// Déploiement automatique du site sur Netlify (reconstruit + envoie dist/).
// Méthode « digest » de l'API Netlify : aucune dépendance (sha1 + fetch).
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileP = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json')
const SITE_DIR = path.join(__dirname, '..', 'hypotheque-site')
const DIST_DIR = path.join(SITE_DIR, 'dist')
const VITE_BIN = path.join(SITE_DIR, 'node_modules', 'vite', 'bin', 'vite.js')
const API = 'https://api.netlify.com/api/v1'

async function cfg() {
  try {
    const c = JSON.parse(await fs.readFile(CONFIG_FILE, 'utf8'))
    return {
      token: (c.netlifyToken || '').trim(),
      siteId: (c.netlifySiteId || '').trim(),
      mainSiteId: (c.netlifyMainSiteId || '').trim(),
    }
  } catch {
    return { token: '', siteId: '', mainSiteId: '' }
  }
}

export async function getStatus() {
  const { token, siteId } = await cfg()
  return { configured: !!(token && siteId) }
}

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) await walk(full, out)
    else out.push(full)
  }
  return out
}

const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex')

// Pousse un jeu de fichiers vers un site Netlify (méthode digest).
async function pushSite(token, siteId, entries) {
  const digest = {}
  for (const e of entries) {
    e.sha = sha1(e.buf)
    digest[e.rel] = e.sha
  }

  const createRes = await fetch(`${API}/sites/${siteId}/deploys`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: digest }),
  })
  if (!createRes.ok) {
    const t = await createRes.text()
    throw Object.assign(new Error(`Netlify ${createRes.status}: ${t}`), { status: createRes.status })
  }
  const dep = await createRes.json()
  const required = new Set(dep.required || [])

  let uploaded = 0
  for (const e of entries) {
    if (!required.has(e.sha)) continue
    const upPath = e.rel.split('/').map(encodeURIComponent).join('/')
    const up = await fetch(`${API}/deploys/${dep.id}/files${upPath}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
      body: e.buf,
    })
    if (!up.ok) {
      const t = await up.text()
      throw Object.assign(new Error(`Téléversement ${e.rel} → ${up.status}: ${t}`), { status: up.status })
    }
    uploaded++
  }

  return { uploaded, total: entries.length, url: dep.ssl_url || dep.deploy_ssl_url || dep.url || '' }
}

export async function deploy() {
  const { token, siteId, mainSiteId } = await cfg()
  if (!token || !siteId) throw Object.assign(new Error('Netlify non configuré'), { code: 'NOCONFIG' })

  // 1) Reconstruire le site une seule fois (intègre les billets à jour)
  await execFileP(process.execPath, [VITE_BIN, 'build'], {
    cwd: SITE_DIR,
    maxBuffer: 1024 * 1024 * 20,
  })

  const files = await walk(DIST_DIR)
  const raw = [] // { relRaw, buf }
  for (const full of files) {
    const relRaw = path.relative(DIST_DIR, full).split(path.sep).join('/')
    raw.push({ relRaw, buf: await fs.readFile(full) })
  }

  // 2a) Déploiement du SITE PRINCIPAL : tous les fichiers tels quels (index.html = accueil).
  const mainEntries = raw.map((f) => ({ rel: '/' + f.relRaw, buf: f.buf }))

  // 2b) Déploiement du JOURNAL : journal.html devient la page d'accueil
  //     (index.html marketing exclu ; _redirects propre au journal en SPA).
  const journalEntries = []
  for (const f of raw) {
    if (f.relRaw === 'index.html') continue // page marketing : pas sur le site journal
    if (f.relRaw === '_redirects') continue // on écrit le nôtre ci-dessous
    const rel = f.relRaw === 'journal.html' ? '/index.html' : '/' + f.relRaw
    journalEntries.push({ rel, buf: f.buf })
  }
  journalEntries.push({ rel: '/_redirects', buf: Buffer.from('/*    /index.html    200\n', 'utf8') })

  // 3) Pousser vers les deux sites (le journal d'abord, puis le principal s'il est configuré)
  const journal = await pushSite(token, siteId, journalEntries)
  let main = null
  if (mainSiteId) main = await pushSite(token, mainSiteId, mainEntries)

  const uploaded = journal.uploaded + (main ? main.uploaded : 0)
  const total = journal.total + (main ? main.total : 0)
  return {
    ok: true,
    uploaded,
    total,
    url: journal.url,
    journal,
    main,
  }
}
