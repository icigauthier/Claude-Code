// Ajout unique de partenaires « de départ » dans le CRM.
// Fonctionne par lots (batches). Chaque lot a son propre drapeau : il ne
// s'exécute qu'une seule fois, n'ajoute pas un nom déjà présent, et supprimer
// un partenaire ensuite ne le fait PAS réapparaître. Pour ajouter d'autres
// partenaires plus tard, on ajoute simplement un nouveau lot avec une nouvelle
// clé.
import { readData, writeData, kvGet, kvSet } from './storage.js'

const BATCHES = [
  {
    key: 'seed_courtiers_v1',
    // 4 courtiers immobiliers francophones (Ottawa / Orléans–Rockland) + 1 notaire.
    partners: [
      {
        id: 'pa_seed_yanick_dagenais',
        nom: 'Yanick Dagenais — RE/MAX Hallmark Realty Group',
        industrie: 'agent_immo',
        langue: 'francais',
        telephone: '613-590-3000',
        site_web: '',
        notes:
          "RE/MAX Hallmark Realty Group — Rockland / Orléans / Ottawa.\nCourriel : yanick.dagenais@hallmarkottawa.com",
      },
      {
        id: 'pa_seed_maxime_seguin',
        nom: 'Maxime Séguin — RE/MAX',
        industrie: 'agent_immo',
        langue: 'francais',
        telephone: '613-830-1887',
        site_web: '',
        notes: 'RE/MAX Ottawa — Orléans / Ottawa.',
      },
      {
        id: 'pa_seed_marc_andre_perrier',
        nom: 'Marc-André Perrier — Century 21',
        industrie: 'agent_immo',
        langue: 'francais',
        telephone: '',
        site_web: 'https://marcandre-perrier.c21.ca',
        notes: 'Century 21 — Orléans / Ottawa.',
      },
      {
        id: 'pa_seed_charles_seguin',
        nom: 'Charles Séguin — RE/MAX Delta Realty',
        industrie: 'agent_immo',
        langue: 'francais',
        telephone: '',
        site_web: 'https://charlesseguinrealty.com',
        notes: 'RE/MAX Delta Realty — Rockland / Est ontarien.',
      },
      {
        id: 'pa_seed_guertin_poirier',
        nom: 'Guertin Poirier Avocats/Notaires',
        industrie: 'notaire',
        langue: 'bilingue',
        telephone: '613-744-4488',
        site_web: '',
        notes:
          "Avocat & notaire immobilier bilingue — Beechwood, Ottawa (≈15 min d'Orléans). Relie acheteurs, vendeurs, agents et prêteurs pour les clôtures immobilières → référent naturel et sous-exploité.\nCourriel : opendoor@guertinpoirierlaw.ca",
      },
    ],
  },
  {
    key: 'seed_courtiers_v2',
    partners: [
      {
        id: 'pa_seed_francois_piche',
        nom: 'François Piché — RE/MAX Delta Home Team',
        industrie: 'agent_immo',
        langue: 'francais',
        telephone: '613-677-2100',
        site_web: 'https://remaxdeltahometeam.com',
        notes: 'RE/MAX Delta Home Team.\nCourriel : francoispiche@msn.com',
      },
    ],
  },
]

export async function seedPartners() {
  try {
    for (const batch of BATCHES) {
      if (await kvGet(batch.key)) continue // lot déjà semé
      const data = await readData()
      const existing = new Set((data.partners || []).map((p) => (p.nom || '').toLowerCase()))
      const now = new Date().toISOString()
      let added = 0
      for (const p of batch.partners) {
        if (existing.has(p.nom.toLowerCase())) continue
        data.partners.unshift({
          ...p,
          statut: 'a_contacter',
          date_relance: '',
          cree: now,
          maj: now,
        })
        added++
      }
      if (added) await writeData(data)
      await kvSet(batch.key, now)
      if (added) console.log(`  ${added} partenaire(s) ajouté(s) (${batch.key}).`)
    }
  } catch (e) {
    console.error('Semis partenaires ignoré :', e.message)
  }
}
