import { useEffect, useState } from 'react'
import { EVENT_TYPE_MAP, PARTNER_INDUSTRY_MAP } from '../constants.js'
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

  // Relances dues : partenaires dont la date de relance est <= aujourd'hui,
  // du plus ancien au plus récent. La table partners est la source (pas de
  // table de tâches séparée).
  const today = todayISO()
  const dueRelances = (partners || [])
    .filter((p) => p.date_relance && p.date_relance <= today)
    .sort((a, b) => a.date_relance.localeCompare(b.date_relance))

  useEffect(() => {
    let cancel = false
    Promise.resolve(loadUpcoming())
      .then((evts) => {
        if (!cancel) setUpcoming((evts || []).slice().sort((a, b) => (a.date + (a.heureDebut || '')).localeCompare(b.date + (b.heureDebut || ''))))
      })
      .catch(() => !cancel && setUpcoming([]))
    return () => {
      cancel = true
    }
  }, [loadUpcoming, version])

  const active = todos.filter((t) => !t.done)
  const done = todos.filter((t) => t.done)

  function add(e) {
    e.preventDefault()
    const v = text.trim()
    if (!v) return
    onAdd(v)
    setText('')
  }

  return (
    <div className="todo">
      <div className="todo__col">
        {dueRelances.length > 0 && (
          <div className="relances">
            <h3>Relances à faire ({dueRelances.length})</h3>
            <ul className="todo__list">
              {dueRelances.map((p) => (
                <li key={p.id} className="todo__item" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <span className="todo__text">
                    Relancer <b>{p.nom || 'Sans nom'}</b>{' '}
                    <small>({PARTNER_INDUSTRY_MAP[p.industrie] || 'Autre'})</small> ·{' '}
                    <small>{fmtDate(p.date_relance)}</small>
                  </span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    {p.telephone && (
                      <a className="btn btn--ghost" href={`tel:${p.telephone}`} title="Appeler">📞</a>
                    )}
                    {p.telephone && (
                      <a className="btn btn--ghost" href={`sms:${p.telephone}`} title="Texter">💬</a>
                    )}
                    <button className="btn btn--primary" onClick={() => onContact(p)}>
                      Contact fait
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

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
          {active.map((t) => (
            <li key={t.id} className="todo__item">
              <input type="checkbox" checked={t.done} onChange={() => onToggle(t)} />
              <span className="todo__text">{t.text}</span>
              <button className="todo__del" onClick={() => onDelete(t.id)} aria-label="Supprimer">✕</button>
            </li>
          ))}
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
