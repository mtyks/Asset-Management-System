import { createClient } from "@supabase/supabase-js";

// ค่าทั้งหมดมาจากไฟล์ .env (ดู .env.example) — ห้าม hardcode key ในโค้ดนี้เด็ดขาด
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail-stop: แจ้งทันทีถ้า config ไม่ครบ แทนที่จะปล่อยให้แอปพังแบบเงียบๆ ตอน query
  throw new Error(
    "[Config Error] ไม่พบ VITE_SUPABASE_URL หรือ VITE_SUPABASE_ANON_KEY กรุณาตั้งค่าในไฟล์ .env (ดูตัวอย่างใน .env.example)"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
