import { useEffect, useState } from 'react'
import { supabase } from '../state/supabase.js'
import { load, save } from '../state/storage.js'
import { seed } from '../state/seed.js'

const DEFAULT_STATE = seed()

export function useAppState() {
  const [state, setState] = useState(() => {
    const local = load()
    return local || DEFAULT_STATE
  })
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')

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
      // First sign-in with no cloud snapshot yet: keep whatever is on screen so
      // the save effect seeds the cloud from it, rather than wiping to defaults.
      if (data?.payload) setState(data.payload)
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

  return { state, setState, session, loading, error, signIn, signOut, hasSupabase: Boolean(supabase) }
}
