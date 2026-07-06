import { useEffect, useRef, useState } from 'react'
import { supabase, LOCAL_LOGIN_USERNAME, LOCAL_LOGIN_PASSWORD } from '../state/supabase.js'
import { load, save } from '../state/storage.js'
import { seed } from '../state/seed.js'

const DEFAULT_STATE = seed()
const SIGNED_IN_KEY = 'content-dashboard-signed-in'
// One shared cloud row for the local admin login (no per-user Supabase accounts).
const SNAPSHOT_KEY = `local:${LOCAL_LOGIN_USERNAME}`

export function useAppState() {
  const [state, setState] = useState(() => load() || DEFAULT_STATE)
  const [signedIn, setSignedIn] = useState(() => localStorage.getItem(SIGNED_IN_KEY) === 'yes')
  const [error, setError] = useState('')
  // Guards the save effect from clobbering the cloud with stale local data
  // before the initial cloud load for this session has completed.
  const hydratedRef = useRef(false)

  // When signed in, pull the shared cloud snapshot (once, on sign-in / mount).
  useEffect(() => {
    if (!signedIn || !supabase) {
      hydratedRef.current = true
      return
    }
    hydratedRef.current = false
    let cancelled = false
    ;(async () => {
      const { data, error: fetchError } = await supabase
        .from('dashboard_snapshots')
        .select('payload')
        .eq('source_key', SNAPSHOT_KEY)
        .maybeSingle()
      if (cancelled) return
      if (fetchError) {
        setError(fetchError.message)
      } else if (data?.payload) {
        setState(data.payload)
      } else {
        // No cloud snapshot yet — seed it from whatever is currently on screen.
        const { error: seedError } = await supabase
          .from('dashboard_snapshots')
          .upsert({ source_key: SNAPSHOT_KEY, payload: state }, { onConflict: 'source_key' })
        if (seedError) setError(seedError.message)
      }
      hydratedRef.current = true
    })()
    return () => { cancelled = true }
  }, [signedIn])

  // Persist on every change: cloud when signed in, localStorage otherwise.
  useEffect(() => {
    if (signedIn && supabase) {
      if (!hydratedRef.current) return
      ;(async () => {
        const { error: upsertError } = await supabase
          .from('dashboard_snapshots')
          .upsert({ source_key: SNAPSHOT_KEY, payload: state }, { onConflict: 'source_key' })
        if (upsertError) setError(upsertError.message)
      })()
    } else {
      save(state)
    }
  }, [state, signedIn])

  function signIn(username, password) {
    if (username === LOCAL_LOGIN_USERNAME && password === LOCAL_LOGIN_PASSWORD) {
      localStorage.setItem(SIGNED_IN_KEY, 'yes')
      setError('')
      setSignedIn(true)
      return
    }
    throw new Error('Wrong username or password')
  }

  function signOut() {
    localStorage.removeItem(SIGNED_IN_KEY)
    hydratedRef.current = false
    setSignedIn(false)
  }

  return { state, setState, signedIn, signIn, signOut, error, hasSupabase: Boolean(supabase) }
}
