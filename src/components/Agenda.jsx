import { useEffect, useMemo, useState } from 'react'
import { EVENT_TYPE_MAP } from '../constants.js'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export default function Agenda({ loadMonth, version, outlook, onOpenEvent, onNewEvent }) {
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [monthEvents, setMonthEvents] = useState([])
  const [loadErr, setLoadErr] = useState('')
  const todayISO = iso(today)

  const cells = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const first = new Date(year, month, 1)
    const startDay = (first.getDay() + 6) % 7
    return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - startDay + i))
  }, [cursor])

  useEffect(() => {
    let cancelled = false
    const start = `${iso(cells[0])}T00:00:00`
    const endDate = new Date(cells[41])
    endDate.setDate(endDate.getDate() + 1)
    const end = `${iso(endDate)}T00:00:00`
    setLoadErr('')
    Promise.resolve(loadMonth(start, end))
      .then((evts) => {
        if (!cancelled) setMonthEvents(evts || [])
      })
      .catch((e) => {
        if (!cancelled) {
          setMonthEvents([])
          setLoadErr(e.message || 'Erreur de chargement.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [cells, version, outlook.connected, loadMonth])

  const byDate = useMemo(() => {
    const map = {}
    for (const e of monthEvents) {
      if (!e.date) continue
      ;(map[e.date] || (map[e.date] = [])).push(e)
    }
    for (const k in map) map[k].sort((a, b) => (a.heureDebut || '').localeCompare(b.heureDebut || ''))
    return map
  }, [monthEvents])

  const shift = (n) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1))

  return (
    <div className="agenda">
      <OutlookBar outlook={outlook} />

      <div className="agenda__bar">
        <div className="agenda__nav">
          <button className="btn btn--ghost" onClick={() => shift(-1)}>‹</button>
          <button
            className="btn btn--ghost"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
          >
            Aujourd'hui
          </button>
          <button className="btn btn--ghost" onClick={() => shift(1)}>›</button>
          <h2 className="agenda__month">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </h2>
        </div>
        <button className="btn btn--primary" onClick={() => onNewEvent(todayISO)}>
          + Nouvelle rencontre
        </button>
      </div>

      {loadErr && <div className="banner banner--error">{loadErr}</div>}

      <div className="cal">
        <div className="cal__weekdays">
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal__weekday">{w}</div>
          ))}
        </div>
        <div className="cal__grid">
          {cells.map((d, i) => {
            const key = iso(d)
            const inMonth = d.getMonth() === cursor.getMonth()
            const isToday = key === todayISO
            const list = byDate[key] || []
            return (
              <div
                key={i}
                className={`cal__cell ${inMonth ? '' : 'cal__cell--out'} ${isToday ? 'cal__cell--today' : ''}`}
                onClick={() => onNewEvent(key)}
              >
                <span className="cal__daynum">{d.getDate()}</span>
                <div className="cal__events">
                  {list.slice(0, 4).map((e) => (
                    <button
                      key={e.id}
                      className="cal__event"
                      style={{
                        background:
                          EVENT_TYPE_MAP[e.type] ||
                          (e.source === 'outlook' ? '#0f6cbd' : '#6b6156'),
                      }}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        onOpenEvent(e)
                      }}
                      title={`${e.heureDebut || ''} ${e.titre}`}
                    >
                      {e.heureDebut && <b>{e.heureDebut}</b>} {e.titre || 'Sans titre'}
                    </button>
                  ))}
                  {list.length > 4 && (
                    <span className="cal__more">+{list.length - 4} autres</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function OutlookBar({ outlook }) {
  if (outlook.connected) {
    return (
      <div className="ol-bar ol-bar--on">
        <span>🟢 Connecté à Outlook{outlook.email ? ` : ${outlook.email}` : ''}</span>
        <a className="ol-link" href="/auth/logout">Déconnecter</a>
      </div>
    )
  }
  if (outlook.configured) {
    return (
      <div className="ol-bar">
        <span>Ton agenda n'est pas encore relié à Outlook.</span>
        <a className="btn btn--outlook" href="/auth/login">Se connecter à Outlook</a>
      </div>
    )
  }
  return (
    <div className="ol-bar ol-bar--muted">
      <span>
        Mode hors ligne. Pour relier ton agenda à Outlook, ajoute ton Client ID
        Microsoft dans <code>crm/data/config.json</code> (voir le README).
      </span>
    </div>
  )
}
