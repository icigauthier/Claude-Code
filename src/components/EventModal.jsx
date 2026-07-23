import { useEffect, useState } from 'react'
import { EVENT_TYPES } from '../constants.js'
import { downloadICS } from '../ics.js'

const EMPTY = {
  titre: '', type: 'Rencontre client', date: '', heureDebut: '09:00',
  heureFin: '10:00', clientId: '', lieu: '', notes: '',
}

export default function EventModal({ event, clients, connected, onClose, onSave, onDelete }) {
  const isNew = !event.id
  const [f, setF] = useState({ ...EMPTY, ...event })
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

  const canOutlook = f.titre.trim() && f.date

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet__head">
          <h2>{isNew ? 'Nouvelle rencontre' : f.titre || 'Rencontre'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">✕</button>
        </header>

        <form className="sheet__body" onSubmit={submit}>
          <div className="grid2">
            <label className="field">
              <span className="field__label">Titre</span>
              <input value={f.titre} onChange={set('titre')} autoFocus placeholder="Ex. Signature chez le notaire" />
            </label>
            <label className="field">
              <span className="field__label">Type</span>
              <select value={f.type} onChange={set('type')}>
                {EVENT_TYPES.map((t) => (
                  <option key={t.key}>{t.key}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid3">
            <label className="field">
              <span className="field__label">Date</span>
              <input type="date" value={f.date} onChange={set('date')} required />
            </label>
            <label className="field">
              <span className="field__label">Début</span>
              <input type="time" value={f.heureDebut} onChange={set('heureDebut')} />
            </label>
            <label className="field">
              <span className="field__label">Fin</span>
              <input type="time" value={f.heureFin} onChange={set('heureFin')} />
            </label>
          </div>

          <div className="grid2">
            <label className="field">
              <span className="field__label">Client lié</span>
              <select value={f.clientId} onChange={set('clientId')}>
                <option value="">— Aucun —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom || 'Sans nom'}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Lieu</span>
              <input value={f.lieu} onChange={set('lieu')} placeholder="Bureau, Zoom, adresse…" />
            </label>
          </div>

          <label className="field">
            <span className="field__label">Notes</span>
            <textarea rows={3} value={f.notes} onChange={set('notes')} />
          </label>

          {connected ? (
            <p className="hint">
              🟢 Cette rencontre sera enregistrée directement dans ton calendrier
              Outlook.
            </p>
          ) : (
            <>
              <button
                type="button"
                className="btn btn--outlook"
                disabled={!canOutlook}
                onClick={() => downloadICS(f)}
                title={canOutlook ? '' : 'Ajoute un titre et une date d’abord'}
              >
                📅 Ajouter à Outlook
              </button>
              <p className="hint">
                Télécharge un fichier .ics — ouvre-le pour l’ajouter à ton
                calendrier Outlook.
              </p>
            </>
          )}

          <footer className="sheet__foot">
            {!isNew && (
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  if (confirm('Supprimer cette rencontre ?')) onDelete(event.id)
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
