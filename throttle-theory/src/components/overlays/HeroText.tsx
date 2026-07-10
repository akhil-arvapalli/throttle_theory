import { useScrollStore } from '../../hooks/useScrollProgress'

export default function HeroText() {
  const progress = useScrollStore((s) => s.progress)

  // Clip 1 = 0.000–0.143 (opening, no text)
  // Clip 2 = 0.143–0.286 (home page — show hero title)
  let opacity = 0
  if (progress >= 0.155 && progress < 0.175) {
    opacity = (progress - 0.155) / 0.02
  } else if (progress >= 0.175 && progress < 0.250) {
    opacity = 1
  } else if (progress >= 0.250 && progress < 0.270) {
    opacity = 1 - (progress - 0.250) / 0.02
  }

  const arrowOpacity = progress < 0.02 ? 1 : progress < 0.05 ? 1 - (progress - 0.02) / 0.03 : 0

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
