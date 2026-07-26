// Agrégateur de nouvelles (flux RSS/Atom) pour la section « Nouvelles » du CRM.
// Aucune dépendance : petit analyseur RSS/Atom + cache 15 min.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const TTL = 60 * 60 * 1000 // 1 heure
const PER_SOURCE = 12 // articles récents par source

const SOURCES = [
  {
    key: 'cmt',
    name: 'Canadian Mortgage Trends',
    url: 'https://www.canadianmortgagetrends.com/feed/',
    site: 'https://www.canadianmortgagetrends.com/',
    color: '#1f6b4a',
  },
  {
    // Le flux officiel FR de la BdC est un calendrier (jours fériés, dates à venir),
    // pas des nouvelles → on passe par Google Actualités (FR) sur la BdC.
    key: 'boc',
    name: 'Banque du Canada',
    url:
      'https://news.google.com/rss/search?q=%22Banque%20du%20Canada%22%20(taux%20OR%20%22politique%20mon%C3%A9taire%22%20OR%20inflation)&hl=fr-CA&gl=CA&ceid=CA:fr',
    site: 'https://www.banqueducanada.ca/',
    color: '#b3452f',
  },
  {
    key: 'statcan',
    name: 'Statistique Canada',
    url: 'https://www150.statcan.gc.ca/n1/rss/dai-quo/0-fra.rss',
    site: 'https://www.statcan.gc.ca/fr/debut',
    color: '#4f6bae',
  },
  {
    key: 'ratehub',
    name: 'RateHub',
    url: 'https://www.ratehub.ca/blog/feed/',
    site: 'https://www.ratehub.ca/',
    color: '#8459b3',
  },
  {
    key: 'cmhc',
    name: 'SCHL / Actualités',
    url:
      'https://news.google.com/rss/search?q=(SCHL%20OR%20CMHC)%20logement%20hypoth%C3%A8que&hl=fr-CA&gl=CA&ceid=CA:fr',
    site: 'https://www.cmhc-schl.gc.ca/media-newsroom',
    color: '#c9922b',
  },

  /* ---- Priorité absolue ---- */
  {
    // Cas spécial : le rendement de l'obligation 5 ans du GdC (un chiffre, pas
    // des articles). Source directe : l'API Valet de la Banque du Canada.
    key: 'goc5y',
    name: 'Obligation 5 ans (GdC)',
    type: 'valet',
    seriesId: 'BD.CDN.5YR.DQ.YLD',
    url: 'https://www.bankofcanada.ca/valet/observations/BD.CDN.5YR.DQ.YLD/json?recent=1',
    site: 'https://www.banqueducanada.ca/taux/taux-interet/obligations-canadiennes/',
    color: '#d4531e',
  },
  {
    key: 'apciq',
    name: 'APCIQ (Gatineau)',
    url:
      'https://news.google.com/rss/search?q=APCIQ%20OR%20%22march%C3%A9%20immobilier%20Gatineau%22%20OR%20%22Barom%C3%A8tre%20r%C3%A9sidentiel%22&hl=fr-CA&gl=CA&ceid=CA:fr',
    site: 'https://apciq.ca/',
    color: '#2f7d6b',
  },
  {
    key: 'oreb',
    name: 'OREB (Ottawa)',
    url:
      'https://news.google.com/rss/search?q=%22Ottawa%20Real%20Estate%20Board%22%20OR%20%22OREB%22&hl=en-CA&gl=CA&ceid=CA:en',
    site: 'https://www.oreb.ca/',
    color: '#3b6ea5',
  },
  {
    key: 'rcecon',
    name: 'Radio-Canada Économie',
    url:
      'https://news.google.com/rss/search?q=%C3%A9conomie%20site:ici.radio-canada.ca&hl=fr-CA&gl=CA&ceid=CA:fr',
    site: 'https://ici.radio-canada.ca/economie',
    color: '#c1272d',
  },
  {
    key: 'cmp',
    name: 'Canadian Mortgage Pro.',
    url:
      'https://news.google.com/rss/search?q=site:mpamag.com%20OR%20%22Canadian%20Mortgage%20Professional%22&hl=en-CA&gl=CA&ceid=CA:en',
    site: 'https://www.mpamag.com/ca',
    color: '#6b4fa5',
  },

  /* ---- Deuxième vague ---- */
  {
    key: 'saretsky',
    name: 'The Saretsky Report',
    url: 'https://stevesaretsky.substack.com/feed',
    site: 'https://stevesaretsky.substack.com/',
    color: '#1f7a5a',
  },
  {
    key: 'desjardins',
    name: 'Desjardins — Études éco.',
    url:
      'https://news.google.com/rss/search?q=Desjardins%20%22%C3%A9tudes%20%C3%A9conomiques%22&hl=fr-CA&gl=CA&ceid=CA:fr',
    site: 'https://www.desjardins.com/qc/fr/etudes-economiques.html',
    color: '#00874e',
  },

  /* ---- Bonus ---- */
  {
    key: 'osfi',
    name: 'BSIF / OSFI',
    url:
      'https://news.google.com/rss/search?q=(OSFI%20OR%20BSIF)%20(hypoth%C3%A8que%20OR%20%22B-20%22%20OR%20%22stress%20test%22)&hl=fr-CA&gl=CA&ceid=CA:fr',
    site: 'https://www.osfi-bsif.gc.ca/',
    color: '#7a5c3e',
  },
  {
    key: 'fsra',
    name: 'FSRA Ontario',
    url:
      'https://news.google.com/rss/search?q=%22FSRA%22%20Ontario%20(mortgage%20OR%20broker)&hl=en-CA&gl=CA&ceid=CA:en',
    site: 'https://www.fsrao.ca/',
    color: '#4a6d8c',
  },
  {
    key: 'betterdwelling',
    name: 'Better Dwelling',
    url: 'https://betterdwelling.com/feed/',
    site: 'https://betterdwelling.com/',
    color: '#a83244',
  },
  {
    key: 'rentals',
    name: 'Rentals.ca (loyers)',
    url:
      'https://news.google.com/rss/search?q=%22Rentals.ca%22%20(rent%20report%20OR%20loyers)&hl=en-CA&gl=CA&ceid=CA:en',
    site: 'https://rentals.ca/national-rent-report',
    color: '#2a8fbd',
  },
  {
    key: 'bsf',
    name: 'Insolvabilités (BSF)',
    url:
      'https://news.google.com/rss/search?q=Canada%20(insolvabilit%C3%A9%20OR%20faillites%20OR%20insolvency)%20(consommateurs%20OR%20m%C3%A9nages%20OR%20consumer)&hl=fr-CA&gl=CA&ceid=CA:fr',
    site: 'https://ised-isde.canada.ca/site/bureau-surintendant-faillites/fr',
    color: '#8a6d3b',
  },
]

function decodeEntities(s) {
  return String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#0?39;|&#x27;/gi, "'")
    .replace(/&#8217;|&#x2019;/gi, '’')
    .replace(/&#8211;|&#x2013;/gi, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      try {
        return String.fromCodePoint(parseInt(h, 16))
      } catch {
        return ''
      }
    })
    .replace(/&#(\d+);/g, (_, d) => {
      try {
        return String.fromCodePoint(parseInt(d, 10))
      } catch {
        return ''
      }
    })
    .replace(/\s+/g, ' ')
    .trim()
}

function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  if (!m) return ''
  return m[1]
    .replace(/^\s*<!\[CDATA\[/, '')
    .replace(/\]\]>\s*$/, '')
    .trim()
}

function parseFeed(xml, source) {
  const out = []
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/\1>/gi) || []
  for (const b of blocks) {
    const title = decodeEntities(pick(b, 'title'))
    let link = pick(b, 'link')
    if (!link || /^\s*$/.test(link)) {
      const lm = b.match(/<link[^>]*href="([^"]+)"/i)
      link = lm ? lm[1] : ''
    }
    link = decodeEntities(link)
    const dateStr =
      pick(b, 'pubDate') || pick(b, 'published') || pick(b, 'updated') || pick(b, 'dc:date')
    const d = dateStr ? new Date(dateStr) : null
    if (!title) continue
    out.push({
      title,
      link,
      date: d && !isNaN(d) ? d.toISOString() : null,
      source: source.name,
      sourceKey: source.key,
      color: source.color,
    })
  }
  return out
}

async function fetchOne(source) {
  if (source.type === 'valet') return fetchValet(source)
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 12000)
  try {
    const r = await fetch(source.url, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
      redirect: 'follow',
      signal: ctrl.signal,
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const xml = await r.text()
    return parseFeed(xml, source).slice(0, PER_SOURCE)
  } finally {
    clearTimeout(to)
  }
}

// Cas spécial : un chiffre (rendement d'obligation) via l'API Valet publique de
// la Banque du Canada. Renvoyé comme une « nouvelle » unique, à jour du jour.
async function fetchValet(source) {
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 12000)
  try {
    const r = await fetch(source.url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      redirect: 'follow',
      signal: ctrl.signal,
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = await r.json()
    const obs = data.observations || []
    const last = obs[obs.length - 1]
    const raw = last && last[source.seriesId] ? last[source.seriesId].v : null
    if (raw == null || raw === '') return []
    const val = Number(raw)
    if (!isFinite(val)) return []
    const label = last.d
      ? new Date(last.d + 'T12:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })
      : ''
    return [
      {
        title: `Obligation 5 ans du GdC : ${val.toFixed(2)} %${label ? ` — ${label}` : ''}`,
        link: source.site,
        date: last.d ? new Date(last.d + 'T12:00:00').toISOString() : null,
        source: source.name,
        sourceKey: source.key,
        color: source.color,
      },
    ]
  } finally {
    clearTimeout(to)
  }
}

let cache = { at: 0, data: null }

export async function getNews(force = false) {
  if (!force && cache.data && Date.now() - cache.at < TTL) return cache.data

  const results = await Promise.allSettled(SOURCES.map(fetchOne))
  let items = []
  const sources = SOURCES.map((s, i) => {
    const r = results[i]
    if (r.status === 'fulfilled') {
      items.push(...r.value)
      return { key: s.key, name: s.name, site: s.site, color: s.color, ok: true, count: r.value.length }
    }
    return { key: s.key, name: s.name, site: s.site, color: s.color, ok: false, count: 0 }
  })

  // Écarte les entrées datées dans le futur (calendriers, jours fériés…)
  const futureLimit = Date.now() + 2 * 24 * 60 * 60 * 1000
  items = items.filter((it) => !it.date || new Date(it.date).getTime() <= futureLimit)

  // Dédup + tri par date décroissante (sans date à la fin)
  const seen = new Set()
  items = items.filter((it) => {
    const k = it.link || it.title
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  items.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  items = items.slice(0, 70)

  cache = { at: Date.now(), data: { updatedAt: new Date().toISOString(), sources, items } }
  return cache.data
}
