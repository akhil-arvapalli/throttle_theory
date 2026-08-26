import { SITE } from '../../config/site'

/** Full services list — includes everything, even what the video doesn't show. */
const SERVICES_LIST = [
  'Engine & Performance',
  'Maintenance & Service',
  'Restoration & Classics',
  'Paint & Detailing',
  'Vinyl Wrapping',
  'Wash & Valet',
]

export default function Footer() {
  return (
    <footer id="contact" className="footer">
      <div className="footer-grid">
        {/* Left: logo + tagline + CTA */}
        <div>
          <div className="footer-brand">
            <svg width="20" height="12" viewBox="0 0 20 12" fill="none" aria-hidden="true">
              <path
                d="M1 8h4l2-6 3 8 2-4 2 3 2-3h3"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{SITE.name.toUpperCase()}</span>
          </div>
          <p className="footer-tagline">{SITE.tagline}</p>
          <a
            className="btn btn-solid footer-cta"
            href={SITE.whatsappHref}
            target={SITE.whatsappHref.startsWith('#') ? undefined : '_blank'}
            rel={SITE.whatsappHref.startsWith('#') ? undefined : 'noopener noreferrer'}
          >
            Book a Service
          </a>
        </div>

        {/* Right: services + contact */}
        <div className="footer-right-grid">
          <div>
            <p className="footer-heading">Services</p>
            {SERVICES_LIST.map((s) => (
              <p key={s} className="footer-line">
                {s}
              </p>
            ))}
          </div>

          <div>
            <p className="footer-heading">Contact</p>
            <p className="footer-line">{SITE.address}</p>
            <p className="footer-line">
              <a href={SITE.phoneHref} className="footer-link">
                {SITE.phoneDisplay}
              </a>
            </p>
            <p className="footer-line">
              <a href={SITE.emailHref} className="footer-link">
                {SITE.email}
              </a>
            </p>
            <p className="footer-line">{SITE.hours}</p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom">
        <p className="footer-line">
          © {SITE.established} {SITE.name}
        </p>
        <div className="footer-socials">
          <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="footer-link">
            Instagram
          </a>
          <a href={SITE.mapsUrl} target="_blank" rel="noopener noreferrer" className="footer-link">
            Google Maps
          </a>
        </div>
      </div>
    </footer>
  )
}
