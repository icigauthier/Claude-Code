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
  {
    key: 'seed_courtiers_v5',
    partners: [
      {
        id: 'pa_seed_marie_france_lavigne',
        nom: 'Marie-France Lavigne — RE/MAX Delta Realty Team',
        industrie: 'agent_immo',
        langue: 'francais',
        telephone: '613-301-3213',
        site_web: '',
        notes: 'RE/MAX Delta Realty Team. 2316 St. Joseph Blvd, Ottawa (Ontario) K1C 1E8.',
      },
      {
        id: 'pa_seed_patrick_lamesse',
        nom: 'Patrick Lamesse — Sutton Group Ottawa Realty',
        industrie: 'agent_immo',
        langue: 'francais',
        telephone: '613-912-3457',
        site_web: '',
        notes: 'Sutton Group - Ottawa Realty. 300 Richmond Rd, Unit 400, Ottawa (Ontario) K1Z 6X6.',
      },
      {
        id: 'pa_seed_bruno_gamache',
        nom: 'Bruno Gamache — Royal LePage Integrity Realty',
        industrie: 'agent_immo',
        langue: 'francais',
        telephone: '613-878-3310',
        site_web: '',
        notes: 'Royal LePage Integrity Realty. 2148 Carling Ave, Unit 5-6, Ottawa (Ontario) K2A 1H1.',
      },
      {
        id: 'pa_seed_marie_jo_shapiro',
        nom: 'Marie-Jo Shapiro — RE/MAX Delta Realty',
        industrie: 'agent_immo',
        langue: 'francais',
        telephone: '613-716-7653',
        site_web: '',
        notes: 'RE/MAX Delta Realty. 1863 Laurier St, PO Box 845, Rockland (Ontario) K4K 1L5.',
      },
    ],
  },
  {
    key: 'seed_courtiers_v6',
    partners: [
      {
        id: 'pa_seed_olesya_sokolova',
        nom: 'Olesya Sokolova — Solid Rock Realty',
        industrie: 'agent_immo',
        langue: 'bilingue',
        telephone: '343-202-1515',
        site_web: '',
        notes: 'Solid Rock Realty. 5 Corvus Court, Ottawa (Ontario) K2E 7Z4.',
      },
      {
        id: 'pa_seed_phil_labbe',
        nom: 'Phil Labbe — Royal LePage Integrity Realty',
        industrie: 'agent_immo',
        langue: 'francais',
        telephone: '613-316-3707',
        site_web: '',
        notes: 'Royal LePage Integrity Realty. 2062 St Joseph Blvd, Orléans (Ontario) K1C 1E6.',
      },
    ],
  },
  {
    key: 'seed_courtiers_v7',
    // Liste Ottawa (Marie-France Lavigne exclue : déjà présente). Langue par
    // défaut : bilingue (à ajuster au besoin).
    partners: [
      { id: 'pa_seed_mathieu_bedirian', nom: 'Mathieu Bedirian — RE/MAX Hallmark Realty Group', industrie: 'agent_immo', langue: 'bilingue', telephone: '613-220-7168', site_web: '', notes: "RE/MAX Hallmark Realty Group. 4366 Innes Road, Ottawa (Ontario) K4A 3W3." },
      { id: 'pa_seed_nicholas_labrosse', nom: 'Nicholas Labrosse — RE/MAX Hallmark Realty Group', industrie: 'agent_immo', langue: 'bilingue', telephone: '613-227-6409', site_web: '', notes: "RE/MAX Hallmark Realty Group. 4366 Innes Road, Ottawa (Ontario) K4A 3W3." },
      { id: 'pa_seed_chris_lambert', nom: 'Chris Lambert — Innovation Realty Ltd.', industrie: 'agent_immo', langue: 'bilingue', telephone: '613-266-8350', site_web: '', notes: "Innovation Realty Ltd. 8221 Campeau Drive, Unit B, Kanata (Ontario) K2T 0A2." },
      { id: 'pa_seed_erika_johnson', nom: 'Erika Johnson — CDN Global (Ottawa) Ltd.', industrie: 'agent_immo', langue: 'bilingue', telephone: '514-237-1612', site_web: '', notes: "CDN Global (Ottawa) Ltd. 1419 Carling Avenue, Unit 203, Ottawa (Ontario) K1Z 7L6." },
      { id: 'pa_seed_nicole_rosenfeldt', nom: 'Nicole Rosenfeldt — Royal LePage Team Realty', industrie: 'agent_immo', langue: 'bilingue', telephone: '613-612-4663', site_web: '', notes: "Royal LePage Team Realty. 5536 Manotick Main St, Manotick (Ontario) K4M 1A7." },
      { id: 'pa_seed_miguel_levesque', nom: 'Miguel Levesque — One Percent Realty Ltd.', industrie: 'agent_immo', langue: 'bilingue', telephone: '613-800-6069', site_web: '', notes: "One Percent Realty Ltd. 21 Ladouceur St, Ottawa (Ontario) K1Y 2S9." },
      { id: 'pa_seed_mathieu_jacques', nom: 'Mathieu Jacques — EXP Realty', industrie: 'agent_immo', langue: 'bilingue', telephone: '343-596-9322', site_web: '', notes: "EXP Realty. 532 Limoges Road, Unit E, Limoges (Ontario) K0A 2M0." },
      { id: 'pa_seed_kristine_haselsteiner', nom: 'Kristine Haselsteiner — Royal LePage Team Realty', industrie: 'agent_immo', langue: 'bilingue', telephone: '613-612-3871', site_web: '', notes: "Royal LePage Team Realty. 6081 Hazeldean Road, 12B, Ottawa (Ontario) K2S 1B9." },
      { id: 'pa_seed_christopher_blenkiron', nom: 'Christopher Blenkiron — RE/MAX Hallmark Excellence Group Realty', industrie: 'agent_immo', langue: 'bilingue', telephone: '613-913-4665', site_web: '', notes: "RE/MAX Hallmark Excellence Group Realty. 4366 Innes Road, Unit 202, Ottawa (Ontario) K4A 3W3." },
      { id: 'pa_seed_tony_giampietro', nom: 'Antonio (Tony) Giampietro — Royal LePage Integrity Realty', industrie: 'agent_immo', langue: 'bilingue', telephone: '613-854-1102', site_web: '', notes: "Royal LePage Integrity Realty. 2148 Carling Ave, Unit 5-6, Ottawa (Ontario) K2A 1H1." },
      { id: 'pa_seed_ray_smiley', nom: 'Ray Smiley — RE/MAX Hallmark Realty Group', industrie: 'agent_immo', langue: 'bilingue', telephone: '613-818-1819', site_web: '', notes: "RE/MAX Hallmark Realty Group. 344 O'Connor Street, Ottawa (Ontario) K2P 1W1." },
      { id: 'pa_seed_thierno_diallo', nom: 'Thierno Diallo — Royal LePage Integrity Realty', industrie: 'agent_immo', langue: 'bilingue', telephone: '613-799-0005', site_web: '', notes: "Royal LePage Integrity Realty. 2148 Carling Ave, Unit 5-6, Ottawa (Ontario) K2A 1H1." },
      { id: 'pa_seed_tamara_villanyi_bokor', nom: 'Tamara Villanyi Bokor — Royal LePage Integrity Realty', industrie: 'agent_immo', langue: 'bilingue', telephone: '613-796-9436', site_web: '', notes: "Royal LePage Integrity Realty. 2148 Carling Ave, Unit 5-6, Ottawa (Ontario) K2A 1H1." },
      { id: 'pa_seed_jeff_matheson', nom: 'Jeff Matheson — EXP Realty', industrie: 'agent_immo', langue: 'bilingue', telephone: '613-699-8163', site_web: '', notes: "EXP Realty. 343 Preston Street, 11th Floor, Ottawa (Ontario) K1S 1N4." },
      { id: 'pa_seed_irene_bilinski', nom: 'Irene Bilinski — RE/MAX Hallmark Realty Group', industrie: 'agent_immo', langue: 'bilingue', telephone: '613-858-1151', site_web: '', notes: "RE/MAX Hallmark Realty Group. 4366 Innes Road, Ottawa (Ontario) K4A 3W3." },
      { id: 'pa_seed_steve_sicard', nom: 'Steve Sicard — RE/MAX Hallmark Realty Group', industrie: 'agent_immo', langue: 'bilingue', telephone: '613-853-5807', site_web: '', notes: "RE/MAX Hallmark Realty Group. 4366 Innes Road, Ottawa (Ontario) K4A 3W3." },
      { id: 'pa_seed_yasser_abed', nom: 'Yasser Abed — EXP Realty', industrie: 'agent_immo', langue: 'bilingue', telephone: '613-266-6373', site_web: '', notes: "EXP Realty. 343 Preston Street, 11th Floor, Ottawa (Ontario) K1S 1N4." },
      { id: 'pa_seed_roch_stgeorges', nom: 'Roch St-Georges — EXIT Realty Matrix', industrie: 'agent_immo', langue: 'bilingue', telephone: '613-889-7732', site_web: '', notes: "EXIT Realty Matrix. 2131 St. Joseph Blvd, Ottawa (Ontario) K1C 1E7." },
      { id: 'pa_seed_melanie_ebbs', nom: 'Melanie Ebbs — EXP Realty', industrie: 'agent_immo', langue: 'bilingue', telephone: '819-665-4843', site_web: '', notes: "EXP Realty. 424 Catherine St, Unit 200, Ottawa (Ontario) K1R 5T8." },
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
