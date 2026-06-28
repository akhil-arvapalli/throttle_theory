import { useScrollStore } from '../../hooks/useScrollProgress'

export default function HeroText() {
  const progress = useScrollStore((s) => s.progress)

  let opacity = 0
  if (progress >= 0.20 && progress <= 0.28) {
    opacity = (progress - 0.20) / 0.08
  } else if (progress > 0.28 && progress < 0.42) {
    opacity = 1
  } else if (progress >= 0.42 && progress <= 0.50) {
    opacity = 1 - (progress - 0.42) / 0.08
  }

  const arrowOpacity = progress < 0.04 ? 1 : progress < 0.08 ? 1 - (progress - 0.04) / 0.04 : 0

  return (
    <>
      {/* Hero title */}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          bottom: '18%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          textAlign: 'center',
          opacity,
          transition: 'opacity 0.1s',
          willChange: 'opacity',
          pointerEvents: 'none',
        }}
      >
        <h1
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(28px, 5vw, 42px)',
            letterSpacing: '0.25em',
            color: '#f5f5f0',
            margin: 0,
            lineHeight: 1,
          }}
        >
          THROTTLE THEORY
        </h1>
        <div style={{ width: 40, height: 1, background: '#f59e0b', margin: '10px auto' }} />
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            color: 'rgba(245,245,240,0.35)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          HYDERABAD — EST. 2026
        </p>
      </div>

      {/* Scroll arrow indicator */}
      <div
        style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          opacity: arrowOpacity,
          willChange: 'opacity, transform',
          pointerEvents: 'none',
        }}
        className="bounce-arrow"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5v14M5 12l7 7 7-7"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </>
  )
}
