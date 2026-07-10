export interface Service {
  id: string
  label: string
  title: string
  description: string
  items: string[]
  accentColor: string
  /** progress value to jump to when clicking this service */
  scrollTarget: number
  /** box fades in at this progress */
  startPhase: number
  /** box fades out at this progress */
  endPhase: number
  /** horizontal position of the info box on screen */
  position: 'center' | 'left' | 'right'
}

export const SERVICES: Service[] = [
  {
    id: 'diagnostics',
    label: 'Diagnostics',
    title: 'Know Your Machine',
    description:
      'Full OBD scanning, live sensor data, fault code analysis, and pre-purchase inspections. We read the car before anyone touches it.',
    items: ['OBD-II / OBD scan', 'Live sensor & data logging', 'Fault code diagnosis', 'Pre-purchase inspection'],
    accentColor: '#f59e0b',
    scrollTarget: 0.296,
    startPhase: 0.296,
    endPhase: 0.415,
    position: 'center',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    title: 'Keep It Running Right',
    description:
      'Scheduled servicing, brake systems, suspension, AC, and everything in between. We follow manufacturer specs — no shortcuts.',
    items: ['Oil, filter & fluids', 'Brake pads, rotors, caliper', 'Suspension & alignment', 'AC service & regas'],
    accentColor: '#60a5fa',
    scrollTarget: 0.430,
    startPhase: 0.430,
    endPhase: 0.557,
    position: 'center',
  },
  // Clip 5 — Performance (left) + Wheels & Tyres (right)
  {
    id: 'performance',
    label: 'Performance',
    title: 'Push Further',
    description:
      'ECU remapping, turbo upgrades, intake & exhaust, and full engine rebuilds. More power done properly.',
    items: ['ECU remap & tuning', 'Turbo rebuild & upgrade', 'Intake & exhaust work', 'Full engine rebuild'],
    accentColor: '#ef4444',
    scrollTarget: 0.582,
    startPhase: 0.582,
    endPhase: 0.704,
    position: 'left',
  },
  {
    id: 'wheels',
    label: 'Wheels & Tyres',
    title: 'Grip. Balance. Style.',
    description:
      'Tyre fitting, laser wheel alignment, dynamic balancing, and alloy refurbishment.',
    items: ['Tyre supply & fitting', 'Laser wheel alignment', 'Dynamic balancing', 'Alloy wheel repair'],
    accentColor: '#34d399',
    scrollTarget: 0.582,
    startPhase: 0.582,
    endPhase: 0.704,
    position: 'right',
  },
  // Clip 7 — Detailing (left) + Custom Builds (right)
  {
    id: 'detailing',
    label: 'Detailing',
    title: 'Show-Ready Finish',
    description:
      'Multi-stage paint correction, ceramic coating, paint protection film, and deep interior cleaning.',
    items: ['Multi-stage paint correction', 'Ceramic Pro coating', 'PPF (full / partial)', 'Interior deep clean'],
    accentColor: '#a78bfa',
    scrollTarget: 0.868,
    startPhase: 0.868,
    endPhase: 0.975,
    position: 'left',
  },
  {
    id: 'custom',
    label: 'Custom Builds',
    title: 'Built From a Vision',
    description:
      "Full project builds, engine swaps, roll cage fabrication, and bespoke modifications.",
    items: ['Full project builds', 'Engine swaps', 'Roll cage & fabrication', 'Livery & wrap design'],
    accentColor: '#f97316',
    scrollTarget: 0.868,
    startPhase: 0.868,
    endPhase: 0.975,
    position: 'right',
  },
]
