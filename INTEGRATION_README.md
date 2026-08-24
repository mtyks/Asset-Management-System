# คู่มือเชื่อม Frontend ของทีมกับ Supabase Backend

Frontend ตัวนี้คัดลอกมาจาก `petchtany/AssetManagementSystem` แล้วนลินแก้ให้เชื่อมกับ
Supabase (PostgreSQL) จริงแทน localStorage เดิม โดย **คงหน้าตา/ฟังก์ชันเดิมของทีมไว้เกือบทั้งหมด**

## สิ่งที่เปลี่ยน (สรุปสั้นๆ)

| ไฟล์ | เปลี่ยนอะไร |
|---|---|
| `js/data.js` | เขียนใหม่ทั้งไฟล์ — จาก localStorage เป็น Supabase แต่ตัวแปร/ฟังก์ชันชื่อเดิมหมด (`categories`, `locations`, `assets`, `transfers`, `maintenance`, `loadX()`, `saveX()`) |
| `js/supabase-config.js` | ไฟล์ใหม่ — ใส่ URL/anon key ของ Supabase ตรงนี้ |
| `js/assets.js`, `js/categories.js`, `js/maintenance.js`, `js/transfers.js`, `js/dashboard.js` | แก้แค่บรรทัดสุดท้าย (`DOMContentLoaded`) ให้ `await bootstrapData()` ก่อนเริ่มหน้า — โค้ดส่วนอื่นทั้งหมด **ไม่ได้แตะเลย** |
| `locations.html`, `js/locations.js` | เขียนใหม่ทั้งคู่ — จากหน้าจัดการ "สถานที่" แบบตารางเดียว เป็น 3 แท็บ: อาคาร / ชั้น / ห้อง ตามที่ตกลงกับพี่ว่าจะเก็บโครงสร้าง 3 ระดับ |
| ทุก `.html` | เพิ่ม `<script>` โหลด Supabase JS (CDN) และ `js/supabase-config.js` |
| `database/schema_v2.sql` | Schema ใหม่ทั้งชุด ออกแบบให้ตรงกับฟิลด์ที่ frontend ทีมใช้จริง (ดูหัวข้อถัดไป) |

## ทำไม assets.js / categories.js / maintenance.js / transfers.js ถึงแทบไม่ต้องแก้

โค้ดเดิมของทีมมี pattern ชัดเจนมาก: มัยแก้ array ในหน่วยความจำ (`assets.push(...)`, `assets.filter(...)`)
แล้วเรียก `saveAssets(assets)` ทุกครั้ง — นลินใช้ pattern เดิมนี้เป๊ะ แค่เปลี่ยนสิ่งที่อยู่**ข้างใน**
`saveAssets()` จาก "เขียน localStorage" เป็น "เทียบกับข้อมูลล่าสุดที่ sync ไปแล้ว (diff) แล้วส่งเฉพาะ
ส่วนต่างขึ้น Supabase (insert/update/delete)" — หน้าตาการเรียกใช้จากภายนอกเหมือนเดิมทุกจุด

## ⚠️ จุดที่นลินอยากย้ำกับพี่และทีม (สำคัญ)

1. **ยังไม่มีระบบ login** — RLS ใน `schema_v2.sql` เปิดให้ทุกคนที่มีลิงก์เว็บอ่าน/แก้ไขข้อมูลได้หมด
   เพราะ frontend เดิมของทีมไม่มีหน้า login เลย ถ้าจะเพิ่มความปลอดภัย บอกนลินได้ จะช่วยเพิ่ม
   Supabase Auth + หน้า login แล้วรัดกุม policy ให้

2. **`location` ของครุภัณฑ์อ้างอิงด้วย "ชื่อห้อง" (string) ไม่ใช่ id** — เพื่อให้เข้ากับโค้ดเดิมของทีม
   ที่ใช้ชื่อห้องเป็นตัวอ้างอิงอยู่แล้ว ข้อจำกัด: ถ้าสองห้องคนละตึกดันตั้งชื่อซ้ำกันเป๊ะ อาจสับสนได้
   ตอนนี้ยังไม่เจอปัญหานี้เพราะข้อมูลตัวอย่างชื่อไม่ซ้ำกัน แต่ถ้าทีมจะเพิ่มห้องเยอะๆ ควรตั้งชื่อห้อง
   ให้ไม่ซ้ำกันทั้งระบบไว้ก่อน

3. **`saveX()` เป็นแบบ diff-sync** — เทียบข้อมูลตอนโหลดกับตอนบันทึก แล้วส่งเฉพาะส่วนต่าง ไม่ใช่เขียน
   ทับทั้งตารางทุกครั้ง (ปลอดภัยกว่า และเร็วกว่า) แต่ต้อง `await bootstrapData()` ให้เสร็จก่อนเสมอ
   ถึงจะเริ่มมี "snapshot" ให้เทียบได้ถูกต้อง — อย่าลบส่วน `await bootstrapData()` ที่ท้ายไฟล์แต่ละหน้า

## วิธีตั้งค่า

1. สร้าง Supabase Project (ใหม่ แนะนำให้แยกจาก project เดิมที่เคยรัน `schema.sql` เวอร์ชันแรก
   เพราะโครงสร้างตารางเปลี่ยนไปมาก)
2. รัน `database/schema_v2.sql` ทั้งไฟล์ใน Supabase SQL Editor
3. เปิด `js/supabase-config.js` ใส่ `SUPABASE_URL` และ `SUPABASE_ANON_KEY` จาก Project Settings > API
4. เปิด `index.html` ผ่าน local server (ห้ามเปิดแบบ `file://` ตรงๆ เพราะบาง browser บล็อก
   cross-origin request) เช่น รัน `npx serve .` หรือใช้ VS Code extension "Live Server"
5. Deploy ขึ้น Vercel/Netlify ได้เลยเพราะเป็น static HTML/CSS/JS ล้วนๆ ไม่ต้อง build

## โครงสร้างตารางใหม่ (schema_v2.sql)

buildings → floors → rooms → assets (category_id, room_id)
assets → transfers (ย้าย/ยืม/คืน), assets → maintenance (ใบแจ้งซ่อม)

ดูรายละเอียดคอลัมน์ทั้งหมดในไฟล์ `database/schema_v2.sql` มีคอมเมนต์กำกับไว้ทุกจุด
