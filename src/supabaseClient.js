import { createClient } from "@supabase/supabase-js";

const envUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_SUPABASE_URL) ||
  "https://uestpasdphjmmqpbuzrb.supabase.co";

const envKey =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== "undefined" && process.env?.VITE_SUPABASE_ANON_KEY) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlc3RwYXNkcGhqbW1xcGJ1enJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjcyMjksImV4cCI6MjEwMzgwMzIyOX0.BMSGsQsLQsnNBoqsqbE0-TnI0dDPgYk3QQAkpeXBrYU";

export const isConfigured = Boolean(
  envUrl &&
  envKey &&
  !envUrl.includes("YOUR-PROJECT-REF") &&
  !envKey.includes("YOUR-ANON-PUBLIC-KEY")
);

const supabaseUrl = isConfigured ? envUrl : "https://placeholder-project.supabase.co";
const supabaseAnonKey = isConfigured ? envKey : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
