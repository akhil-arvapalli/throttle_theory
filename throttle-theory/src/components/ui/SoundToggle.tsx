import { useSound } from '../../hooks/useSound'

export default function SoundToggle() {
  const { enabled, toggle } = useSound()

  return (
    <button
      onClick={toggle}
      aria-label={enabled ? 'Mute engine sound' : 'Unmute engine sound'}
      aria-pressed={enabled}
      className="sound-toggle"
    >
      {enabled ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M11 5L6 9H2v6h4l5 4V5z" fill="rgba(255,255,255,0.75)" />
          <path
            d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M11 5L6 9H2v6h4l5 4V5z" fill="rgba(255,255,255,0.4)" />
          <line x1="23" y1="9" x2="17" y2="15" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="17" y1="9" x2="23" y2="15" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}
