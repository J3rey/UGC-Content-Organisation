import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const localPassword = import.meta.env.VITE_LOCAL_LOGIN_PASSWORD || 'Potato01'

export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const LOCAL_LOGIN_PASSWORD = localPassword
