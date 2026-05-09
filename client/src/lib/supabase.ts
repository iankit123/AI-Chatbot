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

const getStoredAuthUser = (): AppUser | null => {
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

const getOwnerIds = () => {
  const user = auth.currentUser || getStoredAuthUser();
  if (user?.uid) return { userId: user.uid, anonymousUserId: null };
  return { userId: null, anonymousUserId: getAnonymousUserId() };
};

const getGuestProfile = () => {
  try {
    const raw = localStorage.getItem("guestProfile");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveChatMessage = async (message: any) => {
  const owner = getOwnerIds();
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
      ...owner,
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
    throw new Error(`Failed to save chat message: ${text}`);
  }

  const data = await response.json();
  return data.id;
};

export const getChatMessages = async (userId: string, companionId: string) => {
  const params = new URLSearchParams({ userId, companionId });
  const response = await fetch(`/api/chat/messages?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to load chat messages");
  return response.json();
};

export const getAllUserChats = async (userId: string) => {
  const params = new URLSearchParams({ userId });
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
