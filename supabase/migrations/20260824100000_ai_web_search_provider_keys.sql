-- Credenciales de búsqueda web por usuario.
-- Las claves se cifran en el servidor antes de llegar a esta tabla.
create table if not exists public.user_ai_web_search_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_provider text not null default 'tavily'
    check (preferred_provider in ('tavily', 'brave')),
  tavily_api_key_ciphertext text,
  tavily_key_hint text,
  brave_api_key_ciphertext text,
  brave_key_hint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_ai_web_search_settings enable row level security;

drop policy if exists "Users can read their web search settings" on public.user_ai_web_search_settings;
create policy "Users can read their web search settings"
  on public.user_ai_web_search_settings for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their web search settings" on public.user_ai_web_search_settings;
create policy "Users can insert their web search settings"
  on public.user_ai_web_search_settings for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their web search settings" on public.user_ai_web_search_settings;
create policy "Users can update their web search settings"
  on public.user_ai_web_search_settings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their web search settings" on public.user_ai_web_search_settings;
create policy "Users can delete their web search settings"
  on public.user_ai_web_search_settings for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_ai_web_search_settings to authenticated;

create or replace function public.set_user_ai_web_search_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_ai_web_search_settings_updated_at on public.user_ai_web_search_settings;
create trigger user_ai_web_search_settings_updated_at
before update on public.user_ai_web_search_settings
for each row execute function public.set_user_ai_web_search_settings_updated_at();
