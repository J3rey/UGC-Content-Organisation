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
  // That row's updated_at — the compare-and-set token that stops this tab from
  // overwriting a newer save made by another tab or device.
  const savedAtRef = useRef(null)
  // Only one write may be in flight: concurrent upserts can commit out of
  // order, which is how newer edits used to get overwritten by older ones.
  const writingRef = useRef(false)

  // Stops all further cloud writes: someone else has saved over the row this
  // tab loaded, so anything we write from here would delete their work.
  function stopOnConflict() {
    hydratedRef.current = false
    setError('another tab or device saved newer data — reload the page to catch up (edits here are staying on this device)')
  }

  // Writes the newest state, then re-checks — so edits made during a write are
  // never dropped, and the last write always carries the newest snapshot.
  async function flushToCloud() {
    if (!hydratedRef.current || writingRef.current) return
    writingRef.current = true
    try {
      while (latestRef.current !== savedRef.current) {
        const snapshot = latestRef.current
        const stamp = new Date().toISOString()
        if (savedAtRef.current === null) {
          // No row yet. A duplicate-key error means another tab just made one.
          const { error: insertError } = await supabase
            .from('dashboard_snapshots')
            .insert({ source_key: SNAPSHOT_KEY, payload: snapshot, updated_at: stamp })
          if (insertError) {
            if (insertError.code === '23505') stopOnConflict()
            else setError(insertError.message)
            return
          }
        } else {
          // Only overwrite the exact row version this tab last saw.
          const { data, error: updateError } = await supabase
            .from('dashboard_snapshots')
            .update({ payload: snapshot, updated_at: stamp })
            .eq('source_key', SNAPSHOT_KEY)
            .eq('updated_at', savedAtRef.current)
            .select('source_key')
            .maybeSingle()
          if (updateError) {
            setError(updateError.message)
            return
          }
          if (!data) {
            stopOnConflict()
            return
          }
        }
        savedRef.current = snapshot
        savedAtRef.current = stamp
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
      savedAtRef.current = null
      return
    }
    hydratedRef.current = false
    let cancelled = false
    const before = latestRef.current
    ;(async () => {
      const { data, error: fetchError } = await supabase
        .from('dashboard_snapshots')
        .select('payload, updated_at')
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
        savedAtRef.current = data.updated_at
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
      // Without a known row version there is nothing safe to overwrite.
      if (!hydratedRef.current || !savedAtRef.current) return
      if (latestRef.current === savedRef.current) return
      const query = `source_key=eq.${encodeURIComponent(SNAPSHOT_KEY)}`
        + `&updated_at=eq.${encodeURIComponent(savedAtRef.current)}`
      fetch(`${SUPABASE_URL}/rest/v1/dashboard_snapshots?${query}`, {
        method: 'PATCH',
        keepalive: true,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ payload: latestRef.current, updated_at: new Date().toISOString() }),
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
    savedAtRef.current = null
    setSignedIn(false)
  }

  return { state, setState, signedIn, signIn, signOut, error, hasSupabase: Boolean(supabase) }
}
