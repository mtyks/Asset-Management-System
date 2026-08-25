-- ============================================================================
-- Asset Management System - Schema v4
-- ลดจาก 3 ระดับ (buildings -> floors -> rooms) เหลือ 2 ระดับ
-- (buildings -> rooms) เก็บ "ชั้น" เป็นแค่ตัวเลขคอลัมน์เดียวในตาราง rooms
-- เพื่อให้ import CSV ง่ายขึ้น (ไม่ต้องคำนวณ floor_code) แต่ยังมี FK คุมความถูกต้อง
-- ของชื่อตึกและห้องเหมือนเดิม
--
-- ⚠️ เป็น schema ชุดใหม่ แทนที่ schema.sql เดิมทั้งหมด ไม่ใช่ patch
-- ถ้า Supabase project เดิมมีตารางแบบ 3 ระดับอยู่แล้ว ต้องรัน DROP TABLE ท้ายไฟล์นี้ก่อน
-- (ข้อมูลเดิมจะหายหมด)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. LOCATION HIERARCHY: buildings -> rooms (2 ระดับ)
-- ----------------------------------------------------------------------------

create table if not exists buildings (
  building_code  text primary key,        -- เช่น "MAIN", "TECH" (พี่กำหนดเอง)
  name           text not null,
  created_at     timestamptz not null default now()
);

create table if not exists rooms (
  room_code      text primary key,        -- เช่น "R101" (พี่กำหนดเอง ต้องไม่ซ้ำกันทั้งระบบ)
  building_code  text not null references buildings(building_code) on delete restrict on update cascade,
  floor_number   int not null,            -- แค่ตัวเลขชั้น ไม่ต้องมีตารางแยกอีกต่อไป
  room_name      text not null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_rooms_building on rooms(building_code);

-- ----------------------------------------------------------------------------
-- 2. ASSET CATEGORIES
-- ----------------------------------------------------------------------------

create table if not exists asset_categories (
  category_code  text primary key,        -- เช่น "CAT-01"
  category_name  text not null unique,
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. ASSETS (main table) — asset_code คือ primary key โดยตรง
-- ----------------------------------------------------------------------------

create table if not exists assets (
  asset_code    text primary key,          -- เช่น "B1000-41400020000/ผ.53-78" เลขทะเบียนครุภัณฑ์จริง
  name          text not null,
  category_code text references asset_categories(category_code) on delete set null on update cascade,
  color         text,
  status        text not null default 'normal'
                  check (status in ('normal', 'repair', 'borrowed', 'damaged', 'disposed')),
  room_code     text references rooms(room_code) on delete set null on update cascade,
  image_url     text,
  received_date date,
  responsible_person text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_assets_status on assets(status);
create index if not exists idx_assets_room on assets(room_code);
create index if not exists idx_assets_category on assets(category_code);

-- ----------------------------------------------------------------------------
-- 4. STATUS HISTORY LOG
-- ----------------------------------------------------------------------------

create table if not exists asset_status_log (
  id          bigint generated always as identity primary key,
  asset_code  text not null references assets(asset_code) on delete cascade on update cascade,
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
  id                bigint generated always as identity primary key,
  asset_code        text not null references assets(asset_code) on delete cascade on update cascade,
  borrower_name     text not null,
  borrower_contact  text,
  borrowed_at       timestamptz not null default now(),
  due_date          date,
  returned_at       timestamptz,
  created_by        uuid references auth.users(id)
);

create index if not exists idx_borrow_asset on borrow_records(asset_code);

-- ----------------------------------------------------------------------------
-- 6. STAFF PROFILES
-- ----------------------------------------------------------------------------

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'staff' check (role in ('admin', 'staff', 'viewer')),
  created_at  timestamptz not null default now()
);

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
-- 7. TRIGGERS
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
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    insert into asset_status_log (asset_code, old_status, new_status, changed_by)
    values (new.asset_code, null, new.status, auth.uid());
  elsif (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    insert into asset_status_log (asset_code, old_status, new_status, changed_by)
    values (new.asset_code, old.status, new.status, auth.uid());
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
-- ============================================================================

alter table buildings          enable row level security;
alter table rooms              enable row level security;
alter table asset_categories   enable row level security;
alter table assets             enable row level security;
alter table asset_status_log   enable row level security;
alter table borrow_records     enable row level security;
alter table profiles           enable row level security;

create policy "public read buildings"   on buildings          for select using (true);
create policy "public read rooms"       on rooms              for select using (true);
create policy "public read categories"  on asset_categories   for select using (true);
create policy "public read assets"      on assets             for select using (true);
create policy "public read status log"  on asset_status_log   for select using (true);

create policy "staff write buildings"  on buildings          for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff write rooms"      on rooms              for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff write categories" on asset_categories   for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff write assets"     on assets             for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff write borrow"     on borrow_records     for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "staff read own profile" on profiles for select using (auth.uid() = id);
create policy "staff update own profile" on profiles for update using (auth.uid() = id);

-- ============================================================================
-- 9. SEED DATA
-- ============================================================================

insert into asset_categories (category_code, category_name) values
  ('CAT-01', 'เฟอร์นิเจอร์'),
  ('CAT-02', 'อุปกรณ์อิเล็กทรอนิกส์'),
  ('CAT-03', 'อุปกรณ์คอมพิวเตอร์'),
  ('CAT-04', 'เครื่องใช้ไฟฟ้า'),
  ('CAT-05', 'อุปกรณ์การเรียน')
on conflict (category_code) do nothing;

-- ============================================================================
-- ถ้า Supabase project เดิมเคยรัน schema เวอร์ชัน 3 ระดับ (มีตาราง floors) ไปแล้ว
-- ต้องลบตารางเก่าก่อนรันไฟล์นี้ (ข้อมูลเดิมจะหายทั้งหมด):
--
-- drop table if exists asset_status_log, borrow_records, profiles, assets,
--   asset_categories, rooms, floors, buildings cascade;
-- ============================================================================