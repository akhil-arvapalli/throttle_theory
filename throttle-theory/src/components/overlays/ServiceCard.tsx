import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import type { Service } from '../../data/services'
import { CARD_WINDOW } from '../../data/services'
import SpotlightCard from '../reactbits/SpotlightCard'
import BorderBeam from '../reactbits/BorderBeam'

interface Props {
  service: Service
  index: number
  total: number
  visible: boolean
  progress: number
  /** Camera tracking is a desktop-only affordance. */
  tracked: boolean
}

const contentVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}
const riseVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}
const ruleVariants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.5, ease: 'easeOut' as const } },
}
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } },
}
const itemVariants = {
  hidden: { opacity: 0, x: -14 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

/**
 * Scene-synced service card, React-Bits styled: orbiting border beam in the
 * service's accent, staggered content entrance (title → rule draws → items
 * cascade), HUD corner brackets and a mouse-tracked spotlight.
 *
 * On desktop the card also *tracks the camera*: it drifts from `track.from`
 * to `track.to` across its window so it stays spatially attached to the
 * subject the video is zooming into, connector pointing at it.
 */
export default function ServiceCard({ service, index, total, visible, progress, tracked }: Props) {
  let anchorStyle: CSSProperties | undefined
  let side: 'left' | 'right' = service.position
  const isTracked = tracked && !!service.track

  if (service.track && isTracked) {
    const w = service.window ?? CARD_WINDOW
    const t = Math.max(0, Math.min(1, (progress - service.phase) / w))
    const e = easeInOut(t)
    const x = lerp(service.track.from.x, service.track.to.x, e)
    const y = lerp(service.track.from.y, service.track.to.y, e)
    const s = lerp(service.track.from.s, service.track.to.s, e)
    anchorStyle = { '--tx': `${x}%`, '--ty': `${y}%`, '--ts': s } as CSSProperties
    // Connector always points inward, toward the subject
    side = x < 50 ? 'left' : 'right'
  }

  return (
    <div
      className={`service-card-anchor${isTracked ? ' tracked' : ''}`}
      data-position={side}
      style={anchorStyle}
      aria-hidden={!visible}
    >
      <div className="service-card-motion" style={{ pointerEvents: visible ? 'auto' : 'none' }}>
        <motion.div
          initial={false}
          animate={
            visible
              ? { y: 0, opacity: 1, scale: 1 }
              : { y: 28, opacity: 0, scale: 0.985 }
          }
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <BorderBeam color={service.accentColor} duration={7}>
            <SpotlightCard className="service-card" style={{ '--accent': service.accentColor } as CSSProperties}>
              <motion.div
                variants={contentVariants}
                initial="hidden"
                animate={visible ? 'show' : 'hidden'}
              >
                <motion.div variants={riseVariants} className="service-top">
                  <span className="service-index">
                    {String(index + 1).padStart(2, '0')}
                    <em>/{String(total).padStart(2, '0')}</em>
                  </span>
                  <p className="service-subtitle">{service.subtitle}</p>
                </motion.div>

                <motion.h3 variants={riseVariants} className="service-title">
                  {service.title}
                </motion.h3>
                <motion.span variants={ruleVariants} className="service-rule" aria-hidden="true" />

                <motion.p variants={riseVariants} className="service-description">
                  {service.description}
                </motion.p>

                <motion.ul variants={listVariants} className="service-items">
                  {service.items.map((item) => (
                    <motion.li key={item} variants={itemVariants}>
                      <span style={{ color: service.accentColor }}>—</span>
                      {item}
                    </motion.li>
                  ))}
                </motion.ul>
              </motion.div>

              {/* HUD corner brackets */}
              <span className="service-corner service-corner-tl" aria-hidden="true" />
              <span className="service-corner service-corner-br" aria-hidden="true" />
            </SpotlightCard>
          </BorderBeam>
        </motion.div>
      </div>

      {/* Connector line + dot — desktop only, outside the beam's clip */}
      <svg className="service-connector" width="40" height="2" aria-hidden="true">
        <line
          x1={side === 'right' ? 40 : 0}
          y1="1"
          x2={side === 'right' ? 0 : 40}
          y2="1"
          stroke={service.accentColor}
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="4 3"
        />
        <circle
          cx={side === 'right' ? 0 : 40}
          cy="1"
          r="3"
          fill={service.accentColor}
          style={{ filter: `drop-shadow(0 0 4px ${service.accentColor})` }}
        />
      </svg>
    </div>
  )
}
