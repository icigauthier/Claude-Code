import { useEffect, useState, useMemo } from 'react'
import { api } from '../api.js'
import { getReadSet, toggleRead } from '../newsRead.js'

const REFRESH_MS = 15 * 60 * 1000 // 15 minutes

function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  const j = Math.floor(h / 24)
  if (j === 1) return 'hier'
  if (j < 7) return `il y a ${j} j`
  return new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })
}

export default function News() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('all')
  const [tick, setTick] = useState(0) // rafraîchit les « il y a X min »
  const [read, setRead] = useState(() => getReadSet())

  function markRead(link) {
    setRead(new Set(toggleRead(link)))
  }

  async function load(force = false) {
    try {
      setError('')
      if (force) setRefreshing(true)
      const d = await api.getNews(force)
      setData(d)
    } catch {
      setError('Impossible de charger les nouvelles. Vérifie ta connexion Internet.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(() => load(), REFRESH_MS) // auto-update 15 min
    const t = setInterval(() => setTick((x) => x + 1), 60000) // horodatage relatif
    return () => {
      clearInterval(id)
      clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const items = useMemo(() => {
    const all = data?.items || []
    return filter === 'all' ? all : all.filter((i) => i.sourceKey === filter)
  }, [data, filter, tick])

  const sources = data?.sources || []

  return (
    <div className="news">
      <div className="news__bar">
        <div className="news__chips">
          <button
            className={`news-chip ${filter === 'all' ? 'is-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Toutes
          </button>
          {sources.map((s) => (
            <button
              key={s.key}
              className={`news-chip ${filter === s.key ? 'is-active' : ''} ${s.ok ? '' : 'is-down'}`}
              onClick={() => setFilter(s.key)}
              title={s.ok ? `${s.count} article(s)` : 'Source indisponible pour le moment'}
            >
              <span className="news-chip__dot" style={{ background: s.color }} />
              {s.name}
            </button>
          ))}
        </div>
        <div className="news__meta">
          {items.length > 0 && (
            <span className="news__unread">
              {items.filter((i) => !read.has(i.link)).length} non lue(s)
            </span>
          )}
          {data?.updatedAt && <span>Actualisé {timeAgo(data.updatedAt)}</span>}
          <button className="btn btn--ghost" onClick={() => load(true)} disabled={refreshing}>
            {refreshing ? 'Actualisation…' : '↻ Actualiser'}
          </button>
        </div>
      </div>

      <p className="news__hint">Mise à jour automatique toutes les 15 minutes.</p>

      {error && <div className="banner banner--error">{error}</div>}
      {loading ? (
        <div className="loading">Chargement des nouvelles…</div>
      ) : (
        <ul className="news__list">
          {items.map((it, i) => {
            const isRead = read.has(it.link)
            return (
              <li key={(it.link || it.title) + i} className={`news-item ${isRead ? 'is-read' : ''}`}>
                <span className="news-item__accent" style={{ background: it.color }} />
                <a
                  className="news-item__body"
                  href={it.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="news-item__title">{it.title}</span>
                  <span className="news-item__meta">
                    <span className="news-item__src" style={{ color: it.color }}>
                      {it.source}
                    </span>
                    {it.date && <span className="news-item__time">· {timeAgo(it.date)}</span>}
                  </span>
                </a>
                <button
                  className={`news-item__check ${isRead ? 'is-on' : ''}`}
                  onClick={() => markRead(it.link)}
                  title={isRead ? 'Marquer comme non lue' : 'Marquer comme lue'}
                  aria-pressed={isRead}
                >
                  <span className="news-item__check-box">{isRead ? '✓' : ''}</span>
                  <span className="news-item__check-lbl">{isRead ? 'Lue' : 'Lu'}</span>
                </button>
              </li>
            )
          })}
          {items.length === 0 && (
            <li className="news__empty">Aucune nouvelle pour cette source pour l’instant.</li>
          )}
        </ul>
      )}
    </div>
  )
}
