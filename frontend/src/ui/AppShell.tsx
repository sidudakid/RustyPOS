import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useCafeSettings } from '../cafeSettings'

const navItems = [
  { to: '/', label: 'Customer', shortLabel: 'Order', icon: '🛎️', description: 'Ordering and table flow', end: true },
  { to: '/kitchen', label: 'Kitchen', shortLabel: 'Kitchen', icon: '👨‍🍳', description: 'Prep queue and handoff', end: false },
  { to: '/staff', label: 'Staff', shortLabel: 'Staff', icon: '💳', description: 'Cashier and inventory', end: false },
  { to: '/admin/orders', label: 'Admin', shortLabel: 'Admin', icon: '📊', description: 'Operations and settings', end: false },
] as const

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const settings = useCafeSettings()

  const closeMenu = () => setMenuOpen(false)
  const cafeName = settings.name || 'OpenClaw Café'
  const cafeImage = settings.image_url?.trim() || ''

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const activeNavItem = useMemo(
    () =>
      navItems.find((item) =>
        item.end ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
      ) ?? navItems[0],
    [location.pathname],
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-main">
          <div className="brand-block topbar-row">
            <Link to="/" className="brand-link" onClick={closeMenu}>
              <span className="brand-media-frame">
                {cafeImage ? <img src={cafeImage} alt={cafeName} className="brand-image" /> : <span className="brand-mark">☕</span>}
              </span>
              <div>
                <h1>{cafeName}</h1>
                <p className="brand-subtitle">{settings.tagline?.trim() || 'Fast café ordering for customers, kitchen, and staff.'}</p>
              </div>
            </Link>
            <button
              type="button"
              className="hamburger-button secondary-button"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>

          <div className="topbar-context">
            <span className="topbar-context-label">Current workspace</span>
            <strong>
              {activeNavItem.icon} {activeNavItem.label}
            </strong>
            <span>{activeNavItem.description}</span>
          </div>
        </div>

        <nav className={menuOpen ? 'topnav topnav-open' : 'topnav'} aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'nav-pill nav-pill-active' : 'nav-pill')}
              onClick={closeMenu}
            >
              <span className="nav-pill-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="nav-pill-copy">
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </span>
            </NavLink>
          ))}
        </nav>
      </header>

      <nav className="mobile-bottom-nav" aria-label="Primary mobile">
        {navItems.map((item) => (
          <NavLink
            key={`mobile-${item.to}`}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'mobile-bottom-link mobile-bottom-link-active' : 'mobile-bottom-link')}
          >
            <span className="mobile-bottom-link-icon" aria-hidden="true">{item.icon}</span>
            <span className="mobile-bottom-link-label">{item.shortLabel}</span>
          </NavLink>
        ))}
      </nav>

      <main className="page page-with-mobile-nav">
        <Outlet />
      </main>
    </div>
  )
}
