-- Editorial content for the public home. Catalog categories remain independent.

create table if not exists public.home_hero (
  id boolean primary key default true check (id = true),
  eyebrow text not null default 'CoreXScoring',
  title text not null default 'Decide tu próximo equipo con datos.',
  description text not null default 'Compara hardware, descubre configuraciones equilibradas y encuentra la mejor opción para tu presupuesto.',
  primary_label text not null default 'Explorar catálogo',
  primary_href text not null default '/catalog',
  secondary_label text not null default 'Abrir comparador',
  secondary_href text not null default '/comparator',
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.home_hero (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.home_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  description text not null default '' check (length(description) <= 360),
  eyebrow text not null default '' check (length(eyebrow) <= 80),
  content_type text not null check (content_type in ('products', 'combos', 'builds', 'comparisons')),
  visual_variant text not null default 'default' check (visual_variant in ('default', 'spotlight', 'compact')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.home_section_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.home_sections(id) on delete cascade,
  product_id text references public.products(id) on delete cascade,
  combo_id uuid references public.combos(id) on delete cascade,
  build_id uuid references public.builds(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (num_nonnulls(product_id, combo_id, build_id) = 1),
  unique (section_id, product_id),
  unique (section_id, combo_id),
  unique (section_id, build_id)
);

create table if not exists public.home_comparisons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.home_sections(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 120),
  description text not null default '' check (length(description) <= 360),
  eyebrow text not null default '' check (length(eyebrow) <= 80),
  item_type text not null check (item_type in ('products', 'combos', 'builds')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.home_comparison_items (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references public.home_comparisons(id) on delete cascade,
  product_id text references public.products(id) on delete cascade,
  combo_id uuid references public.combos(id) on delete cascade,
  build_id uuid references public.builds(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (num_nonnulls(product_id, combo_id, build_id) = 1),
  unique (comparison_id, product_id),
  unique (comparison_id, combo_id),
  unique (comparison_id, build_id)
);

-- A previous interrupted execution may have created this table before the column was added.
alter table public.home_comparison_items
  add column if not exists created_at timestamptz not null default now();

create index if not exists home_sections_public_order_idx
  on public.home_sections (is_active, sort_order, created_at);
create index if not exists home_section_items_section_order_idx
  on public.home_section_items (section_id, sort_order, created_at);
create index if not exists home_comparisons_section_order_idx
  on public.home_comparisons (section_id, is_active, sort_order, created_at);
create index if not exists home_comparison_items_comparison_order_idx
  on public.home_comparison_items (comparison_id, sort_order, created_at);

alter table public.home_hero enable row level security;
alter table public.home_sections enable row level security;
alter table public.home_section_items enable row level security;
alter table public.home_comparisons enable row level security;
alter table public.home_comparison_items enable row level security;

drop policy if exists "Anyone can read public home hero" on public.home_hero;
create policy "Anyone can read public home hero"
  on public.home_hero for select to anon, authenticated using (is_active = true);

drop policy if exists "Anyone can read public home sections" on public.home_sections;
create policy "Anyone can read public home sections"
  on public.home_sections for select to anon, authenticated using (is_active = true);

drop policy if exists "Anyone can read home section items" on public.home_section_items;
create policy "Anyone can read home section items"
  on public.home_section_items for select to anon, authenticated using (
    exists (select 1 from public.home_sections where id = section_id and is_active = true)
  );

drop policy if exists "Anyone can read public home comparisons" on public.home_comparisons;
create policy "Anyone can read public home comparisons"
  on public.home_comparisons for select to anon, authenticated using (
    is_active = true
    and exists (select 1 from public.home_sections where id = section_id and is_active = true)
  );

drop policy if exists "Anyone can read home comparison items" on public.home_comparison_items;
create policy "Anyone can read home comparison items"
  on public.home_comparison_items for select to anon, authenticated using (
    exists (
      select 1 from public.home_comparisons comparison
      join public.home_sections section on section.id = comparison.section_id
      where comparison.id = comparison_id
        and comparison.is_active = true
        and section.is_active = true
    )
  );

grant select on public.home_hero, public.home_sections, public.home_section_items,
  public.home_comparisons, public.home_comparison_items to anon, authenticated;
