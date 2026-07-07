import { useSound } from '../../hooks/useSound'

export default function SoundToggle() {
  const { enabled, toggle } = useSound()

  return (
    <>
      <button
        onClick={toggle}
        aria-label={enabled ? 'Disable sound' : 'Enable sound'}
        className="sound-toggle"
      >
        {enabled ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M11 5L6 9H2v6h4l5 4V5z" fill="rgba(255,255,255,0.6)" />
            <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M11 5L6 9H2v6h4l5 4V5z" fill="rgba(255,255,255,0.35)" />
            <line x1="23" y1="9" x2="17" y2="15" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="17" y1="9" x2="23" y2="15" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </button>

      <style>{`
        .sound-toggle {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 30;
          background: rgba(8,8,8,0.7);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          padding: 8px 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(8px);
          -webkit-tap-highlight-color: transparent;
        }
        .sound-toggle:active {
          background: rgba(245,158,11,0.2);
          border-color: rgba(245,158,11,0.4);
        }

        @media (max-width: 768px) {
          .sound-toggle {
            bottom: 16px;
            left: 16px;
            right: auto;
          }
        }
      `}</style>
    </>
  )
}
