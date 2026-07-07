import { motion } from 'framer-motion'
import type { Service } from '../../data/services'

interface Props {
  service: Service
  visible: boolean
}

export default function ServiceCard({ service, visible }: Props) {
  const isRight = service.position === 'right'

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={visible ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="service-card"
      style={{
        position: 'fixed',
        zIndex: 10,
        background: 'rgba(8,8,8,0.82)',
        backdropFilter: 'blur(12px)',
        borderLeft: `3px solid ${service.accentColor}`,
        borderRadius: 4,
        padding: '16px 18px',
        willChange: 'transform, opacity',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      data-position={service.position}
    >
      <div style={{ marginBottom: 4 }}>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            color: service.accentColor,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            margin: '0 0 4px',
          }}
        >
          {service.subtitle}
        </p>
        <h3
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            color: '#f5f5f0',
            margin: 0,
          }}
        >
          {service.title}
        </h3>
      </div>

      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.6,
          margin: '8px 0',
        }}
      >
        {service.description}
      </p>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {service.items.map((item) => (
          <li
            key={item}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: 'rgba(255,255,255,0.4)',
              padding: '2px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ color: service.accentColor, fontSize: 10 }}>—</span>
            {item}
          </li>
        ))}
      </ul>

      {/* Connector line + dot — hidden on mobile */}
      <svg
        className="service-card-connector"
        style={{
          position: 'absolute',
          top: '50%',
          [isRight ? 'left' : 'right']: -40,
          transform: 'translateY(-50%)',
          overflow: 'visible',
          pointerEvents: 'none',
        }}
        width="40"
        height="2"
      >
        <line
          x1={isRight ? 40 : 0}
          y1="1"
          x2={isRight ? 0 : 40}
          y2="1"
          stroke={service.accentColor}
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="4 3"
        />
        <circle
          cx={isRight ? 0 : 40}
          cy="1"
          r="3"
          fill={service.accentColor}
          style={{ filter: `drop-shadow(0 0 4px ${service.accentColor})` }}
        />
      </svg>

      <style>{`
        /* Desktop positioning */
        .service-card {
          top: 50%;
          transform: translateY(-50%);
          width: 280px;
        }
        .service-card[data-position="right"] {
          right: 32px;
        }
        .service-card[data-position="left"] {
          left: 32px;
        }

        /* Mobile: center cards at bottom, full width */
        @media (max-width: 768px) {
          .service-card {
            top: auto !important;
            bottom: 20px !important;
            left: 16px !important;
            right: 16px !important;
            width: auto !important;
            transform: none !important;
            max-width: 400px;
            margin: 0 auto;
          }
          .service-card[data-position="right"] {
            right: 16px !important;
            left: 16px !important;
          }
          .service-card-connector {
            display: none !important;
          }
        }
      `}</style>
    </motion.div>
  )
}
