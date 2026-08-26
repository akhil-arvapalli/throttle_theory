/**
 * Single source of truth for business info shown across the site
 * (hero, CTA overlays, footer, SEO tags).
 *
 * ⚠️ PLACEHOLDER VALUES — swap these with the real details before launch.
 * Every component reads from here, so this is the only file to edit.
 */
export const SITE = {
  name: 'Throttle Theory',
  tagline: 'We work on machines. Not timelines.',
  city: 'Hyderabad',
  region: 'Telangana',
  established: 2026,
  phoneDisplay: '+91 98765 43210',
  phoneHref: 'tel:+919876543210',
  /** TODO: dummy until the real number lands — point this at the wa.me link. */
  whatsappHref: '#',
  email: 'hello@throttletheory.in',
  emailHref: 'mailto:hello@throttletheory.in',
  address: 'Hyderabad, Telangana, India',
  hours: 'Mon–Sat · 9am–7pm',
  instagram: 'https://www.instagram.com/throttletheory.hyd/',
  mapsUrl: 'https://maps.google.com/?q=Throttle+Theory+Hyderabad',
  /** Used for canonical URL + social preview tags. Update after domain is final. */
  siteUrl: 'https://throttletheory.in',
} as const