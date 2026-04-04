import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useCafeSettings } from '../cafeSettings'

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const settings = useCafeSettings()

  const closeMenu = () => setMenuOpen(false)
  const cafeName = settings.name || 'OpenClaw Café'
  const cafeImage = settings.image_url?.trim() || ''

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block topbar-row">
          <Link to="/" className="brand-link" onClick={closeMenu}>
            {cafeImage ? <img src={cafeImage} alt={cafeName} className="brand-image" /> : <span className="brand-mark">☕</span>}
            <div>
              <h1>{cafeName}</h1>
              <p className="brand-subtitle">Fast café ordering for customers, kitchen, and staff.</p>
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
        <nav className={menuOpen ? 'topnav topnav-open' : 'topnav'}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? 'nav-pill nav-pill-active' : 'nav-pill')}
            onClick={closeMenu}
          >
            Customer
          </NavLink>
          <NavLink
            to="/kitchen"
            className={({ isActive }) => (isActive ? 'nav-pill nav-pill-active' : 'nav-pill')}
            onClick={closeMenu}
          >
            Kitchen
          </NavLink>
          <NavLink
            to="/admin/orders"
            className={({ isActive }) => (isActive ? 'nav-pill nav-pill-active' : 'nav-pill')}
            onClick={closeMenu}
          >
            Admin
          </NavLink>
        </nav>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}
