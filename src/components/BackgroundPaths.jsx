import { useEffect, useRef } from 'react'

// Génère les 36 tracés (même formule que le composant d'origine).
function buildPaths(position) {
  return Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d:
      `M-${380 - i * 5 * position} -${189 + i * 6}` +
      `C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}` +
      `C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }))
}

function PathGroup({ position, tone }) {
  const paths = buildPaths(position)
  return (
    <svg
      className={`bgp-svg bgp-svg--${tone}`}
      viewBox="0 0 696 316"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {paths.map((p) => (
        <path
          key={p.id}
          d={p.d}
          pathLength="1"
          stroke="currentColor"
          strokeWidth={p.width}
          className="bgp-path"
          style={{
            strokeOpacity: 0.05 + p.id * 0.012,
            animationDuration: `${22 + (p.id % 10) * 1.6}s`,
            animationDelay: `-${(p.id % 12) * 1.7}s`,
          }}
        />
      ))}
    </svg>
  )
}

// Fond ambiant de lignes qui coulent, en couleurs de marque (émeraude + or),
// avec une légère parallaxe suivant la souris.
export default function BackgroundPaths() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onMove = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const x = e.clientX / window.innerWidth - 0.5
        const y = e.clientY / window.innerHeight - 0.5
        el.style.setProperty('--px', `${x * 12}px`)
        el.style.setProperty('--py', `${y * 12}px`)
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="bg-paths" ref={ref} aria-hidden="true">
      <PathGroup position={1} tone="green" />
      <PathGroup position={-1} tone="gold" />
    </div>
  )
}
