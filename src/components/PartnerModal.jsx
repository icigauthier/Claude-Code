import { useEffect, useState } from 'react'
import { PARTNER_INDUSTRIES, PARTNER_LANGUES } from '../constants.js'

const EMPTY = {
  nom: '',
  industrie: 'autre',
  langue: 'bilingue',
  telephone: '',
  site_web: '',
  notes: '',
  statut: 'a_contacter',
  date_relance: '',
}

export default function PartnerModal({ partner, onClose, onSave, onDelete }) {
  const isNew = !partner.id
  const [f, setF] = useState({ ...EMPTY, ...partner })
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

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(f)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet__head">
          <h2>{isNew ? 'Nouveau partenaire' : f.nom || 'Partenaire'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">✕</button>
        </header>

        <form className="sheet__body" onSubmit={submit}>
          <label className="field">
            <span className="field__label">Nom / entreprise</span>
            <input value={f.nom} onChange={set('nom')} autoFocus />
          </label>

          <div className="grid2">
            <label className="field">
              <span className="field__label">Industrie</span>
              <select value={f.industrie} onChange={set('industrie')}>
                {PARTNER_INDUSTRIES.map((i) => (
                  <option key={i.key} value={i.key}>{i.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Langue</span>
              <select value={f.langue} onChange={set('langue')}>
                {PARTNER_LANGUES.map((l) => (
                  <option key={l.key} value={l.key}>{l.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid2">
            <label className="field">
              <span className="field__label">Téléphone</span>
              <input value={f.telephone} onChange={set('telephone')} />
            </label>
            <label className="field">
              <span className="field__label">Site web</span>
              <input value={f.site_web} onChange={set('site_web')} placeholder="https://…" />
            </label>
          </div>

          <label className="field">
            <span className="field__label">Notes</span>
            <textarea rows={4} value={f.notes} onChange={set('notes')} />
          </label>

          <footer className="sheet__foot">
            {!isNew && (
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  if (confirm('Supprimer ce partenaire ?')) onDelete(partner.id)
                }}
              >
                Supprimer
              </button>
            )}
            <div className="sheet__foot-right">
              <button type="button" className="btn btn--ghost" onClick={onClose}>Annuler</button>
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
