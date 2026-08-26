import { useScrollStore, scrollToProgress, SECTIONS } from '../hooks/useScrollProgress'
import { SERVICES } from '../data/services'

const STOPS = [
  { label: 'Start', progress: SECTIONS.home },
  { label: 'About', progress: SECTIONS.about },
  ...SERVICES.map((s) => ({ label: s.title, progress: s.phase + 0.02 })),
  { label: 'Contact', progress: SECTIONS.contact },
].sort((a, b) => a.progress - b.progress)

/** Desktop progress rail — shows where you are, click to jump. */
export default function ProgressRail() {
  const progress = useScrollStore((s) => s.progress)

  return (
    <div className="progress-rail hidden-mobile" role="navigation" aria-label="Sections">
      <div className="rail-track" aria-hidden="true">
        <div className="rail-fill" style={{ height: `${progress * 100}%` }} />
      </div>
      {STOPS.map((stop) => {
        const active = progress >= stop.progress - 0.02 && progress < stop.progress + 0.1
        return (
          <button
            key={stop.label}
            className={active ? 'rail-dot rail-dot-active' : 'rail-dot'}
            style={{ top: `${stop.progress * 100}%` }}
            onClick={() => scrollToProgress(stop.progress)}
            aria-label={`Go to ${stop.label}`}
            title={stop.label}
          />
        )
      })}
    </div>
  )
}
