import { describe, it, expect } from 'vitest'
import {
  uid, newPillar, newHook, newVideo, assignVideoColor, deriveQueue, reorderQueue,
} from '../state/contentModel.js'
import { VIDEO_COLORS } from '../constants/index.js'

describe('factories', () => {
  it('uid returns unique strings', () => {
    expect(uid()).not.toBe(uid())
    expect(typeof uid()).toBe('string')
  })

  it('newPillar trims name and keeps colorIdx', () => {
    const p = newPillar('  Vlog ', 3)
    expect(p.name).toBe('Vlog')
    expect(p.colorIdx).toBe(3)
    expect(p.id).toBeTruthy()
  })

  it('newHook defaults to not posted', () => {
    const h = newHook('hook line')
    expect(h).toMatchObject({ text: 'hook line', posted: false })
    expect(h.id).toBeTruthy()
  })

  it('newVideo builds the full shape with defaults', () => {
    const v = newVideo({ idea: ' My Idea ', pillarId: 'p1', status: 'Idea', tagColorIdx: 2 })
    expect(v).toMatchObject({
      idea: 'My Idea', pillarId: 'p1', status: 'Idea',
      refLink: '', script: '', tagColorIdx: 2, hooks: [],
    })
    expect(v.id).toBeTruthy()
  })
})

describe('assignVideoColor', () => {
  it('cycles through VIDEO_COLORS by count', () => {
    expect(assignVideoColor([])).toBe(0)
    expect(assignVideoColor([{}, {}])).toBe(2)
    expect(assignVideoColor(new Array(VIDEO_COLORS.length).fill({}))).toBe(0)
  })
})

describe('deriveQueue', () => {
  const base = {
    pillars: [{ id: 'p1', name: 'A', colorIdx: 0 }],
    videos: [
      { id: 'v1', idea: 'Vid1', pillarId: 'p1', status: 'Edited', tagColorIdx: 0,
        hooks: [{ id: 'h1', text: 'hookA', posted: false }, { id: 'h2', text: 'hookB', posted: true }] },
      { id: 'v2', idea: 'Vid2', pillarId: 'p1', status: 'Idea', tagColorIdx: 1, hooks: [] },
      { id: 'v3', idea: 'Vid3', pillarId: 'p1', status: 'Edited', tagColorIdx: 2, hooks: [] },
    ],
    postingOrder: [],
    filter: 'all',
  }

  it('includes only unposted hooks of Edited videos', () => {
    const q = deriveQueue(base)
    const keys = q.map(e => e.key)
    expect(keys).toContain('h1')      // edited, unposted
    expect(keys).not.toContain('h2')  // posted -> excluded
    expect(keys).not.toContain('v2')  // not edited -> excluded
  })

  it('adds a virtual entry for an Edited video with no hooks', () => {
    const q = deriveQueue(base)
    const virtual = q.find(e => e.key === 'v3')
    expect(virtual).toBeTruthy()
    expect(virtual.hookId).toBeNull()
    expect(virtual.hookText).toBe('Vid3') // falls back to the idea
  })

  it('orders entries by postingOrder, appending unknown keys', () => {
    const q = deriveQueue({ ...base, postingOrder: ['v3', 'h1'] })
    expect(q.map(e => e.key)).toEqual(['v3', 'h1'])
  })

  it('exposes videoIdea, hookText, pillarId, tagColorIdx per entry', () => {
    const e = deriveQueue(base).find(x => x.key === 'h1')
    expect(e).toMatchObject({ videoId: 'v1', hookId: 'h1', videoIdea: 'Vid1', hookText: 'hookA', pillarId: 'p1', tagColorIdx: 0 })
  })
})

describe('reorderQueue', () => {
  it('moves a key to the target position', () => {
    expect(reorderQueue(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a'])
    expect(reorderQueue(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b'])
  })
  it('returns input unchanged when a key is missing', () => {
    expect(reorderQueue(['a', 'b'], 'x', 'a')).toEqual(['a', 'b'])
  })
})
