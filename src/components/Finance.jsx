import { useMemo, useState } from 'react'
import { fmtMoney, fmtDate, todayISO } from '../format.js'

export default function Finance({ finances, onAdd, onDelete }) {
  const thisYear = String(new Date().getFullYear())
  const [year, setYear] = useState(thisYear)
  const [form, setForm] = useState({ date: todayISO(), type: 'revenu', description: '', montant: '' })

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

  function submit(e) {
    e.preventDefault()
    if (!form.montant || !form.date) return
    onAdd({ ...form, montant: Number(form.montant) })
    setForm((f) => ({ ...f, description: '', montant: '' }))
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
          <div className="kpi__value" style={{ color: '#173b34' }}>{fmtMoney(revenus)}</div>
          <div className="kpi__label">Revenus {year}</div>
        </div>
        <div className="kpi">
          <div className="kpi__value" style={{ color: '#a5402c' }}>{fmtMoney(depenses)}</div>
          <div className="kpi__label">Dépenses {year}</div>
        </div>
        <div className={`kpi ${net >= 0 ? 'kpi--strong' : ''}`}>
          <div className="kpi__value" style={net < 0 ? { color: '#a5402c' } : undefined}>
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
        <button className="btn btn--primary">Ajouter</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Montant</th>
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
                  style={{ textAlign: 'right', color: r.type === 'revenu' ? '#173b34' : '#a5402c' }}
                >
                  {r.type === 'revenu' ? '+' : '−'}
                  {fmtMoney(Number(r.montant) || 0)}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="todo__del" onClick={() => onDelete(r.id)} aria-label="Supprimer">✕</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-2)', padding: '1.5rem' }}>
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
