create table if not exists public.auth_recovery_proofs (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_recovery_proofs_user_id_idx
  on public.auth_recovery_proofs (user_id);

create index if not exists auth_recovery_proofs_expires_at_idx
  on public.auth_recovery_proofs (expires_at)
  where consumed_at is null;

alter table public.auth_recovery_proofs enable row level security;

revoke all on table public.auth_recovery_proofs from anon, authenticated;

comment on table public.auth_recovery_proofs is
  'One-time, server-only proof created after a Supabase recovery link is verified.';
