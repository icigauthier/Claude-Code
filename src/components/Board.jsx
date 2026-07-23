import { useMemo, useState } from 'react'
import { STAGES } from '../constants.js'
import Card from './Card.jsx'

export default function Board({ clients, onOpen, onMove }) {
  const [dragId, setDragId] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((s) => [s.key, []]))
    for (const c of clients) (map[c.statut] || (map[c.statut] = [])).push(c)
    return map
  }, [clients])

  function onDrop(stageKey) {
    if (dragId) {
      const c = clients.find((x) => x.id === dragId)
      if (c && c.statut !== stageKey) onMove(dragId, stageKey)
    }
    setDragId(null)
    setDragOver(null)
  }

  return (
    <div className="board">
      {STAGES.map((stage) => {
        const items = byStage[stage.key] || []
        return (
          <section
            key={stage.key}
            className={`col ${dragOver === stage.key ? 'col--over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              if (dragOver !== stage.key) setDragOver(stage.key)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null)
            }}
            onDrop={() => onDrop(stage.key)}
          >
            <header className="col__head">
              <span className="dot" style={{ background: stage.color }} />
              <span className="col__label">{stage.label}</span>
              <span className="col__count">{items.length}</span>
            </header>
            <div className="col__body">
              {items.map((c) => (
                <Card
                  key={c.id}
                  client={c}
                  onOpen={() => onOpen(c)}
                  onDragStart={() => setDragId(c.id)}
                  onDragEnd={() => {
                    setDragId(null)
                    setDragOver(null)
                  }}
                  dragging={dragId === c.id}
                />
              ))}
              {items.length === 0 && <p className="col__empty">Aucune fiche</p>}
            </div>
          </section>
        )
      })}
    </div>
  )
}
