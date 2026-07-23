// Étapes du pipeline hypothécaire (ordre = colonnes du tableau)
export const STAGES = [
  { key: 'nouveau', label: 'Nouveau lead', color: '#b8894b' },
  { key: 'contacte', label: 'Contacté', color: '#4f8cae' },
  { key: 'preapprouve', label: 'Pré-approuvé', color: '#7a9a5b' },
  { key: 'dossier', label: 'En dossier', color: '#c58b3a' },
  { key: 'finance', label: 'Financé', color: '#2e7d5b' },
  { key: 'perdu', label: 'Perdu / inactif', color: '#98918a' },
]

export const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.key, s]))

export const PROJETS = [
  'Achat d’une propriété',
  'Pré-approbation',
  'Refinancement',
  'Renouvellement',
  'Travailleur autonome',
  'Autre',
]

export const ECHEANCIERS = [
  'Le plus tôt possible',
  'D’ici 1 à 3 mois',
  'D’ici 3 à 6 mois',
  'Dans 6 mois ou plus',
  'Je m’informe pour l’instant',
]

export const MISES = [
  'Moins de 5 %',
  '5 % à 10 %',
  '10 % à 20 %',
  '20 % ou plus',
  'Je ne sais pas encore',
]

export const SOURCES = [
  'Formulaire du site',
  'Référence',
  'Réseaux sociaux',
  'Appel entrant',
  'Autre',
]

export const PARTNER_TYPES = [
  'Prêteur',
  'Notaire',
  'Courtier immobilier',
  'Évaluateur',
  'Assureur',
  'Référence',
  'Autre',
]

export const EVENT_TYPES = [
  { key: 'Rencontre client', color: '#1f6b4a' },
  { key: 'Appel', color: '#4f8cae' },
  { key: 'Signature', color: '#b8894b' },
  { key: 'Renouvellement', color: '#8459b3' },
  { key: 'Suivi', color: '#7a9a5b' },
  { key: 'Personnel', color: '#98918a' },
  { key: 'Autre', color: '#c58b3a' },
]

export const EVENT_TYPE_MAP = Object.fromEntries(
  EVENT_TYPES.map((t) => [t.key, t.color]),
)
