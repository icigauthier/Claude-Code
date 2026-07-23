import express from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as outlook from './outlook.js'
import { getNews } from './news.js'
import * as netlify from './netlify.js'
import { readData, writeData } from './storage.js'
import { setupAuth } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 4321

function newId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/* ---------- App ---------- */
const app = express()
app.use(express.json({ limit: '2mb' }))

// Connexion sécurisée (active en ligne dès qu'un mot de passe est défini,
// transparente sur ton PC en local).
setupAuth(app)

app.get('/api/state', async (req, res) => {
  const data = await readData()
  data.posts = await readPosts()
  res.json(data)
})

/* ---- Clients ---- */
app.post('/api/clients', async (req, res) => {
  const data = await readData()
  const now = new Date().toISOString()
  const client = {
    id: newId('cl_'),
    nom: '', courriel: '', telephone: '', statut: 'nouveau',
    projet: '', echeancier: '', ville: '', source: '',
    dossierFinmo: '', prochainSuivi: '', notes: [],
    ...req.body,
    cree: now, maj: now,
  }
  data.clients.unshift(client)
  await writeData(data)
  res.status(201).json(client)
})

app.patch('/api/clients/:id', async (req, res) => {
  const data = await readData()
  const i = data.clients.findIndex((c) => c.id === req.params.id)
  if (i === -1) return res.status(404).json({ error: 'Introuvable' })
  data.clients[i] = {
    ...data.clients[i], ...req.body,
    id: data.clients[i].id, cree: data.clients[i].cree,
    maj: new Date().toISOString(),
  }
  await writeData(data)
  res.json(data.clients[i])
})

app.delete('/api/clients/:id', async (req, res) => {
  const data = await readData()
  const before = data.clients.length
  data.clients = data.clients.filter((c) => c.id !== req.params.id)
  if (data.clients.length === before) return res.status(404).json({ error: 'Introuvable' })
  await writeData(data)
  res.json({ ok: true })
})

/* ---- Partenaires ---- */
app.post('/api/partners', async (req, res) => {
  const data = await readData()
  const now = new Date().toISOString()
  const partner = {
    id: newId('pa_'),
    nom: '', type: '', contact: '', telephone: '', courriel: '', notes: '',
    ...req.body,
    cree: now, maj: now,
  }
  data.partners.unshift(partner)
  await writeData(data)
  res.status(201).json(partner)
})

app.patch('/api/partners/:id', async (req, res) => {
  const data = await readData()
  const i = data.partners.findIndex((p) => p.id === req.params.id)
  if (i === -1) return res.status(404).json({ error: 'Introuvable' })
  data.partners[i] = {
    ...data.partners[i], ...req.body,
    id: data.partners[i].id, cree: data.partners[i].cree,
    maj: new Date().toISOString(),
  }
  await writeData(data)
  res.json(data.partners[i])
})

app.delete('/api/partners/:id', async (req, res) => {
  const data = await readData()
  const before = data.partners.length
  data.partners = data.partners.filter((p) => p.id !== req.params.id)
  if (data.partners.length === before) return res.status(404).json({ error: 'Introuvable' })
  await writeData(data)
  res.json({ ok: true })
})

/* ---- Rencontres (agenda) ---- */
app.post('/api/events', async (req, res) => {
  const data = await readData()
  const now = new Date().toISOString()
  const event = {
    id: newId('ev_'),
    titre: '', type: '', date: '', heureDebut: '', heureFin: '',
    clientId: '', lieu: '', notes: '',
    ...req.body,
    cree: now, maj: now,
  }
  data.events.unshift(event)
  await writeData(data)
  res.status(201).json(event)
})

app.patch('/api/events/:id', async (req, res) => {
  const data = await readData()
  const i = data.events.findIndex((e) => e.id === req.params.id)
  if (i === -1) return res.status(404).json({ error: 'Introuvable' })
  data.events[i] = {
    ...data.events[i], ...req.body,
    id: data.events[i].id, cree: data.events[i].cree,
    maj: new Date().toISOString(),
  }
  await writeData(data)
  res.json(data.events[i])
})

app.delete('/api/events/:id', async (req, res) => {
  const data = await readData()
  const before = data.events.length
  data.events = data.events.filter((e) => e.id !== req.params.id)
  if (data.events.length === before) return res.status(404).json({ error: 'Introuvable' })
  await writeData(data)
  res.json({ ok: true })
})

/* ---- Tâches (to-do) ---- */
app.post('/api/todos', async (req, res) => {
  const data = await readData()
  const now = new Date().toISOString()
  const todo = { id: newId('td_'), text: '', done: false, due: '', ...req.body, cree: now, maj: now }
  data.todos.unshift(todo)
  await writeData(data)
  res.status(201).json(todo)
})
app.patch('/api/todos/:id', async (req, res) => {
  const data = await readData()
  const i = data.todos.findIndex((t) => t.id === req.params.id)
  if (i === -1) return res.status(404).json({ error: 'Introuvable' })
  data.todos[i] = { ...data.todos[i], ...req.body, id: data.todos[i].id, cree: data.todos[i].cree, maj: new Date().toISOString() }
  await writeData(data)
  res.json(data.todos[i])
})
app.delete('/api/todos/:id', async (req, res) => {
  const data = await readData()
  const before = data.todos.length
  data.todos = data.todos.filter((t) => t.id !== req.params.id)
  if (data.todos.length === before) return res.status(404).json({ error: 'Introuvable' })
  await writeData(data)
  res.json({ ok: true })
})

/* ---- Finances (revenus / dépenses) ---- */
app.post('/api/finances', async (req, res) => {
  const data = await readData()
  const now = new Date().toISOString()
  const tx = {
    id: newId('fi_'),
    date: '', type: 'revenu', categorie: '', description: '', montant: 0,
    ...req.body,
    montant: Number(req.body?.montant) || 0,
    cree: now, maj: now,
  }
  data.finances.unshift(tx)
  await writeData(data)
  res.status(201).json(tx)
})
app.patch('/api/finances/:id', async (req, res) => {
  const data = await readData()
  const i = data.finances.findIndex((t) => t.id === req.params.id)
  if (i === -1) return res.status(404).json({ error: 'Introuvable' })
  const patch = { ...req.body }
  if (patch.montant !== undefined) patch.montant = Number(patch.montant) || 0
  data.finances[i] = { ...data.finances[i], ...patch, id: data.finances[i].id, cree: data.finances[i].cree, maj: new Date().toISOString() }
  await writeData(data)
  res.json(data.finances[i])
})
app.delete('/api/finances/:id', async (req, res) => {
  const data = await readData()
  const before = data.finances.length
  data.finances = data.finances.filter((t) => t.id !== req.params.id)
  if (data.finances.length === before) return res.status(404).json({ error: 'Introuvable' })
  await writeData(data)
  res.json({ ok: true })
})

/* ---- Journal / blog (écrit dans le contenu du SITE web) ---- */
// Les billets vivent dans le site pour s'y afficher au prochain déploiement.
const POSTS_FILE = path.join(__dirname, '..', 'hypotheque-site', 'src', 'data', 'posts.json')
async function readPosts() {
  try {
    const arr = JSON.parse(await fs.readFile(POSTS_FILE, 'utf8'))
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}
async function writePosts(posts) {
  await fs.mkdir(path.dirname(POSTS_FILE), { recursive: true })
  const tmp = POSTS_FILE + '.tmp'
  await fs.writeFile(tmp, JSON.stringify(posts, null, 2), 'utf8')
  await fs.rename(tmp, POSTS_FILE)
}

app.get('/api/posts', async (req, res) => {
  res.json(await readPosts())
})
app.post('/api/posts', async (req, res) => {
  const posts = await readPosts()
  const now = new Date().toISOString()
  const post = {
    id: newId('po_'),
    titre: '', date: now.slice(0, 10), extrait: '', contenu: '', publie: false,
    ...req.body,
    cree: now, maj: now,
  }
  posts.unshift(post)
  await writePosts(posts)
  res.status(201).json(post)
})
app.patch('/api/posts/:id', async (req, res) => {
  const posts = await readPosts()
  const i = posts.findIndex((p) => p.id === req.params.id)
  if (i === -1) return res.status(404).json({ error: 'Introuvable' })
  posts[i] = { ...posts[i], ...req.body, id: posts[i].id, cree: posts[i].cree, maj: new Date().toISOString() }
  await writePosts(posts)
  res.json(posts[i])
})
app.delete('/api/posts/:id', async (req, res) => {
  const posts = await readPosts()
  const before = posts.length
  const next = posts.filter((p) => p.id !== req.params.id)
  if (next.length === before) return res.status(404).json({ error: 'Introuvable' })
  await writePosts(next)
  res.json({ ok: true })
})

/* ---- Infolettre : abonnés + envoi d'un billet ---- */
function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function postToHtml(post) {
  const paras = String(post.contenu || '')
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#191309;">${escHtml(p).replace(/\n/g, '<br>')}</p>`,
    )
    .join('')
  const url = 'https://icigauthier-journal.netlify.app'
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:8px 4px;">
    <p style="font-family:monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b8894b;margin:0 0 6px;">Blog iciGauthier</p>
    <h1 style="font-size:24px;line-height:1.2;color:#191309;margin:0 0 8px;">${escHtml(post.titre)}</h1>
    ${post.extrait ? `<p style="font-style:italic;color:#173b34;font-size:16px;margin:0 0 18px;">${escHtml(post.extrait)}</p>` : ''}
    ${paras}
    <p style="margin:24px 0;"><a href="${url}" style="background:#173b34;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:100px;font-weight:bold;display:inline-block;">Lire sur le site →</a></p>
    <hr style="border:none;border-top:1px solid #e2dbc9;margin:24px 0;">
    <p style="font-size:12px;color:#6b6156;line-height:1.6;">Tu reçois ce courriel parce que tu t'es abonné au blog d'iciGauthier — Antoine Gauthier, agent hypothécaire niveau 1 (Shelto Inc., FSRA #13568). Pour te désabonner, réponds « STOP » à ce courriel.</p>
  </div>`
}

app.delete('/api/subscribers/:email', async (req, res) => {
  const data = await readData()
  const email = decodeURIComponent(req.params.email).toLowerCase()
  const before = data.subscribers.length
  data.subscribers = data.subscribers.filter((s) => s.email !== email)
  if (data.subscribers.length === before) return res.status(404).json({ error: 'Introuvable' })
  await writeData(data)
  res.json({ ok: true })
})

app.post('/api/newsletter/send', async (req, res) => {
  try {
    const posts = await readPosts()
    const i = posts.findIndex((p) => p.id === req.body?.postId)
    if (i === -1) return res.status(404).json({ error: 'Billet introuvable' })
    const testEmail = (req.body?.testEmail || '').trim()
    const html = postToHtml(posts[i])

    // Envoi de test vers une seule adresse (ne marque pas le billet comme envoyé)
    if (testEmail) {
      try {
        await outlook.sendMail({ subject: `[TEST] ${posts[i].titre}`, html, to: [testEmail] })
      } catch (e) {
        return res.json({ needsAuth: true, error: e.message })
      }
      return res.json({ sent: 1, test: true, to: testEmail })
    }

    const data = await readData()
    const emails = data.subscribers.map((s) => s.email).filter(Boolean)
    if (emails.length === 0) return res.json({ noSubscribers: true })
    try {
      await outlook.sendMail({ subject: posts[i].titre, html, bcc: emails })
    } catch (e) {
      return res.json({ needsAuth: true, error: e.message })
    }
    posts[i] = { ...posts[i], emailedAt: new Date().toISOString(), maj: new Date().toISOString() }
    await writePosts(posts)
    res.json({ sent: emails.length, post: posts[i] })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ---- Connexion Outlook (Microsoft) ---- */
app.get('/api/outlook/status', async (req, res) => {
  try {
    res.json(await outlook.getStatus())
  } catch {
    res.json({ configured: false, connected: false })
  }
})

app.get('/auth/login', async (req, res) => {
  try {
    const url = await outlook.buildAuthUrl()
    if (!url) return res.status(400).send('Client ID Microsoft manquant dans data/config.json.')
    res.redirect(url)
  } catch (e) {
    res.status(500).send('Erreur de connexion : ' + e.message)
  }
})

app.get('/auth/callback', async (req, res) => {
  try {
    await outlook.handleCallback(req.query.code, req.query.state)
    res.redirect('/?outlook=connected')
  } catch (e) {
    res.status(500).send('Échec de la connexion Outlook : ' + e.message)
  }
})

app.get('/auth/logout', async (req, res) => {
  await outlook.logout()
  res.redirect('/')
})

// Événements du calendrier Outlook
app.get('/api/outlook/events', async (req, res) => {
  try {
    res.json(await outlook.listEvents(req.query.start, req.query.end))
  } catch (e) {
    res.status(e.code === 'NOAUTH' ? 401 : 500).json({ error: e.message })
  }
})
app.post('/api/outlook/events', async (req, res) => {
  try {
    res.status(201).json(await outlook.createEvent(req.body))
  } catch (e) {
    res.status(e.code === 'NOAUTH' ? 401 : 500).json({ error: e.message })
  }
})
app.patch('/api/outlook/events/:id', async (req, res) => {
  try {
    res.json(await outlook.updateEvent(req.params.id, req.body))
  } catch (e) {
    res.status(e.code === 'NOAUTH' ? 401 : 500).json({ error: e.message })
  }
})
app.delete('/api/outlook/events/:id', async (req, res) => {
  try {
    await outlook.deleteEvent(req.params.id)
    res.json({ ok: true })
  } catch (e) {
    res.status(e.code === 'NOAUTH' ? 401 : 500).json({ error: e.message })
  }
})

/* ---- Import automatique des leads (courriels du formulaire → fiches) ---- */
function leadToClient(L, now) {
  return {
    id: newId('cl_'),
    nom: L.nom || '', courriel: L.courriel || '', telephone: L.telephone || '',
    statut: 'nouveau',
    projet: L.projet || '', echeancier: L.echeancier || '', ville: L.ville || '',
    source: L.source || 'Formulaire du site',
    dossierFinmo: '', prochainSuivi: '',
    notes: L.message ? [{ date: now.slice(0, 10), text: 'Message du formulaire : ' + L.message }] : [],
    cree: now, maj: now,
  }
}

/* ---- Analyse des commandes vocales (courriels « CRM: … ») ---- */
const WEEKDAYS = { dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 }
const MONTHS = {
  janvier: 0, 'février': 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, 'août': 7, aout: 7, septembre: 8, octobre: 9, novembre: 10,
  'décembre': 11, decembre: 11,
}
const pad2 = (n) => String(n).padStart(2, '0')
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

// Devine une date (AAAA-MM-JJ) et une heure (HH:MM) à partir d'un texte français.
function parseWhen(text) {
  const t = (text || '').toLowerCase()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let date = null

  if (/\baujourd'?hui\b/.test(t)) date = new Date(today)
  else if (/\bapr[eè]s[-\s]?demain\b/.test(t)) {
    date = new Date(today)
    date.setDate(date.getDate() + 2)
  } else if (/\bdemain\b/.test(t)) {
    date = new Date(today)
    date.setDate(date.getDate() + 1)
  } else {
    for (const [name, wd] of Object.entries(WEEKDAYS)) {
      if (new RegExp(`\\b${name}\\b`, 'i').test(t)) {
        const d = new Date(today)
        let diff = (wd - d.getDay() + 7) % 7
        if (diff === 0) diff = 7 // prochaine occurrence
        d.setDate(d.getDate() + diff)
        date = d
        break
      }
    }
    if (!date) {
      const md = t.match(
        /\b(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\b/i,
      )
      if (md) {
        const day = parseInt(md[1], 10)
        const mon = MONTHS[md[2].toLowerCase()]
        let d = new Date(today.getFullYear(), mon, day)
        if (d < today) d = new Date(today.getFullYear() + 1, mon, day)
        date = d
      }
    }
  }

  let heure = null
  const hm = t.match(/\b(\d{1,2})\s*[h:]\s*(\d{2})?/i)
  if (hm) {
    const h = parseInt(hm[1], 10)
    const mi = hm[2] ? parseInt(hm[2], 10) : 0
    if (h >= 0 && h < 24 && mi < 60) heure = `${pad2(h)}:${pad2(mi)}`
  }

  return { date: date ? isoOf(date) : null, heure }
}

// Route une commande vocale vers une tâche ou un événement d'agenda.
function parseCommand(command) {
  let text = (command || '').trim()
  const eventKw = /^(agenda|rdv|rendez[-\s]?vous|rencontre|appel|r[ée]union|meeting)\b[\s:,-]*/i
  const todoKw = /^(t[aâ]che|todo|to-?do|[àa]\s*faire|rappelle?|rappel)\b[\s:,-]*/i

  let kind = null
  if (eventKw.test(text)) {
    kind = 'event'
    text = text.replace(eventKw, '').trim()
  } else if (todoKw.test(text)) {
    kind = 'todo'
    text = text.replace(todoKw, '').trim()
  }
  if (!kind) {
    const w = parseWhen(text)
    kind = w.date || w.heure ? 'event' : 'todo'
  }

  if (kind === 'event') {
    const w = parseWhen(text)
    return {
      kind,
      title: text || 'Rendez-vous',
      date: w.date || isoOf(new Date()),
      heureDebut: w.heure || '09:00',
    }
  }
  return { kind, title: text || command }
}

app.post('/api/leads/scan', async (req, res) => {
  try {
    const data = await readData()

    // Première fois : ligne de départ = il y a 24 h. On ne risque pas d'importer
    // du vieux (seuls les courriels du nouveau formulaire ont le bloc LEADv1),
    // mais un lead récent (ou un test) rentre tout de suite.
    if (!data.leadWatermark) {
      data.leadWatermark = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    }

    let leads
    try {
      leads = await outlook.fetchLeads(data.leadWatermark)
    } catch (e) {
      return res.json({ created: 0, needsAuth: true, error: e.message })
    }

    const now = new Date().toISOString()
    const newClients = []
    let maxTs = data.leadWatermark
    for (const item of leads) {
      if ((item.receivedDateTime || '') > maxTs) maxTs = item.receivedDateTime
      if (data.processedLeadEmails.includes(item.id)) continue
      const client = leadToClient(item.lead || {}, now)
      data.clients.unshift(client)
      newClients.push(client)
      data.processedLeadEmails.push(item.id)
    }

    // Commandes vocales (courriels « CRM: … » envoyés par le raccourci Siri)
    const voiceTodos = []
    const voiceEvents = []
    let commands = []
    try {
      commands = await outlook.fetchCommands(data.leadWatermark)
    } catch {
      commands = [] // mail non autorisé : on ignore, déjà géré par les leads
    }
    let olConnected = false
    if (commands.length) {
      try {
        olConnected = (await outlook.getStatus()).connected
      } catch {
        olConnected = false
      }
    }
    for (const item of commands) {
      if ((item.receivedDateTime || '') > maxTs) maxTs = item.receivedDateTime
      if (data.processedLeadEmails.includes(item.id)) continue
      const parsed = parseCommand(item.command)
      if (parsed.kind === 'todo') {
        const todo = { id: newId('td_'), text: parsed.title, done: false, due: '', source: 'voix', cree: now, maj: now }
        data.todos.unshift(todo)
        voiceTodos.push(todo)
      } else {
        const ev = {
          titre: parsed.title,
          type: 'Rencontre client',
          date: parsed.date,
          heureDebut: parsed.heureDebut,
          heureFin: '',
          clientId: '',
          lieu: '',
          notes: 'Créé par commande vocale.',
        }
        let saved = null
        if (olConnected) {
          try {
            saved = await outlook.createEvent(ev)
          } catch {
            saved = null
          }
        }
        if (!saved) {
          saved = { id: newId('ev_'), ...ev, cree: now, maj: now }
          data.events.unshift(saved)
        }
        voiceEvents.push(saved)
      }
      data.processedLeadEmails.push(item.id)
    }

    // Inscriptions à l'infolettre (courriels « Nouvel abonné … »)
    const newSubscribers = []
    let signups = []
    try {
      signups = await outlook.fetchSubscriberSignups(data.leadWatermark)
    } catch {
      signups = []
    }
    const knownEmails = new Set(data.subscribers.map((s) => s.email))
    for (const item of signups) {
      if ((item.receivedDateTime || '') > maxTs) maxTs = item.receivedDateTime
      if (data.processedLeadEmails.includes(item.id)) continue
      data.processedLeadEmails.push(item.id)
      if (item.email && !knownEmails.has(item.email)) {
        knownEmails.add(item.email)
        const sub = { email: item.email, cree: now }
        data.subscribers.push(sub)
        newSubscribers.push(sub)
      }
    }

    // Désabonnements (réponses « STOP » d'un abonné → retrait automatique)
    const unsubscribed = []
    let unsubs = []
    try {
      unsubs = await outlook.fetchUnsubscribes(data.leadWatermark)
    } catch {
      unsubs = []
    }
    for (const item of unsubs) {
      if ((item.receivedDateTime || '') > maxTs) maxTs = item.receivedDateTime
      if (data.processedLeadEmails.includes(item.id)) continue
      data.processedLeadEmails.push(item.id)
      if (item.email && knownEmails.has(item.email)) {
        knownEmails.delete(item.email)
        data.subscribers = data.subscribers.filter((s) => s.email !== item.email)
        unsubscribed.push(item.email)
      }
    }

    data.leadWatermark = maxTs
    if (data.processedLeadEmails.length > 300) {
      data.processedLeadEmails = data.processedLeadEmails.slice(-300)
    }
    await writeData(data)
    res.json({
      created: newClients.length,
      newClients,
      voice: { todos: voiceTodos, events: voiceEvents },
      subscribersAdded: newSubscribers.length,
      newSubscribers,
      unsubscribed,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ---- Déploiement Netlify (auto : reconstruit + publie le site) ---- */
app.get('/api/deploy/status', async (req, res) => {
  try {
    res.json(await netlify.getStatus())
  } catch {
    res.json({ configured: false })
  }
})
app.post('/api/deploy', async (req, res) => {
  try {
    res.json(await netlify.deploy())
  } catch (e) {
    if (e.code === 'NOCONFIG') return res.json({ needsConfig: true, error: e.message })
    res.status(500).json({ error: e.message })
  }
})

/* ---- Nouvelles (flux RSS agrégés, cache 15 min) ---- */
app.get('/api/news', async (req, res) => {
  try {
    res.json(await getNews(req.query.force === '1'))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ---------- Frontend (Vite en mode intégré) ---------- */
const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  app.use(express.static(path.join(__dirname, 'dist')))
  app.use((req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({
    root: __dirname,
    server: { middlewareMode: true },
    appType: 'spa',
  })
  app.use(vite.middlewares)
}

app.listen(PORT, () => {
  console.log(`\n  CRM iciGauthier en marche  →  http://localhost:${PORT}\n`)
})
