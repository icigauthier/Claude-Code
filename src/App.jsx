import { useEffect, useMemo, useState } from 'react'
import { api } from './api.js'
import BackgroundPaths from './components/BackgroundPaths.jsx'
import Overview from './components/Overview.jsx'
import Board from './components/Board.jsx'
import Agenda from './components/Agenda.jsx'
import Todo from './components/Todo.jsx'
import Finance from './components/Finance.jsx'
import News from './components/News.jsx'
import Contacts from './components/Contacts.jsx'
import Partners from './components/Partners.jsx'
import Performance from './components/Performance.jsx'
import ClientModal from './components/ClientModal.jsx'
import PartnerModal from './components/PartnerModal.jsx'
import EventModal from './components/EventModal.jsx'
import RenewalPrompt from './components/RenewalPrompt.jsx'

const pad2 = (x) => String(x).padStart(2, '0')
const isoLocal = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

// Soustrait n mois à une date « AAAA-MM-JJ » (gère le débordement de mois).
function minusMonths(isoDate, n) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return isoLocal(new Date(y, m - 1 - n, d))
}

const NAV = [
  { key: 'overview', label: "Vue d'ensemble", icon: '◧' },
  { key: 'pipeline', label: 'Pipeline', icon: '▦' },
  { key: 'agenda', label: 'Agenda', icon: '🗓' },
  { key: 'todo', label: 'À faire', icon: '✓' },
  { key: 'contacts', label: 'Contacts', icon: '☰' },
  { key: 'partners', label: 'Partenaires', icon: '⤳' },
  { key: 'finance', label: 'Finance', icon: '$' },
  { key: 'news', label: 'Nouvelles', icon: '📰' },
  { key: 'performance', label: 'Performance', icon: '📈' },
]

export default function App() {
  const [clients, setClients] = useState([])
  const [partners, setPartners] = useState([])
  const [events, setEvents] = useState([])
  const [todos, setTodos] = useState([])
  const [finances, setFinances] = useState([])
  const [, setSubscribers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('overview')
  const [query, setQuery] = useState('')
  const [editingClient, setEditingClient] = useState(null)
  const [editingPartner, setEditingPartner] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [outlook, setOutlook] = useState({ configured: false, connected: false })
  const [eventsVersion, setEventsVersion] = useState(0)
  const [renewalFor, setRenewalFor] = useState(null)
  const [toast, setToast] = useState('')

  async function load() {
    try {
      setError('')
      const data = await api.getState()
      setClients(data.clients || [])
      setPartners(data.partners || [])
      setEvents(data.events || [])
      setTodos(data.todos || [])
      setFinances(data.finances || [])
      setSubscribers(data.subscribers || [])
    } catch {
      setError('Impossible de charger les données. Le serveur est-il démarré ?')
    } finally {
      setLoading(false)
    }
  }

  async function refreshOutlook() {
    try {
      setOutlook(await api.outlookStatus())
    } catch {
      setOutlook({ configured: false, connected: false })
    }
  }

  useEffect(() => {
    load()
    refreshOutlook()
  }, [])

  // ---- Import automatique des leads du formulaire (via Outlook) ----
  async function scanLeads() {
    try {
      const r = await api.scanLeads()
      const parts = []
      if (r.created > 0) {
        setClients((cs) => [...r.newClients, ...cs])
        parts.push(r.created === 1 ? '1 nouveau lead' : `${r.created} nouveaux leads`)
      }
      const vt = r.voice?.todos || []
      const ve = r.voice?.events || []
      if (vt.length) {
        setTodos((ts) => [...vt, ...ts])
        parts.push(vt.length === 1 ? '1 tâche' : `${vt.length} tâches`)
      }
      if (ve.length) {
        setEventsVersion((v) => v + 1)
        parts.push(ve.length === 1 ? '1 rendez-vous' : `${ve.length} rendez-vous`)
      }
      const ns = r.newSubscribers || []
      if (ns.length) {
        setSubscribers((ss) => [...ss, ...ns])
        parts.push(ns.length === 1 ? '1 abonné' : `${ns.length} abonnés`)
      }
      const unsub = r.unsubscribed || []
      if (unsub.length) {
        setSubscribers((ss) => ss.filter((s) => !unsub.includes(s.email)))
        setToast(
          unsub.length === 1
            ? '1 désabonnement traité 👋'
            : `${unsub.length} désabonnements traités 👋`,
        )
      }
      if (parts.length) {
        const icon = vt.length || ve.length ? '🎙️' : ns.length ? '📧' : '🎉'
        setToast(`${parts.join(' · ')} ajouté(s) ${icon}`)
      }
      if (r.needsAuth) refreshOutlook() // met à jour l'état « lecture courriels »
    } catch {
      /* silencieux : on réessaiera au prochain cycle */
    }
  }

  // Sonde toutes les 60 s quand Outlook est connecté.
  useEffect(() => {
    if (!outlook.connected) return
    scanLeads()
    const id = setInterval(scanLeads, 60000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlook.connected])

  // Efface le message après quelques secondes.
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 6000)
    return () => clearTimeout(id)
  }, [toast])

  // ---- Clients ----
  async function saveClient(patch) {
    const wasFinance = editingClient?.statut === 'finance'
    let saved
    if (editingClient && editingClient.id) {
      saved = await api.update(editingClient.id, patch)
      setClients((cs) => cs.map((c) => (c.id === saved.id ? saved : c)))
    } else {
      saved = await api.create(patch)
      setClients((cs) => [saved, ...cs])
    }
    setEditingClient(null)
    if (saved.statut === 'finance' && !wasFinance) setRenewalFor(saved)
  }
  async function deleteClient(id) {
    await api.remove(id)
    setClients((cs) => cs.filter((c) => c.id !== id))
    setEditingClient(null)
  }
  async function moveClient(id, statut) {
    const prev = clients
    const current = clients.find((c) => c.id === id)
    const becameFinance = statut === 'finance' && current?.statut !== 'finance'
    setClients((cs) => cs.map((c) => (c.id === id ? { ...c, statut } : c)))
    try {
      await api.update(id, { statut })
      if (becameFinance && current) setRenewalFor({ ...current, statut })
    } catch {
      setClients(prev)
    }
  }

  // ---- Partenaires ----
  async function savePartner(patch) {
    if (editingPartner && editingPartner.id) {
      const updated = await api.updatePartner(editingPartner.id, patch)
      setPartners((ps) => ps.map((p) => (p.id === updated.id ? updated : p)))
    } else {
      const created = await api.createPartner(patch)
      setPartners((ps) => [created, ...ps])
    }
    setEditingPartner(null)
  }
  async function deletePartner(id) {
    await api.removePartner(id)
    setPartners((ps) => ps.filter((p) => p.id !== id))
    setEditingPartner(null)
  }

  // ---- Rencontres (agenda) ----
  // Charge les rencontres du mois affiché : Outlook si connecté, sinon local.
  async function loadMonth(startISO, endISO) {
    if (outlook.connected) return api.outlookEvents(startISO, endISO)
    const s = startISO.slice(0, 10)
    const e = endISO.slice(0, 10)
    return events.filter((ev) => ev.date && ev.date >= s && ev.date < e)
  }

  async function saveEvent(patch) {
    const id = editingEvent && editingEvent.id
    if (outlook.connected) {
      if (id) await api.updateOutlookEvent(id, patch)
      else await api.createOutlookEvent(patch)
    } else if (id) {
      const updated = await api.updateEvent(id, patch)
      setEvents((es) => es.map((e) => (e.id === updated.id ? updated : e)))
    } else {
      const created = await api.createEvent(patch)
      setEvents((es) => [created, ...es])
    }
    setEditingEvent(null)
    setEventsVersion((v) => v + 1)
  }

  async function deleteEvent(id) {
    if (outlook.connected) await api.removeOutlookEvent(id)
    else {
      await api.removeEvent(id)
      setEvents((es) => es.filter((e) => e.id !== id))
    }
    setEditingEvent(null)
    setEventsVersion((v) => v + 1)
  }

  // Ajoute une rencontre à l'agenda (Outlook si connecté, sinon local).
  async function addAgendaEvent(ev) {
    if (outlook.connected) return api.createOutlookEvent(ev)
    const created = await api.createEvent(ev)
    setEvents((es) => [created, ...es])
    return created
  }

  // Depuis le popup « Financé » : crée le rappel 6 mois avant + l'échéance.
  async function createRenewalEvent(client, date) {
    const nom = client.nom || 'client'
    const cid = client.id || ''
    const rappelDate = minusMonths(date, 6)

    await addAgendaEvent({
      titre: `📞 Contacter ${nom} — renouvellement`,
      type: 'Renouvellement',
      date: rappelDate,
      heureDebut: '09:00',
      heureFin: '09:30',
      clientId: cid,
      lieu: '',
      notes: `Rappel : renouvellement de ${nom} le ${date}. Le contacter maintenant pour magasiner son renouvellement (6 mois d'avance).`,
    })

    await addAgendaEvent({
      titre: `Renouvellement — ${nom} (échéance)`,
      type: 'Renouvellement',
      date,
      heureDebut: '09:00',
      heureFin: '09:30',
      clientId: cid,
      lieu: '',
      notes: `Date de renouvellement hypothécaire de ${nom}.`,
    })

    if (client.id) {
      try {
        const upd = await api.update(client.id, { renouvellement: date })
        setClients((cs) => cs.map((c) => (c.id === upd.id ? upd : c)))
      } catch {
        /* ignore */
      }
    }
    setEventsVersion((v) => v + 1)
    setRenewalFor(null)
  }

  // Rencontres à venir (aujourd'hui → +45 jours) pour la vue « À faire ».
  function loadUpcoming() {
    const now = new Date()
    const later = new Date(now)
    later.setDate(later.getDate() + 45)
    return loadMonth(`${isoLocal(now)}T00:00:00`, `${isoLocal(later)}T00:00:00`)
  }

  // ---- Tâches ----
  async function addTodo(text) {
    const created = await api.createTodo({ text })
    setTodos((ts) => [created, ...ts])
  }
  async function toggleTodo(t) {
    const updated = await api.updateTodo(t.id, { done: !t.done })
    setTodos((ts) => ts.map((x) => (x.id === updated.id ? updated : x)))
  }
  async function deleteTodo(id) {
    await api.removeTodo(id)
    setTodos((ts) => ts.filter((t) => t.id !== id))
  }

  // ---- Finances ----
  async function addFinance(tx) {
    const created = await api.createFinance(tx)
    setFinances((fs) => [created, ...fs])
  }
  async function deleteFinance(id) {
    await api.removeFinance(id)
    setFinances((fs) => fs.filter((f) => f.id !== id))
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) =>
      [c.nom, c.courriel, c.telephone, c.ville, c.projet, c.dossierFinmo]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q)),
    )
  }, [clients, query])

  const showSearch = view === 'pipeline' || view === 'contacts'
  const title = NAV.find((n) => n.key === view)?.label
  const needMailAuth = outlook.connected && outlook.mailEnabled === false

  return (
    <div className="app app--nav">
      <BackgroundPaths />
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="brand__mark" />
          <div>
            <strong>CRM</strong> <span className="brand__ici">ici</span>Gauthier
          </div>
        </div>
        <nav className="sidebar__nav">
          {NAV.map((n) => (
            <button
              key={n.key}
              className={`navitem ${view === n.key ? 'is-active' : ''}`}
              onClick={() => setView(n.key)}
            >
              <span className="navitem__icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1 className="topbar__title">{title}</h1>
          {showSearch && (
            <input
              className="search"
              type="search"
              placeholder="Rechercher…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          <div className="topbar__actions">
            <button className="btn btn--ghost" onClick={load} title="Rafraîchir">↻</button>
            {outlook.connected && outlook.mailEnabled && (
              <button
                className="btn btn--ghost"
                onClick={scanLeads}
                title="Chercher maintenant les nouveaux leads du formulaire"
              >
                ⤵ Leads
              </button>
            )}
            {showSearch && (
              <button className="btn btn--primary" onClick={() => setEditingClient({})}>
                + Nouveau client
              </button>
            )}
          </div>
        </header>

        {error && <div className="banner banner--error">{error}</div>}
        {needMailAuth && (
          <div className="banner banner--info">
            <span>
              Pour importer tes leads du formulaire automatiquement, autorise la lecture
              de tes courriels.
            </span>
            <a className="banner__link" href="/auth/login">Se reconnecter à Outlook →</a>
          </div>
        )}

        <div className="content">
          {loading ? (
            <div className="loading">Chargement…</div>
          ) : view === 'overview' ? (
            <Overview
              clients={clients}
              todos={todos}
              finances={finances}
              loadUpcoming={loadUpcoming}
              version={eventsVersion}
              onNavigate={setView}
              onOpenClient={setEditingClient}
              onNewClient={() => setEditingClient({})}
            />
          ) : view === 'pipeline' ? (
            <Board clients={filtered} onOpen={setEditingClient} onMove={moveClient} />
          ) : view === 'agenda' ? (
            <Agenda
              loadMonth={loadMonth}
              version={eventsVersion}
              outlook={outlook}
              onRefreshOutlook={refreshOutlook}
              onOpenEvent={setEditingEvent}
              onNewEvent={(date) => setEditingEvent({ date })}
            />
          ) : view === 'todo' ? (
            <Todo
              todos={todos}
              onAdd={addTodo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              loadUpcoming={loadUpcoming}
              version={eventsVersion}
            />
          ) : view === 'finance' ? (
            <Finance finances={finances} onAdd={addFinance} onDelete={deleteFinance} />
          ) : view === 'news' ? (
            <News />
          ) : view === 'contacts' ? (
            <Contacts clients={filtered} onOpen={setEditingClient} />
          ) : view === 'partners' ? (
            <Partners
              partners={partners}
              onOpen={setEditingPartner}
              onNew={() => setEditingPartner({})}
            />
          ) : (
            <Performance clients={clients} />
          )}
        </div>
      </div>

      {editingClient && (
        <ClientModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSave={saveClient}
          onDelete={deleteClient}
        />
      )}
      {editingPartner && (
        <PartnerModal
          partner={editingPartner}
          onClose={() => setEditingPartner(null)}
          onSave={savePartner}
          onDelete={deletePartner}
        />
      )}
      {editingEvent && (
        <EventModal
          event={editingEvent}
          clients={clients}
          connected={outlook.connected}
          onClose={() => setEditingEvent(null)}
          onSave={saveEvent}
          onDelete={deleteEvent}
        />
      )}
      {renewalFor && (
        <RenewalPrompt
          client={renewalFor}
          onConfirm={(date) => createRenewalEvent(renewalFor, date)}
          onSkip={() => setRenewalFor(null)}
        />
      )}
      {toast && (
        <div className="toast" role="status" onClick={() => setToast('')}>
          {toast}
        </div>
      )}
    </div>
  )
}
