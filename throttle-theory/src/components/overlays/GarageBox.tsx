import { motion } from 'framer-motion'
import type { Service } from '../../data/services'

interface Props {
  service: Service
  progress: number
}

const NEOMORPH_SHADOW = (accent: string) =>
  `8px 8px 24px rgba(0,0,0,0.55), -4px -4px 12px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.07), 0 0 0 1px rgba(255,255,255,0.06)`

export default function GarageBox({ service, progress }: Props) {
  const { startPhase, endPhase, accentColor, position } = service

  const fadeWidth = 0.02
  let opacity = 0
  if (progress >= startPhase && progress < startPhase + fadeWidth) {
    opacity = (progress - startPhase) / fadeWidth
  } else if (progress >= startPhase + fadeWidth && progress < endPhase - fadeWidth) {
    opacity = 1
  } else if (progress >= endPhase - fadeWidth && progress < endPhase) {
    opacity = 1 - (progress - (endPhase - fadeWidth)) / fadeWidth
  }

  const visible = opacity > 0

  const positionStyle: React.CSSProperties =
    position === 'left'
      ? { left: 20, right: 'auto', transform: 'none' }
      : position === 'right'
      ? { right: 20, left: 'auto', transform: 'none' }
      : { left: '50%', transform: 'translateX(-50%)' }

  const boxWidth =
    position === 'center' ? 'min(460px, 90vw)' : 'min(340px, 44vw)'

  return (
    <motion.div
      animate={{ opacity, y: visible ? 0 : 18 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        bottom: '8%',
        zIndex: 10,
        width: boxWidth,
        pointerEvents: visible ? 'auto' : 'none',
        willChange: 'transform, opacity',
        ...positionStyle,
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: NEOMORPH_SHADOW(accentColor),
          padding: '18px 20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Accent top-edge glow */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${accentColor}99, transparent)`,
          borderRadius: '12px 12px 0 0',
        }} />

        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 9,
          color: accentColor,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          margin: '0 0 5px',
          opacity: 0.9,
        }}>
          {service.label}
        </p>

        <h2 style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: position === 'center' ? 'clamp(18px, 2.6vw, 24px)' : 'clamp(16px, 1.8vw, 20px)',
          color: '#f0f0ec',
          margin: '0 0 8px',
          letterSpacing: '0.04em',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}>
          {service.title}
        </h2>

        <div style={{
          width: 28, height: 1,
          background: `linear-gradient(90deg, ${accentColor}, transparent)`,
          marginBottom: 10,
        }} />

        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          color: 'rgba(240,240,236,0.6)',
          lineHeight: 1.65,
          margin: '0 0 12px',
        }}>
          {service.description}
        </p>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {service.items.map((item) => (
            <li key={item} style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              color: 'rgba(240,240,236,0.38)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{
                width: 4, height: 4, borderRadius: '50%',
                background: accentColor, flexShrink: 0, opacity: 0.8,
              }} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}
