import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { SectionCard } from '../components'
import { adminShellTitle, setupProgressLabel, useAdminState } from '../adminShared'

const adminNavItems = [
  { to: '/admin/orders', label: 'Overview', shortLabel: 'Overview', description: 'Management hub, setup health, and database controls' },
  { to: '/admin/menu', label: 'Menu', shortLabel: 'Menu', description: 'Create, edit, archive, and organize catalog data' },
  { to: '/admin/inventory', label: 'Inventory', shortLabel: 'Inventory', description: 'Stock values, availability, and item maintenance' },
  { to: '/admin/analytics', label: 'Analytics', shortLabel: 'Analytics', description: 'Revenue trends and reporting only' },
  { to: '/admin/settings', label: 'Settings', shortLabel: 'Settings', description: 'Branding, tables, links, and tenant config' },
] as const

export function AdminPage() {
  const admin = useAdminState()
  const location = useLocation()
  const currentTitle = adminShellTitle(location.pathname)

  return (
    <section className="admin-shell">
      <SectionCard>
        <div className="hero-row admin-shell-hero admin-shell-hero-compact">
          <div>
            <p className="eyebrow">Operations</p>
            <h2 className="section-title">Admin workspace</h2>
          </div>
          <div className="hero-chip-group">
            <span className={admin.connected ? 'info-chip info-chip-success' : 'info-chip info-chip-danger'}>
              {admin.connected ? 'Live connected' : 'Disconnected'}
            </span>
            <span className={admin.setupChecks.isComplete ? 'info-chip info-chip-success' : 'info-chip'}>
              {setupProgressLabel(admin.setupChecks.completed, admin.setupChecks.total)}
            </span>
            <span className="info-chip">Area: {currentTitle}</span>
          </div>
        </div>

        <div className="admin-subnav-header admin-subnav-header-compact">
          <div>
            <p className="eyebrow">Workspace map</p>
            <h3 className="section-title">Jump between management areas</h3>
          </div>
          <span className="info-chip">Responsive quick access</span>
        </div>

        <nav className="admin-subnav admin-subnav-mobile-rail" aria-label="Admin sections">
          {adminNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin/orders'}
              className={({ isActive }) => (isActive ? 'admin-subnav-item admin-subnav-item-active' : 'admin-subnav-item')}
            >
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </NavLink>
          ))}
        </nav>
      </SectionCard>

      <nav className="admin-bottom-nav" aria-label="Admin mobile sections">
        {adminNavItems.map((item) => (
          <NavLink
            key={`admin-mobile-${item.to}`}
            to={item.to}
            end={item.to === '/admin/orders'}
            className={({ isActive }) => (isActive ? 'admin-bottom-link admin-bottom-link-active' : 'admin-bottom-link')}
          >
            <span>{item.shortLabel}</span>
          </NavLink>
        ))}
      </nav>

      <Outlet context={admin} />
    </section>
  )
}
