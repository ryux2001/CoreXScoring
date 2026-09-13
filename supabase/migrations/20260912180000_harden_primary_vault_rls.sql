-- Exclude anonymous JWTs from persisted vault data and retain ownership checks.
begin;

alter table public.saved_products enable row level security;
alter table public.saved_combos enable row level security;
alter table public.saved_builds enable row level security;
alter table public.created_combos enable row level security;
alter table public.created_builds enable row level security;

revoke all on table public.saved_products, public.saved_combos, public.saved_builds, public.created_combos, public.created_builds from anon;
revoke all on table public.saved_products, public.saved_combos, public.saved_builds, public.created_combos, public.created_builds from authenticated;

grant select, insert, delete on table public.saved_products, public.saved_combos, public.saved_builds to authenticated;
grant select, insert, update, delete on table public.created_combos, public.created_builds to authenticated;

drop policy if exists "Users can remove their saved products" on public.saved_products;
drop policy if exists "Users can save products" on public.saved_products;
drop policy if exists "Users can view their saved products" on public.saved_products;
drop policy if exists "Users can remove their saved combos" on public.saved_combos;
drop policy if exists "Users can save combos" on public.saved_combos;
drop policy if exists "Users can view their saved combos" on public.saved_combos;
drop policy if exists "Users can remove their saved builds" on public.saved_builds;
drop policy if exists "Users can save builds" on public.saved_builds;
drop policy if exists "Users can view their saved builds" on public.saved_builds;
drop policy if exists "Users can create combos" on public.created_combos;
drop policy if exists "Users can delete their created combos" on public.created_combos;
drop policy if exists "Users can update their created combos" on public.created_combos;
drop policy if exists "Users can view their created combos" on public.created_combos;
drop policy if exists "Users can create their builds" on public.created_builds;
drop policy if exists "Users can delete their created builds" on public.created_builds;
drop policy if exists "Users can update their created builds" on public.created_builds;
drop policy if exists "Users can view their created builds" on public.created_builds;

create policy "Registered users can view saved products"
  on public.saved_products for select to authenticated
  using (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Registered users can save products"
  on public.saved_products for insert to authenticated
  with check (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Registered users can remove saved products"
  on public.saved_products for delete to authenticated
  using (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Registered users can view saved combos"
  on public.saved_combos for select to authenticated
  using (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Registered users can save combos"
  on public.saved_combos for insert to authenticated
  with check (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Registered users can remove saved combos"
  on public.saved_combos for delete to authenticated
  using (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Registered users can view saved builds"
  on public.saved_builds for select to authenticated
  using (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Registered users can save builds"
  on public.saved_builds for insert to authenticated
  with check (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Registered users can remove saved builds"
  on public.saved_builds for delete to authenticated
  using (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Registered users can view created combos"
  on public.created_combos for select to authenticated
  using (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Registered users can create combos"
  on public.created_combos for insert to authenticated
  with check (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Registered users can update created combos"
  on public.created_combos for update to authenticated
  using (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Registered users can delete created combos"
  on public.created_combos for delete to authenticated
  using (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Registered users can view created builds"
  on public.created_builds for select to authenticated
  using (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Registered users can create builds"
  on public.created_builds for insert to authenticated
  with check (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Registered users can update created builds"
  on public.created_builds for update to authenticated
  using (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy "Registered users can delete created builds"
  on public.created_builds for delete to authenticated
  using (auth.uid() = user_id and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

commit;
