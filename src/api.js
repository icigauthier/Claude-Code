const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function req(url, options) {
  const res = await fetch(url, options)
  if (res.status === 401) {
    // Session expirée ou absente → retour à la page de connexion.
    window.location.href = '/login'
    return new Promise(() => {}) // stoppe la chaîne sans afficher d'erreur
  }
  if (!res.ok) {
    let msg = `Erreur ${res.status}`
    try {
      const j = await res.json()
      if (j.error) msg = j.error
    } catch {
      /* pas de JSON */
    }
    throw new Error(msg)
  }
  return res.status === 204 ? null : res.json()
}

export const api = {
  getState: () => req('/api/state'),

  // Clients
  create: (client) =>
    req('/api/clients', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(client) }),
  update: (id, patch) =>
    req(`/api/clients/${id}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(patch) }),
  remove: (id) => req(`/api/clients/${id}`, { method: 'DELETE' }),

  // Partenaires
  createPartner: (p) =>
    req('/api/partners', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(p) }),
  updatePartner: (id, patch) =>
    req(`/api/partners/${id}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(patch) }),
  removePartner: (id) => req(`/api/partners/${id}`, { method: 'DELETE' }),

  // Rencontres locales (agenda hors ligne)
  createEvent: (e) =>
    req('/api/events', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(e) }),
  updateEvent: (id, patch) =>
    req(`/api/events/${id}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(patch) }),
  removeEvent: (id) => req(`/api/events/${id}`, { method: 'DELETE' }),

  // Tâches (à faire)
  createTodo: (t) =>
    req('/api/todos', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(t) }),
  updateTodo: (id, patch) =>
    req(`/api/todos/${id}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(patch) }),
  removeTodo: (id) => req(`/api/todos/${id}`, { method: 'DELETE' }),

  // Finances
  createFinance: (t) =>
    req('/api/finances', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(t) }),
  updateFinance: (id, patch) =>
    req(`/api/finances/${id}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(patch) }),
  removeFinance: (id) => req(`/api/finances/${id}`, { method: 'DELETE' }),

  // Outlook
  outlookStatus: () => req('/api/outlook/status'),
  outlookEvents: (start, end) =>
    req(`/api/outlook/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
  createOutlookEvent: (e) =>
    req('/api/outlook/events', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(e) }),
  updateOutlookEvent: (id, patch) =>
    req(`/api/outlook/events/${id}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(patch) }),
  removeOutlookEvent: (id) => req(`/api/outlook/events/${id}`, { method: 'DELETE' }),

  // Import automatique des leads (courriels du formulaire)
  scanLeads: () => req('/api/leads/scan', { method: 'POST' }),

  // Nouvelles (flux RSS agrégés)
  getNews: (force) => req(`/api/news${force ? '?force=1' : ''}`),

  // Journal / blog (billets du site)
  createPost: (p) =>
    req('/api/posts', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(p) }),
  updatePost: (id, patch) =>
    req(`/api/posts/${id}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(patch) }),
  removePost: (id) => req(`/api/posts/${id}`, { method: 'DELETE' }),

  // Infolettre
  sendNewsletter: (postId) =>
    req('/api/newsletter/send', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ postId }) }),
  removeSubscriber: (email) => req(`/api/subscribers/${encodeURIComponent(email)}`, { method: 'DELETE' }),

  // Déploiement Netlify
  deployStatus: () => req('/api/deploy/status'),
  deploy: () => req('/api/deploy', { method: 'POST' }),
}
