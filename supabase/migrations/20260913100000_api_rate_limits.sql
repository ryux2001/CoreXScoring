begin;

create table public.api_rate_limit_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.api_rate_limit_buckets enable row level security;
revoke all on table public.api_rate_limit_buckets from public, anon, authenticated;
grant all on table public.api_rate_limit_buckets to service_role;

create or replace function public.consume_api_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := now();
  v_bucket public.api_rate_limit_buckets%rowtype;
  v_retry integer;
begin
  if p_key is null or char_length(p_key) < 1 or char_length(p_key) > 256
    or p_window_seconds < 1 or p_window_seconds > 86400
    or p_limit < 1 or p_limit > 100000 then
    raise exception 'API rate limit arguments are invalid' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_key, 9131));
  select * into v_bucket from public.api_rate_limit_buckets where bucket_key = p_key for update;

  if not found or v_now >= v_bucket.window_started_at + make_interval(secs => p_window_seconds) then
    insert into public.api_rate_limit_buckets (bucket_key, window_started_at, request_count, updated_at)
    values (p_key, v_now, 1, v_now)
    on conflict (bucket_key) do update
      set window_started_at = excluded.window_started_at,
          request_count = excluded.request_count,
          updated_at = excluded.updated_at;
    return jsonb_build_object('allowed', true, 'retry_after_seconds', p_window_seconds);
  end if;

  if v_bucket.request_count >= p_limit then
    v_retry := greatest(1, ceil(extract(epoch from (v_bucket.window_started_at + make_interval(secs => p_window_seconds) - v_now)))::integer);
    return jsonb_build_object('allowed', false, 'retry_after_seconds', v_retry);
  end if;

  update public.api_rate_limit_buckets
  set request_count = request_count + 1, updated_at = v_now
  where bucket_key = p_key;
  return jsonb_build_object('allowed', true, 'retry_after_seconds', p_window_seconds);
end;
$$;

create or replace function public.cleanup_api_rate_limit_buckets(p_before timestamptz)
returns integer
language sql
security definer
set search_path = pg_catalog, public
as $$
  with deleted as (
    delete from public.api_rate_limit_buckets
    where updated_at < p_before
    returning 1
  )
  select count(*)::integer from deleted;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.cleanup_api_rate_limit_buckets(timestamptz) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;
grant execute on function public.cleanup_api_rate_limit_buckets(timestamptz) to service_role;

commit;
