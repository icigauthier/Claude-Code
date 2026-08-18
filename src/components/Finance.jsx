import { useMemo, useState } from 'react'
import { fmtMoney, fmtDate, todayISO } from '../format.js'
import { api } from '../api.js'

function fileToBase64(f) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = reject
    r.readAsDataURL(f)
  })
}

export default function Finance({ finances, onAdd, onDelete }) {
  const thisYear = String(new Date().getFullYear())
  const [year, setYear] = useState(thisYear)
  const [form, setForm] = useState({ date: todayISO(), type: 'revenu', description: '', montant: '' })
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const years = useMemo(() => {
    const s = new Set(finances.map((f) => (f.date || '').slice(0, 4)).filter(Boolean))
    s.add(thisYear)
    return [...s].sort().reverse()
  }, [finances, thisYear])

  const rows = useMemo(
    () =>
      finances
        .filter((f) => (f.date || '').startsWith(year))
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [finances, year],
  )

  const revenus = rows.filter((r) => r.type === 'revenu').reduce((s, r) => s + (Number(r.montant) || 0), 0)
  const depenses = rows.filter((r) => r.type === 'depense').reduce((s, r) => s + (Number(r.montant) || 0), 0)
  const net = revenus - depenses

  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const formEl = e.currentTarget
    if (!form.montant || !form.date) return
    if (file && file.size > 8 * 1024 * 1024) {
      alert('Fichier trop volumineux (max 8 Mo).')
      return
    }
    setUploading(true)
    try {
      let facture = null
      if (file) {
        const data = await fileToBase64(file)
        facture = await api.uploadFile({ name: file.name, type: file.type, data })
      }
      await onAdd({ ...form, montant: Number(form.montant), facture })
      setForm((f) => ({ ...f, description: '', montant: '' }))
      setFile(null)
      formEl.reset()
    } catch {
      alert("Échec de l'envoi du fichier. Réessaie.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="finance">
      <div className="finance__bar">
        <div className="year-tabs">
          {years.map((y) => (
            <button
              key={y}
              className={`year-tab ${y === year ? 'is-active' : ''}`}
              onClick={() => setYear(y)}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi__value" style={{ color: 'var(--pos)' }}>{fmtMoney(revenus)}</div>
          <div className="kpi__label">Revenus {year}</div>
        </div>
        <div className="kpi">
          <div className="kpi__value" style={{ color: 'var(--neg)' }}>{fmtMoney(depenses)}</div>
          <div className="kpi__label">Dépenses {year}</div>
        </div>
        <div className={`kpi ${net >= 0 ? 'kpi--strong' : ''}`}>
          <div className="kpi__value" style={net < 0 ? { color: 'var(--neg)' } : undefined}>
            {fmtMoney(net)}
          </div>
          <div className="kpi__label">Bénéfice net {year}</div>
        </div>
      </div>

      <form className="finance__add" onSubmit={submit}>
        <input type="date" value={form.date} onChange={set('date')} />
        <select value={form.type} onChange={set('type')}>
          <option value="revenu">Revenu</option>
          <option value="depense">Dépense</option>
        </select>
        <input
          className="finance__desc"
          placeholder="Description (ex. commission, publicité…)"
          value={form.description}
          onChange={set('description')}
        />
        <input
          type="number"
          step="0.01"
          placeholder="Montant $"
          value={form.montant}
          onChange={set('montant')}
        />
        <label className="btn btn--ghost" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} title="Joindre une facture (image ou PDF)">
          📎 {file ? (file.name.length > 16 ? file.name.slice(0, 15) + '…' : file.name) : 'Facture'}
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files[0] || null)}
            style={{ display: 'none' }}
          />
        </label>
        <button className="btn btn--primary" disabled={uploading}>
          {uploading ? 'Envoi…' : 'Ajouter'}
        </button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Montant</th>
              <th>Pièce</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="td-mono">{fmtDate(r.date)}</td>
                <td>
                  <span
                    className="badge"
                    style={{ background: r.type === 'revenu' ? '#173b34' : '#a5402c' }}
                  >
                    {r.type === 'revenu' ? 'Revenu' : 'Dépense'}
                  </span>
                </td>
                <td>{r.description || '—'}</td>
                <td
                  className="td-mono"
                  style={{ textAlign: 'right', color: r.type === 'revenu' ? 'var(--pos)' : 'var(--neg)' }}
                >
                  {r.type === 'revenu' ? '+' : '−'}
                  {fmtMoney(Number(r.montant) || 0)}
                </td>
                <td>
                  {r.facture ? (
                    <a
                      href={`/api/files/${r.facture.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={r.facture.name || 'Facture'}
                    >
                      📎 Voir
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="todo__del" onClick={() => onDelete(r.id)} aria-label="Supprimer">✕</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-2)', padding: '1.5rem' }}>
                  Aucune entrée pour {year}. Ajoute ton premier revenu ou dépense ci-dessus.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
