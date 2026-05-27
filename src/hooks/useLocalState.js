import { useState, useEffect } from 'react'
import { load, save } from '../state/storage.js'
import { seed } from '../state/seed.js'

export function useLocalState() {
  const [state, setState] = useState(() => load() || seed())

  useEffect(() => {
    save(state)
  }, [state])

  return [state, setState]
}
