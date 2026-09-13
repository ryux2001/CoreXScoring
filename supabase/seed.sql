-- Small, deterministic catalog used by local development and CI security smokes.
-- Production and hosted projects keep their catalog data outside this seed.
insert into public.ai_quota_config (singleton)
values (true)
on conflict (singleton) do nothing;

insert into public.products (id, slug, name, brand, type, category, price_base_usd, price_base_eur, price_usd, price_eur, specs, compatibility, benchmarks, tags)
values
  ('ci-cpu', 'ci-cpu', 'CoreX CI CPU', 'CoreX', 'cpu', 'CPU', 200, 185, 200, 185, '{"cores": 8}', '{}', '{}', '[]'),
  ('ci-gpu', 'ci-gpu', 'CoreX CI GPU', 'CoreX', 'gpu', 'GPU', 400, 370, 400, 370, '{"vram": 12}', '{}', '{}', '[]'),
  ('ci-ram', 'ci-ram', 'CoreX CI RAM', 'CoreX', 'ram', 'RAM', 80, 74, 80, 74, '{"capacity": 32}', '{}', '{}', '[]'),
  ('ci-motherboard', 'ci-motherboard', 'CoreX CI Motherboard', 'CoreX', 'motherboard', 'Motherboard', 140, 130, 140, 130, '{}', '{}', '{}', '[]'),
  ('ci-storage', 'ci-storage', 'CoreX CI Storage', 'CoreX', 'storage', 'Storage', 70, 65, 70, 65, '{}', '{}', '{}', '[]'),
  ('ci-psu', 'ci-psu', 'CoreX CI PSU', 'CoreX', 'psu', 'PSU', 90, 83, 90, 83, '{}', '{}', '{}', '[]')
on conflict (id) do nothing;

insert into public.combos (title, category, slug, is_active, cpu_id, gpu_id, ram_id)
values ('CoreX CI Combo', 'Gaming', 'ci-combo', true, 'ci-cpu', 'ci-gpu', 'ci-ram')
on conflict (slug) do nothing;

insert into public.builds (title, slug, category, is_active, cpu_id, gpu_id, ram_id, motherboard_id, storage_id, psu_id)
values ('CoreX CI Build', 'ci-build', 'Gaming', true, 'ci-cpu', 'ci-gpu', 'ci-ram', 'ci-motherboard', 'ci-storage', 'ci-psu')
on conflict (slug) do nothing;
