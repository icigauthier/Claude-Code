import { useEffect, useState } from 'react'

const DELAYS = [
  { days: 7, label: '7 jours' },
  { days: 30, label: '30 jours' },
  { days: 90, label: '90 jours' },
]

// Mini-formulaire « Contact fait » : note rapide + prochaine relance.
export default function ContactModal({ partner, onClose, onSave }) {
  const [note, setNote] = useState('')
  const [delay, setDelay] = useState(30)
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

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(partner, { note: note.trim(), delayDays: delay })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <header className="sheet__head">
          <h2>Contact fait — {partner.nom || 'Partenaire'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">✕</button>
        </header>

        <form className="sheet__body" onSubmit={submit}>
          <label className="field">
            <span className="field__label">Note rapide (optionnel)</span>
            <textarea
              rows={3}
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex. : Laissé un message, à rappeler."
            />
          </label>

          <div className="field">
            <span className="field__label">Relancer dans</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {DELAYS.map((d) => (
                <button
                  type="button"
                  key={d.days}
                  className={`btn ${delay === d.days ? 'btn--primary' : 'btn--ghost'}`}
                  style={{ flex: 1 }}
                  onClick={() => setDelay(d.days)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <footer className="sheet__foot">
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
