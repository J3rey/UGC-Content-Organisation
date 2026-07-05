import { useEffect, useState } from 'react'
import { supabase, LOCAL_LOGIN_PASSWORD } from '../state/supabase.js'
import { load, save } from '../state/storage.js'
import { seed } from '../state/seed.js'

const DEFAULT_STATE = seed()
const LOCK_KEY = 'content-dashboard-locked'

export function useAppState() {
  const [state, setState] = useState(() => {
    const local = load()
    return local || DEFAULT_STATE
  })
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [locked, setLocked] = useState(() => localStorage.getItem(LOCK_KEY) !== 'unlocked')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      save(state)
      return
    }
    const saveRemote = async () => {
      const { error: upsertError } = await supabase
        .from('dashboard_snapshots')
        .upsert({ source_key: `user:${session.user.id}`, payload: state }, { onConflict: 'source_key' })
      if (upsertError) setError(upsertError.message)
    }
    saveRemote()
  }, [state, session])

  useEffect(() => {
    if (!supabase || !session?.user?.id) return
    const loadRemote = async () => {
      const { data, error: fetchError } = await supabase
        .from('dashboard_snapshots')
        .select('payload')
        .eq('source_key', `user:${session.user.id}`)
        .maybeSingle()
      if (fetchError) {
        setError(fetchError.message)
        return
      }
      if (data?.payload) setState(data.payload)
      else setState(DEFAULT_STATE)
    }
    loadRemote()
  }, [session?.user?.id])

  async function signIn(email, password) {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) throw authError
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  async function unlock(password) {
    if (password === LOCAL_LOGIN_PASSWORD) {
      localStorage.setItem(LOCK_KEY, 'unlocked')
      setLocked(false)
      setUnlockError('')
      return
    }
    setUnlockError('Wrong password')
  }

  return { state, setState, session, loading, error, signIn, signOut, hasSupabase: Boolean(supabase), locked, unlock, unlockError }
}
