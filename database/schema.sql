-- ============================================================================
-- Asset Management System - Schema v3 (ไม่ใช้ uuid เป็น primary key แล้ว)
--
-- ⚠️ เป็น schema ชุดใหม่ทั้งหมด แทนที่ schema.sql เดิม ไม่ใช่ patch
-- ถ้า Supabase project เดิมมีข้อมูลอยู่แล้ว ให้รัน DROP TABLE ท้ายไฟล์นี้ก่อน
-- (ข้อมูลเดิมจะหายหมด) แนะนำสำรอง export ข้อมูลก่อนถ้ามีของจริงอยู่แล้ว
--
-- หลักการ: ใช้ "รหัสที่มนุษย์อ่านออก" (code) เป็น primary key โดยตรง แทน uuid
-- เช่น B1000-41400020000/ผ.53-78 สำหรับครุภัณฑ์ ซึ่งเป็นเลขทะเบียนที่มีอยู่แล้ว
-- ไม่ต้องมี id แยกซ้อนอีกชั้น อ่านง่ายกว่า debug ง่ายกว่า
--
-- ข้อยกเว้นเดียว: profiles.id และคอลัมน์ที่อ้างอิงผู้ใช้ (changed_by, created_by)
-- ยังคงเป็น uuid เพราะผูกกับ auth.users ของ Supabase Auth ซึ่งบังคับให้เป็น uuid
-- มาจากตัวระบบ Supabase เอง ไม่ใช่สิ่งที่เราออกแบบเองได้
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. LOCATION HIERARCHY: buildings -> floors -> rooms
-- ----------------------------------------------------------------------------

create table if not exists buildings (
  building_code  text primary key,        -- เช่น "MAIN", "TECH" (พี่กำหนดเองตอนเพิ่ม)
  name           text not null,
  created_at     timestamptz not null default now()
);

create table if not exists floors (
  floor_code     text primary key,        -- generate อัตโนมัติ = building_code || '-F' || floor_number
  building_code  text not null references buildings(building_code) on delete restrict on update cascade,
  floor_number   int not null,
  floor_name     text,
  created_at     timestamptz not null default now(),
  unique (building_code, floor_number)
);

create table if not exists rooms (
  room_code   text primary key,          -- เช่น "R101" (พี่กำหนดเอง ต้องไม่ซ้ำกันทั้งระบบ)
  floor_code  text not null references floors(floor_code) on delete restrict on update cascade,
  room_name   text not null,
  created_at  timestamptz not null default now()
);

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
  asset_code    text primary key,          -- เช่น "B1000-41400020000/ผ.53-78" — เลขทะเบียนครุภัณฑ์จริง พิมพ์บน QR
  name          text not null,
  category_code text references asset_categories(category_code) on delete set null on update cascade,
  color         text,
  status        text not null default 'normal'
                  check (status in ('normal', 'repair', 'borrowed', 'damaged', 'disposed')),
  room_code     text references rooms(room_code) on delete set null on update cascade,
  image_url     text,                          -- Supabase Storage public URL
  received_date date,
  responsible_person text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_assets_status on assets(status);
create index if not exists idx_assets_room on assets(room_code);
create index if not exists idx_assets_category on assets(category_code);

-- ----------------------------------------------------------------------------
-- 4. STATUS HISTORY LOG (auto-filled by trigger below)
-- ----------------------------------------------------------------------------

create table if not exists asset_status_log (
  id          bigint generated always as identity primary key, -- แค่เลขลำดับ log ไม่ใช่ตัวอ้างอิงธุรกิจ ใช้เลขธรรมดาพอ
  asset_code  text not null references assets(asset_code) on delete cascade on update cascade,
  old_status  text,
  new_status  text not null,
  note        text,
  changed_by  uuid references auth.users(id), -- ต้องเป็น uuid เพราะอ้างอิง Supabase Auth
  changed_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. BORROW RECORDS
-- ----------------------------------------------------------------------------

create table if not exists borrow_records (
  id                bigint generated always as identity primary key, -- log/history เช่นกัน ใช้เลขลำดับพอ
  asset_code        text not null references assets(asset_code) on delete cascade on update cascade,
  borrower_name     text not null,
  borrower_contact  text,
  borrowed_at       timestamptz not null default now(),
  due_date          date,
  returned_at       timestamptz,
  created_by        uuid references auth.users(id) -- ต้องเป็น uuid เพราะอ้างอิง Supabase Auth
);

create index if not exists idx_borrow_asset on borrow_records(asset_code);

-- ----------------------------------------------------------------------------
-- 6. STAFF PROFILES (extends Supabase auth.users with a role)
--    ตารางนี้ id ต้องเป็น uuid เพราะ FK ตรงไปที่ auth.users(id) ของ Supabase Auth โดยตรง
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
alter table floors             enable row level security;
alter table rooms              enable row level security;
alter table asset_categories   enable row level security;
alter table assets             enable row level security;
alter table asset_status_log   enable row level security;
alter table borrow_records     enable row level security;
alter table profiles           enable row level security;

create policy "public read buildings"   on buildings          for select using (true);
create policy "public read floors"      on floors             for select using (true);
create policy "public read rooms"       on rooms              for select using (true);
create policy "public read categories"  on asset_categories   for select using (true);
create policy "public read assets"      on assets             for select using (true);
create policy "public read status log"  on asset_status_log   for select using (true);

create policy "staff write buildings"  on buildings          for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff write floors"     on floors             for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
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
-- ถ้า Supabase project เดิมเคยรัน schema.sql เวอร์ชัน uuid ไปแล้ว ต้องลบตารางเก่า
-- ก่อนรันไฟล์นี้ (สลับลำดับความสัมพันธ์ FK จาก uuid เป็น text ปนกันไม่ได้)
-- รันบรรทัดนี้ก่อน (ข้อมูลเดิมจะหายทั้งหมด):
--
-- drop table if exists asset_status_log, borrow_records, profiles, assets,
--   asset_categories, rooms, floors, buildings cascade;
-- ============================================================================
