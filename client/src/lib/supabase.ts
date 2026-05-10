import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

interface UserProfile {
  name?: string;
  email?: string;
  age?: number;
  [key: string]: unknown;
}

const AUTH_USER_KEY = "authUser";
const ANONYMOUS_ID_KEY = "anonymousUserId";

export const normalizeIndianPhone = (input: string): string | null => {
  let digits = input.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("91")) digits = digits.slice(-10);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(-10);
  else if (digits.length > 10) digits = digits.slice(-10);
  return digits.length === 10 ? digits : null;
};

/** `selectedCompanion.id` from localStorage, if set */
export function getSelectedCompanionId(): string | null {
  try {
    const raw = localStorage.getItem("selectedCompanion");
    if (!raw) return null;
    const id = JSON.parse(raw)?.id;
    return id != null ? String(id) : null;
  } catch {
    return null;
  }
}

/** 10-digit mobile already stored from phone sign-in or guest profile */
export function getStoredBillingPhoneDigits(): string | null {
  try {
    const raw = localStorage.getItem("authUser");
    if (raw) {
      const u = JSON.parse(raw) as { uid?: string; email?: string };
      const uid = String(u.uid || "");
      if (uid.startsWith("phone-")) {
        const d = uid.slice("phone-".length).replace(/\D/g, "");
        if (d.length === 10) return d;
      }
      const email = String(u.email || "");
      const m = email.match(/^(\d{10})@phone\.local$/);
      if (m) return m[1];
    }
    const g = localStorage.getItem("guestProfile");
    if (g) {
      const p = JSON.parse(g) as { phone?: string };
      const d = String(p.phone ?? "").replace(/\D/g, "");
      if (d.length >= 10) return d.slice(-10);
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function notifyLocalAuthListeners() {
  window.dispatchEvent(new Event("local-storage-auth"));
}

export const isSignedInLocally = (): boolean => {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return false;
    const u = JSON.parse(raw) as AppUser;
    if (!u?.uid || String(u.uid).startsWith("anonymous-")) return false;
    const email = u.email ? String(u.email) : "";
    /** Phone sign-in uses `${digits}@phone.local` */
    const isPhoneLocalUser = /^\d{10}@phone\.local$/i.test(email);
    const pseudoEmail =
      email && !email.includes("anonymous") && !isPhoneLocalUser;
    return pseudoEmail || !!u.displayName?.trim() || isPhoneLocalUser;
  } catch {
    return false;
  }
};

/** Phone auth or guest profile with valid 10-digit phone — bottom nav + profile sheet */
export function isUserRegisteredLocally(): boolean {
  if (isSignedInLocally()) return true;
  try {
    const raw = localStorage.getItem("guestProfile");
    if (!raw) return false;
    const p = JSON.parse(raw) as { phone?: string };
    return normalizeIndianPhone(String(p.phone ?? "")) !== null;
  } catch {
    return false;
  }
}

/** Marks the user signed-in locally using phone (no OTP). Syncs guestProfile.name if missing. */
export const signInWithPhoneLocal = (name: string, phoneDigits: string): AppUser => {
  const normalized = normalizeIndianPhone(phoneDigits);
  if (!normalized) throw new Error("Invalid phone number");

  let prev: Record<string, unknown> = {};
  try {
    const g = localStorage.getItem("guestProfile");
    prev = g ? JSON.parse(g) : {};
  } catch {
    prev = {};
  }

  const displayName = name.trim() || (prev.name as string)?.trim() || "User";
  const user: AppUser = {
    uid: `phone-${normalized}`,
    email: `${normalized}@phone.local`,
    displayName,
    photoURL: null,
  };
  auth.currentUser = user;
  localStorage.setItem(
    AUTH_USER_KEY,
    JSON.stringify(user),
  );
  localStorage.setItem(
    "guestProfile",
    JSON.stringify({
      ...prev,
      name: displayName,
      phone: normalized,
    }),
  );
  notifyLocalAuthListeners();
  return user;
};

export async function upsertAppProfileOnServer(
  deviceId: string,
  opts: { phone?: string | null; name?: string | null },
): Promise<boolean> {
  try {
    const res = await fetch("/api/profiles/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        device_id: deviceId,
        phone_number: opts.phone ?? null,
        name: opts.name ?? null,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function logPaymentAttemptOnServer(payload: {
  device_id: string;
  phone_number: string;
  amount_rupees: number;
  companion_id?: string | null;
  rate_note?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/billing/payment-attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const toAppUser = (user: any): AppUser => ({
  uid: user.id,
  email: user.email || null,
  displayName:
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    null,
  photoURL: user.user_metadata?.avatar_url || null,
});

export function getStoredAuthUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const auth: { currentUser: AppUser | null } = {
  currentUser: getStoredAuthUser(),
};

if (supabase) {
  supabase.auth.getUser().then(({ data }) => {
    if (data.user) {
      auth.currentUser = toAppUser(data.user);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(auth.currentUser));
    }
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    auth.currentUser = session?.user ? toAppUser(session.user) : null;
    if (auth.currentUser) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(auth.currentUser));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  });
}

export const subscribeToAuthChanges = (callback: (user: AppUser | null) => void) => {
  callback(auth.currentUser);

  if (!supabase) {
    return () => {};
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ? toAppUser(session.user) : null;
    auth.currentUser = user;
    callback(user);
  });

  return () => data.subscription.unsubscribe();
};

export const signInWithGoogle = async (): Promise<AppUser> => {
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });

  if (error) throw error;
  throw new Error("Google sign-in redirect started. Complete sign-in in the browser.");
};

export const createUser = async (email: string, password: string): Promise<AppUser> => {
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("Account created. Please check your email to confirm sign-up.");

  const user = toAppUser(data.user);
  auth.currentUser = user;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  return user;
};

export const signIn = async (email: string, password: string): Promise<AppUser> => {
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("Unable to sign in");

  const user = toAppUser(data.user);
  auth.currentUser = user;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  return user;
};

export const signOutUser = async () => {
  if (supabase) await supabase.auth.signOut();
  auth.currentUser = null;
  localStorage.removeItem(AUTH_USER_KEY);
  notifyLocalAuthListeners();
};

export const saveUserProfile = async (_userId: string, profile: UserProfile) => {
  localStorage.setItem("guestProfile", JSON.stringify(profile));

  if (supabase && auth.currentUser) {
    await supabase.auth.updateUser({
      data: {
        name: profile.name,
        full_name: profile.name,
        age: profile.age,
      },
    });
  }
};

export const getUserProfile = async (_userId: string): Promise<UserProfile | null> => {
  const storedProfile = localStorage.getItem("guestProfile");
  if (storedProfile) return JSON.parse(storedProfile);

  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  return {
    name:
      data.user.user_metadata?.full_name ||
      data.user.user_metadata?.name ||
      data.user.email?.split("@")[0],
    email: data.user.email,
    age: data.user.user_metadata?.age,
  };
};

export const getAnonymousUserId = (): string => {
  const existing = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (existing) return existing;

  const anonymousId = `anonymous-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
  return anonymousId;
};

/** Stable browser id for guests (same key as anonymous chat owner). */
export const getDeviceId = (): string => getAnonymousUserId();

function stringifyApiErrorPart(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

const getGuestProfile = () => {
  try {
    const raw = localStorage.getItem("guestProfile");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Same criteria as bottom nav "Profile" vs "Sign in" — used for server-backed chat history. */
export function getPersistedChatUserId(): string | null {
  if (!isUserRegisteredLocally()) return null;

  const stored = getStoredAuthUser();
  if (stored?.uid && !String(stored.uid).startsWith("anonymous-")) {
    return stored.uid;
  }

  const digits = getStoredBillingPhoneDigits();
  return digits ? `phone-${digits}` : null;
}

/** Owner tuple for `/api/chat/*` — signed-in uses userId; guests use stable device anonymous id. */
export function getChatPersistenceOwner(): {
  userId: string | null;
  anonymousUserId: string | null;
} {
  const persisted = getPersistedChatUserId();
  if (persisted) {
    return { userId: persisted, anonymousUserId: null };
  }
  return { userId: null, anonymousUserId: getAnonymousUserId() };
}

export const saveChatMessage = async (message: any) => {
  const owner = getChatPersistenceOwner();

  const profile = getGuestProfile();
  const selectedCompanion = localStorage.getItem("selectedCompanion");
  const companion = selectedCompanion ? JSON.parse(selectedCompanion) : null;

  const response = await fetch("/api/chat/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      userId: owner.userId,
      anonymousUserId: owner.anonymousUserId,
      companionId: message.companionId || companion?.id || "unknown",
      companionName: companion?.name || null,
      companionAvatar: companion?.avatar || null,
      userName: profile?.name || null,
      userAge: profile?.age ? Number(profile.age) : null,
      role: message.role,
      content: message.content,
      language: localStorage.getItem("chatLanguage") || "hindi",
      photoUrl: message.photoUrl || null,
      isPremium: Boolean(message.isPremium),
      contextInfo: message.contextInfo || null,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    let detail = text;
    try {
      const j = JSON.parse(text) as {
        error?: unknown;
        hint?: string;
        message?: string;
      };
      detail =
        [j.message, stringifyApiErrorPart(j.error), j.hint].filter(Boolean).join(" — ") || text;
    } catch {
      /* raw text */
    }
    throw new Error(`Failed to save chat message: ${detail}`);
  }

  const data = await response.json();
  return data.id;
};

export const getChatMessages = async (
  companionId: string,
  owner: { userId: string | null; anonymousUserId: string | null },
) => {
  const params = new URLSearchParams({ companionId });
  if (owner.userId) params.set("userId", owner.userId);
  if (owner.anonymousUserId) params.set("anonymousUserId", owner.anonymousUserId);
  const response = await fetch(`/api/chat/messages?${params.toString()}`);
  if (!response.ok) {
    const text = await response.text();
    let detail = text;
    try {
      const j = JSON.parse(text) as {
        error?: unknown;
        hint?: string;
        message?: string;
      };
      detail =
        [j.message, stringifyApiErrorPart(j.error), j.hint].filter(Boolean).join(" — ") || text;
    } catch {
      /* raw text */
    }
    throw new Error(`Failed to load chat messages: ${detail}`);
  }
  return response.json();
};

export const getAllUserChats = async (owner: {
  userId: string | null;
  anonymousUserId: string | null;
}) => {
  const params = new URLSearchParams();
  if (owner.userId) params.set("userId", owner.userId);
  if (owner.anonymousUserId) params.set("anonymousUserId", owner.anonymousUserId);
  const response = await fetch(`/api/chat/conversations?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to load chat conversations");
  return response.json();
};

export const logPaymentRequest = async (
  userId: string,
  userEmail: string,
  type: string,
  data: Record<string, unknown>,
) => {
  const paymentRequests = JSON.parse(localStorage.getItem("paymentRequests") || "[]");
  paymentRequests.push({
    userId,
    userEmail,
    type,
    ...data,
    timestamp: new Date().toISOString(),
  });
  localStorage.setItem("paymentRequests", JSON.stringify(paymentRequests));
};
