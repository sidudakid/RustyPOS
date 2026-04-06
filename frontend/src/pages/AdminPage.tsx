import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AuthTokenInput, SectionCard } from '../components'
import { adminShellTitle, useAdminState } from '../adminShared'

const adminNavItems = [
  { to: '/admin/orders', label: 'Overview', description: 'Live queue, ready pickups, and KPIs' },
  { to: '/admin/menu', label: 'Menu', description: 'Categories and menu items' },
  { to: '/admin/inventory', label: 'Inventory', description: 'Stock levels and availability' },
  { to: '/admin/analytics', label: 'Analytics', description: 'Revenue trends and peak hours' },
  { to: '/admin/settings', label: 'Settings', description: 'Branding, tables, and tenant config' },
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
              Better navigation, cleaner separation, and less everything-in-one-place chaos.
            </p>
          </div>
          <div className="hero-chip-group">
            <span className={admin.connected ? 'info-chip info-chip-success' : 'info-chip info-chip-danger'}>
              {admin.connected ? 'Live connected' : 'Disconnected'}
            </span>
            <span className="info-chip">Last: {admin.lastEvent}</span>
            <span className="info-chip">Area: {currentTitle}</span>
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
