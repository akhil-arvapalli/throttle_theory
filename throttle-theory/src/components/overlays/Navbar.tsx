import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useScrollStore } from '../../hooks/useScrollProgress'
import { SERVICES } from '../../data/services'

export default function Navbar() {
  const progress = useScrollStore((s) => s.progress)
  const jumpTo = useScrollStore((s) => s.jumpTo)
  const [menuOpen, setMenuOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const servicesRef = useRef<HTMLDivElement>(null)

  const opacity = progress > 0.12 ? 1 : 0

  // Close services dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) {
        setServicesOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleServiceClick = (scrollTarget: number) => {
    jumpTo(scrollTarget)
    setServicesOpen(false)
    setMenuOpen(false)
  }

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="hidden-mobile">

        {/* Services dropdown */}
        <div ref={servicesRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setServicesOpen((v) => !v)}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: servicesOpen ? '#f5f5f0' : 'rgba(255,255,255,0.55)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#f5f5f0')}
            onMouseLeave={(e) => { if (!servicesOpen) e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
          >
            Services
            <svg
              width="10" height="6" viewBox="0 0 10 6" fill="none"
              style={{ transition: 'transform 0.2s', transform: servicesOpen ? 'rotate(180deg)' : 'none' }}
            >
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>

          <AnimatePresence>
            {servicesOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 14px)',
                  right: 0,
                  background: 'rgba(8,8,8,0.96)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6,
                  overflow: 'hidden',
                  minWidth: 180,
                  zIndex: 30,
                }}
              >
                {SERVICES.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceClick(service.scrollTarget)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '11px 16px',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.7)',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${service.accentColor}14`
                      e.currentTarget.style.color = '#f5f5f0'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none'
                      e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
                    }}
                  >
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: service.accentColor, flexShrink: 0,
                    }} />
                    {service.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => jumpTo(0.143)}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: 'rgba(255,255,255,0.55)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#f5f5f0')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
        >
          About
        </button>

        <button
          onClick={() => jumpTo(1.0)}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: 'rgba(255,255,255,0.55)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#f5f5f0')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
        >
          Contact
        </button>
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
          WebkitTapHighlightColor: 'transparent',
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
              background: 'rgba(8,8,8,0.97)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden',
              zIndex: 20,
            }}
          >
            {/* Mobile: Services header */}
            <div style={{
              padding: '10px 24px 4px',
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}>
              Services
            </div>

            {SERVICES.map((service) => (
              <button
                key={service.id}
                onClick={() => handleServiceClick(service.scrollTarget)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '11px 24px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.7)',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: service.accentColor, flexShrink: 0,
                }} />
                {service.label}
              </button>
            ))}

            <button
              onClick={() => { jumpTo(0.143); setMenuOpen(false) }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '14px 24px',
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                color: 'rgba(255,255,255,0.7)',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer',
              }}
            >
              About
            </button>

            <button
              onClick={() => { jumpTo(1.0); setMenuOpen(false) }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '14px 24px',
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                color: 'rgba(255,255,255,0.7)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Contact
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
