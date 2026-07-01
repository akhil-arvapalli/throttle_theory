import { useScrollStore } from '../hooks/useScrollProgress'

const STEP = 0.005

export default function ScrollButtons() {
  const { progress, setProgress } = useScrollStore()

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 24,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <button
        onMouseDown={() => {
          const interval = setInterval(() => {
            useScrollStore.setState((s) => ({ progress: Math.max(0, s.progress - STEP) }))
          }, 16)
          const stop = () => { clearInterval(interval); window.removeEventListener('mouseup', stop) }
          window.addEventListener('mouseup', stop)
        }}
        style={btnStyle}
        aria-label="Scroll up"
      >
        ▲
      </button>

      <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
        {(progress * 100).toFixed(1)}%
      </div>

      <button
        onMouseDown={() => {
          const interval = setInterval(() => {
            useScrollStore.setState((s) => ({ progress: Math.min(1, s.progress + STEP) }))
          }, 16)
          const stop = () => { clearInterval(interval); window.removeEventListener('mouseup', stop) }
          window.addEventListener('mouseup', stop)
        }}
        style={btnStyle}
        aria-label="Scroll down"
      >
        ▼
      </button>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  background: 'rgba(8,8,8,0.85)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 4,
  color: '#f5f5f0',
  fontSize: 14,
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
