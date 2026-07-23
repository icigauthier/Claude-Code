import { useState } from 'react'
import { fmtDate, todayISO } from '../format.js'

const EMPTY = { titre: '', date: todayISO(), extrait: '', contenu: '', publie: true }

export default function Blog({
  posts,
  onSave,
  onDelete,
  subscribers = [],
  sendEnabled = false,
  onSendEmail,
  onRemoveSubscriber,
  deploy = { configured: false, status: 'idle' },
  onDeploy,
}) {
  const [f, setF] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [sendingId, setSendingId] = useState(null)
  const [manage, setManage] = useState(false)
  const set = (k) => (e) =>
    setF((s) => ({ ...s, [k]: k === 'publie' ? e.target.checked : e.target.value }))

  function edit(post) {
    setEditingId(post.id)
    setF({
      titre: post.titre || '',
      date: post.date || todayISO(),
      extrait: post.extrait || '',
      contenu: post.contenu || '',
      publie: !!post.publie,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function reset() {
    setEditingId(null)
    setF(EMPTY)
  }

  async function submit(e) {
    e.preventDefault()
    if (!f.titre.trim()) return
    setSaving(true)
    try {
      const saved = await onSave(editingId ? { ...f, id: editingId } : f)
      reset()
      // Publication → proposer l'envoi courriel automatique.
      if (
        saved &&
        saved.publie &&
        !saved.emailedAt &&
        subscribers.length > 0 &&
        sendEnabled &&
        confirm(`Envoyer ce billet à tes ${subscribers.length} abonné(s) par courriel maintenant ?`)
      ) {
        await onSendEmail(saved.id)
      }
    } finally {
      setSaving(false)
    }
  }

  async function sendOne(p) {
    if (!confirm(`Envoyer « ${p.titre} » à tes ${subscribers.length} abonné(s) ?`)) return
    setSendingId(p.id)
    try {
      await onSendEmail(p.id)
    } finally {
      setSendingId(null)
    }
  }

  const sorted = posts.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const deploying = deploy.status === 'deploying'

  return (
    <div className="blog">
      {/* Barre de publication en ligne (Netlify) */}
      <div className={`deploy-bar ${deploy.status}`}>
        {!deploy.configured ? (
          <span className="deploy-bar__txt">
            🌐 Publication automatique en ligne pas encore branchée — demande-moi de brancher
            Netlify.
          </span>
        ) : (
          <>
            <span className="deploy-bar__txt">
              {deploying
                ? '⏳ Mise en ligne du site en cours…'
                : deploy.status === 'error'
                  ? `⚠️ Échec de la mise en ligne : ${deploy.error || ''}`
                  : deploy.status === 'done'
                    ? '✅ Blog à jour en ligne. Publier met le site à jour tout seul.'
                    : '🌐 Site relié à Netlify — chaque publication le met à jour automatiquement.'}
            </span>
            <button className="btn btn--ghost" onClick={onDeploy} disabled={deploying}>
              {deploying ? 'Mise en ligne…' : '↻ Mettre le site à jour'}
            </button>
          </>
        )}
      </div>

      {/* Barre infolettre */}
      <div className={`nl-bar ${!sendEnabled ? 'is-warn' : ''}`}>
        <span className="nl-bar__count">📧 {subscribers.length} abonné(s) à l’infolettre</span>
        {!sendEnabled ? (
          <span className="nl-bar__hint">
            Envoi courriel pas encore autorisé —{' '}
            <a className="banner__link" href="/auth/login">
              autoriser l’envoi (reconnexion Outlook) →
            </a>
          </span>
        ) : (
          <span className="nl-bar__hint">✅ Envoi courriel autorisé.</span>
        )}
        {subscribers.length > 0 && (
          <button className="btn btn--ghost" onClick={() => setManage((m) => !m)}>
            {manage ? 'Fermer' : 'Gérer'}
          </button>
        )}
      </div>
      {manage && subscribers.length > 0 && (
        <ul className="nl-subs">
          {subscribers.map((s) => (
            <li key={s.email}>
              <span>{s.email}</span>
              <button className="todo__del" onClick={() => onRemoveSubscriber(s.email)} aria-label="Retirer">✕</button>
            </li>
          ))}
        </ul>
      )}

      <form className="blog__editor" onSubmit={submit}>
        <div className="blog__editor-head">
          <h3>{editingId ? 'Modifier le billet' : 'Nouveau billet'}</h3>
          {editingId && (
            <button type="button" className="btn btn--ghost" onClick={reset}>
              + Nouveau
            </button>
          )}
        </div>

        <div className="grid2">
          <label className="field">
            <span className="field__label">Titre</span>
            <input value={f.titre} onChange={set('titre')} placeholder="Titre du billet" autoFocus />
          </label>
          <label className="field">
            <span className="field__label">Date</span>
            <input type="date" value={f.date} onChange={set('date')} />
          </label>
        </div>

        <label className="field">
          <span className="field__label">Accroche (résumé court affiché dans la liste)</span>
          <input value={f.extrait} onChange={set('extrait')} placeholder="Une phrase qui résume le billet" />
        </label>

        <label className="field">
          <span className="field__label">Contenu</span>
          <textarea
            className="blog__body"
            rows={12}
            value={f.contenu}
            onChange={set('contenu')}
            placeholder="Écris ton billet ici. Laisse une ligne vide entre les paragraphes."
          />
        </label>

        <div className="blog__foot">
          <label className="blog__publish">
            <input type="checkbox" checked={f.publie} onChange={set('publie')} />
            <span>Publié sur le site (décoche pour garder en brouillon)</span>
          </label>
          <button className="btn btn--primary" disabled={saving}>
            {saving ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Publier le billet'}
          </button>
        </div>
        <p className="blog__hint">
          Les billets s’enregistrent dans le contenu de ton site (visible en ligne au prochain
          déploiement). Si tu as des abonnés, tu peux aussi envoyer le billet par courriel.
        </p>
      </form>

      <div className="blog__list">
        <h3 className="blog__list-title">Mes billets ({posts.length})</h3>
        {sorted.length === 0 && <p className="ov-empty">Aucun billet pour l’instant.</p>}
        {sorted.map((p) => (
          <article key={p.id} className={`blog-item ${editingId === p.id ? 'is-editing' : ''}`}>
            <div className="blog-item__main">
              <div className="blog-item__top">
                <span className="blog-item__title">{p.titre || '(sans titre)'}</span>
                <span className={`badge ${p.publie ? '' : 'badge--draft'}`} style={p.publie ? { background: 'var(--green)' } : undefined}>
                  {p.publie ? 'Publié' : 'Brouillon'}
                </span>
                {p.emailedAt && <span className="blog-item__sent">✓ Envoyé le {fmtDate(p.emailedAt)}</span>}
              </div>
              <div className="blog-item__meta">{fmtDate(p.date)}</div>
              {p.extrait && <p className="blog-item__excerpt">{p.extrait}</p>}
            </div>
            <div className="blog-item__actions">
              {p.publie && !p.emailedAt && sendEnabled && subscribers.length > 0 && (
                <button className="btn btn--ghost" onClick={() => sendOne(p)} disabled={sendingId === p.id}>
                  {sendingId === p.id ? 'Envoi…' : `📧 Envoyer (${subscribers.length})`}
                </button>
              )}
              <button className="btn btn--ghost" onClick={() => edit(p)}>Modifier</button>
              <button
                className="btn btn--danger"
                onClick={() => confirm('Supprimer ce billet définitivement ?') && onDelete(p.id)}
              >
                Supprimer
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
