// Stockage des données du CRM — deux modes, choisis automatiquement :
//
//   • MODE NUAGE  : si la variable d'environnement MONGODB_URI est définie,
//                   les données vivent dans une base MongoDB (persistante,
//                   survit aux redémarrages de l'hébergeur gratuit).
//   • MODE LOCAL  : sinon, elles vivent dans data/crm.json comme avant
//                   (aucun changement pour l'utilisation sur ton PC).
//
// Le reste du serveur appelle readData()/writeData() sans savoir lequel des
// deux est actif.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const MONGODB_URI = (process.env.MONGODB_URI || '').trim()
const MONGODB_DB = (process.env.MONGODB_DB || 'crm').trim()
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'crm.json')

// true dès qu'on a une base MongoDB configurée.
export const usingCloud = !!MONGODB_URI

// Structure vide par défaut (première utilisation).
function emptyData() {
  return {
    clients: [], partners: [], events: [], todos: [],
    finances: [], subscribers: [], processedLeadEmails: [],
  }
}

// Garantit que les listes attendues existent toujours (évite les plantages).
function normalize(data) {
  if (!data || typeof data !== 'object') return emptyData()
  for (const key of ['clients', 'partners', 'events', 'todos', 'finances', 'subscribers', 'processedLeadEmails']) {
    if (!Array.isArray(data[key])) data[key] = []
  }
  return data
}

/* ---------- MODE NUAGE : MongoDB ---------- */
let dbPromise = null
async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const { MongoClient } = await import('mongodb')
      const client = new MongoClient(MONGODB_URI)
      await client.connect()
      return client.db(MONGODB_DB)
    })().catch((err) => {
      dbPromise = null // permet une nouvelle tentative au prochain appel
      throw err
    })
  }
  return dbPromise
}

/* ---------- API publique ---------- */
export async function readData() {
  if (usingCloud) {
    const coll = (await getDb()).collection('state')
    const doc = await coll.findOne({ _id: 'crm' })
    return normalize(doc && doc.data ? doc.data : emptyData())
  }
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8')
    return normalize(JSON.parse(raw))
  } catch {
    return emptyData()
  }
}

export async function writeData(data) {
  if (usingCloud) {
    const coll = (await getDb()).collection('state')
    await coll.updateOne({ _id: 'crm' }, { $set: { data, maj: new Date().toISOString() } }, { upsert: true })
    return
  }
  // Écriture atomique locale : fichier temporaire puis renommage.
  await fs.mkdir(DATA_DIR, { recursive: true })
  const tmp = DATA_FILE + '.tmp'
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
  await fs.rename(tmp, DATA_FILE)
}

/* ---------- Petit stockage clé → texte ----------
   Sert à la connexion Outlook (config + cache de jetons Microsoft).
   En ligne : collection MongoDB « kv ». En local : fichiers dans data/. */
export async function kvGet(key) {
  if (usingCloud) {
    const doc = await (await getDb()).collection('kv').findOne({ _id: key })
    return doc ? doc.value : null
  }
  try {
    return await fs.readFile(path.join(DATA_DIR, key), 'utf8')
  } catch {
    return null
  }
}

export async function kvSet(key, value) {
  if (usingCloud) {
    await (await getDb()).collection('kv').updateOne({ _id: key }, { $set: { value } }, { upsert: true })
    return
  }
  await fs.mkdir(DATA_DIR, { recursive: true })
  const tmp = path.join(DATA_DIR, key) + '.tmp'
  await fs.writeFile(tmp, value, 'utf8')
  await fs.rename(tmp, path.join(DATA_DIR, key))
}

export async function kvDel(key) {
  if (usingCloud) {
    await (await getDb()).collection('kv').deleteOne({ _id: key })
    return
  }
  try {
    await fs.unlink(path.join(DATA_DIR, key))
  } catch {
    /* déjà absent */
  }
}

/* ---------- Fichiers joints (factures : image / PDF) ----------
   Stockés à part (collection « files » en ligne, dossier data/files/ en local)
   pour ne pas alourdir le document principal. rec = { name, type, data(base64) }. */
export async function fileSet(id, rec) {
  if (usingCloud) {
    await (await getDb()).collection('files').updateOne({ _id: id }, { $set: rec }, { upsert: true })
    return
  }
  const dir = path.join(DATA_DIR, 'files')
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, id + '.json'), JSON.stringify(rec), 'utf8')
}

export async function fileGet(id) {
  if (usingCloud) {
    return await (await getDb()).collection('files').findOne({ _id: id })
  }
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, 'files', id + '.json'), 'utf8'))
  } catch {
    return null
  }
}

export async function fileDel(id) {
  if (usingCloud) {
    await (await getDb()).collection('files').deleteOne({ _id: id })
    return
  }
  try {
    await fs.unlink(path.join(DATA_DIR, 'files', id + '.json'))
  } catch {
    /* déjà absent */
  }
}
