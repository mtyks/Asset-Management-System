-- ============================================================================
-- Asset Management System - Database Schema (PostgreSQL / Supabase)
-- Run this entire file once in Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ----------------------------------------------------------------------------
-- 1. LOCATION HIERARCHY: buildings -> floors -> rooms
-- ----------------------------------------------------------------------------

create table if not exists buildings (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text unique,
  created_at  timestamptz not null default now()
);

create table if not exists floors (
  id            uuid primary key default gen_random_uuid(),
  building_id   uuid not null references buildings(id) on delete restrict,
  floor_number  int not null,
  floor_name    text,
  created_at    timestamptz not null default now(),
  unique (building_id, floor_number)
);

create table if not exists rooms (
  id          uuid primary key default gen_random_uuid(),
  floor_id    uuid not null references floors(id) on delete restrict,
  room_name   text not null,
  room_code   text,
  created_at  timestamptz not null default now(),
  unique (floor_id, room_name)
);

-- ----------------------------------------------------------------------------
-- 2. ASSET CATEGORIES (reference table, avoids free-text duplication)
-- ----------------------------------------------------------------------------

create table if not exists asset_categories (
  id             uuid primary key default gen_random_uuid(),
  category_name  text not null unique,
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. ASSETS (main table)
-- ----------------------------------------------------------------------------

create table if not exists assets (
  id            uuid primary key default gen_random_uuid(),
  asset_code    text not null unique,          -- printed on the QR code
  name          text not null,
  category_id   uuid references asset_categories(id) on delete set null,
  color         text,
  status        text not null default 'normal'
                  check (status in ('normal', 'repair', 'borrowed', 'damaged', 'disposed')),
  room_id       uuid references rooms(id) on delete set null,
  image_url     text,                          -- Supabase Storage public URL
  received_date date,
  responsible_person text,                     -- ชื่อผู้รับผิดชอบ/ผู้ดูแลครุภัณฑ์ชิ้นนี้
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_assets_status on assets(status);
create index if not exists idx_assets_room on assets(room_id);
create index if not exists idx_assets_category on assets(category_id);

-- ----------------------------------------------------------------------------
-- 4. STATUS HISTORY LOG (auto-filled by trigger below)
-- ----------------------------------------------------------------------------

create table if not exists asset_status_log (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid not null references assets(id) on delete cascade,
  old_status  text,
  new_status  text not null,
  note        text,
  changed_by  uuid references auth.users(id),
  changed_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. BORROW RECORDS
-- ----------------------------------------------------------------------------

create table if not exists borrow_records (
  id                uuid primary key default gen_random_uuid(),
  asset_id          uuid not null references assets(id) on delete cascade,
  borrower_name     text not null,
  borrower_contact  text,
  borrowed_at       timestamptz not null default now(),
  due_date          date,
  returned_at       timestamptz,
  created_by        uuid references auth.users(id)
);

create index if not exists idx_borrow_asset on borrow_records(asset_id);

-- ----------------------------------------------------------------------------
-- 6. STAFF PROFILES (extends Supabase auth.users with a role)
-- ----------------------------------------------------------------------------

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'staff' check (role in ('admin', 'staff', 'viewer')),
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'staff');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- 7. TRIGGERS: keep updated_at fresh + auto-log every status change
-- ----------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_assets_updated_at on assets;
create trigger trg_assets_updated_at
  before update on assets
  for each row execute function set_updated_at();

create or replace function log_asset_status_change()
returns trigger
language plpgsql
security definer  -- ทำงานด้วยสิทธิ์เจ้าของฟังก์ชัน (bypass RLS) เพราะเป็น log ที่ผู้ใช้ทั่วไปไม่ควร insert เองตรงๆ อยู่แล้ว
as $$
begin
  if (tg_op = 'INSERT') then
    insert into asset_status_log (asset_id, old_status, new_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    insert into asset_status_log (asset_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_asset_status_log on assets;
create trigger trg_asset_status_log
  after insert or update on assets
  for each row execute function log_asset_status_change();

-- ============================================================================
-- 8. ROW LEVEL SECURITY
--    Rule of thumb: anyone (incl. public QR scan, not logged in) can VIEW
--    asset info. Only logged-in staff can add/edit/delete.
-- ============================================================================

alter table buildings          enable row level security;
alter table floors             enable row level security;
alter table rooms              enable row level security;
alter table asset_categories   enable row level security;
alter table assets             enable row level security;
alter table asset_status_log   enable row level security;
alter table borrow_records     enable row level security;
alter table profiles           enable row level security;

-- Public read access (needed so a scanned QR code works without login)
create policy "public read buildings"   on buildings          for select using (true);
create policy "public read floors"      on floors             for select using (true);
create policy "public read rooms"       on rooms              for select using (true);
create policy "public read categories"  on asset_categories   for select using (true);
create policy "public read assets"      on assets             for select using (true);
create policy "public read status log"  on asset_status_log   for select using (true);

-- Authenticated staff: full write access
create policy "staff write buildings"  on buildings          for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff write floors"     on floors             for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff write rooms"      on rooms              for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff write categories" on asset_categories   for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff write assets"     on assets             for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff write borrow"     on borrow_records     for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "staff read own profile" on profiles for select using (auth.uid() = id);
create policy "staff update own profile" on profiles for update using (auth.uid() = id);

-- ============================================================================
-- 9. SEED DATA (optional starting data - safe to delete/edit)
-- ============================================================================

insert into asset_categories (category_name) values
  ('เฟอร์นิเจอร์'), ('อุปกรณ์อิเล็กทรอนิกส์'), ('อุปกรณ์คอมพิวเตอร์'), ('เครื่องใช้ไฟฟ้า'), ('อุปกรณ์การเรียน')
on conflict (category_name) do nothing;

-- ============================================================================
-- Done. Next step: Project Settings > API to copy your Project URL and anon key
-- into the frontend .env file (see README.md).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ถ้าพี่เคยรัน schema.sql เวอร์ชันก่อนหน้าไปแล้ว (ไม่มีคอลัมน์ responsible_person)
-- ให้รันแค่บรรทัดนี้บรรทัดเดียวเพิ่มใน SQL Editor แทนที่จะรันทั้งไฟล์ใหม่:
-- ----------------------------------------------------------------------------
-- alter table assets add column if not exists responsible_person text;
