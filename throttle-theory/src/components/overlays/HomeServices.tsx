import { motion } from 'framer-motion'
import { SERVICES } from '../../data/services'
import { useScrollStore } from '../../hooks/useScrollProgress'

interface Props {
  progress: number
}

export default function HomeServices({ progress }: Props) {
  const jumpTo = useScrollStore((s) => s.jumpTo)

  let opacity = 0
  if (progress >= 0.195 && progress < 0.215) {
    opacity = (progress - 0.195) / 0.02
  } else if (progress >= 0.215 && progress < 0.258) {
    opacity = 1
  } else if (progress >= 0.258 && progress < 0.278) {
    opacity = 1 - (progress - 0.258) / 0.02
  }

  const visible = opacity > 0

  return (
    <motion.div
      animate={{ opacity }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        bottom: '6%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        pointerEvents: visible ? 'auto' : 'none',
        width: 'min(640px, 92vw)',
      }}
    >
      <p style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 9,
        color: 'rgba(255,255,255,0.28)',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        textAlign: 'center',
        margin: '0 0 10px',
      }}>
        Our Services
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
      }}>
        {SERVICES.map((service, i) => (
          <motion.button
            key={service.id}
            initial={{ opacity: 0, y: 10 }}
            animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.35, delay: i * 0.05, ease: 'easeOut' }}
            onClick={() => jumpTo(service.scrollTarget)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '6px 6px 18px rgba(0,0,0,0.45), -3px -3px 8px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: '12px 14px',
              cursor: 'pointer',
              textAlign: 'left',
              WebkitTapHighlightColor: 'transparent',
              transition: 'box-shadow 0.2s, background 0.2s',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.09)'
              e.currentTarget.style.boxShadow = `4px 4px 14px rgba(0,0,0,0.5), -2px -2px 6px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 16px ${service.accentColor}22`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              e.currentTarget.style.boxShadow = '6px 6px 18px rgba(0,0,0,0.45), -3px -3px 8px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.06)'
            }}
          >
            {/* Accent bottom-edge glow line */}
            <span style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0, height: 1,
              background: `linear-gradient(90deg, transparent, ${service.accentColor}88, transparent)`,
            }} />

            <span style={{
              display: 'block',
              width: 6, height: 6,
              borderRadius: '50%',
              background: service.accentColor,
              boxShadow: `0 0 6px ${service.accentColor}88`,
              marginBottom: 8,
            }} />

            <span style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: 'rgba(240,240,236,0.9)',
              letterSpacing: '0.06em',
              display: 'block',
              textShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}>
              {service.label}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
