import { useEffect, useState } from 'react'
import {
  STAGES,
  PROJETS,
  ECHEANCIERS,
  SOURCES,
} from '../constants.js'
import { fmtDate, todayISO } from '../format.js'

const EMPTY = {
  nom: '',
  courriel: '',
  telephone: '',
  statut: 'nouveau',
  projet: '',
  echeancier: '',
  ville: '',
  source: '',
  dossierFinmo: '',
  prochainSuivi: '',
  source_partner_id: '',
  notes: [],
}

export default function ClientModal({ client, partners, onClose, onSave, onDelete }) {
  const isNew = !client.id
  const [f, setF] = useState({ ...EMPTY, ...client })
  const [noteDraft, setNoteDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  function addNote() {
    const text = noteDraft.trim()
    if (!text) return
    setF((s) => ({
      ...s,
      notes: [{ date: todayISO(), text }, ...(s.notes || [])],
    }))
    setNoteDraft('')
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    const patch = { ...f }
    try {
      await onSave(patch)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet__head">
          <h2>{isNew ? 'Nouveau client' : f.nom || 'Fiche client'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>

        <form className="sheet__body" onSubmit={submit}>
          <div className="grid2">
            <Field label="Nom complet">
              <input value={f.nom} onChange={set('nom')} autoFocus />
            </Field>
            <Field label="Statut">
              <select value={f.statut} onChange={set('statut')}>
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid2">
            <Field label="Courriel">
              <input type="email" value={f.courriel} onChange={set('courriel')} />
            </Field>
            <Field label="Téléphone">
              <input value={f.telephone} onChange={set('telephone')} />
            </Field>
          </div>

          <div className="grid2">
            <Field label="Type de projet">
              <select value={f.projet} onChange={set('projet')}>
                <option value="">—</option>
                {PROJETS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Échéancier">
              <select value={f.echeancier} onChange={set('echeancier')}>
                <option value="">—</option>
                {ECHEANCIERS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid2">
            <Field label="Ville / région">
              <input value={f.ville} onChange={set('ville')} />
            </Field>
            <Field label="Source">
              <select value={f.source} onChange={set('source')}>
                <option value="">—</option>
                {SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid2">
            <Field label="Dossier FINMO">
              <input
                value={f.dossierFinmo}
                onChange={set('dossierFinmo')}
                placeholder="# ou lien du dossier FINMO"
              />
            </Field>
            <Field label="Prochain suivi">
              <input
                type="date"
                value={f.prochainSuivi || ''}
                onChange={set('prochainSuivi')}
              />
            </Field>
          </div>

          <Field label="Référé par (partenaire)">
            <select value={f.source_partner_id || ''} onChange={set('source_partner_id')}>
              <option value="">— Aucun —</option>
              {(partners || []).map((p) => (
                <option key={p.id} value={p.id}>{p.nom || 'Sans nom'}</option>
              ))}
            </select>
          </Field>

          {/* Notes */}
          <div className="notes">
            <label className="field__label">Notes</label>
            <div className="notes__add">
              <textarea
                rows={2}
                placeholder="Ajouter une note (appel, courriel, mise à jour…)"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
              />
              <button type="button" className="btn btn--ghost" onClick={addNote}>
                Ajouter
              </button>
            </div>
            <ul className="notes__list">
              {(f.notes || []).map((n, i) => (
                <li key={i}>
                  <span className="notes__date">{fmtDate(n.date)}</span>
                  <span>{n.text}</span>
                </li>
              ))}
              {(!f.notes || f.notes.length === 0) && (
                <li className="notes__empty">Aucune note pour l’instant.</li>
              )}
            </ul>
          </div>

          <footer className="sheet__foot">
            {!isNew && (
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  if (confirm('Supprimer cette fiche définitivement ?'))
                    onDelete(client.id)
                }}
              >
                Supprimer
              </button>
            )}
            <div className="sheet__foot-right">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Annuler
              </button>
              <button className="btn btn--primary" disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
    </label>
  )
}
