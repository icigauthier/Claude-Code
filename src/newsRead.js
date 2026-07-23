// État « lu / vu » des nouvelles, mémorisé localement (par lien d'article).
const KEY = 'crm_news_read_v1'

export function getReadSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function save(set) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set].slice(-500)))
  } catch {
    /* stockage plein / indisponible : on ignore */
  }
}

// Bascule l'état lu d'un article et renvoie le nouvel ensemble.
export function toggleRead(link) {
  const set = getReadSet()
  if (set.has(link)) set.delete(link)
  else set.add(link)
  save(set)
  return set
}
