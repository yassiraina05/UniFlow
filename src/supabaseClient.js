import { createClient } from "@supabase/supabase-js";

// --- REPLACE THESE WITH YOUR OWN SUPABASE CREDENTIALS ---
const SUPABASE_URL = "https://plbwjcwfokhyuknllbqq.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_sDm9aAenHhUfLyDBzHCYpA_YlHiwMLP";
// --------------------------------------------------------

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
