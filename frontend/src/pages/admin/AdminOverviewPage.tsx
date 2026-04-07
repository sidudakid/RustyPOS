import { NavLink } from 'react-router-dom'
import { AuthTokenInput, SectionCard } from '../../components'
import { money, useAdminOutletState } from '../../adminShared'

export function AdminOverviewPage() {
  const admin = useAdminOutletState()
  const revenue = admin.revenueQuery.data
  const menuItems = admin.draftMenuItems
  const categories = admin.draftCategories
  const inventoryItems = admin.inventoryQuery.data ?? []
  const tableAccess = admin.settingsQuery.data?.table_access ?? []
  const activeTableAccess = tableAccess.filter((table) => table.active)
  const operationalTables = admin.tableOperationsQuery.data ?? []
  const activeOperationalTables = operationalTables.filter((table) => table.active)
  const inactiveOperationalTables = operationalTables.filter((table) => !table.active)
  const lowStockItems = inventoryItems.filter((item) => item.restock_needed || item.stock_count <= item.low_stock_threshold)
  const unavailableItems = inventoryItems.filter((item) => !item.available || item.stock_count <= 0)
  const archivedItems = menuItems.filter((item) => !item.active)
  const archivedCategories = categories.filter((category) => !category.active)
  const topRiskItems = [...inventoryItems]
    .filter((item) => item.active)
    .sort((left, right) => {
      const leftScore = Number(left.stock_count <= 0 || !left.available) * 2 + Number(left.restock_needed || left.stock_count <= left.low_stock_threshold)
      const rightScore = Number(right.stock_count <= 0 || !right.available) * 2 + Number(right.restock_needed || right.stock_count <= right.low_stock_threshold)
      if (rightScore !== leftScore) return rightScore - leftScore
      return left.stock_count - right.stock_count
    })
    .slice(0, 4)

  return (
    <div className="page-layout-admin admin-management-page admin-overview-page">
      <section className="admin-overview-hero-grid">
        <SectionCard>
          <div className="section-heading-row admin-overview-card-heading">
            <div>
              <p className="eyebrow">Workspace guidance</p>
              <h3 className="section-title">Admin access and next steps</h3>
            </div>
            <span className={admin.connected ? 'info-chip info-chip-success' : 'info-chip info-chip-danger'}>
              {admin.connected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <p className="muted inventory-helper-text admin-overview-intro">
            This admin area is for ownership and database management: configure the restaurant, maintain menu and inventory records, review analytics, and manage table access. Live operational order handling belongs in Staff.
          </p>
          <div className="setup-callout-grid admin-overview-setup-grid">
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
        </SectionCard>
        <SectionCard>
          <div className="section-heading-row admin-overview-card-heading">
            <div>
              <p className="eyebrow">Ownership snapshot</p>
              <h3 className="section-title">Management overview</h3>
            </div>
            <span className="info-chip">CRUD workspace</span>
          </div>
          <p className="muted inventory-helper-text admin-overview-intro">
            Keep this area focused on restaurant setup, menu records, stock hygiene, and reporting. Staff owns the live service rail.
          </p>
          <div className="admin-overview-kpi-grid">
            <div className="admin-overview-kpi-card">
              <span className="inventory-summary-label">Tracked catalog</span>
              <strong>{menuItems.length}</strong>
              <small>{categories.length} categories</small>
            </div>
            <div className="admin-overview-kpi-card admin-overview-kpi-card-low">
              <span className="inventory-summary-label">Inventory attention</span>
              <strong>{lowStockItems.length}</strong>
              <small>{unavailableItems.length} unavailable</small>
            </div>
            <div className="admin-overview-kpi-card">
              <span className="inventory-summary-label">Table access links</span>
              <strong>{activeTableAccess.length}</strong>
              <small>{admin.settingsDraft.table_count} configured</small>
            </div>
            <div className="admin-overview-kpi-card admin-overview-kpi-card-success">
              <span className="inventory-summary-label">Reported revenue</span>
              <strong>{revenue ? money(revenue.total_revenue, admin.currency_code) : '—'}</strong>
              <small>{revenue ? `${revenue.order_count} paid orders` : 'Analytics only'}</small>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="section-heading-row admin-overview-card-heading">
            <div>
              <p className="eyebrow">Setup pulse</p>
              <h3 className="section-title">Readiness</h3>
            </div>
            <span className={admin.setupChecks.isComplete ? 'info-chip info-chip-success' : 'info-chip'}>
              {admin.setupChecks.completed}/{admin.setupChecks.total}
            </span>
          </div>
          <p className="muted inventory-helper-text">{admin.setupChecks.nextAction}</p>
          <div className="pill-list">
            <span className={admin.setupChecks.identityReady ? 'info-chip info-chip-success' : 'info-chip'}>Identity</span>
            <span className={admin.setupChecks.locationReady ? 'info-chip info-chip-success' : 'info-chip'}>Location</span>
            <span className={admin.setupChecks.tableRecordsReady ? 'info-chip info-chip-success' : 'info-chip'}>Tables</span>
            <span className={admin.setupChecks.tableLinksReady ? 'info-chip info-chip-success' : 'info-chip'}>Links</span>
            <span className={admin.setupChecks.supportReady ? 'info-chip info-chip-success' : 'info-chip'}>Support</span>
          </div>
          <div className="admin-overview-quick-links">
            <NavLink className="admin-overview-quick-link" to="/admin/settings">
              <strong>Open settings</strong>
              <span>Branding, address, table counts, and QR links.</span>
            </NavLink>
            <NavLink className="admin-overview-quick-link" to="/admin/menu">
              <strong>Review menu database</strong>
              <span>Names, pricing, categories, and catalog cleanup.</span>
            </NavLink>
          </div>
        </SectionCard>
      </section>

      <section className="two-column page-layout-admin admin-overview-main-grid">
        <div className="admin-overview-main-stack">
          <SectionCard>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Management lanes</p>
                <h3 className="section-title">What belongs here</h3>
              </div>
              <span className="info-chip">No live floor ops</span>
            </div>
            <div className="admin-edit-list admin-lane-grid">
              <div className="admin-edit-card">
                <strong>Menu & categories</strong>
                <p className="muted inventory-helper-text">
                  Register new categories and items, edit names, prices, images, and archive stale records without crowding staff workflows.
                </p>
              </div>
              <div className="admin-edit-card">
                <strong>Inventory values</strong>
                <p className="muted inventory-helper-text">
                  Maintain counts, thresholds, availability, and restock flags as durable data — not as a live rush board.
                </p>
              </div>
              <div className="admin-edit-card">
                <strong>Restaurant identity & table access</strong>
                <p className="muted inventory-helper-text">
                  Update branding, address, service mode, managed table counts, customer links, and support details from Settings.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Table data</p>
                <h3 className="section-title">Provisioning summary</h3>
              </div>
              <span className={admin.setupChecks.tableRecordsReady ? 'info-chip info-chip-success' : 'info-chip'}>
                {admin.setupChecks.tableRecordsReady ? 'Aligned' : 'Needs sync'}
              </span>
            </div>
            <div className="inventory-summary-grid">
              <div className="inventory-summary-card">
                <span className="inventory-summary-label">Configured tables</span>
                <strong>{admin.settingsDraft.table_count}</strong>
              </div>
              <div className="inventory-summary-card">
                <span className="inventory-summary-label">Live links</span>
                <strong>{activeTableAccess.length}</strong>
              </div>
              <div className="inventory-summary-card">
                <span className="inventory-summary-label">Active floor tables</span>
                <strong>{activeOperationalTables.length}</strong>
              </div>
              <div className="inventory-summary-card">
                <span className="inventory-summary-label">Inactive tables</span>
                <strong>{inactiveOperationalTables.length}</strong>
              </div>
            </div>
            <p className="muted inventory-helper-text">
              Admin manages structure and records. Staff handles live service activity separately in the Staff workspace.
            </p>
          </SectionCard>
        </div>

        <aside className="admin-sidebar-stack">
          <SectionCard>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Data hygiene</p>
                <h3 className="section-title">Watchlist</h3>
              </div>
              <span className="info-chip">Owner review</span>
            </div>
            <div className="admin-watchlist">
              <div className="admin-watchlist-row">
                <span>Archived items</span>
                <strong>{archivedItems.length}</strong>
              </div>
              <div className="admin-watchlist-row">
                <span>Archived categories</span>
                <strong>{archivedCategories.length}</strong>
              </div>
              <div className="admin-watchlist-row">
                <span>Low-stock items</span>
                <strong>{lowStockItems.length}</strong>
              </div>
              <div className="admin-watchlist-row">
                <span>Unavailable items</span>
                <strong>{unavailableItems.length}</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Inventory triage</p>
                <h3 className="section-title">Highest-risk items</h3>
              </div>
              <NavLink to="/admin/inventory" className="info-chip admin-overview-inline-link">
                Open inventory
              </NavLink>
            </div>
            {topRiskItems.length === 0 ? (
              <p className="muted">No active inventory items found yet.</p>
            ) : (
              <div className="admin-overview-risk-list">
                {topRiskItems.map((item) => {
                  const tone = item.stock_count <= 0 || !item.available ? 'inventory-badge inventory-badge-out' : item.restock_needed || item.stock_count <= item.low_stock_threshold ? 'inventory-badge inventory-badge-low' : 'inventory-badge inventory-badge-ok'
                  return (
                    <div key={item.id} className="admin-overview-risk-row">
                      <div>
                        <strong>{item.name}</strong>
                        <p className="muted inventory-price-row">
                          {item.category} · {item.stock_count} in stock · threshold {item.low_stock_threshold}
                        </p>
                      </div>
                      <span className={tone}>{item.stock_count <= 0 || !item.available ? 'Critical' : item.restock_needed || item.stock_count <= item.low_stock_threshold ? 'Watch' : 'OK'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>
        </aside>
      </section>
    </div>
  )
}
