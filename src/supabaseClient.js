import { createClient } from "@supabase/supabase-js";

const envUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_SUPABASE_URL) ||
  "https://bhbuhlrftqhuoynxkosy.supabase.co";

const envKey =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== "undefined" && process.env?.VITE_SUPABASE_ANON_KEY) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoYnVobHJmdHFodW95bnhrb3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MjkwNTEsImV4cCI6MjEwMzEwNTA1MX0.yEiUOmJK5SNsYqdj2rkK0flyl1NnxiLNfjrO9VWYK-M";

export const isConfigured = Boolean(
  envUrl &&
  envKey &&
  !envUrl.includes("YOUR-PROJECT-REF") &&
  !envKey.includes("YOUR-ANON-PUBLIC-KEY")
);

const supabaseUrl = isConfigured ? envUrl : "https://placeholder-project.supabase.co";
const supabaseAnonKey = isConfigured ? envKey : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
