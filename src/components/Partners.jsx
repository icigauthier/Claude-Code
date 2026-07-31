import { useMemo } from 'react'
import {
  PARTNER_STATUTS,
  PARTNER_INDUSTRY_MAP,
  PARTNER_LANGUE_MAP,
} from '../constants.js'
import { fmtDate } from '../format.js'

// Colonne effective d'un partenaire : « gagné » dès qu'un client le référence.
function columnOf(p, refCount) {
  if (refCount > 0 || p.statut === 'gagne') return 'gagne'
  return p.statut === 'relancer' ? 'relancer' : 'a_contacter'
}

export default function Partners({ partners, clients, onOpen, onNew, onContact }) {
  // Nombre de références = COUNT des clients pointant vers le partenaire.
  const refCounts = useMemo(() => {
    const m = {}
    for (const c of clients || []) {
      if (c.source_partner_id) m[c.source_partner_id] = (m[c.source_partner_id] || 0) + 1
    }
    return m
  }, [clients])

  const byCol = useMemo(() => {
    const map = Object.fromEntries(PARTNER_STATUTS.map((s) => [s.key, []]))
    for (const p of partners) map[columnOf(p, refCounts[p.id] || 0)].push(p)
    return map
  }, [partners, refCounts])

  return (
    <div>
      <div className="section-actions">
        <button className="btn btn--primary" onClick={onNew}>+ Nouveau partenaire</button>
      </div>

      {partners.length === 0 ? (
        <p className="empty-state">
          Aucun partenaire. Ajoute tes agents immobiliers, notaires, comptables, assureurs…
        </p>
      ) : (
        <div className="board">
          {PARTNER_STATUTS.map((col) => {
            const items = byCol[col.key] || []
            return (
              <section key={col.key} className="col">
                <header className="col__head">
                  <span className="dot" style={{ background: col.color }} />
                  <span className="col__label">{col.label}</span>
                  <span className="col__count">{items.length}</span>
                </header>
                <div className="col__body">
                  {items.map((p) => (
                    <PartnerCard
                      key={p.id}
                      partner={p}
                      refCount={refCounts[p.id] || 0}
                      onOpen={() => onOpen(p)}
                      onContact={() => onContact(p)}
                    />
                  ))}
                  {items.length === 0 && <p className="col__empty">Aucun</p>}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PartnerCard({ partner: p, refCount, onOpen, onContact }) {
  return (
    <article className="partner-card">
      <div className="partner-card__top" style={{ cursor: 'pointer' }} onClick={onOpen}>
        <h3>{p.nom || 'Sans nom'}</h3>
        <span className="partner-type">{PARTNER_INDUSTRY_MAP[p.industrie] || 'Autre'}</span>
      </div>
      <div className="partner-line">🗣 {PARTNER_LANGUE_MAP[p.langue] || '—'}</div>
      <div className="partner-line">🔗 {refCount} référence{refCount > 1 ? 's' : ''}</div>
      {p.date_relance && (
        <div className="partner-line">📅 Relance : {fmtDate(p.date_relance)}</div>
      )}
      <button
        className="btn btn--ghost"
        style={{ marginTop: 10, width: '100%' }}
        onClick={onContact}
      >
        Contact fait
      </button>
    </article>
  )
}
