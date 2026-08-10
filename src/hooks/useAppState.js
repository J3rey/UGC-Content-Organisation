import { useEffect, useRef, useState } from 'react'
import {
  supabase, SUPABASE_URL, SUPABASE_ANON_KEY, LOCAL_LOGIN_USERNAME, LOCAL_LOGIN_PASSWORD,
} from '../state/supabase.js'
import { load, save } from '../state/storage.js'
import { seed } from '../state/seed.js'

const DEFAULT_STATE = seed()
const SIGNED_IN_KEY = 'content-dashboard-signed-in'
// One shared cloud row for the local admin login (no per-user Supabase accounts).
const SNAPSHOT_KEY = `local:${LOCAL_LOGIN_USERNAME}`
// Typing fires a state change per keystroke; wait for a pause before writing.
const SAVE_DEBOUNCE_MS = 600

export function useAppState() {
  const [state, setState] = useState(() => load() || DEFAULT_STATE)
  const [signedIn, setSignedIn] = useState(() => localStorage.getItem(SIGNED_IN_KEY) === 'yes')
  const [error, setError] = useState('')

  // Guards the save path from clobbering the cloud with stale local data before
  // this session's cloud read has completed successfully.
  const hydratedRef = useRef(false)
  // Newest state, readable from async code without stale closures.
  const latestRef = useRef(state)
  // Last snapshot the cloud is known to hold, compared by reference.
  const savedRef = useRef(null)
  // Only one write may be in flight: concurrent upserts can commit out of
  // order, which is how newer edits used to get overwritten by older ones.
  const writingRef = useRef(false)

  // Writes the newest state, then re-checks — so edits made during a write are
  // never dropped, and the last write always carries the newest snapshot.
  async function flushToCloud() {
    if (!hydratedRef.current || writingRef.current) return
    writingRef.current = true
    try {
      while (latestRef.current !== savedRef.current) {
        const snapshot = latestRef.current
        const { error: upsertError } = await supabase
          .from('dashboard_snapshots')
          .upsert({ source_key: SNAPSHOT_KEY, payload: snapshot }, { onConflict: 'source_key' })
        if (upsertError) {
          setError(upsertError.message)
          return
        }
        savedRef.current = snapshot
        setError('')
      }
    } finally {
      writingRef.current = false
    }
  }

  // When signed in, pull the shared cloud snapshot (once, on sign-in / mount).
  useEffect(() => {
    if (!signedIn || !supabase) {
      hydratedRef.current = true
      savedRef.current = null
      return
    }
    hydratedRef.current = false
    let cancelled = false
    const before = latestRef.current
    ;(async () => {
      const { data, error: fetchError } = await supabase
        .from('dashboard_snapshots')
        .select('payload')
        .eq('source_key', SNAPSHOT_KEY)
        .maybeSingle()
      if (cancelled) return
      if (fetchError) {
        // Stay un-hydrated: writing now would push this device's stale snapshot
        // over whatever the cloud actually holds. Edits still save locally.
        setError(`could not load cloud data, saving to this device only — ${fetchError.message}`)
        return
      }
      if (data?.payload) {
        savedRef.current = data.payload
        // Don't discard edits made while the read was in flight.
        if (latestRef.current === before) setState(data.payload)
      }
      hydratedRef.current = true
      // No row yet, or local edits raced the read: push what's on screen up.
      flushToCloud()
    })()
    return () => { cancelled = true }
  }, [signedIn])

  // Persist on every change. localStorage is always mirrored so there is a
  // local copy to fall back on when the cloud is unreachable.
  useEffect(() => {
    latestRef.current = state
    save(state)
    if (!signedIn || !supabase || !hydratedRef.current) return
    const timer = setTimeout(flushToCloud, SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [state, signedIn])

  // A debounced or in-flight save dies with the page. `keepalive` lets one last
  // write outlive the tab, so closing right after an edit doesn't lose it.
  useEffect(() => {
    if (!signedIn || !supabase) return
    function onPageHide() {
      if (!hydratedRef.current || latestRef.current === savedRef.current) return
      fetch(`${SUPABASE_URL}/rest/v1/dashboard_snapshots?on_conflict=source_key`, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({ source_key: SNAPSHOT_KEY, payload: latestRef.current }),
      }).catch(() => {})
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [signedIn])

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
    savedRef.current = null
    setSignedIn(false)
  }

  return { state, setState, signedIn, signIn, signOut, error, hasSupabase: Boolean(supabase) }
}
