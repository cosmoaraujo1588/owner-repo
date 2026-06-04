create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  title text not null,
  category text not null default 'Ofertas',
  subcategory text,
  sku text,
  price numeric(12,2) not null default 0,
  old_price numeric(12,2),
  tag text,
  short_description text,
  description text,
  image_url text,
  gallery jsonb not null default '[]'::jsonb,
  video_url text,
  video_thumb text,
  checkout_url text not null default '',
  featured boolean not null default true,
  active boolean not null default true,
  best_seller boolean not null default false,
  flash_offer boolean not null default false,
  review_rating numeric(3,1) not null default 5,
  review_count integer not null default 0,
  scarcity_text text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  name text not null,
  image_url text,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subcategories (
  id text primary key,
  category_id text references public.categories(id) on delete cascade,
  name text not null,
  image_url text,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id text primary key,
  product_id text references public.products(id) on delete set null,
  product_name text,
  customer_name text not null,
  city text,
  rating numeric(3,1) not null default 5 check (rating in (1,1.5,2,2.5,3,3.5,4,4.5,5)),
  comment text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.banners (
  id text primary key,
  title text,
  subtitle text,
  image_url text,
  mobile_image_url text,
  button_text text,
  button_link text,
  placement text not null default 'main',
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pages (
  id text primary key,
  title text not null,
  slug text not null unique,
  content text,
  seo_title text,
  seo_description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  whatsapp text,
  city text,
  source text,
  session_id text,
  status text not null default 'novo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  product_id text references public.products(id) on delete cascade,
  session_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.cart_events (
  id uuid primary key default gen_random_uuid(),
  product_id text references public.products(id) on delete set null,
  session_id text,
  event_type text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.click_events (
  id uuid primary key default gen_random_uuid(),
  product_id text references public.products(id) on delete set null,
  session_id text,
  click_type text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.view_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  session_id text,
  page text,
  referrer text,
  device text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.online_visitors (
  session_id text primary key,
  page text,
  product_id text,
  device text,
  origin text,
  last_activity timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  keyword text,
  response text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id text primary key,
  name text not null,
  product_id text references public.products(id) on delete set null,
  message text,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  product_id text references public.products(id) on delete cascade,
  video_url text,
  thumb_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  period_start timestamptz,
  period_end timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.reviews enable row level security;
alter table public.banners enable row level security;
alter table public.settings enable row level security;
alter table public.pages enable row level security;
alter table public.leads enable row level security;
alter table public.favorites enable row level security;
alter table public.cart_events enable row level security;
alter table public.click_events enable row level security;
alter table public.view_events enable row level security;
alter table public.online_visitors enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.campaigns enable row level security;
alter table public.videos enable row level security;
alter table public.reports enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.products, public.categories, public.subcategories, public.reviews, public.banners, public.settings, public.pages to anon, authenticated;
grant insert on public.leads, public.favorites, public.cart_events, public.click_events, public.view_events, public.online_visitors to anon, authenticated;
grant select, update on public.online_visitors to anon, authenticated;

drop policy if exists "public read active products" on public.products;
create policy "public read active products" on public.products for select using (active = true);

drop policy if exists "public read active categories" on public.categories;
create policy "public read active categories" on public.categories for select using (active = true);

drop policy if exists "public read active subcategories" on public.subcategories;
create policy "public read active subcategories" on public.subcategories for select using (active = true);

drop policy if exists "public read active reviews" on public.reviews;
create policy "public read active reviews" on public.reviews for select using (active = true);

drop policy if exists "public read active banners" on public.banners;
create policy "public read active banners" on public.banners for select using (active = true);

drop policy if exists "public read settings" on public.settings;
create policy "public read settings" on public.settings for select using (true);

drop policy if exists "public read active pages" on public.pages;
create policy "public read active pages" on public.pages for select using (active = true);

drop policy if exists "public insert leads" on public.leads;
create policy "public insert leads" on public.leads for insert with check (true);

drop policy if exists "public insert events" on public.view_events;
create policy "public insert events" on public.view_events for insert with check (true);

drop policy if exists "public insert favorites" on public.favorites;
create policy "public insert favorites" on public.favorites for insert with check (true);

drop policy if exists "public insert clicks" on public.click_events;
create policy "public insert clicks" on public.click_events for insert with check (true);

drop policy if exists "public insert cart events" on public.cart_events;
create policy "public insert cart events" on public.cart_events for insert with check (true);

drop policy if exists "public track online visitors" on public.online_visitors;
create policy "public track online visitors" on public.online_visitors for insert with check (true);

drop policy if exists "public update own online visitor" on public.online_visitors;
create policy "public update own online visitor" on public.online_visitors for update using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('kairos-public', 'kairos-public', true)
on conflict (id) do update set public = true;

drop policy if exists "public read kairos files" on storage.objects;
create policy "public read kairos files"
on storage.objects for select
using (bucket_id = 'kairos-public');

drop policy if exists "service uploads kairos files" on storage.objects;

do $$
declare
  kairos_table regclass;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach kairos_table in array array[
      'public.products'::regclass,
      'public.categories'::regclass,
      'public.banners'::regclass,
      'public.reviews'::regclass,
      'public.settings'::regclass
    ]
    loop
      begin
        execute format('alter publication supabase_realtime add table %s', kairos_table);
      exception
        when duplicate_object then null;
      end;
    end loop;
  end if;
end $$;
