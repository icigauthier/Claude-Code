import { useEffect, useState } from 'react'
import { EVENT_TYPE_MAP } from '../constants.js'
import { fmtDate, todayISO } from '../format.js'

export default function Todo({
  todos,
  onAdd,
  onToggle,
  onDelete,
  loadUpcoming,
  version,
  partners,
  onContact,
}) {
  const [text, setText] = useState('')
  const [upcoming, setUpcoming] = useState([])

  useEffect(() => {
    let cancel = false
    Promise.resolve(loadUpcoming())
      .then((evts) => {
        if (!cancel)
          setUpcoming(
            (evts || [])
              .slice()
              .sort((a, b) =>
                (a.date + (a.heureDebut || '')).localeCompare(b.date + (b.heureDebut || '')),
              ),
          )
      })
      .catch(() => !cancel && setUpcoming([]))
    return () => {
      cancel = true
    }
  }, [loadUpcoming, version])

  const today = todayISO()
  const partnerById = Object.fromEntries((partners || []).map((p) => [p.id, p]))

  // Tâches en cours, triées par date d'échéance (les plus proches d'abord ;
  // celles sans date à la fin).
  const active = todos
    .filter((t) => !t.done)
    .slice()
    .sort((a, b) => (a.due || '9999-99-99').localeCompare(b.due || '9999-99-99'))
  const done = todos.filter((t) => t.done)

  function add(e) {
    e.preventDefault()
    const v = text.trim()
    if (!v) return
    onAdd(v)
    setText('')
  }

  function renderTask(t) {
    const overdue = t.due && t.due <= today
    const partner =
      t.kind === 'relance-partenaire' && t.partnerId ? partnerById[t.partnerId] : null
    return (
      <li key={t.id} className="todo__item" style={{ flexWrap: 'wrap', gap: 8 }}>
        <input type="checkbox" checked={!!t.done} onChange={() => onToggle(t)} />
        <span className="todo__text">
          {t.text}
          {t.due && (
            <small style={{ marginLeft: 6, color: overdue ? 'var(--neg)' : 'var(--ink-3)' }}>
              · {fmtDate(t.due)}
            </small>
          )}
        </span>
        {partner && !t.done && (
          <span style={{ display: 'flex', gap: 6 }}>
            {partner.telephone && (
              <a className="btn btn--ghost" href={`tel:${partner.telephone}`} title="Appeler">📞</a>
            )}
            {partner.telephone && (
              <a className="btn btn--ghost" href={`sms:${partner.telephone}`} title="Texter">💬</a>
            )}
            <button className="btn btn--ghost" onClick={() => onContact(partner)} title="Relance faite / replanifier">
              Contact fait
            </button>
          </span>
        )}
        <button className="todo__del" onClick={() => onDelete(t.id)} aria-label="Supprimer">✕</button>
      </li>
    )
  }

  return (
    <div className="todo">
      <div className="todo__col">
        <h3>Mes tâches</h3>
        <form className="todo__add" onSubmit={add}>
          <input
            placeholder="Ajouter une tâche…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn btn--primary">Ajouter</button>
        </form>

        <ul className="todo__list">
          {active.map(renderTask)}
          {active.length === 0 && <li className="todo__empty">Aucune tâche en cours 🎉</li>}
        </ul>

        {done.length > 0 && (
          <>
            <h4 className="todo__done-title">Terminées ({done.length})</h4>
            <ul className="todo__list">
              {done.map((t) => (
                <li key={t.id} className="todo__item todo__item--done">
                  <input type="checkbox" checked readOnly onChange={() => onToggle(t)} />
                  <span className="todo__text">{t.text}</span>
                  <button className="todo__del" onClick={() => onDelete(t.id)} aria-label="Supprimer">✕</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="todo__col">
        <h3>Prochaines rencontres (agenda)</h3>
        <ul className="todo__agenda">
          {upcoming.map((e) => (
            <li key={e.id} className="agenda-item">
              <span
                className="agenda-item__dot"
                style={{ background: EVENT_TYPE_MAP[e.type] || (e.source === 'outlook' ? '#0f6cbd' : '#6b6156') }}
              />
              <div>
                <div className="agenda-item__title">{e.titre || 'Sans titre'}</div>
                <div className="agenda-item__meta">
                  {fmtDate(e.date)}
                  {e.heureDebut ? ` · ${e.heureDebut}` : ''}
                </div>
              </div>
            </li>
          ))}
          {upcoming.length === 0 && (
            <li className="todo__empty">Rien de prévu dans les 45 prochains jours.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
