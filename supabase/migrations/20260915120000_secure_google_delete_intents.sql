create table if not exists public.auth_google_delete_intents (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_google_delete_intents_expires_at_idx
  on public.auth_google_delete_intents (expires_at)
  where consumed_at is null;

alter table public.auth_google_delete_intents enable row level security;

revoke all on table public.auth_google_delete_intents from anon, authenticated;

comment on table public.auth_google_delete_intents is
  'One-time server-only intent requiring a fresh Google OAuth session before account deletion.';
