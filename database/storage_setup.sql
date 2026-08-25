-- ============================================================================
-- เพิ่ม Storage bucket สำหรับรูปภาพครุภัณฑ์
-- รันก้อนนี้ใน Supabase SQL Editor ครั้งเดียว (ไม่ต้องรัน schema.sql ใหม่ทั้งไฟล์)
-- ============================================================================

-- สร้าง bucket ชื่อ "asset-images" แบบ public (ใครมีลิงก์รูปก็เปิดดูได้ เหมาะกับรูปครุภัณฑ์
-- ที่ไม่ใช่ข้อมูลอ่อนไหว และต้องให้คนสแกน QR ดูรูปได้โดยไม่ต้องล็อกอิน)
insert into storage.buckets (id, name, public)
values ('asset-images', 'asset-images', true)
on conflict (id) do nothing;

-- ใครก็ดูรูปได้ (ตรงกับ policy เดิมของตาราง assets ที่ให้ดูข้อมูลได้โดยไม่ต้องล็อกอิน)
create policy "public read asset images"
  on storage.objects for select
  using (bucket_id = 'asset-images');

-- ต้องล็อกอิน (เจ้าหน้าที่) เท่านั้นถึงจะอัปโหลด/แก้ไข/ลบรูปได้ — ตรงกับ policy เดิมของตาราง assets
create policy "staff upload asset images"
  on storage.objects for insert
  with check (bucket_id = 'asset-images' and auth.role() = 'authenticated');

create policy "staff update asset images"
  on storage.objects for update
  using (bucket_id = 'asset-images' and auth.role() = 'authenticated');

create policy "staff delete asset images"
  on storage.objects for delete
  using (bucket_id = 'asset-images' and auth.role() = 'authenticated');