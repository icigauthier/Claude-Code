import { useEffect, useState } from 'react'

const pad = (n) => String(n).padStart(2, '0')
function defaultDate() {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 5) // terme hypothécaire typique : 5 ans
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function RenewalPrompt({ client, onConfirm, onSkip }) {
  const [date, setDate] = useState(defaultDate())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onSkip()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onSkip])

  async function confirm() {
    if (!date) return
    setSaving(true)
    try {
      await onConfirm(date)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onClick={onSkip}>
      <div className="sheet sheet--sm" onClick={(e) => e.stopPropagation()}>
        <header className="sheet__head">
          <h2>🎉 Dossier financé !</h2>
          <button className="icon-btn" onClick={onSkip} aria-label="Fermer">✕</button>
        </header>
        <div className="sheet__body">
          <p className="prompt-text">
            Quand est le <strong>renouvellement</strong> de{' '}
            <strong>{client.nom || 'ce client'}</strong> ? Je l’ajoute à ton agenda
            — avec un <strong>rappel 6 mois avant</strong> pour le contacter à temps.
          </p>
          <label className="field">
            <span className="field__label">Date de renouvellement</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} autoFocus />
          </label>

          <footer className="sheet__foot">
            <button type="button" className="btn btn--ghost" onClick={onSkip}>
              Plus tard
            </button>
            <div className="sheet__foot-right">
              <button
                className="btn btn--primary"
                onClick={confirm}
                disabled={saving || !date}
              >
                {saving ? 'Ajout…' : 'Ajouter à l’agenda'}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
