# ระบบจัดการครุภัณฑ์ด้วย QR Code

Web App (React + Vite) เชื่อมต่อ Supabase (PostgreSQL) — ใช้งานได้ทั้งบนคอมพิวเตอร์และมือถือ
สแกน QR ผ่านกล้องมือถือได้ทันทีโดยไม่ต้องล็อกอิน ส่วนการเพิ่ม/แก้ไขข้อมูลต้องล็อกอินก่อน

---

## โครงสร้างโปรเจกต์

```
asset-system/
├── database/
│   ├── schema.sql       ← รันไฟล์นี้ใน Supabase SQL Editor ครั้งเดียวตอนตั้งระบบ
│   └── erd.mermaid       ← ER Diagram (เปิดดูได้ที่ mermaid.live หรือ VS Code extension)
├── src/
│   ├── supabaseClient.js ← จุดเดียวที่อ่านค่า config จาก .env (fail-stop ถ้า config ไม่ครบ)
│   ├── lib/
│   │   ├── queries.js     ← query ทั้งหมดที่คุยกับฐานข้อมูล รวมไว้ที่เดียว
│   │   └── AuthContext.jsx
│   ├── components/        ← ชิ้นส่วน UI ที่ใช้ซ้ำ (Navbar, QR display, badge, route guard)
│   └── pages/              ← หนึ่งไฟล์ต่อหนึ่งหน้าจอ
├── .env.example           ← คัดลอกเป็น .env แล้วใส่ค่าจริง (ห้าม commit .env ขึ้น git)
└── package.json
```

---

## ขั้นตอนที่ 1 — สร้าง Supabase Project (พี่ต้องทำเองตรงนี้)

นลินพาไปได้แค่บอกขั้นตอน แต่การสมัครบัญชี/สร้างโปรเจกต์ต้องให้พี่กดเองนะคะ เพราะเป็นขั้นตอนที่ต้องผูกกับอีเมล/บัญชีของพี่โดยตรง:

1. เข้า https://supabase.com → กด **Start your project** → สมัคร/ล็อกอินด้วยอีเมลหรือ GitHub
2. กด **New Project** ตั้งชื่อโปรเจกต์ เช่น `asset-management` ตั้งรหัสผ่านฐานข้อมูล (เก็บไว้ให้ดี) เลือก Region ใกล้ที่สุด (เช่น Singapore)
3. รอสร้างเสร็จ (~2 นาที) แล้วเข้าไปที่เมนู **SQL Editor** ทางซ้าย
4. กด **New query** แล้ว copy เนื้อหาทั้งหมดจากไฟล์ `database/schema.sql` มาวาง แล้วกด **Run**
   - ถ้ารันสำเร็จ จะเห็นตาราง `buildings, floors, rooms, asset_categories, assets, asset_status_log, borrow_records, profiles` ที่เมนู **Table Editor**
5. ไปที่ **Project Settings > API** → copy ค่า **Project URL** และ **anon public key** เก็บไว้ (ใช้ในขั้นตอนที่ 3)
6. สร้างผู้ใช้เจ้าหน้าที่คนแรก: ไปที่ **Authentication > Users > Add user** กรอกอีเมล/รหัสผ่าน แล้วกด Create — จะได้ role `staff` อัตโนมัติจาก trigger ที่อยู่ใน schema.sql

---

## ขั้นตอนที่ 2 — ติดตั้งโปรเจกต์บนเครื่อง

ต้องมี [Node.js](https://nodejs.org) เวอร์ชัน 18 ขึ้นไป

```bash
cd asset-system
npm install
```

## ขั้นตอนที่ 3 — ตั้งค่า .env

```bash
cp .env.example .env
```

แล้วเปิดไฟล์ `.env` ใส่ค่าที่ copy มาจากขั้นตอนที่ 1.5:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxxxxxxx
```

**ห้าม commit ไฟล์ `.env` ขึ้น git** — ไฟล์ `.gitignore` กันไว้ให้แล้ว

## ขั้นตอนที่ 4 — รันทดสอบ

```bash
npm run dev
```

เปิด `http://localhost:5173` — ถ้าจะทดสอบสแกน QR จากมือถือจริง ให้เข้าผ่าน URL แบบ `http://<IP เครื่องคอม>:5173` (เครื่องคอมกับมือถือต้องอยู่ Wi-Fi วงเดียวกัน) เพราะกล้องบนเว็บต้องใช้ HTTPS หรือ localhost/IP วงในเท่านั้น

## ขั้นตอนที่ 5 — Deploy ขึ้นใช้งานจริง (ฟรี)

1. Push โค้ดขึ้น GitHub repo (ไม่ต้อง push `.env`)
2. เข้า https://vercel.com → **Add New Project** → เลือก repo นี้
3. ที่หน้า Environment Variables ใส่ `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` ตามค่าจริง
4. กด Deploy — Vercel จะให้ HTTPS URL มาอัตโนมัติ (เช่น `asset-mgmt.vercel.app`) ซึ่งจำเป็นสำหรับกล้องสแกน QR บนมือถือ
5. เมื่อพร้อมใช้งานจริง ให้เข้าไปที่หน้า "เพิ่มครุภัณฑ์ใหม่" ของแต่ละชิ้น พิมพ์ QR ที่ได้ไปติดของจริง

---

## จุด Fail-Stop ที่วางไว้ในระบบ

- `supabaseClient.js` — โยน error ทันทีตอนแอปเริ่มทำงานถ้า `.env` ไม่ครบ ไม่ปล่อยให้ query เงียบๆ แล้วพังทีหลัง
- ทุกหน้าที่ดึง/บันทึกข้อมูล (`Dashboard`, `AssetsList`, `AssetForm`, `AssetDetail`, `Locations`, `Categories`) ดัก error จาก Supabase แล้วแสดงข้อความแดงให้เห็นทันที ไม่มีการ retry อัตโนมัติแบบเงียบ
- การเปลี่ยนสถานะครุภัณฑ์ทุกครั้งถูกบันทึกลง `asset_status_log` อัตโนมัติผ่าน database trigger (`log_asset_status_change`) — ต่อให้แก้ผ่าน Supabase Table Editor ตรงๆ ก็ยังถูกบันทึกประวัติ เพราะ trigger อยู่ระดับฐานข้อมูล ไม่ใช่ระดับโค้ด frontend

## ระบบสิทธิ์ (Row Level Security)

- **ใครก็ได้ดูข้อมูลครุภัณฑ์ผ่านสแกน QR โดยไม่ต้องล็อกอิน** (ตั้งใจให้เป็นแบบนี้ เพื่อให้สแกนแล้วเห็นข้อมูลทันที)
- **ต้องล็อกอินก่อนถึงจะเพิ่ม/แก้ไข/ลบข้อมูลได้** — บังคับที่ระดับฐานข้อมูล (RLS policies ใน schema.sql) ไม่ใช่แค่ซ่อนปุ่มในหน้าจอ ต่อให้มีคนพยายามยิง API ตรงก็ยังถูกกันไว้
- ถ้าต้องการแบ่งสิทธิ์ละเอียดกว่านี้ (เช่น staff แก้ได้แต่ต้อง admin ถึงลบได้) ตาราง `profiles` มีคอลัมน์ `role` เตรียมไว้ให้แล้ว แค่ต้องเพิ่ม policy เงื่อนไข role เพิ่มเติม — บอกนลินได้ถ้าต้องการให้ทำส่วนนี้ต่อ

## ข้อควรระวังด้าน Data Privacy

- `borrower_contact` ในตาราง `borrow_records` เป็นข้อมูลส่วนบุคคล ควรเก็บเท่าที่จำเป็นและมีนโยบายลบข้อมูลเก่าตามรอบที่เหมาะสม (PDPA)
- อย่าใส่ Service Role Key ของ Supabase ไว้ใน frontend เด็ดขาด (โค้ดชุดนี้ใช้แค่ anon key ซึ่งถูกจำกัดสิทธิ์ด้วย RLS แล้ว ปลอดภัยสำหรับฝั่ง client)

---

*หมายเหตุจากนลิน: โปรเจกต์นี้ build ผ่านแล้ว (`npm run build` สำเร็จ ไม่มี error) แต่ยังไม่ได้ต่อกับ Supabase จริงเพราะพี่ยังไม่มี project — พอพี่ทำขั้นตอนที่ 1 เสร็จแล้วส่ง URL/key มา นลินช่วยเช็กการเชื่อมต่อให้อีกรอบได้ค่ะ*
