// Connexion au calendrier Outlook via Microsoft Graph (OAuth 2.0, MSAL).
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PublicClientApplication, CryptoProvider } from '@azure/msal-node'
import { kvGet, kvSet, kvDel } from './storage.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json')

const PORT = process.env.PORT || 4321
// Adresse publique de l'app. En ligne : fournie automatiquement par Render
// (RENDER_EXTERNAL_URL) ou par APP_URL. En local : localhost. Sert à construire
// l'adresse de redirection Microsoft (doit correspondre à celle d'Azure).
const BASE_URL = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`).replace(/\/+$/, '')
const REDIRECT_URI = `${BASE_URL}/auth/callback`
const AUTHORITY = 'https://login.microsoftonline.com/common'
// Permissions séparées : le calendrier marche même si la lecture des courriels
// n'est pas encore autorisée. La connexion demande l'union des deux.
const CAL_SCOPES = ['Calendars.ReadWrite', 'User.Read']
const MAIL_SCOPES = ['Mail.Read'] // lecture (leads, commandes vocales, abonnés)
const SEND_SCOPES = ['Mail.Send'] // envoi de l'infolettre
const ALL_SCOPES = [...CAL_SCOPES, 'Mail.Read', 'Mail.Send']

const cryptoProvider = new CryptoProvider()
const pkceStore = new Map() // state -> code verifier

let clientId = ''
let timezone = 'America/Toronto'
let pca = null

async function loadConfig() {
  let c = {}
  try {
    c = JSON.parse(await fs.readFile(CONFIG_FILE, 'utf8'))
  } catch {
    /* pas de config.json (normal en ligne : on lit les variables d'env) */
  }
  const id = (process.env.MS_CLIENT_ID || c.msClientId || '').trim()
  clientId = id === 'REMPLACE_PAR_TON_CLIENT_ID_MICROSOFT' ? '' : id
  timezone = process.env.MS_TIMEZONE || c.timezone || 'America/Toronto'
}

function cachePlugin() {
  return {
    beforeCacheAccess: async (ctx) => {
      try {
        const data = await kvGet('ms-cache.json')
        if (data) ctx.tokenCache.deserialize(data)
      } catch {
        /* pas de cache encore */
      }
    },
    afterCacheAccess: async (ctx) => {
      if (ctx.cacheHasChanged) {
        try {
          await kvSet('ms-cache.json', ctx.tokenCache.serialize())
        } catch {
          /* ignore */
        }
      }
    },
  }
}

async function getPca() {
  await loadConfig()
  if (!clientId) return null
  if (pca && pca.__cid === clientId) return pca
  pca = new PublicClientApplication({
    auth: { clientId, authority: AUTHORITY },
    cache: { cachePlugin: cachePlugin() },
  })
  pca.__cid = clientId
  return pca
}

async function getAccount(instance) {
  try {
    const raw = await kvGet('ms-account.json')
    if (!raw) return null
    const { homeAccountId } = JSON.parse(raw)
    return await instance.getTokenCache().getAccountByHomeId(homeAccountId)
  } catch {
    return null
  }
}

async function getToken(scopes = CAL_SCOPES) {
  const instance = await getPca()
  if (!instance) throw Object.assign(new Error('Non configuré'), { code: 'NOCONFIG' })
  const account = await getAccount(instance)
  if (!account) throw Object.assign(new Error('Non connecté'), { code: 'NOAUTH' })
  const r = await instance.acquireTokenSilent({ account, scopes })
  return r.accessToken
}

/* ---------- API publique ---------- */
export async function buildAuthUrl() {
  const instance = await getPca()
  if (!instance) return null
  const { verifier, challenge } = await cryptoProvider.generatePkceCodes()
  const state = cryptoProvider.createNewGuid()
  pkceStore.set(state, verifier)
  return instance.getAuthCodeUrl({
    scopes: ALL_SCOPES,
    redirectUri: REDIRECT_URI,
    codeChallenge: challenge,
    codeChallengeMethod: 'S256',
    state,
  })
}

export async function handleCallback(code, state) {
  const instance = await getPca()
  if (!instance) throw new Error('Client ID Microsoft manquant.')
  const codeVerifier = pkceStore.get(state)
  pkceStore.delete(state)
  const result = await instance.acquireTokenByCode({
    code,
    scopes: ALL_SCOPES,
    redirectUri: REDIRECT_URI,
    codeVerifier,
  })
  await kvSet(
    'ms-account.json',
    JSON.stringify({
      homeAccountId: result.account.homeAccountId,
      username: result.account.username,
    }),
  )
  return result.account
}

export async function getStatus() {
  await loadConfig()
  if (!clientId) return { configured: false, connected: false }
  const instance = await getPca()
  const account = await getAccount(instance)
  if (!account) return { configured: true, connected: false }
  let connected = false
  let mailEnabled = false
  let sendEnabled = false
  try {
    await instance.acquireTokenSilent({ account, scopes: CAL_SCOPES })
    connected = true
  } catch {
    /* calendrier non autorisé */
  }
  try {
    await instance.acquireTokenSilent({ account, scopes: MAIL_SCOPES })
    mailEnabled = true
  } catch {
    /* lecture courriels non autorisée */
  }
  try {
    await instance.acquireTokenSilent({ account, scopes: SEND_SCOPES })
    sendEnabled = true
  } catch {
    /* envoi courriels non autorisé */
  }
  return { configured: true, connected, mailEnabled, sendEnabled, email: account.username }
}

export async function logout() {
  const instance = await getPca()
  try {
    const account = await getAccount(instance)
    if (account) await instance.getTokenCache().removeAccount(account)
  } catch {
    /* ignore */
  }
  try {
    await kvDel('ms-account.json')
  } catch {
    /* ignore */
  }
}

/* ---------- Graph : calendrier ---------- */
async function graph(method, url, body) {
  const token = await getToken()
  const res = await fetch('https://graph.microsoft.com/v1.0' + url, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      Prefer: `outlook.timezone="${timezone}"`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const t = await res.text()
    throw Object.assign(new Error(`Graph ${res.status}: ${t}`), { status: res.status })
  }
  return res.status === 204 ? null : res.json()
}

function addHour(hhmm) {
  const [h, m] = (hhmm || '09:00').split(':').map(Number)
  return String((h + 1) % 24).padStart(2, '0') + ':' + String(m).padStart(2, '0')
}

function toGraph(ev) {
  const startTime = ev.heureDebut || '09:00'
  const endTime = ev.heureFin || addHour(startTime)
  return {
    subject: ev.titre || 'Rencontre',
    start: { dateTime: `${ev.date}T${startTime}:00`, timeZone: timezone },
    end: { dateTime: `${ev.date}T${endTime}:00`, timeZone: timezone },
    location: { displayName: ev.lieu || '' },
    body: { contentType: 'text', content: ev.notes || '' },
  }
}

function fromGraph(g) {
  const sd = g.start?.dateTime || ''
  const ed = g.end?.dateTime || ''
  return {
    id: g.id,
    titre: g.subject || '(sans titre)',
    date: sd.slice(0, 10),
    heureDebut: sd.slice(11, 16),
    heureFin: ed.slice(11, 16),
    lieu: g.location?.displayName || '',
    notes: g.bodyPreview || '',
    source: 'outlook',
  }
}

export async function listEvents(startISO, endISO) {
  const url =
    `/me/calendarView?startDateTime=${encodeURIComponent(startISO)}` +
    `&endDateTime=${encodeURIComponent(endISO)}` +
    `&$select=subject,start,end,location,bodyPreview&$orderby=start/dateTime&$top=250`
  const data = await graph('GET', url)
  return (data.value || []).map(fromGraph)
}

export async function createEvent(ev) {
  return fromGraph(await graph('POST', '/me/events', toGraph(ev)))
}

export async function updateEvent(id, ev) {
  return fromGraph(await graph('PATCH', '/me/events/' + id, toGraph(ev)))
}

export async function deleteEvent(id) {
  await graph('DELETE', '/me/events/' + id)
}

/* ---------- Graph : lecture des courriels (leads du formulaire) ---------- */
function b64urlDecode(s) {
  let b = s.replace(/-/g, '+').replace(/_/g, '/')
  while (b.length % 4) b += '='
  return Buffer.from(b, 'base64').toString('utf8')
}

// Extrait le bloc « LEADv1:<base64url> » inséré par le formulaire du site.
function parseLead(msg) {
  const html = msg.body?.content || ''
  const text = html.replace(/<[^>]+>/g, ' ')
  const m = text.match(/LEADv1:([A-Za-z0-9_-]+)/)
  if (!m) return null
  try {
    const lead = JSON.parse(b64urlDecode(m[1]))
    return lead && typeof lead === 'object' ? lead : null
  } catch {
    return null
  }
}

// Lit les courriels récents du formulaire non encore importés.
// Renvoie [{ id, receivedDateTime, subject, lead }].
async function listInbox(sinceISO, select) {
  const token = await getToken(MAIL_SCOPES)
  let url =
    'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages' +
    `?$select=${select}&$orderby=receivedDateTime desc&$top=40`
  if (sinceISO) url += `&$filter=receivedDateTime ge ${sinceISO}`
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } })
  if (!res.ok) {
    const t = await res.text()
    throw Object.assign(new Error(`Graph ${res.status}: ${t}`), { status: res.status })
  }
  const data = await res.json()
  return data.value || []
}

export async function fetchLeads(sinceISO) {
  const msgs = await listInbox(sinceISO, 'id,subject,receivedDateTime,body')
  const out = []
  for (const msg of msgs) {
    if (!/nouvelle fiche client/i.test(msg.subject || '')) continue
    const lead = parseLead(msg)
    if (lead) out.push({ id: msg.id, receivedDateTime: msg.receivedDateTime, subject: msg.subject, lead })
  }
  // Du plus ancien au plus récent (ordre d'arrivée).
  return out.sort((a, b) => (a.receivedDateTime || '').localeCompare(b.receivedDateTime || ''))
}

// Courriels de commande vocale : sujet « CRM: <commande> » (envoyés par un
// raccourci Siri). Renvoie [{ id, receivedDateTime, subject, command }].
export async function fetchCommands(sinceISO) {
  const msgs = await listInbox(sinceISO, 'id,subject,receivedDateTime,bodyPreview')
  const out = []
  for (const msg of msgs) {
    const m = (msg.subject || '').match(/^\s*crm\s*:\s*(.+)$/i)
    if (!m) continue
    let command = (m[1] || '').trim()
    if (!command) command = (msg.bodyPreview || '').trim()
    if (command) out.push({ id: msg.id, receivedDateTime: msg.receivedDateTime, subject: msg.subject, command })
  }
  return out.sort((a, b) => (a.receivedDateTime || '').localeCompare(b.receivedDateTime || ''))
}

// Inscriptions à l'infolettre : sujet « Nouvel abonné … » (formulaire du journal).
// Renvoie [{ id, receivedDateTime, email }].
export async function fetchSubscriberSignups(sinceISO) {
  const msgs = await listInbox(sinceISO, 'id,subject,receivedDateTime,body')
  const out = []
  for (const msg of msgs) {
    if (!/nouvel\s*abonn/i.test(msg.subject || '')) continue
    const text = (msg.body?.content || '').replace(/<[^>]+>/g, ' ')
    const m =
      text.match(/courriel_abonne[\s:]*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i) ||
      text.match(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/)
    if (m) out.push({ id: msg.id, receivedDateTime: msg.receivedDateTime, email: m[1].toLowerCase() })
  }
  return out.sort((a, b) => (a.receivedDateTime || '').localeCompare(b.receivedDateTime || ''))
}

// Désabonnements : réponses « STOP » (ou « désabonne »/« unsubscribe ») d'un abonné.
// On lit le début du message (bodyPreview) pour ignorer le texte cité de l'original.
export async function fetchUnsubscribes(sinceISO) {
  const msgs = await listInbox(sinceISO, 'id,subject,receivedDateTime,from,bodyPreview')
  const out = []
  for (const msg of msgs) {
    const from = msg.from?.emailAddress?.address?.toLowerCase()
    if (!from) continue
    const preview = (msg.bodyPreview || '').trim()
    const subj = (msg.subject || '').trim()
    const start = preview.slice(0, 40)
    const asked =
      /^\s*stop\b/i.test(start) ||
      /^\s*(d[ée]sabonne|d[ée]sinscri|unsubscribe|retire[- ]?moi|arr[êe]te)/i.test(start) ||
      /^\s*stop\s*$/i.test(subj)
    if (asked) out.push({ id: msg.id, receivedDateTime: msg.receivedDateTime, email: from })
  }
  return out.sort((a, b) => (a.receivedDateTime || '').localeCompare(b.receivedDateTime || ''))
}

// Envoie un courriel HTML (infolettre) : soi-même en « À », abonnés en copie cachée.
// `to` (optionnel) force les destinataires directs (utilisé pour un envoi de test).
export async function sendMail({ subject, html, bcc = [], to = null }) {
  const token = await getToken(SEND_SCOPES)
  const instance = await getPca()
  const account = await getAccount(instance)
  const me = account?.username
  const toList = to && to.length ? to : me ? [me] : []
  const message = {
    subject,
    body: { contentType: 'HTML', content: html },
    toRecipients: toList.map((a) => ({ emailAddress: { address: a } })),
    bccRecipients: bcc.map((a) => ({ emailAddress: { address: a } })),
  }
  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, saveToSentItems: true }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw Object.assign(new Error(`Graph ${res.status}: ${t}`), { status: res.status })
  }
}
