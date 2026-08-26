import { useEffect, useState } from 'react'
import { useScrollStore } from '../../hooks/useScrollProgress'
import { SERVICES } from '../../data/services'
import ServiceCard from './ServiceCard'

const DESKTOP_MQ = '(min-width: 769px)'

/** One card per service, each synced to its matching video scene. */
export default function ServiceCards() {
  const progress = useScrollStore((s) => s.progress)
  const [tracked, setTracked] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches
  )

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ)
    const onChange = (e: MediaQueryListEvent) => setTracked(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <>
      {SERVICES.map((service, index) => {
        const visible =
          progress >= service.phase &&
          progress < service.phase + (service.window ?? 0.115)
        return (
          <ServiceCard
            key={service.id}
            service={service}
            index={index}
            total={SERVICES.length}
            visible={visible}
            progress={progress}
            tracked={tracked}
          />
        )
      })}
    </>
  )
}
