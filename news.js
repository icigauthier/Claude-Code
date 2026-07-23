// Agrégateur de nouvelles (flux RSS/Atom) pour la section « Nouvelles » du CRM.
// Aucune dépendance : petit analyseur RSS/Atom + cache 15 min.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const TTL = 15 * 60 * 1000 // 15 minutes
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
