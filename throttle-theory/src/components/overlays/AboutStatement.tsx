import { useScrollStore } from '../../hooks/useScrollProgress'
import { SITE } from '../../config/site'
import ScrambleText from '../reactbits/ScrambleText'

/**
 * Brand statement over the "lights flick on" moment (progress ~0.13–0.22),
 * between the shutter opening and the workshop reveal. Headline decodes
 * in when the statement becomes readable, replays on re-entry.
 */
export default function AboutStatement() {
  const progress = useScrollStore((s) => s.progress)

  let opacity = 0
  if (progress >= 0.125 && progress <= 0.155) {
    opacity = (progress - 0.125) / 0.03
  } else if (progress > 0.155 && progress < 0.195) {
    opacity = 1
  } else if (progress >= 0.195 && progress <= 0.225) {
    opacity = 1 - (progress - 0.195) / 0.03
  }

  const play = opacity > 0.6

  return (
    <section
      id="about"
      className="about-overlay"
      style={{
        opacity,
        visibility: opacity === 0 ? 'hidden' : 'visible',
        pointerEvents: 'none',
      }}
      aria-hidden={opacity < 0.5}
    >
      <p className="overlay-kicker">The Theory</p>
      <h2 className="about-headline">
        <ScrambleText text="One roof." play={play} duration={750} />
        <br />
        <ScrambleText text="Every obsession." play={play} duration={1000} />
      </h2>
      <p className="about-sub">
        A full-service performance garage in {SITE.city} — from daily drivers to
        ground-up restorations.
      </p>
      <span className="sr-only">
        {SITE.name} — {SITE.tagline}
      </span>
    </section>
  )
}
