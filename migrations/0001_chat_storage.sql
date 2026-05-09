-- Supabase chat storage tables.
-- Supports authenticated users via auth.uid() and guest users via anonymous_user_id.

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_user_id text,
  companion_id text not null,
  companion_name text,
  companion_avatar text,
  user_name text,
  user_age integer,
  last_message text,
  last_message_role text check (last_message_role in ('user', 'assistant')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_conversations_owner_check check (
    user_id is not null or anonymous_user_id is not null
  ),
  constraint chat_conversations_unique_auth unique (user_id, companion_id),
  constraint chat_conversations_unique_guest unique (anonymous_user_id, companion_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_user_id text,
  companion_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  language text check (language in ('hindi', 'english')),
  photo_url text,
  is_premium boolean not null default false,
  context_info text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint chat_messages_owner_check check (
    user_id is not null or anonymous_user_id is not null
  )
);

create index if not exists chat_conversations_user_updated_idx
  on public.chat_conversations (user_id, updated_at desc);

create index if not exists chat_conversations_guest_updated_idx
  on public.chat_conversations (anonymous_user_id, updated_at desc);

create index if not exists chat_messages_conversation_created_idx
  on public.chat_messages (conversation_id, created_at asc);

create index if not exists chat_messages_user_companion_created_idx
  on public.chat_messages (user_id, companion_id, created_at asc);

create index if not exists chat_messages_guest_companion_created_idx
  on public.chat_messages (anonymous_user_id, companion_id, created_at asc);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Users can read own conversations" on public.chat_conversations;
create policy "Users can read own conversations"
  on public.chat_conversations
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own conversations" on public.chat_conversations;
create policy "Users can insert own conversations"
  on public.chat_conversations
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own conversations" on public.chat_conversations;
create policy "Users can update own conversations"
  on public.chat_conversations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own conversations" on public.chat_conversations;
create policy "Users can delete own conversations"
  on public.chat_conversations
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own messages" on public.chat_messages;
create policy "Users can read own messages"
  on public.chat_messages
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own messages" on public.chat_messages;
create policy "Users can insert own messages"
  on public.chat_messages
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own messages" on public.chat_messages;
create policy "Users can delete own messages"
  on public.chat_messages
  for delete
  using (auth.uid() = user_id);

-- Guest chats are intended to be written through trusted backend endpoints using
-- SUPABASE_SERVICE_ROLE_KEY. The service role bypasses RLS, so no anonymous
-- public policy is added for anonymous_user_id rows.
