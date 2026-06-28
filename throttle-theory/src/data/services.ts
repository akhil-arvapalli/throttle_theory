export interface Service {
  id: string
  title: string
  subtitle: string
  description: string
  items: string[]
  accentColor: string
  scrollPhase: number
  position: 'left' | 'right'
}

export const SERVICES: Service[] = [
  {
    id: 'engine',
    title: 'Engine & Performance',
    subtitle: 'Rebuild · Tune · Remap',
    description: 'Full diagnostics, engine rebuilds, ECU remapping, turbo service, and performance upgrades. We speak Bosch and Haltech.',
    items: ['Compression & leak-down testing', 'Timing chain / belt', 'Turbo rebuild & upgrade', 'ECU remap'],
    accentColor: '#f59e0b',
    scrollPhase: 0.75,
    position: 'right',
  },
  {
    id: 'maintenance',
    title: 'Maintenance & Service',
    subtitle: 'Full spectrum care',
    description: 'Scheduled servicing, brake systems, suspension, AC, and full pre-purchase inspections.',
    items: ['Oil, filter & fluids', 'Brake pads, rotors, caliper', 'Suspension & alignment', 'AC service & regas'],
    accentColor: '#60a5fa',
    scrollPhase: 0.80,
    position: 'left',
  },
  {
    id: 'detailing',
    title: 'Paint & Detailing',
    subtitle: 'Correction · Ceramic · PPF',
    description: 'Single-stage to multi-stage paint correction, ceramic coating, and paint protection film application.',
    items: ['Multi-stage paint correction', 'Ceramic Pro coating', 'PPF (full / partial)', 'Interior deep clean'],
    accentColor: '#34d399',
    scrollPhase: 0.85,
    position: 'right',
  },
  {
    id: 'wrapping',
    title: 'Vinyl Wrapping',
    subtitle: 'Full · Partial · Livery',
    description: 'Full body wraps, chrome deletes, racing stripes, and custom livery design. 3M and Avery certified.',
    items: ['Full body wrap', 'Chrome delete', 'Custom livery design', 'Carbon fibre accents'],
    accentColor: '#a78bfa',
    scrollPhase: 0.88,
    position: 'left',
  },
  {
    id: 'wash',
    title: 'Wash & Valet',
    subtitle: 'Hand wash · Express · Full',
    description: 'Foam cannon hand wash, interior valet, tyre dressing, and express packages. No automated machines — ever.',
    items: ['Foam cannon wash', 'Clay bar decontamination', 'Interior vacuum & wipe', 'Tyre & trim dressing'],
    accentColor: '#38bdf8',
    scrollPhase: 0.93,
    position: 'right',
  },
]
