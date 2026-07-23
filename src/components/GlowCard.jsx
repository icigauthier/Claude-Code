import { useEffect } from 'react'

// Un seul écouteur pointermove partagé par toutes les GlowCard.
// Écrit la position du curseur (coords viewport) sur la racine du document ;
// les cartes lisent ces variables via CSS (fond « spotlight » attaché au viewport).
let count = 0
let handler = null
let raf = 0

function attach() {
  if (count++ > 0) return
  handler = (e) => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      const root = document.documentElement
      root.style.setProperty('--glow-x', e.clientX.toFixed(1))
      root.style.setProperty('--glow-y', e.clientY.toFixed(1))
      root.style.setProperty('--glow-xp', (e.clientX / window.innerWidth).toFixed(3))
      root.style.setProperty('--glow-yp', (e.clientY / window.innerHeight).toFixed(3))
    })
  }
  document.addEventListener('pointermove', handler, { passive: true })
}

function detach() {
  if (--count > 0) return
  if (handler) document.removeEventListener('pointermove', handler)
  cancelAnimationFrame(raf)
  handler = null
}

// Enveloppe une carte pour lui donner le halo « spotlight » qui suit le curseur.
export default function GlowCard({ children, className = '', ...rest }) {
  useEffect(() => {
    attach()
    return detach
  }, [])

  return (
    <div className={`glow-card ${className}`} {...rest}>
      {children}
    </div>
  )
}
