import { createClient } from "@supabase/supabase-js";

// Use Vite environment variables with hardcoded fallbacks for immediate preview functionality
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://plbwjcwfokhyuknllbqq.supabase.co";
const SUPABASE_PUBLIC_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_sDm9aAenHhUfLyDBzHCYpA_YlHiwMLP";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
