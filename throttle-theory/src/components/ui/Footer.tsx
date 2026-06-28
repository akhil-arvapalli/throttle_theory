const SERVICES_LIST = [
  'Engine & Performance',
  'Maintenance & Service',
  'Paint & Detailing',
  'Vinyl Wrapping',
  'Wash & Valet',
]

export default function Footer() {
  return (
    <footer
      id="contact"
      style={{
        background: '#080808',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '48px 5%',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
          maxWidth: 960,
          margin: '0 auto',
        }}
      >
        {/* Left: logo + tagline */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
              <path
                d="M1 8h4l2-6 3 8 2-4 2 3 2-3h3"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              THROTTLE THEORY
            </span>
          </div>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: 'rgba(255,255,255,0.45)',
              fontStyle: 'italic',
              lineHeight: 1.5,
            }}
          >
            We work on machines. Not timelines.
          </p>
        </div>

        {/* Right: services + contact */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 14,
                color: 'rgba(255,255,255,0.8)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Services
            </p>
            {SERVICES_LIST.map((s) => (
              <p
                key={s}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.45)',
                  lineHeight: 1.8,
                }}
              >
                {s}
              </p>
            ))}
          </div>

          <div>
            <p
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 14,
                color: 'rgba(255,255,255,0.8)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Contact
            </p>
            {[
              'Hyderabad, Telangana',
              '+91 98765 43210',
              'Mon–Sat  9am–7pm',
            ].map((line) => (
              <p
                key={line}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.45)',
                  lineHeight: 1.8,
                }}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          maxWidth: 960,
          margin: '32px auto 0',
          paddingTop: 20,
          borderTop: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: 'rgba(255,255,255,0.45)',
          }}
        >
          © 2026 Throttle Theory
        </p>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Instagram', 'Google Maps'].map((link) => (
            <a
              key={link}
              href="#"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: 'rgba(255,255,255,0.45)',
                textDecoration: 'none',
              }}
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
