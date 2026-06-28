import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useScrollStore } from '../../hooks/useScrollProgress'

const NAV_LINKS = [
  { label: 'Services', href: '#services' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
]

export default function Navbar() {
  const progress = useScrollStore((s) => s.progress)
  const [menuOpen, setMenuOpen] = useState(false)

  const opacity = progress > 0.12 ? 1 : 0

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 52,
        zIndex: 20,
        opacity,
        transition: 'opacity 0.4s',
        background: 'rgba(8,8,8,0.85)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        willChange: 'opacity',
        pointerEvents: opacity > 0 ? 'auto' : 'none',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
          <path
            d="M1 8h4l2-6 3 8 2-4 2 3 2-3h3"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '0.2em',
            color: '#f5f5f0',
          }}
        >
          THROTTLE THEORY
        </span>
      </div>

      {/* Desktop links */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 28 }}
        className="hidden-mobile"
      >
        {NAV_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: 'rgba(255,255,255,0.55)',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#f5f5f0')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Hamburger (mobile) */}
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="show-mobile"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          display: 'none',
        }}
        aria-label="Toggle menu"
      >
        <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
          <line x1="0" y1="2" x2="22" y2="2" stroke="white" strokeWidth="1.5" />
          <line x1="0" y1="8" x2="22" y2="8" stroke="white" strokeWidth="1.5" />
          <line x1="0" y1="14" x2="22" y2="14" stroke="white" strokeWidth="1.5" />
        </svg>
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'absolute',
              top: 52,
              left: 0,
              right: 0,
              background: 'rgba(8,8,8,0.95)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden',
              zIndex: 20,
            }}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'block',
                  padding: '14px 24px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.7)',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                {link.label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
