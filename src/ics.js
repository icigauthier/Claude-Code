// Génère un fichier .ics (iCalendar) pour ouvrir une rencontre dans Outlook.

function pad(n) {
  return String(n).padStart(2, '0')
}

// Format local « flottant » : AAAAMMJJTHHMMSS (interprété comme heure locale)
function fmtLocal(d) {
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}00`
  )
}

function escapeText(s = '') {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function range(ev) {
  const start = new Date(`${ev.date}T${ev.heureDebut || '09:00'}:00`)
  let end
  if (ev.heureFin) {
    end = new Date(`${ev.date}T${ev.heureFin}:00`)
    if (end <= start) end = new Date(start.getTime() + 60 * 60000)
  } else {
    end = new Date(start.getTime() + 60 * 60000)
  }
  return { start, end }
}

export function buildICS(ev) {
  const { start, end } = range(ev)
  const stamp =
    new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//iciGauthier CRM//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.id || 'ev_' + Date.now()}@icigauthier`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${fmtLocal(start)}`,
    `DTEND:${fmtLocal(end)}`,
    `SUMMARY:${escapeText(ev.titre || 'Rencontre')}`,
    ev.lieu ? `LOCATION:${escapeText(ev.lieu)}` : null,
    ev.notes ? `DESCRIPTION:${escapeText(ev.notes)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  return lines.join('\r\n')
}

export function downloadICS(ev) {
  const blob = new Blob([buildICS(ev)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download =
    (ev.titre || 'rencontre').replace(/[^\w\-]+/g, '_').slice(0, 40) + '.ics'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
