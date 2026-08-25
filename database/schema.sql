-- ============================================================================
-- ระบบบริหารจัดการครุภัณฑ์ (Asset Management System)
-- Comprehensive Relational Database Schema & Supabase Setup
-- 
-- วิธีใช้งาน:
-- 1. เข้า Supabase Dashboard (https://supabase.com/dashboard)
-- 2. ไปที่เมนู "SQL Editor" > "New query"
-- 3. คัดลอกคำสั่งทั้งหมดในไฟล์นี้ไปวางแล้วกดปุ่ม "Run"
-- ============================================================================

-- 0. เปิด Extension ที่จำเป็น
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ล้างตารางเดิม (Clean Drop เพื่อสร้างความสัมพันธ์ใหม่อย่างสมบูรณ์)
-- ----------------------------------------------------------------------------
drop table if exists asset_status_log cascade;
drop table if exists borrow_records cascade;
drop table if exists assets cascade;
drop table if exists rooms cascade;
drop table if exists floors cascade;
drop table if exists buildings cascade;
drop table if exists asset_categories cascade;
drop table if exists profiles cascade;

-- ----------------------------------------------------------------------------
-- 1. ลำดับโครงสร้างสถานที่ (Location Hierarchy): buildings -> floors -> rooms
-- ----------------------------------------------------------------------------

-- 1.1 อาคาร / ตึก (Buildings)
create table buildings (
  id             uuid primary key default gen_random_uuid(),
  building_code  text not null unique,
  name           text not null,
  created_at     timestamptz not null default now()
);

-- 1.2 ชั้นในอาคาร (Floors)
create table floors (
  id            uuid primary key default gen_random_uuid(),
  building_id   uuid not null references buildings(id) on delete cascade,
  building_code text,
  floor_number  int not null,
  floor_name    text,
  created_at    timestamptz not null default now(),
  unique (building_id, floor_number)
);

-- 1.3 ห้อง / จุดประจำ (Rooms)
create table rooms (
  id          uuid primary key default gen_random_uuid(),
  floor_id    uuid references floors(id) on delete set null,
  room_code   text not null unique,
  room_name   text not null,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. หมวดหมู่ครุภัณฑ์ (Asset Categories)
-- ----------------------------------------------------------------------------
create table asset_categories (
  id             uuid primary key default gen_random_uuid(),
  category_code  text not null unique,
  category_name  text not null unique,
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. ตารางข้อมูลครุภัณฑ์หลัก (Assets)
-- ----------------------------------------------------------------------------
create table assets (
  id                  uuid primary key default gen_random_uuid(),
  asset_code          text not null unique,               -- ป้ายทะเบียน QR Code (เช่น A-2569-1001)
  name                text not null,                      -- ชื่อรายการครุภัณฑ์
  category_id         uuid references asset_categories(id) on delete set null,
  category_code       text,                               -- สำเนาคีย์รหัสหมวดหมู่เพื่อความสะดวก
  room_id             uuid references rooms(id) on delete set null,
  room_code           text,                               -- สำเนาคีย์รหัสห้อง
  color               text,                               -- รายละเอียด / สี / ยี่ห้อ / รุ่น
  status              text not null default 'normal'      -- สถานะครุภัณฑ์
                        check (status in ('normal', 'borrowed', 'repair', 'damaged', 'disposed')),
  image_url           text,                               -- URL รูปภาพจาก Supabase Storage
  received_date       date,                               -- วันที่ตรวจรับเข้าคลัง
  responsible_person  text,                               -- ชื่อผู้รับผิดชอบ / ผู้ดูแล
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- สร้าง Indexes เพื่อเพิ่มความเร็วในการค้นหาและกรองข้อมูล
create index idx_assets_code on assets(asset_code);
create index idx_assets_status on assets(status);
create index idx_assets_category on assets(category_id);
create index idx_assets_room on assets(room_id);

-- ----------------------------------------------------------------------------
-- 4. ประวัติการยืม - คืน ครุภัณฑ์ (Borrow Records)
-- ----------------------------------------------------------------------------
create table borrow_records (
  id                uuid primary key default gen_random_uuid(),
  asset_id          uuid references assets(id) on delete cascade,
  asset_code        text not null,                        -- เลขครุภัณฑ์ที่ถูกยืม
  borrower_name     text not null,                        -- ชื่อผู้ยืม
  borrower_contact  text,                                 -- เบอร์ติดต่อ / สังกัด / แผนก
  borrowed_at       timestamptz not null default now(),   -- วันเวลาที่ยืม
  due_date          date,                                 -- กำหนดวันส่งคืน
  returned_at       timestamptz,                          -- วันเวลาที่ส่งคืน (NULL = กำลังยืมอยู่)
  created_at        timestamptz not null default now()
);

create index idx_borrow_records_asset on borrow_records(asset_code);
create index idx_borrow_records_status on borrow_records(returned_at);

-- ----------------------------------------------------------------------------
-- 5. ประวัติการเปลี่ยนแปลงสถานะ (Status Log & Timeline)
-- ----------------------------------------------------------------------------
create table asset_status_log (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid references assets(id) on delete cascade,
  asset_code  text not null,
  old_status  text,
  new_status  text not null,
  note        text,
  changed_at  timestamptz not null default now()
);

create index idx_status_log_asset on asset_status_log(asset_code);

-- ----------------------------------------------------------------------------
-- 6. Trigger บันทึก Timeline และ Timestamp อัตโนมัติ
-- ----------------------------------------------------------------------------

-- Function อัปเดต updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_assets_updated_at
  before update on assets
  for each row execute function set_updated_at();

-- Function บันทึกประวัติสถานะอัตโนมัติเมื่อสถานะของ asset เปลี่ยนแปลง
create or replace function log_asset_status_change()
returns trigger language plpgsql as $$
begin
  if (old.status is distinct from new.status) then
    insert into asset_status_log (asset_id, asset_code, old_status, new_status, note, changed_at)
    values (new.id, new.asset_code, old.status, new.status, 'ปรับปรุงสถานะผ่านระบบ', now());
  end if;
  return new;
end;
$$;

create trigger trg_log_asset_status_change
  after update on assets
  for each row execute function log_asset_status_change();

-- ----------------------------------------------------------------------------
-- 7. View แสดงข้อมูลครุภัณฑ์แบบรวมความสัมพันธ์ (Full View)
-- ----------------------------------------------------------------------------
create or replace view view_assets_full as
select
  a.id,
  a.asset_code,
  a.name,
  a.color,
  a.status,
  a.image_url,
  a.received_date,
  a.responsible_person,
  a.created_at,
  a.updated_at,
  c.id as category_id,
  c.category_code,
  c.category_name,
  r.id as room_id,
  r.room_code,
  r.room_name,
  f.id as floor_id,
  f.floor_number,
  f.floor_name,
  b.id as building_id,
  b.building_code,
  b.name as building_name
from assets a
left join asset_categories c on a.category_id = c.id or a.category_code = c.category_code
left join rooms r on a.room_id = r.id or a.room_code = r.room_code
left join floors f on r.floor_id = f.id
left join buildings b on f.building_id = b.id;

-- ----------------------------------------------------------------------------
-- 8. เปิดใช้งาน Row Level Security (RLS) พร้อมกำหนดสิทธิ์อย่างถูกต้อง
-- ----------------------------------------------------------------------------
alter table buildings enable row level security;
alter table floors enable row level security;
alter table rooms enable row level security;
alter table asset_categories enable row level security;
alter table assets enable row level security;
alter table borrow_records enable row level security;
alter table asset_status_log enable row level security;

-- นโยบายสิทธิ์ (Policies) อนุญาตให้อ่านและจัดการข้อมูลได้อย่างสมบูรณ์ (Public / Anon / Authenticated)
create policy "allow_all_buildings" on buildings for all using (true) with check (true);
create policy "allow_all_floors" on floors for all using (true) with check (true);
create policy "allow_all_rooms" on rooms for all using (true) with check (true);
create policy "allow_all_categories" on asset_categories for all using (true) with check (true);
create policy "allow_all_assets" on assets for all using (true) with check (true);
create policy "allow_all_borrow_records" on borrow_records for all using (true) with check (true);
create policy "allow_all_status_log" on asset_status_log for all using (true) with check (true);

-- ----------------------------------------------------------------------------
-- 9. สร้าง Storage Bucket 'asset-images' สำหรับเก็บรูปภาพครุภัณฑ์
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('asset-images', 'asset-images', true)
on conflict (id) do update set public = true;

create policy "allow_public_read_images"
  on storage.objects for select
  using (bucket_id = 'asset-images');

create policy "allow_public_upload_images"
  on storage.objects for insert
  with check (bucket_id = 'asset-images');

create policy "allow_public_update_images"
  on storage.objects for update
  using (bucket_id = 'asset-images');

create policy "allow_public_delete_images"
  on storage.objects for delete
  using (bucket_id = 'asset-images');

-- ----------------------------------------------------------------------------
-- 10. ข้อมูลเริ่มต้นระบบ (Seed Data)
-- ----------------------------------------------------------------------------

-- อาคาร
insert into buildings (id, building_code, name) values
  ('11111111-1111-1111-1111-111111111111', 'BLD-01', 'อาคารอำนวยการ'),
  ('22222222-2222-2222-2222-222222222222', 'BLD-02', 'อาคารปฏิบัติการและเทคโนโลยี')
on conflict (building_code) do nothing;

-- ชั้น
insert into floors (id, building_id, building_code, floor_number, floor_name) values
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'BLD-01', 1, 'ชั้น 1 โถงกลาง'),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'BLD-01', 2, 'ชั้น 2 สำนักงาน'),
  ('44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222222', 'BLD-02', 1, 'ชั้น 1 ห้องปฏิบัติการ')
on conflict do nothing;

-- ห้อง
insert into rooms (id, floor_id, room_code, room_name) values
  ('55555555-5555-5555-5555-555555555551', '33333333-3333-3333-3333-333333333331', 'RM-101', 'ห้องธุรการและสารบรรณ'),
  ('55555555-5555-5555-5555-555555555552', '33333333-3333-3333-3333-333333333331', 'RM-102', 'ห้องประชุมใหญ่ ชั้น 1'),
  ('55555555-5555-5555-5555-555555555553', '33333333-3333-3333-3333-333333333332', 'RM-201', 'ห้องศูนย์ข้อมูลคอมพิวเตอร์')
on conflict (room_code) do nothing;

-- หมวดหมู่ครุภัณฑ์
insert into asset_categories (id, category_code, category_name) values
  ('66666666-6666-6666-6666-666666666661', 'CAT-01', 'ครุภัณฑ์สำนักงาน'),
  ('66666666-6666-6666-6666-666666666662', 'CAT-02', 'ครุภัณฑ์คอมพิวเตอร์และอุปกรณ์ไอที'),
  ('66666666-6666-6666-6666-666666666663', 'CAT-03', 'ครุภัณฑ์ไฟฟ้าและวิทยุ'),
  ('66666666-6666-6666-6666-666666666664', 'CAT-04', 'ครุภัณฑ์ยานพาหนะและขนส่ง'),
  ('66666666-6666-6666-6666-666666666665', 'CAT-05', 'ครุภัณฑ์การศึกษาและวิทยาศาสตร์')
on conflict (category_code) do nothing;

-- ครุภัณฑ์ตัวอย่างเริ่มต้น
insert into assets (
  id,
  asset_code,
  name,
  category_id,
  category_code,
  room_id,
  room_code,
  color,
  status,
  responsible_person,
  received_date
) values
  (
    '77777777-7777-7777-7777-777777777771',
    'A-2569-1001',
    'คอมพิวเตอร์ All-in-One Dell OptiPlex',
    '66666666-6666-6666-6666-666666666662',
    'CAT-02',
    '55555555-5555-5555-5555-555555555551',
    'RM-101',
    'สีดำ-เงิน Core i7 RAM 16GB',
    'normal',
    'สมชาย ใจดี',
    '2026-01-15'
  ),
  (
    '77777777-7777-7777-7777-777777777772',
    'A-2569-1002',
    'โต๊ะทำงานผู้บริหารพร้อมตู้ลิ้นชัก',
    '66666666-6666-6666-6666-666666666661',
    'CAT-01',
    '55555555-5555-5555-5555-555555555552',
    'RM-102',
    'ไม้สักทอง 180 ซม.',
    'normal',
    'วิภา สุขสม',
    '2026-02-01'
  ),
  (
    '77777777-7777-7777-7777-777777777773',
    'A-2569-1003',
    'เครื่องโปรเจกเตอร์ 4K Epson EB-L730U',
    '66666666-6666-6666-6666-666666666663',
    'CAT-03',
    '55555555-5555-5555-5555-555555555552',
    'RM-102',
    'สีขาว เลเซอร์ 7,000 Lumens',
    'borrowed',
    'กิตติกร มีพร้อม',
    '2026-02-10'
  )
on conflict (asset_code) do nothing;

-- รายการยืมครุภัณฑ์เริ่มต้น
insert into borrow_records (
  asset_id,
  asset_code,
  borrower_name,
  borrower_contact,
  borrowed_at,
  due_date
) values
  (
    '77777777-7777-7777-7777-777777777773',
    'A-2569-1003',
    'กิตติกร มีพร้อม',
    '089-123-4567 (ฝ่ายบริหาร)',
    now() - interval '2 days',
    current_date + interval '5 days'
  )
on conflict do nothing;
