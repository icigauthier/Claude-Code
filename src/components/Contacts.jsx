import { STAGE_MAP } from '../constants.js'
import { fmtDate, isFollowUpDue } from '../format.js'

export default function Contacts({ clients, onOpen }) {
  if (clients.length === 0) {
    return <p className="empty-state">Aucun contact. Ajoute ton premier client.</p>
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Statut</th>
            <th>Projet</th>
            <th>Ville</th>
            <th>Téléphone</th>
            <th>Dossier FINMO</th>
            <th>Prochain suivi</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => {
            const stage = STAGE_MAP[c.statut] || {}
            const due = isFollowUpDue(c)
            return (
              <tr key={c.id} onClick={() => onOpen(c)}>
                <td className="td-name">{c.nom || 'Sans nom'}</td>
                <td>
                  <span className="badge" style={{ background: stage.color }}>
                    {stage.label || c.statut}
                  </span>
                </td>
                <td>{c.projet || '—'}</td>
                <td>{c.ville || '—'}</td>
                <td>{c.telephone || '—'}</td>
                <td className="td-mono">{c.dossierFinmo || '—'}</td>
                <td className={due ? 'td-due' : ''}>
                  {c.prochainSuivi ? fmtDate(c.prochainSuivi) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
