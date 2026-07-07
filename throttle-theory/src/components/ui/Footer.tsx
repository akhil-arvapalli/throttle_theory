const SERVICES_LIST = [
  'Engine & Performance',
  'Maintenance & Service',
  'Paint & Detailing',
  'Vinyl Wrapping',
  'Wash & Valet',
]

export default function Footer() {
  return (
    <>
      <footer
        id="contact"
        className="footer"
      >
        <div className="footer-grid">
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
          <div className="footer-right-grid">
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
        <div className="footer-bottom">
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

      <style>{`
        .footer {
          background: #080808;
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 48px 5%;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          max-width: 960px;
          margin: 0 auto;
        }

        .footer-right-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .footer-bottom {
          max-width: 960px;
          margin: 32px auto 0;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.04);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        @media (max-width: 768px) {
          .footer {
            padding: 32px 20px;
          }
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .footer-right-grid {
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .footer-bottom {
            flex-direction: column;
            text-align: center;
            gap: 12px;
          }
        }

        @media (max-width: 420px) {
          .footer-right-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }
      `}</style>
    </>
  )
}
