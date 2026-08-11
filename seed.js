// Réinitialisation unique du carnet de partenaires.
// À la demande, on vide UNE SEULE FOIS la liste des partenaires (drapeau en
// base). Après cette réinitialisation, tout partenaire ajouté reste en place —
// la réinitialisation ne se reproduit pas.
import { readData, writeData, kvGet, kvSet } from './storage.js'

const RESET_KEY = 'reset_partners_v1'

export async function initPartners() {
  try {
    if (await kvGet(RESET_KEY)) return // déjà réinitialisé une fois
    const data = await readData()
    const n = (data.partners || []).length
    data.partners = []
    await writeData(data)
    await kvSet(RESET_KEY, new Date().toISOString())
    if (n) console.log(`  ${n} partenaire(s) retiré(s) (réinitialisation unique).`)
  } catch (e) {
    console.error('Réinitialisation partenaires ignorée :', e.message)
  }
}
