import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Supabase is optional: the app runs on localStorage until these env vars are
// set (locally in .env, or in the Vercel project settings), at which point the
// top-right sign-in becomes functional and signed-in data syncs to the cloud.
export const supabase = url && anonKey ? createClient(url, anonKey) : null
