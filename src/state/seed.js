import { uid } from './contentModel.js'

// First-run sample data. Two Edited videos with multiple hooks demonstrate the
// posting queue and the same-video color chips.
export function seed() {
  const pillars = [
    { id: 'p1', name: 'DITL', colorIdx: 4 },
    { id: 'p2', name: 'Thoughts', colorIdx: 2 },
    { id: 'p3', name: 'Vlog', colorIdx: 5 },
    { id: 'p4', name: 'Story', colorIdx: 0 },
    { id: 'p5', name: 'Talking Head', colorIdx: 1 },
  ]
  const videos = [
    {
      id: uid(), idea: 'DITL3', pillarId: 'p1', status: 'Edited',
      refLink: '', script: '', tagColorIdx: 0,
      hooks: [
        { id: uid(), text: 'my honest 5am routine', posted: false },
        { id: uid(), text: 'nobody talks about this', posted: false },
      ],
    },
    {
      id: uid(), idea: 'no 20k', pillarId: 'p4', status: 'Edited',
      refLink: '', script: '', tagColorIdx: 1,
      hooks: [
        { id: uid(), text: 'I quit my job at 25', posted: false },
        { id: uid(), text: '$0 in savings', posted: false },
      ],
    },
    { id: uid(), idea: 'KASA intro', pillarId: 'p3', status: 'Idea', refLink: '', script: '', tagColorIdx: 2, hooks: [] },
    { id: uid(), idea: 'life comes in waves', pillarId: 'p4', status: 'Scripted', refLink: '', script: '', tagColorIdx: 3, hooks: [] },
    { id: uid(), idea: 'Cleaning Desk', pillarId: 'p1', status: 'Posted', refLink: '', script: '', tagColorIdx: 4, hooks: [] },
  ]
  return { pillars, videos, postingOrder: [], filter: 'all' }
}
