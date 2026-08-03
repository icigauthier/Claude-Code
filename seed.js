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
  {
    key: 'seed_courtiers_v3',
    // Réseau de référents (CSV) — Marc-André Perrier exclu (déjà présent).
    partners: [
      {
        id: 'pa_seed_steven_levac',
        nom: 'Steven Levac — Royal LePage Performance Realty',
        industrie: 'agent_immo',
        langue: 'bilingue',
        telephone: '613-677-8284',
        site_web: 'https://teamstevenlevac.com',
        notes:
          "Courtier / chef d'équipe — Royal LePage Performance Realty. Hawkesbury / Alfred / L'Orignal / Plantagenet (Prescott-Russell).\nAngle : gros volume dans ton marché cœur; partenaire hypothécaire bilingue attitré pour la pré-qualification rapide. Clin d'œil à sa chaîne YouTube.\nProchaine action : texto rédigé — à envoyer.",
      },
      {
        id: 'pa_seed_mehdi_cheddadi',
        nom: 'Mehdi Cheddadi — Century 21 Synergy Realty',
        industrie: 'agent_immo',
        langue: 'bilingue',
        telephone: '613-601-1304',
        site_web: '',
        notes:
          "Courtier — Century 21 Synergy Realty Inc. Orléans / Ottawa / Kanata / Barrhaven.\nAngle : service en français / anglais / arabe — canal de référence multilingue pour la clientèle néo-arrivante d'Orléans.\nCourriel : mehdi.cheddadi@century21.ca\nProchaine action : texto rédigé — à envoyer.",
      },
      {
        id: 'pa_seed_jean_leger',
        nom: 'Jean G. Léger — RE/MAX Affiliates Marquis',
        industrie: 'agent_immo',
        langue: 'francais',
        telephone: '613-938-8100',
        site_web: 'https://remax-cornwall.ca',
        notes:
          "Courtier — RE/MAX Affiliates Marquis Ltd. Cornwall (SD&G).\nAngle : nom francophone dans la principale bannière RE/MAX de Cornwall; diversification géographique vers le Sud-Est.\nProchaine action : texto rédigé — à envoyer.",
      },
      {
        id: 'pa_seed_francois_poirier',
        nom: 'François Poirier — EXIT Realty Matrix',
        industrie: 'agent_immo',
        langue: 'francais',
        telephone: '613-677-1349',
        site_web: 'https://fpoirier.com',
        notes:
          "Courtier — EXIT Realty Matrix. Hawkesbury / Prescott-Russell / Champlain / L'Orignal / Ottawa.\nAngle : courtier francophone bien enraciné, beaucoup d'inscriptions actives; partenaire attitré pour préqualifier ses acheteurs en français.\nProchaine action : nouveau prospect — à contacter.",
      },
      {
        id: 'pa_seed_elise_daponti',
        nom: 'Élise Da Ponti — RE/MAX Delta Realty',
        industrie: 'agent_immo',
        langue: 'bilingue',
        telephone: '613-315-2714',
        site_web: 'https://elisedaponti.ca',
        notes:
          "Représentante commerciale — RE/MAX Delta Realty. Clarence-Rockland.\nAngle : entièrement bilingue; spécialisée premiers acheteurs / investissement / relocalisation militaire.\nCourriel : elise@trivesta.ca\nProchaine action : nouveau prospect — à contacter.",
      },
      {
        id: 'pa_seed_melanie_lafreniere',
        nom: 'Mélanie Lafrenière — Royal LePage North Heritage Realty',
        industrie: 'agent_immo',
        langue: 'francais',
        telephone: '705-688-0007',
        site_web: 'https://myrealtormel.com',
        notes:
          "Courtier immobilier — Royal LePage North Heritage Realty. Grand Sudbury.\nAngle : diversification vers le Nord franco-ontarien; spécialiste investissement (REIS) et premiers acheteurs. Contact à distance possible.\nProchaine action : nouveau prospect — à contacter.",
      },
      {
        id: 'pa_seed_marc_simard',
        nom: 'Marc Simard — Simard & Associés (avocat/notaire)',
        industrie: 'notaire',
        langue: 'bilingue',
        telephone: '613-446-5060',
        site_web: 'https://simards.ca',
        notes:
          "Avocat / notaire (droit immobilier) — Simard & Associés. Rockland / Ottawa.\nAngle : cabinet familial bilingue qui gère les clôtures d'achat de la région; relation réciproque naturelle (clôtures ↔ acheteurs à financer).\nCourriel : info@simards.ca\nProchaine action : nouveau prospect — à contacter.",
      },
    ],
  },
  {
    key: 'seed_courtiers_v4',
    partners: [
      {
        id: 'pa_seed_eric_fournier',
        nom: 'Éric Fournier — RE/MAX (Équipe Fournier)',
        industrie: 'agent_immo',
        langue: 'francais',
        telephone: '613-324-0019',
        site_web: 'https://ericfournier.ca',
        notes: "RE/MAX — Équipe Fournier. Embrun / Casselman / Russell.\nCourriel : eric@ericfournier.ca",
      },
      {
        id: 'pa_seed_jazz_dicaire',
        nom: 'Jazz Dicaire — Dicaire Homes / Royal LePage Performance',
        industrie: 'agent_immo',
        langue: 'francais',
        telephone: '613-830-3350',
        site_web: 'https://dicairehomes.ca',
        notes: "Dicaire Homes / Royal LePage Performance. Orléans.\nCourriel : jazz@dicairehomes.ca",
      },
      {
        id: 'pa_seed_joel_dinelle',
        nom: 'Joel Dinelle — Royal LePage Performance',
        industrie: 'agent_immo',
        langue: 'francais',
        telephone: '613-938-3860',
        site_web: '',
        notes: 'Royal LePage Performance. Cornwall.',
      },
      {
        id: 'pa_seed_roch_marleau',
        nom: 'Roch Marleau — Royal LePage Northern Life',
        industrie: 'agent_immo',
        langue: 'francais',
        telephone: '705-753-3466',
        site_web: '',
        notes: 'Royal LePage Northern Life. North Bay / Nipissing Ouest.',
      },
      {
        id: 'pa_seed_maisons_bruyere',
        nom: 'Maisons Bruyère Homes — Philippe (constructeur)',
        industrie: 'autre',
        langue: 'francais',
        telephone: '613-880-5393',
        site_web: '',
        notes: 'Constructeur de maisons — Maisons Bruyère Homes. Russell. Contact : Philippe.',
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
