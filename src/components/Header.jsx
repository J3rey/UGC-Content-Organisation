import { PILLAR_COLORS } from '../constants/index.js'

export default function Header({
  view, setView, pillars, filter, setFilter,
  onManagePillars, onExport, onImport,
}) {
  return (
    <header className="app-header">
      <div className="brand">CONTENT</div>

      <div className="view-toggle">
        <button className={'toggle-btn' + (view === 'ideas' ? ' active' : '')} onClick={() => setView('ideas')}>ideas</button>
        <button className={'toggle-btn' + (view === 'queue' ? ' active' : '')} onClick={() => setView('queue')}>queue</button>
      </div>

      {view === 'ideas' && (
        <div className="filters">
          <button className={'chip' + (filter === 'all' ? ' active' : '')} onClick={() => setFilter('all')}>all</button>
          {pillars.map(p => {
            const c = PILLAR_COLORS[p.colorIdx] || PILLAR_COLORS[0]
            return (
              <button
                key={p.id}
                className={'chip' + (filter === p.id ? ' active' : '')}
                style={{ background: c.bg, color: c.text }}
                onClick={() => setFilter(p.id)}
              >
                {p.name}
              </button>
            )
          })}
        </div>
      )}

      <div className="header-actions">
        <button className="btn" onClick={onManagePillars}>pillars</button>
        <button className="btn" onClick={onExport}>export</button>
        <label className="btn file-btn">
          import
          <input
            type="file"
            accept="application/json"
            onChange={e => { if (e.target.files[0]) onImport(e.target.files[0]); e.target.value = '' }}
          />
        </label>
      </div>
    </header>
  )
}
