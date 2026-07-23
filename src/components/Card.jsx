import { fmtDate, isFollowUpDue } from '../format.js'

export default function Card({ client, onOpen, onDragStart, onDragEnd, dragging }) {
  const due = isFollowUpDue(client)
  return (
    <article
      className={`card ${dragging ? 'card--dragging' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      <div className="card__top">
        <h3 className="card__name">{client.nom || 'Sans nom'}</h3>
        {client.dossierFinmo ? (
          <span className="card__finmo">📁 {client.dossierFinmo}</span>
        ) : null}
      </div>

      {client.projet && <span className="card__tag">{client.projet}</span>}

      <div className="card__meta">
        {client.ville && <span>📍 {client.ville}</span>}
        {client.telephone && <span>☎ {client.telephone}</span>}
      </div>

      {client.prochainSuivi && (
        <div className={`card__follow ${due ? 'is-due' : ''}`}>
          {due ? '⏰ Suivi dû' : '🗓 Suivi'} · {fmtDate(client.prochainSuivi)}
        </div>
      )}
    </article>
  )
}
