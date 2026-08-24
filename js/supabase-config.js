// --- SUPABASE CONFIG ---
// ใส่ค่าจาก Supabase Project Settings > API ตรงนี้
// (ไฟล์นี้เป็น public frontend config เหมือนไฟล์ .env ของฝั่ง React
//  ค่า anon key ปลอดภัยที่จะฝังไว้ในโค้ด frontend ได้ เพราะถูกจำกัดสิทธิ์ด้วย RLS แล้ว
//  แต่ห้ามใส่ "service_role key" ในไฟล์นี้เด็ดขาด)

const SUPABASE_URL = "https://bhbuhlrftqhuoynxkosy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoYnVobHJmdHFodW95bnhrb3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MjkwNTEsImV4cCI6MjEwMzEwNTA1MX0.yEiUOmJK5SNsYqdj2rkK0flyl1NnxiLNfjrO9VWYK-M";

if (SUPABASE_URL.includes("YOUR-PROJECT-REF")) {
  // fail-stop: เตือนทันทีตั้งแต่หน้าจอโหลด ไม่ปล่อยให้ query เงียบๆ แล้วพังทีหลัง
  alert("[ตั้งค่าไม่ครบ] กรุณาใส่ SUPABASE_URL และ SUPABASE_ANON_KEY ในไฟล์ js/supabase-config.js ก่อนใช้งาน");
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
