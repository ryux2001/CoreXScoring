-- CoreX AI Fase 4: reemplaza reservas de tokens por uso real del proveedor.

create or replace function public.settle_ai_quota(
  p_user_id uuid,
  p_ip_hash text,
  p_reserved_tokens integer,
  p_actual_tokens integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'AI quota settlement user mismatch' using errcode = '42501';
  end if;

  if p_reserved_tokens < 0 or p_reserved_tokens > 20000
    or p_actual_tokens < 0 or p_actual_tokens > 1000000 then
    raise exception 'AI quota settlement is invalid' using errcode = '22023';
  end if;

  update public.ai_usage_daily
  set reserved_tokens = greatest(0, reserved_tokens - p_reserved_tokens + p_actual_tokens),
      last_used_at = now()
  where usage_date = timezone('utc', now())::date
    and bucket_scope = 'user'
    and bucket_key = p_user_id::text;

  if p_ip_hash is not null then
    update public.ai_usage_daily
    set reserved_tokens = greatest(0, reserved_tokens - p_reserved_tokens + p_actual_tokens),
        last_used_at = now()
    where usage_date = timezone('utc', now())::date
      and bucket_scope = 'ip'
      and bucket_key = p_ip_hash;
  end if;
end;
$$;

revoke all on function public.settle_ai_quota(uuid, text, integer, integer) from public, anon;
grant execute on function public.settle_ai_quota(uuid, text, integer, integer) to authenticated;
