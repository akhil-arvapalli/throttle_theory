import { useScrollStore } from '../hooks/useScrollProgress'

const STEP = 0.005

export default function ScrollButtons() {
  const { progress } = useScrollStore()

  return (
    <div
      className="scroll-buttons"
      style={{
        position: 'fixed',
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
        onTouchStart={() => {
          const interval = setInterval(() => {
            useScrollStore.setState((s) => ({ progress: Math.max(0, s.progress - STEP) }))
          }, 16)
          const stop = () => { clearInterval(interval); window.removeEventListener('touchend', stop) }
          window.addEventListener('touchend', stop)
        }}
        className="scroll-btn"
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
        onTouchStart={() => {
          const interval = setInterval(() => {
            useScrollStore.setState((s) => ({ progress: Math.min(1, s.progress + STEP) }))
          }, 16)
          const stop = () => { clearInterval(interval); window.removeEventListener('touchend', stop) }
          window.addEventListener('touchend', stop)
        }}
        className="scroll-btn"
        aria-label="Scroll down"
      >
        ▼
      </button>

      <style>{`
        .scroll-buttons {
          bottom: 80px;
          right: 24px;
        }
        .scroll-btn {
          width: 40px;
          height: 40px;
          background: rgba(8,8,8,0.85);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 4px;
          color: #f5f5f0;
          font-size: 14px;
          cursor: pointer;
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          -webkit-tap-highlight-color: transparent;
        }
        .scroll-btn:active {
          background: rgba(245,158,11,0.2);
          border-color: rgba(245,158,11,0.4);
        }

        @media (max-width: 768px) {
          .scroll-buttons {
            bottom: 16px;
            right: 16px;
          }
          .scroll-btn {
            width: 36px;
            height: 36px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  )
}
