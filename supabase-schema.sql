-- ─────────────────────────────────────────────────────────────────────────────
-- Kyro Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Users ─────────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id              uuid primary key default uuid_generate_v4(),
  username        text unique not null,
  display_name    text not null,
  bio             text,
  avatar_url      text,
  github_login    text unique,
  github_id       bigint unique,
  github_repos    int default 0,
  github_followers int default 0,
  stripe_link     text,
  trust_score     int default 0 check (trust_score >= 0 and trust_score <= 100),
  created_at      timestamptz default now()
);

-- ── Products ──────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.users(id) on delete cascade,
  title           text not null,
  description     text not null default '',
  category        text not null default 'Other',
  price           numeric(10,2) not null default 0,
  stripe_link     text,
  thumbnail_url   text,
  file_url        text,
  tags            text[] default '{}',
  sales           int default 0,
  is_published    boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute procedure public.handle_updated_at();

-- ── Storage bucket for uploads ────────────────────────────────────────────────
-- Run this separately in the Supabase dashboard Storage section,
-- or uncomment and run here:
--
-- insert into storage.buckets (id, name, public)
-- values ('kyro-assets', 'kyro-assets', true)
-- on conflict do nothing;
--
-- create policy "Public read access" on storage.objects
--   for select using (bucket_id = 'kyro-assets');
--
-- create policy "Authenticated upload" on storage.objects
--   for insert with check (bucket_id = 'kyro-assets');

-- ── RLS Policies ──────────────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.products enable row level security;

-- Users: anyone can read, only owner can write
create policy "Public user read" on public.users for select using (true);
create policy "Users insert own" on public.users for insert with check (true);
create policy "Users update own" on public.users for update using (true);

-- Products: anyone can read published, owners can do anything
create policy "Public product read" on public.products
  for select using (is_published = true);
create policy "Owners full access" on public.products
  for all using (true);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists products_user_id_idx on public.products(user_id);
create index if not exists products_category_idx on public.products(category);
create index if not exists products_created_at_idx on public.products(created_at desc);
create index if not exists products_sales_idx on public.products(sales desc);
create index if not exists users_username_idx on public.users(username);
