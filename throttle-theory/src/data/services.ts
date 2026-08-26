export interface Service {
  id: string
  title: string
  subtitle: string
  description: string
  items: string[]
  accentColor: string
  /** Scroll progress (0→1) where the card appears — synced to the matching video scene. */
  phase: number
  /** How long (progress units) the card stays up. Defaults to CARD_WINDOW. */
  window?: number
  position: 'left' | 'right'
  /**
   * Desktop-only camera tracking: the card drifts from `from` to `to` across
   * its window, following the video's camera move. x/y are viewport
   * percentages (card center), s is scale.
   */
  track?: { from: TrackPoint; to: TrackPoint }
}

export interface TrackPoint {
  /** viewport % from left (card center) */
  x: number
  /** viewport % from top (card center) */
  y: number
  /** scale */
  s: number
}

/** Default time on screen (progress units). */
export const CARD_WINDOW = 0.115

/**
 * Card phases are tuned to the video timeline:
 *   0.215  workshop aisle — cars in service bays
 *   0.325  engine bay closeups (Lexus on lift, camera zooms in)
 *   0.44   classic Porsche 930, part 1 — restoration
 *   0.515  classic Porsche 930, part 2 — wraps & finishing
 *   0.595  paint booth reveal
 *   0.90   neon finale (CTA)
 */
export const SERVICES: Service[] = [
  {
    id: 'maintenance',
    title: 'Maintenance & Service',
    subtitle: 'Full-spectrum care',
    description:
      'Scheduled servicing, brakes, suspension, AC and inspections — handled in dedicated bays, never rushed.',
    items: ['Oil, filters & fluids', 'Brakes, pads & rotors', 'Suspension & alignment', 'AC service & regas'],
    accentColor: '#60a5fa',
    phase: 0.215,
    position: 'left',
    // Camera dollies forward down the aisle — card drifts with the parallax
    track: { from: { x: 22, y: 48, s: 1 }, to: { x: 17, y: 53, s: 0.97 } },
  },
  {
    id: 'engine',
    title: 'Engine & Performance',
    subtitle: 'Rebuild · Tune · Remap',
    description:
      'Diagnostics, engine rebuilds, ECU remapping and turbo work. We speak Bosch and Haltech.',
    items: ['Compression & leak-down testing', 'Timing chain / belt', 'Turbo rebuild & upgrade', 'ECU remap'],
    accentColor: '#f59e0b',
    phase: 0.325,
    position: 'right',
    // Camera zooms into the engine bay — card eases in toward the engine
    track: { from: { x: 77, y: 44, s: 1 }, to: { x: 68, y: 56, s: 0.93 } },
  },
  {
    id: 'restoration',
    title: 'Restoration & Classics',
    subtitle: 'Bring them back to life',
    description:
      'Ground-up restorations and classic care — patina preserved, everything else renewed.',
    items: ['Full ground-up restoration', 'Engine & drivetrain rebuilds', 'Interior retrim', 'Period-correct detailing'],
    accentColor: '#34d399',
    phase: 0.44,
    window: 0.07,
    position: 'left',
    // Slow push-in on the 930's rear — card eases toward the car
    track: { from: { x: 22, y: 46, s: 1 }, to: { x: 28, y: 54, s: 0.95 } },
  },
  {
    id: 'finishing',
    title: 'Wraps & Finishing',
    subtitle: 'Vinyl · Protection · Valet',
    description:
      'Vinyl wraps, chrome deletes and protection film — finished with a hand wash. No automated machines, ever.',
    items: ['Full & partial wraps', 'Chrome delete & liveries', 'PPF & ceramic top-ups', 'Hand wash & valet'],
    accentColor: '#38bdf8',
    phase: 0.515,
    window: 0.07,
    position: 'left',
    // The 930's rear fills the right of frame — card drifts up the left
    track: { from: { x: 24, y: 52, s: 1 }, to: { x: 19, y: 45, s: 0.96 } },
  },
  {
    id: 'paint',
    title: 'Paint & Detailing',
    subtitle: 'Booth-finished · Ceramic · PPF',
    description:
      'Correction to full respray in our downdraft paint booth, sealed with ceramic coating or PPF.',
    items: ['Multi-stage paint correction', 'Full resprays — dedicated booth', 'Ceramic Pro coating & PPF', 'Interior deep clean'],
    accentColor: '#a78bfa',
    phase: 0.595,
    position: 'right',
    // Booth doors open toward center — card eases in toward the reveal
    track: { from: { x: 78, y: 46, s: 1 }, to: { x: 70, y: 55, s: 0.94 } },
  },
]
