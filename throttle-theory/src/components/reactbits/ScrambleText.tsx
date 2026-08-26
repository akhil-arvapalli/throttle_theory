import { useEffect, useRef, useState } from 'react'

const GLYPHS = '!<>-_\\/[]{}—=+*^?#01'

interface Props {
  text: string
  /** (Re)plays the scramble when true; clears when false. */
  play: boolean
  /** Rough duration of the reveal in ms. */
  duration?: number
  className?: string
}

/**
 * Decoding-text effect (React Bits "Scramble Text" style): characters cycle
 * through glyphs and settle left-to-right. Spaces never scramble, so the
 * line breaks stay put.
 */
export default function ScrambleText({ text, play, duration = 900, className }: Props) {
  const [display, setDisplay] = useState(play ? text : '')
  const rafRef = useRef(0)

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    if (!play) {
      setDisplay('')
      return
    }

    const chars = text.split('')
    const startT = performance.now()
    // Per-char reveal window: staggered left-to-right with a little jitter
    const queue = chars.map((ch, i) => {
      const t0 = (i / chars.length) * duration * 0.55 + Math.random() * duration * 0.12
      return { ch, start: t0, end: t0 + duration * 0.35 + Math.random() * duration * 0.2 }
    })

    const tick = (now: number) => {
      const elapsed = now - startT
      let out = ''
      let settled = 0
      for (const q of queue) {
        if (q.ch === ' ') {
          out += ' '
          settled++
        } else if (elapsed >= q.end) {
          out += q.ch
          settled++
        } else {
          out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        }
      }
      setDisplay(out)
      if (settled < chars.length) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(text)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [play, text, duration])

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true">{display || ' '}</span>
    </span>
  )
}
