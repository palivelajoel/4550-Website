import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Lightweight shared client for browser-side auth and simple queries
export default createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
