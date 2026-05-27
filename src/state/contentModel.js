import { VIDEO_COLORS } from '../constants/index.js'

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function newPillar(name, colorIdx) {
  return { id: uid(), name: String(name).trim(), colorIdx }
}

export function newHook(text = '') {
  return { id: uid(), text: String(text), posted: false }
}

export function newVideo({ idea, pillarId, status = 'Idea', tagColorIdx = 0 }) {
  return {
    id: uid(),
    idea: String(idea).trim(),
    pillarId,
    status,
    refLink: '',
    script: '',
    tagColorIdx,
    hooks: [],
  }
}

export function assignVideoColor(videos) {
  return videos.length % VIDEO_COLORS.length
}

function makeEntry(video, hook) {
  return {
    key: hook ? hook.id : video.id,
    videoId: video.id,
    hookId: hook ? hook.id : null,
    videoIdea: video.idea,
    hookText: hook ? hook.text : video.idea,
    pillarId: video.pillarId,
    tagColorIdx: video.tagColorIdx,
  }
}

// Build the ordered posting-queue entries from state.
// Includes unposted hooks of Edited videos; a hookless Edited video yields one
// virtual entry keyed by the video id. Ordered by state.postingOrder; entries
// not present there are appended in natural (video/hook) order.
export function deriveQueue(state) {
  const entries = []
  for (const v of state.videos) {
    if (v.status !== 'Edited') continue
    if (!v.hooks || v.hooks.length === 0) {
      entries.push(makeEntry(v, null))
    } else {
      for (const h of v.hooks) {
        if (!h.posted) entries.push(makeEntry(v, h))
      }
    }
  }
  const order = state.postingOrder || []
  const pos = new Map(order.map((k, i) => [k, i]))
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const ai = pos.has(a.e.key) ? pos.get(a.e.key) : Infinity
      const bi = pos.has(b.e.key) ? pos.get(b.e.key) : Infinity
      if (ai !== bi) return ai - bi
      return a.i - b.i
    })
    .map(({ e }) => e)
}

// Move `fromKey` to the index of `toKey`, returning a new key array.
export function reorderQueue(keys, fromKey, toKey) {
  const arr = [...keys]
  const from = arr.indexOf(fromKey)
  const to = arr.indexOf(toKey)
  if (from === -1 || to === -1) return arr
  arr.splice(to, 0, arr.splice(from, 1)[0])
  return arr
}
