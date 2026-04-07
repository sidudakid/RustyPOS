import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AuthTokenInput, SectionCard } from '../components'
import { adminShellTitle, setupProgressLabel, useAdminState } from '../adminShared'

const adminNavItems = [
  { to: '/admin/orders', label: 'Overview', description: 'Management hub, setup health, and database controls' },
  { to: '/admin/menu', label: 'Menu', description: 'Create, edit, archive, and organize catalog data' },
  { to: '/admin/inventory', label: 'Inventory', description: 'Stock values, availability, and item maintenance' },
  { to: '/admin/analytics', label: 'Analytics', description: 'Revenue trends and reporting only' },
  { to: '/admin/settings', label: 'Settings', description: 'Branding, tables, links, and tenant config' },
] as const

export function AdminPage() {
  const admin = useAdminState()
  const location = useLocation()
  const currentTitle = adminShellTitle(location.pathname)

  return (
    <section className="admin-shell">
      <SectionCard>
        <div className="hero-row admin-shell-hero">
          <div>
            <p className="eyebrow">Operations</p>
            <h2 className="section-title">Admin workspace</h2>
            <p className="muted">
              This admin area is for ownership and database management: configure the restaurant, maintain menu and inventory records, review analytics, and manage table access. Live operational order handling belongs in Staff.
            </p>
          </div>
          <div className="hero-chip-group">
            <span className={admin.connected ? 'info-chip info-chip-success' : 'info-chip info-chip-danger'}>
              {admin.connected ? 'Live connected' : 'Disconnected'}
            </span>
            <span className={admin.setupChecks.isComplete ? 'info-chip info-chip-success' : 'info-chip'}>
              {setupProgressLabel(admin.setupChecks.completed, admin.setupChecks.total)}
            </span>
            <span className="info-chip">Last: {admin.lastEvent}</span>
            <span className="info-chip">Area: {currentTitle}</span>
          </div>
        </div>

        <div className="setup-callout-grid">
          <div className="setup-callout-card">
            <strong>{admin.token ? 'Admin access is loaded' : 'Admin access still needs a token'}</strong>
            <p className="muted inventory-helper-text">
              {admin.token
                ? 'Authenticated admin CRUD actions are available. Keep this token restricted to the owner or whoever is trusted to change restaurant data.'
                : 'Read-only cafe settings can still load, but admin create/edit/archive actions stay blocked until a valid token is entered.'}
            </p>
          </div>
          <div className="setup-callout-card">
            <strong>Next management step</strong>
            <p className="muted inventory-helper-text">{admin.setupChecks.nextAction}</p>
          </div>
        </div>

        <AuthTokenInput
          value={admin.token}
          invalid={admin.tokenInvalid}
          onChange={(value) => {
            admin.setToken(value)
            localStorage.setItem('adminToken', value)
          }}
          onReset={() => {
            admin.setToken('')
            localStorage.removeItem('adminToken')
          }}
        />

        <div className="admin-subnav-header">
          <div>
            <p className="eyebrow">Workspace map</p>
            <h3 className="section-title">Jump between management areas</h3>
          </div>
          <span className="info-chip">Responsive quick access</span>
        </div>

        <nav className="admin-subnav" aria-label="Admin sections">
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

      <Outlet context={admin} />
    </section>
  )
}
