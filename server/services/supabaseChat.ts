import { createClient } from "@supabase/supabase-js";
import {
  countsTowardFreeMessages,
  serverShouldChargeForMessage,
} from "@shared/chatBilling";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const resolveOwner = (userId?: string | null, anonymousUserId?: string | null) => {
  if (userId && uuidPattern.test(userId)) {
    return { user_id: userId, anonymous_user_id: null as string | null };
  }

  const guestId = anonymousUserId || userId;
  if (!guestId) {
    throw new Error("A user_id or anonymous_user_id is required");
  }

  return { user_id: null as string | null, anonymous_user_id: guestId };
};

/** PostgREST can reject explicit `user_id: null` on FK columns — omit null keys instead. */
const rowWithOwner = (
  owner: { user_id: string | null; anonymous_user_id: string | null },
  fields: Record<string, unknown>,
): Record<string, unknown> => {
  const row: Record<string, unknown> = { ...fields };
  if (owner.user_id) row.user_id = owner.user_id;
  if (owner.anonymous_user_id) row.anonymous_user_id = owner.anonymous_user_id;
  return row;
};

interface SaveChatMessageInput {
  userId?: string | null;
  anonymousUserId?: string | null;
  companionId: string;
  companionName?: string | null;
  companionAvatar?: string | null;
  userName?: string | null;
  userAge?: number | null;
  role: "user" | "assistant";
  content: string;
  language?: "hindi" | "english" | null;
  photoUrl?: string | null;
  isPremium?: boolean | null;
  contextInfo?: string | null;
  metadata?: Record<string, unknown>;
}

export const saveChatMessageToSupabase = async (input: SaveChatMessageInput) => {
  const supabase = getSupabaseAdmin();
  const owner = resolveOwner(input.userId, input.anonymousUserId);

  let conversationQuery = supabase
    .from("chat_conversations")
    .select("id")
    .eq("companion_id", input.companionId)
    .limit(1);

  conversationQuery = owner.user_id
    ? conversationQuery.eq("user_id", owner.user_id)
    : conversationQuery.eq("anonymous_user_id", owner.anonymous_user_id);

  const { data: existingConversation, error: findError } = await conversationQuery.maybeSingle();
  if (findError) throw findError;

  const conversationPayload = rowWithOwner(owner, {
    companion_id: input.companionId,
    companion_name: input.companionName,
    companion_avatar: input.companionAvatar,
    user_name: input.userName,
    user_age: input.userAge,
    last_message: input.content,
    last_message_role: input.role,
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const conversationId = existingConversation?.id;
  const { data: conversation, error: conversationError } = conversationId
    ? await supabase
        .from("chat_conversations")
        .update(conversationPayload)
        .eq("id", conversationId)
        .select("id")
        .single()
    : await supabase
        .from("chat_conversations")
        .insert(conversationPayload)
        .select("id")
        .single();

  if (conversationError) throw conversationError;

  const { data: message, error: messageError } = await supabase
    .from("chat_messages")
    .insert(
      rowWithOwner(owner, {
        conversation_id: conversation.id,
        companion_id: input.companionId,
        role: input.role,
        content: input.content,
        language: input.language,
        photo_url: input.photoUrl,
        is_premium: Boolean(input.isPremium),
        context_info: input.contextInfo,
        metadata: input.metadata || {},
      }),
    )
    .select(
      "id, conversation_id, companion_id, role, content, language, photo_url, is_premium, context_info, created_at",
    )
    .single();

  if (messageError) throw messageError;
  return message;
};

export const updateChatMessageContentInSupabase = async (
  messageId: string,
  content: string,
  userId?: string | null,
  anonymousUserId?: string | null,
) => {
  const supabase = getSupabaseAdmin();
  const owner = resolveOwner(userId, anonymousUserId);

  let query = supabase.from("chat_messages").update({ content }).eq("id", messageId);

  query = owner.user_id
    ? query.eq("user_id", owner.user_id)
    : query.eq("anonymous_user_id", owner.anonymous_user_id);

  const { data, error } = await query.select("id, content").single();
  if (error) throw error;
  return data;
};

export const getChatMessagesFromSupabase = async (
  companionId: string,
  userId?: string | null,
  anonymousUserId?: string | null,
) => {
  const supabase = getSupabaseAdmin();
  const owner = resolveOwner(userId, anonymousUserId);

  let query = supabase
    .from("chat_messages")
    .select("id, companion_id, role, content, photo_url, is_premium, context_info, created_at")
    .eq("companion_id", companionId)
    .order("created_at", { ascending: true });

  query = owner.user_id
    ? query.eq("user_id", owner.user_id)
    : query.eq("anonymous_user_id", owner.anonymous_user_id);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Messages the person typed to this companion, counting the one being sent now.
 * The client saves the new message in parallel with /api/messages, so it may not be stored yet.
 */
const countTypedUserMessages = async (input: {
  companionId: string;
  userId?: string | null;
  anonymousUserId?: string | null;
  currentContent: string;
}): Promise<number> => {
  const supabase = getSupabaseAdmin();
  const owner = resolveOwner(input.userId, input.anonymousUserId);

  // Anything past the largest free allowance is billable, so 100 rows is plenty.
  let query = supabase
    .from("chat_messages")
    .select("content, context_info, created_at")
    .eq("companion_id", input.companionId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(100);

  query = owner.user_id
    ? query.eq("user_id", owner.user_id)
    : query.eq("anonymous_user_id", owner.anonymous_user_id);

  const { data, error } = await query;
  if (error) throw error;

  const typed = (data || []).filter((row) =>
    countsTowardFreeMessages({ role: "user", contextInfo: row.context_info }),
  );
  const current = input.currentContent.trim();
  const recentCutoff = Date.now() - 2 * 60 * 1000;
  const currentAlreadySaved = typed.some(
    (row) =>
      String(row.content ?? "").trim() === current &&
      new Date(row.created_at).getTime() >= recentCutoff,
  );
  return typed.length + (currentAlreadySaved ? 0 : 1);
};

/**
 * 1-based index of this message for free-allowance billing. The client's counter lives in
 * localStorage and can reset (new chat, re-seeded Kundli intro), so it is raised to the
 * number of typed messages saved for this person.
 */
export const resolveBillableMessageIndex = async (input: {
  companionId: string;
  clientIndex: number;
  owner: { userId?: string | null; anonymousUserId?: string | null };
  currentContent: string;
}): Promise<number> => {
  if (serverShouldChargeForMessage(input.clientIndex, input.companionId)) {
    return input.clientIndex;
  }
  try {
    const typedSoFar = await countTypedUserMessages({
      companionId: input.companionId,
      userId: input.owner.userId,
      anonymousUserId: input.owner.anonymousUserId,
      currentContent: input.currentContent,
    });
    return Math.max(input.clientIndex, typedSoFar);
  } catch (error) {
    console.error("[billing] Could not count saved messages; using client count:", error);
    return input.clientIndex;
  }
};

export const getChatConversationsFromSupabase = async (
  userId?: string | null,
  anonymousUserId?: string | null,
) => {
  const supabase = getSupabaseAdmin();
  const owner = resolveOwner(userId, anonymousUserId);

  let query = supabase
    .from("chat_conversations")
    .select("companion_id, last_message, last_message_role, last_message_at")
    .order("updated_at", { ascending: false });

  query = owner.user_id
    ? query.eq("user_id", owner.user_id)
    : query.eq("anonymous_user_id", owner.anonymous_user_id);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((conversation) => ({
    companionId: conversation.companion_id,
    lastMessage: {
      content: conversation.last_message || "",
      role: conversation.last_message_role || "assistant",
      timestamp: conversation.last_message_at,
    },
    lastMessageTime: conversation.last_message_at,
    messageCount: 0,
  }));
};
