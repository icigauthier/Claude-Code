import { useEffect, useMemo, useState } from 'react'
import { STAGES, STAGE_MAP, EVENT_TYPE_MAP } from '../constants.js'
import { fmtMoney, fmtDate, isFollowUpDue, todayISO } from '../format.js'
import { api } from '../api.js'
import { getReadSet } from '../newsRead.js'
import GlowCard from './GlowCard.jsx'

export default function Overview({
  clients,
  todos,
  finances,
  loadUpcoming,
  version,
  onNavigate,
  onOpenClient,
  onNewClient,
}) {
  const [upcoming, setUpcoming] = useState([])
  const [news, setNews] = useState(null)
  const readSet = getReadSet()

  useEffect(() => {
    let cancel = false
    api
      .getNews()
      .then((d) => !cancel && setNews(d))
      .catch(() => !cancel && setNews({ items: [] }))
    return () => {
      cancel = true
    }
  }, [])

  useEffect(() => {
    let cancel = false
    Promise.resolve(loadUpcoming())
      .then((evts) => {
        if (!cancel)
          setUpcoming(
            (evts || [])
              .slice()
              .sort((a, b) =>
                (a.date + (a.heureDebut || '')).localeCompare(b.date + (b.heureDebut || '')),
              ),
          )
      })
      .catch(() => !cancel && setUpcoming([]))
    return () => {
      cancel = true
    }
  }, [loadUpcoming, version])

  // ---- Pipeline ----
  const pipeline = useMemo(() => {
    const counts = Object.fromEntries(STAGES.map((s) => [s.key, 0]))
    for (const c of clients) counts[c.statut] = (counts[c.statut] || 0) + 1
    const finance = counts.finance || 0
    const perdu = counts.perdu || 0
    const active = clients.length - finance - perdu
    const due = clients.filter(isFollowUpDue)
    return { counts, active, finance, due }
  }, [clients])

  // ---- Finance (année en cours) ----
  const fin = useMemo(() => {
    const year = String(new Date().getFullYear())
    const rows = finances.filter((f) => (f.date || '').startsWith(year))
    const revenus = rows
      .filter((r) => r.type === 'revenu')
      .reduce((s, r) => s + (Number(r.montant) || 0), 0)
    const depenses = rows
      .filter((r) => r.type === 'depense')
      .reduce((s, r) => s + (Number(r.montant) || 0), 0)
    return { year, revenus, depenses, net: revenus - depenses }
  }, [finances])

  // ---- Renouvellements à venir ----
  const renewals = useMemo(() => {
    const today = todayISO()
    return clients
      .filter((c) => c.renouvellement && c.renouvellement >= today)
      .map((c) => {
        const days = Math.round(
          (new Date(c.renouvellement + 'T00:00:00') - new Date(today + 'T00:00:00')) /
            86400000,
        )
        return { ...c, _days: days, _soon: days <= 183 }
      })
      .sort((a, b) => a.renouvellement.localeCompare(b.renouvellement))
      .slice(0, 6)
  }, [clients])

  // ---- Nouvelles du jour ----
  const todayNews = useMemo(() => {
    const all = news?.items || []
    const td = new Date().toDateString()
    return all.filter((i) => i.date && new Date(i.date).toDateString() === td)
  }, [news])
  const newsShown = todayNews.length ? todayNews.slice(0, 6) : (news?.items || []).slice(0, 4)
  const unreadToday = todayNews.filter((i) => !readSet.has(i.link)).length

  const activeTodos = todos.filter((t) => !t.done)
  const maxCount = Math.max(1, ...STAGES.map((s) => pipeline.counts[s.key] || 0))
  const today = new Date().toLocaleDateString('fr-CA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="overview">
      <div className="ov-hello">
        <h2>Bonjour Antoine 👋</h2>
        <span className="ov-hello__date">{today}</span>
      </div>

      <div className="ov-grid">
        {/* Pipeline */}
        <GlowCard className="ov-card">
          <header className="ov-card__head">
            <h3>Pipeline</h3>
            <div className="ov-head-actions">
              <button className="ov-link ov-link--btn" onClick={onNewClient}>
                + Client
              </button>
              <button className="ov-link" onClick={() => onNavigate('pipeline')}>
                Voir →
              </button>
            </div>
          </header>
          <div className="ov-stats">
            <div className="ov-stat">
              <span className="ov-stat__num">{pipeline.active}</span>
              <span className="ov-stat__lbl">Actifs</span>
            </div>
            <div className={`ov-stat ${pipeline.due.length ? 'is-warn' : ''}`}>
              <span className="ov-stat__num">{pipeline.due.length}</span>
              <span className="ov-stat__lbl">Suivis dûs</span>
            </div>
            <div className="ov-stat">
              <span className="ov-stat__num">{pipeline.finance}</span>
              <span className="ov-stat__lbl">Financés</span>
            </div>
          </div>
          <div className="ov-bars">
            {STAGES.map((s) => {
              const n = pipeline.counts[s.key] || 0
              return (
                <div className="ov-bar-row" key={s.key}>
                  <span className="ov-bar-lbl">{s.label}</span>
                  <div className="ov-bar-track">
                    <div
                      className="ov-bar-fill"
                      style={{
                        width: `${(n / maxCount) * 100}%`,
                        background: s.color,
                        minWidth: n > 0 ? '1.4rem' : 0,
                      }}
                    >
                      {n > 0 && <span>{n}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </GlowCard>

        {/* Agenda */}
        <GlowCard className="ov-card">
          <header className="ov-card__head">
            <h3>Agenda — à venir</h3>
            <button className="ov-link" onClick={() => onNavigate('agenda')}>
              Voir →
            </button>
          </header>
          <ul className="ov-list">
            {upcoming.slice(0, 5).map((e) => (
              <li key={e.id} className="ov-item">
                <span
                  className="ov-dot"
                  style={{
                    background:
                      EVENT_TYPE_MAP[e.type] ||
                      (e.source === 'outlook' ? '#0f6cbd' : '#6b6156'),
                  }}
                />
                <div className="ov-item__main">
                  <span className="ov-item__title">{e.titre || 'Sans titre'}</span>
                  <span className="ov-item__meta">
                    {fmtDate(e.date)}
                    {e.heureDebut ? ` · ${e.heureDebut}` : ''}
                  </span>
                </div>
              </li>
            ))}
            {upcoming.length === 0 && (
              <li className="ov-empty">Rien de prévu dans les 45 prochains jours.</li>
            )}
          </ul>
        </GlowCard>

        {/* À faire */}
        <GlowCard className="ov-card">
          <header className="ov-card__head">
            <h3>À faire</h3>
            <button className="ov-link" onClick={() => onNavigate('todo')}>
              Voir →
            </button>
          </header>
          <div className="ov-stats ov-stats--single">
            <div className={`ov-stat ${activeTodos.length ? 'is-warn' : ''}`}>
              <span className="ov-stat__num">{activeTodos.length}</span>
              <span className="ov-stat__lbl">Tâches en cours</span>
            </div>
          </div>
          <ul className="ov-list">
            {activeTodos.slice(0, 5).map((t) => (
              <li key={t.id} className="ov-item">
                <span className="ov-check">○</span>
                <span className="ov-item__title">{t.text}</span>
              </li>
            ))}
            {activeTodos.length === 0 && (
              <li className="ov-empty">Aucune tâche en cours 🎉</li>
            )}
          </ul>
        </GlowCard>

        {/* Finance */}
        <GlowCard className="ov-card">
          <header className="ov-card__head">
            <h3>Finance — {fin.year}</h3>
            <button className="ov-link" onClick={() => onNavigate('finance')}>
              Voir →
            </button>
          </header>
          <div className="ov-stats">
            <div className="ov-stat">
              <span className="ov-stat__num" style={{ color: '#173b34' }}>
                {fmtMoney(fin.revenus)}
              </span>
              <span className="ov-stat__lbl">Revenus</span>
            </div>
            <div className="ov-stat">
              <span className="ov-stat__num" style={{ color: '#a5402c' }}>
                {fmtMoney(fin.depenses)}
              </span>
              <span className="ov-stat__lbl">Dépenses</span>
            </div>
            <div className="ov-stat">
              <span
                className="ov-stat__num"
                style={{ color: fin.net < 0 ? '#a5402c' : 'var(--ink)' }}
              >
                {fmtMoney(fin.net)}
              </span>
              <span className="ov-stat__lbl">Net</span>
            </div>
          </div>
        </GlowCard>

        {/* Nouvelles du jour (pleine largeur) */}
        <GlowCard className="ov-card ov-card--wide">
          <header className="ov-card__head">
            <h3>
              Nouvelles du jour
              {todayNews.length > 0 && (
                <span className="ov-count">{unreadToday} non lue(s)</span>
              )}
            </h3>
            <button className="ov-link" onClick={() => onNavigate('news')}>
              Voir →
            </button>
          </header>
          {!news ? (
            <p className="ov-empty">Chargement des nouvelles…</p>
          ) : (
            <>
              {todayNews.length === 0 && (
                <p className="ov-news-note">
                  Rien de neuf aujourd’hui — dernières nouvelles :
                </p>
              )}
              <ul className="ov-list">
                {newsShown.map((it, i) => (
                  <li
                    key={(it.link || it.title) + i}
                    className={`ov-item ${readSet.has(it.link) ? 'is-read' : ''}`}
                  >
                    <span className="ov-dot" style={{ background: it.color }} />
                    <a
                      className="ov-news-link"
                      href={it.link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="ov-item__title">{it.title}</span>
                      <span className="ov-item__meta">{it.source}</span>
                    </a>
                  </li>
                ))}
                {newsShown.length === 0 && (
                  <li className="ov-empty">Aucune nouvelle pour l’instant.</li>
                )}
              </ul>
            </>
          )}
        </GlowCard>

        {/* Renouvellements à venir (pleine largeur) */}
        <GlowCard className="ov-card ov-card--wide">
          <header className="ov-card__head">
            <h3>Renouvellements à venir</h3>
            <button className="ov-link" onClick={() => onNavigate('pipeline')}>
              Voir →
            </button>
          </header>
          <ul className="ov-list">
            {renewals.map((c) => (
              <li
                key={c.id}
                className="ov-item ov-item--click"
                onClick={() => onOpenClient && onOpenClient(c)}
              >
                <span className="ov-dot" style={{ background: '#8459b3' }} />
                <div className="ov-item__main">
                  <span className="ov-item__title">{c.nom || 'Sans nom'}</span>
                  <span className="ov-item__meta">
                    Renouvellement · {fmtDate(c.renouvellement)}
                  </span>
                </div>
                {c._soon && <span className="ov-badge-soon">À contacter</span>}
              </li>
            ))}
            {renewals.length === 0 && (
              <li className="ov-empty">
                Aucun renouvellement à l’horizon. Ils apparaîtront ici quand tu passeras
                un dossier à « Financé ».
              </li>
            )}
          </ul>
        </GlowCard>
      </div>
    </div>
  )
}
