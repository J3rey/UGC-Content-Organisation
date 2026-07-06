import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Supabase is optional: the app runs on localStorage until these env vars are
// set (locally in .env, or in the Vercel project settings), at which point
// signing in syncs data to a shared cloud row instead.
export const supabase = url && anonKey ? createClient(url, anonKey) : null

// Simple local login gate (not a Supabase account — no email involved).
// Override via env vars if you like; defaults are admin / Potato01.
export const LOCAL_LOGIN_USERNAME = import.meta.env.VITE_LOCAL_LOGIN_USERNAME || 'admin'
export const LOCAL_LOGIN_PASSWORD = import.meta.env.VITE_LOCAL_LOGIN_PASSWORD || 'Potato01'
