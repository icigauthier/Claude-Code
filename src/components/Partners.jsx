import { useMemo, useState } from 'react'
import {
  PARTNER_STATUTS,
  PARTNER_INDUSTRY_MAP,
  PARTNER_LANGUE_MAP,
} from '../constants.js'
import { fmtDate } from '../format.js'

const COL_KEYS = PARTNER_STATUTS.map((s) => s.key)
// Colonne d'un partenaire = son statut (par défaut « à contacter »).
const columnOf = (p) => (COL_KEYS.includes(p.statut) ? p.statut : 'a_contacter')

export default function Partners({ partners, clients, onOpen, onNew, onContact, onMove }) {
  const [dragId, setDragId] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [q, setQ] = useState('')

  // Nombre de références = COUNT des clients pointant vers le partenaire.
  const refCounts = useMemo(() => {
    const m = {}
    for (const c of clients || []) {
      if (c.source_partner_id) m[c.source_partner_id] = (m[c.source_partner_id] || 0) + 1
    }
    return m
  }, [clients])

  // Recherche rapide : nom, industrie, langue, téléphone, notes.
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return partners
    return partners.filter((p) =>
      [p.nom, PARTNER_INDUSTRY_MAP[p.industrie], PARTNER_LANGUE_MAP[p.langue], p.telephone, p.notes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    )
  }, [partners, q])

  const byCol = useMemo(() => {
    const map = Object.fromEntries(PARTNER_STATUTS.map((s) => [s.key, []]))
    for (const p of filtered) map[columnOf(p)].push(p)
    return map
  }, [filtered])

  function onDrop(statutKey) {
    if (dragId) {
      const p = partners.find((x) => x.id === dragId)
      if (p && columnOf(p) !== statutKey) onMove(dragId, statutKey)
    }
    setDragId(null)
    setDragOver(null)
  }

  if (partners.length === 0) {
    return (
      <div>
        <div className="section-actions">
          <button className="btn btn--primary" onClick={onNew}>+ Nouveau partenaire</button>
        </div>
        <p className="empty-state">
          Aucun partenaire. Ajoute tes agents immobiliers, notaires, comptables, assureurs…
        </p>
      </div>
    )
  }

  return (
    <div>
      <div
        className="section-actions"
        style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <input
          className="search"
          type="search"
          placeholder="Rechercher un partenaire…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn btn--primary" onClick={onNew}>+ Nouveau partenaire</button>
      </div>

      {q.trim() && filtered.length === 0 ? (
        <p className="empty-state">Aucun partenaire ne correspond à « {q} ».</p>
      ) : (
        <div className="board">
          {PARTNER_STATUTS.map((col) => {
            const items = byCol[col.key] || []
            return (
              <section
                key={col.key}
                className={`col ${dragOver === col.key ? 'col--over' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (dragOver !== col.key) setDragOver(col.key)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null)
                }}
                onDrop={() => onDrop(col.key)}
              >
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
                      dragging={dragId === p.id}
                      onOpen={() => onOpen(p)}
                      onContact={() => onContact(p)}
                      onDragStart={() => setDragId(p.id)}
                      onDragEnd={() => {
                        setDragId(null)
                        setDragOver(null)
                      }}
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

function PartnerCard({ partner: p, refCount, dragging, onOpen, onContact, onDragStart, onDragEnd }) {
  return (
    <article
      className={`partner-card ${dragging ? 'is-dragging' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
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
