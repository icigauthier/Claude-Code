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
let collPromise = null
async function getCollection() {
  if (!collPromise) {
    collPromise = (async () => {
      const { MongoClient } = await import('mongodb')
      const client = new MongoClient(MONGODB_URI)
      await client.connect()
      return client.db(MONGODB_DB).collection('state')
    })().catch((err) => {
      collPromise = null // permet une nouvelle tentative au prochain appel
      throw err
    })
  }
  return collPromise
}

/* ---------- API publique ---------- */
export async function readData() {
  if (usingCloud) {
    const coll = await getCollection()
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
    const coll = await getCollection()
    await coll.updateOne({ _id: 'crm' }, { $set: { data, maj: new Date().toISOString() } }, { upsert: true })
    return
  }
  // Écriture atomique locale : fichier temporaire puis renommage.
  await fs.mkdir(DATA_DIR, { recursive: true })
  const tmp = DATA_FILE + '.tmp'
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
  await fs.rename(tmp, DATA_FILE)
}
