const money = new Intl.NumberFormat('fr-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
})

export function fmtMoney(v) {
  if (v == null || v === '' || isNaN(v)) return '—'
  return money.format(Number(v))
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  if (isNaN(d)) return iso
  return d.toLocaleDateString('fr-CA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Un suivi est « dû » si sa date est aujourd'hui ou passée et que le
// dossier est encore actif (ni financé, ni perdu).
export function isFollowUpDue(client) {
  if (!client.prochainSuivi) return false
  if (client.statut === 'finance' || client.statut === 'perdu') return false
  return client.prochainSuivi <= todayISO()
}
