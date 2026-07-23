// Envoie tes données locales (data/crm.json) vers la base MongoDB en ligne.
// À lancer UNE FOIS depuis ton PC, après avoir créé la base :
//
//   Windows (PowerShell) :
//     $env:MONGODB_URI="colle-ici-ton-lien-mongodb"
//     npm run upload-data
//
// Ça copie ton CRM actuel dans le nuage. À refaire seulement si tu veux
// réécraser la version en ligne avec ta version locale.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MongoClient } from 'mongodb'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uri = (process.env.MONGODB_URI || '').trim()
const dbName = (process.env.MONGODB_DB || 'crm').trim()
const file = path.join(__dirname, '..', 'data', 'crm.json')

if (!uri) {
  console.error('❌ Définis d’abord la variable MONGODB_URI (ton lien de connexion MongoDB).')
  process.exit(1)
}

const raw = await fs.readFile(file, 'utf8').catch(() => {
  console.error('❌ Fichier introuvable : ' + file)
  process.exit(1)
})
const data = JSON.parse(raw)

const client = new MongoClient(uri)
await client.connect()
await client
  .db(dbName)
  .collection('state')
  .updateOne({ _id: 'crm' }, { $set: { data, maj: new Date().toISOString() } }, { upsert: true })
await client.close()

const n = (data.clients || []).length
const p = (data.partners || []).length
console.log(`✅ Données envoyées dans le nuage (${n} client(s), ${p} partenaire(s)).`)
