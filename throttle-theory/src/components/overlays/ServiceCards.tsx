import { useScrollStore } from '../../hooks/useScrollProgress'
import { SERVICES } from '../../data/services'
import ServiceCard from './ServiceCard'

export default function ServiceCards() {
  const progress = useScrollStore((s) => s.progress)

  return (
    <>
      {SERVICES.map((service) => {
        // Each card appears at its scrollPhase and disappears 0.06 later
        const visible = progress >= service.scrollPhase && progress < service.scrollPhase + 0.07
        return (
          <ServiceCard key={service.id} service={service} visible={visible} />
        )
      })}
    </>
  )
}
