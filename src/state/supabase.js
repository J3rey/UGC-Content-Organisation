import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Supabase is optional: the app runs on localStorage until these env vars are
// set (locally in .env, or in the Vercel project settings), at which point
// signing in syncs data to a shared cloud row instead.
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

// Simple local login gate (not a Supabase account — no email involved).
// Override via env vars if you like; defaults are admin / Potato01.
export const LOCAL_LOGIN_USERNAME = import.meta.env.VITE_LOCAL_LOGIN_USERNAME || 'admin'
export const LOCAL_LOGIN_PASSWORD = import.meta.env.VITE_LOCAL_LOGIN_PASSWORD || 'Potato01'
