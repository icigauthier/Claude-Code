import { useMemo } from 'react'
import { STAGES } from '../constants.js'
import { isFollowUpDue } from '../format.js'

export default function Performance({ clients }) {
  const stats = useMemo(() => {
    const counts = Object.fromEntries(STAGES.map((s) => [s.key, 0]))
    for (const c of clients) {
      counts[c.statut] = (counts[c.statut] || 0) + 1
    }
    const total = clients.length
    const finance = counts.finance || 0
    const perdu = counts.perdu || 0
    const closed = finance + perdu
    const conversion = closed > 0 ? Math.round((finance / closed) * 100) : 0
    const due = clients.filter(isFollowUpDue).length
    const active = total - finance - perdu
    return { counts, total, finance, conversion, due, active }
  }, [clients])

  const maxCount = Math.max(1, ...STAGES.map((s) => stats.counts[s.key] || 0))

  return (
    <div className="perf">
      <div className="kpi-grid">
        <Kpi label="Dossiers actifs" value={stats.active} strong />
        <Kpi label="Dossiers financés" value={stats.finance} />
        <Kpi label="Taux de conversion" value={`${stats.conversion} %`} hint="financés / (financés + perdus)" />
        <Kpi label="Total contacts" value={stats.total} />
        <Kpi label="Suivis à faire" value={stats.due} accent={stats.due > 0} />
      </div>

      <div className="perf-card">
        <h3>Répartition du pipeline</h3>
        <div className="bars">
          {STAGES.map((s) => {
            const n = stats.counts[s.key] || 0
            return (
              <div className="bar-row" key={s.key}>
                <span className="bar-label">{s.label}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(n / maxCount) * 100}%`,
                      background: s.color,
                      minWidth: n > 0 ? '2.2rem' : '0',
                    }}
                  >
                    {n > 0 && <span className="bar-value">{n}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, hint, strong, accent }) {
  return (
    <div className={`kpi ${strong ? 'kpi--strong' : ''} ${accent ? 'kpi--accent' : ''}`}>
      <div className="kpi__value">{value}</div>
      <div className="kpi__label">{label}</div>
      {hint && <div className="kpi__hint">{hint}</div>}
    </div>
  )
}
