export default function Partners({ partners, onOpen, onNew }) {
  return (
    <div>
      <div className="section-actions">
        <button className="btn btn--primary" onClick={onNew}>
          + Nouveau partenaire
        </button>
      </div>

      {partners.length === 0 ? (
        <p className="empty-state">
          Aucun partenaire. Ajoute tes prêteurs, notaires, courtiers immobiliers…
        </p>
      ) : (
        <div className="partner-grid">
          {partners.map((p) => (
            <article key={p.id} className="partner-card" onClick={() => onOpen(p)}>
              <div className="partner-card__top">
                <h3>{p.nom || 'Sans nom'}</h3>
                {p.type && <span className="partner-type">{p.type}</span>}
              </div>
              {p.contact && <div className="partner-line">👤 {p.contact}</div>}
              {p.telephone && <div className="partner-line">☎ {p.telephone}</div>}
              {p.courriel && <div className="partner-line">✉ {p.courriel}</div>}
              {p.notes && <p className="partner-notes">{p.notes}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
