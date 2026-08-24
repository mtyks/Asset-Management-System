-- ============================================================================
-- Asset Management System - Schema v2
-- ออกแบบให้ตรงกับ frontend ของทีม (petchtany/AssetManagementSystem)
-- คงโครงสร้าง 3 ระดับ: buildings -> floors -> rooms ตามที่ตกลงกับพี่
--
-- ⚠️ นี่คือ schema ชุดใหม่ทั้งหมด ไม่ใช่ patch ของ schema.sql เดิม
-- ถ้าพี่มีข้อมูลอยู่ใน Supabase project เดิมแล้ว ให้สร้าง Supabase project ใหม่
-- แล้วรันไฟล์นี้ หรือถ้าจะใช้ project เดิม ต้อง DROP ตารางเก่าก่อน (ดูท้ายไฟล์)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. LOCATION HIERARCHY: buildings -> floors -> rooms
--    "rooms" คือหน่วยที่ frontend เดิมเรียกว่า "location" (มี responsible_person,
--    phone, desc, is_active ติดอยู่ที่ระดับห้อง ตรงกับที่ทีมออกแบบไว้)
-- ----------------------------------------------------------------------------

create table if not exists buildings (
  id          bigint generated always as identity primary key,
  code        text,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists floors (
  id            bigint generated always as identity primary key,
  building_id   bigint not null references buildings(id) on delete restrict,
  floor_number  int not null,
  floor_name    text,
  created_at    timestamptz not null default now(),
  unique (building_id, floor_number)
);

create table if not exists rooms (
  id                  bigint generated always as identity primary key,
  floor_id            bigint not null references floors(id) on delete restrict,
  room_code           text,
  room_name           text not null,
  responsible_person  text,
  phone               text,
  description         text,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  unique (floor_id, room_name)
);

-- ----------------------------------------------------------------------------
-- 2. ASSET CATEGORIES (ตรงกับฟิลด์ที่ categories.js ใช้: code, name, icon, color, desc, isActive)
-- ----------------------------------------------------------------------------

create table if not exists asset_categories (
  id           bigint generated always as identity primary key,
  code         text unique,
  name         text not null,
  icon         text,
  color        text,
  description  text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. ASSETS (ตรงกับฟิลด์ที่ assets.js ใช้: code, serial, name, brandModel, categoryId,
--    location(=room), responsiblePerson, status, condition, icon, iconColor, image)
-- ----------------------------------------------------------------------------

create table if not exists assets (
  id                  bigint generated always as identity primary key,
  code                text not null unique,
  serial              text,
  name                text not null,
  brand_model         text,
  category_id         bigint references asset_categories(id) on delete set null,
  room_id             bigint references rooms(id) on delete set null,
  responsible_person  text,
  status              text not null default 'in_use'
                        check (status in ('in_use', 'borrowed', 'maintenance', 'disposed')),
  condition           text default 'ดี',
  icon                text default 'ph-cube',
  icon_color          text default 'text-blue-500',
  image_url           text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_assets_category on assets(category_id);
create index if not exists idx_assets_room on assets(room_id);
create index if not exists idx_assets_status on assets(status);

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

-- ----------------------------------------------------------------------------
-- 4. TRANSFERS (ย้าย / ยืม / คืน) — ตรงกับ transfers.js
-- ----------------------------------------------------------------------------

create table if not exists transfers (
  id            bigint generated always as identity primary key,
  doc_no        text,
  type          text not null check (type in ('borrow', 'transfer', 'return')),
  asset_id      bigint not null references assets(id) on delete cascade,
  person        text,
  from_room_id  bigint references rooms(id),
  to_room_id    bigint references rooms(id),
  start_date    date,
  due_date      date,
  status        text not null default 'completed' check (status in ('borrowing', 'completed')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_transfers_asset on transfers(asset_id);

-- ----------------------------------------------------------------------------
-- 5. MAINTENANCE (ใบแจ้งซ่อม) — ตรงกับ maintenance.js
-- ----------------------------------------------------------------------------

create table if not exists maintenance (
  id           bigint generated always as identity primary key,
  repair_no    text,
  asset_id     bigint not null references assets(id) on delete cascade,
  problem      text,
  reporter     text,
  repair_date  date,
  status       text not null default 'pending' check (status in ('pending', 'completed')),
  created_at   timestamptz not null default now()
);

create index if not exists idx_maintenance_asset on maintenance(asset_id);

-- ============================================================================
-- 6. ROW LEVEL SECURITY
--
-- ⚠️ จุดที่นลินอยากแจ้งพี่ตรงๆ: frontend ของทีมตอนนี้ยังไม่มีหน้า login เลย
-- (ไม่มีการเรียก Supabase Auth ที่ไหนใน js ทั้ง 8 ไฟล์) เพราะฉะนั้น RLS ชุดนี้
-- เปิดให้ "ทุกคนที่มีลิงก์เว็บ" อ่านและแก้ไขข้อมูลได้หมด (public read + write)
-- เพื่อให้ frontend เดิมทำงานได้ทันทีโดยไม่ต้องเพิ่มหน้า login ตอนนี้
--
-- ความเสี่ยง: ใครก็ตามที่รู้ URL เว็บของพี่ แก้ไข/ลบข้อมูลได้หมดโดยไม่ต้องล็อกอิน
-- แนะนำให้เพิ่มระบบ login ภายหลัง แล้วนลินจะช่วยเปลี่ยน policy ให้รัดกุมขึ้นได้
-- ============================================================================

alter table buildings        enable row level security;
alter table floors           enable row level security;
alter table rooms            enable row level security;
alter table asset_categories enable row level security;
alter table assets           enable row level security;
alter table transfers        enable row level security;
alter table maintenance      enable row level security;

create policy "public full access buildings"        on buildings        for all using (true) with check (true);
create policy "public full access floors"           on floors           for all using (true) with check (true);
create policy "public full access rooms"            on rooms            for all using (true) with check (true);
create policy "public full access asset_categories" on asset_categories for all using (true) with check (true);
create policy "public full access assets"           on assets           for all using (true) with check (true);
create policy "public full access transfers"        on transfers        for all using (true) with check (true);
create policy "public full access maintenance"      on maintenance      for all using (true) with check (true);

-- ============================================================================
-- 7. SEED DATA — ใช้ข้อมูลตัวอย่างชุดเดียวกับที่ทีมทำ mock ไว้ใน js/data.js
--    เพื่อให้เปิดเว็บครั้งแรกแล้วหน้าตาเหมือนของเดิมทุกประการ
-- ============================================================================

insert into asset_categories (code, name, icon, color, description, is_active) values
  ('CAT-01', 'ครุภัณฑ์คอมพิวเตอร์และสารสนเทศ', 'ph-desktop', 'blue', 'คอมพิวเตอร์ตั้งโต๊ะ, โน้ตบุ๊ก, เซิร์ฟเวอร์, แท็บเล็ต, จอภาพ และอุปกรณ์ประมวลผล', true),
  ('CAT-02', 'ครุภัณฑ์สำนักงาน', 'ph-chair', 'amber', 'โต๊ะทำงาน, ตู้เก็บเอกสาร, เก้าอี้สำนักงาน, เครื่องพิมพ์, เครื่องทำลายเอกสาร', true),
  ('CAT-03', 'ครุภัณฑ์อุปกรณ์เครือข่ายและการสื่อสาร', 'ph-wifi-high', 'cyan', 'Switch, Router, Access Point, ตู้ Rack, ระบบโทรศัพท์ IP, สายสัญญาณหลัก', true),
  ('CAT-04', 'ครุภัณฑ์โสตทัศนูปกรณ์', 'ph-projector-screen', 'purple', 'โปรเจคเตอร์, จอ Interactive Touch Screen, เครื่องเสียง, ไมโครโฟน, กล้องบันทึกภาพ', true),
  ('CAT-05', 'ครุภัณฑ์ไฟฟ้าและวิทยุ', 'ph-lightning', 'indigo', 'เครื่องปรับอากาศ, เครื่องสำรองไฟฟ้า (UPS), เครื่องกำเนิดไฟฟ้า, หม้อแปลงไฟฟ้า', true),
  ('CAT-06', 'ครุภัณฑ์ยานพาหนะและขนส่ง', 'ph-car', 'emerald', 'รถยนต์ส่วนกลาง, รถตู้โดยสาร, รถกระบะบรรทุก, รถจักรยานยนต์ตรวจการ', true),
  ('CAT-07', 'ครุภัณฑ์วิทยาศาสตร์และการแพทย์', 'ph-flask', 'rose', 'กล้องจุลทรรศน์, เครื่องวัดความดัน, ตู้บ่มเพาะเชื้อ, เครื่องชั่งสารละเอียด', true),
  ('CAT-08', 'ครุภัณฑ์งานบ้านงานครัว', 'ph-cooking-pot', 'teal', 'ตู้เย็น, ไมโครเวฟ, ตู้กดน้ำร้อน-เย็น, เครื่องฟอกอากาศ, เครื่องล้างจาน', true),
  ('CAT-09', 'ครุภัณฑ์ก่อสร้างและเครื่องมือช่าง', 'ph-wrench', 'orange', 'สว่านแท่น, เครื่องเชื่อมไฟฟ้า, เครื่องตัดไฟเบอร์, ชุดเครื่องมือช่างกล', true),
  ('CAT-10', 'ครุภัณฑ์การเกษตรและสิ่งแวดล้อม', 'ph-plant', 'green', 'เครื่องตัดหญ้า, ปั๊มน้ำแรงดันสูง, เครื่องพ่นละอองยา, เครื่องวัดสภาพอากาศ', true)
on conflict (code) do nothing;

-- ตึกตัวอย่าง (ดึงชื่อตึกที่ไม่ซ้ำจาก mock data ของทีม)
insert into buildings (name) values
  ('อาคารอำนวยการ'), ('อาคารเทคโนโลยี'), ('อาคาร 1'), ('อาคารวิทยาศาสตร์'), ('อาคารซ่อมบำรุง')
on conflict do nothing;

-- ชั้นตัวอย่าง
insert into floors (building_id, floor_number)
select b.id, f.floor_number
from buildings b
join (values
  ('อาคารอำนวยการ', 1), ('อาคารอำนวยการ', 3),
  ('อาคารเทคโนโลยี', 1), ('อาคารเทคโนโลยี', 2),
  ('อาคาร 1', 2),
  ('อาคารวิทยาศาสตร์', 3),
  ('อาคารซ่อมบำรุง', 1)
) as f(building_name, floor_number) on b.name = f.building_name
on conflict (building_id, floor_number) do nothing;

-- ห้องตัวอย่าง (= "locations" เดิมของทีม)
insert into rooms (floor_id, room_code, room_name, responsible_person, phone, description, is_active)
select fl.id, r.room_code, r.room_name, r.responsible_person, r.phone, r.description, true
from floors fl
join buildings b on b.id = fl.building_id
join (values
  ('อาคารอำนวยการ', 1, 'LOC-01', 'ห้องธุรการและสารบรรณ', 'สมชาย ใจดี', '1101', 'ศูนย์กลางงานสารบรรณ พัสดุ และเอกสารธุรการของหน่วยงาน'),
  ('อาคารเทคโนโลยี', 2, 'LOC-02', 'ห้องปฏิบัติการคอมพิวเตอร์ 1', 'วิภาดา สอนดี', '1201', 'ห้องปฏิบัติการคอมพิวเตอร์สำหรับการเรียนรู้และฝึกอบรม'),
  ('อาคารเทคโนโลยี', 2, 'LOC-03', 'ห้องปฏิบัติการคอมพิวเตอร์ 2', 'อนันต์ ระบบดี', '1202', 'ห้องปฏิบัติการระบบเครือข่ายและซอฟต์แวร์ประยุกต์'),
  ('อาคารอำนวยการ', 3, 'LOC-04', 'ห้องประชุมใหญ่ (Auditorium)', 'พงษ์ศิริ มัลติมีเดีย', '1301', 'ห้องประชุมขนาดใหญ่พร้อมระบบภาพ แสง เสียง และโปรเจคเตอร์'),
  ('อาคาร 1', 2, 'LOC-05', 'ห้องกลุ่มงานวิชาการ', 'กิตติพงษ์ งานดี', '1401', 'ห้องทำงานและประสานงานกลุ่มงานวิชาการและทะเบียน'),
  ('อาคารเทคโนโลยี', 1, 'LOC-06', 'ห้องศูนย์เซิร์ฟเวอร์และระบบเครือข่าย', 'อนันต์ ระบบดี', '1200', 'ศูนย์คอมพิวเตอร์ Data Center ตู้ Rack และอุปกรณ์เครือข่ายหลัก'),
  ('อาคารวิทยาศาสตร์', 3, 'LOC-07', 'ห้องปฏิบัติการวิทยาศาสตร์', 'ดร. สุภาภรณ์ วิทย์ดี', '1501', 'ห้องทดลองวิทยาศาสตร์ เครื่องมือวัด และอุปกรณ์ทดลอง'),
  ('อาคารซ่อมบำรุง', 1, 'LOC-08', 'ลานจอดรถส่วนกลางและโรงซ่อมบำรุง', 'สมพงษ์ ขับปลอดภัย', '1601', 'พื้นที่จอดรถส่วนกลาง โรงเก็บพัสดุขนาดใหญ่ และเครื่องมือช่าง')
) as r(building_name, floor_number, room_code, room_name, responsible_person, phone, description)
  on b.name = r.building_name and fl.floor_number = r.floor_number
on conflict (floor_id, room_name) do nothing;

-- ============================================================================
-- ถ้าพี่เคยรัน schema.sql เวอร์ชันแรก (buildings/floors/rooms/assets/asset_status_log/
-- borrow_records/profiles) ไปแล้วใน Supabase project เดียวกัน และอยากล้างของเก่าทิ้ง
-- ก่อนรันไฟล์นี้ ให้รันบรรทัดนี้ก่อน (ระวัง: ข้อมูลเดิมจะหายหมด):
--
-- drop table if exists asset_status_log, borrow_records, profiles, assets,
--   asset_categories, rooms, floors, buildings cascade;
-- ============================================================================
