import { NavLink } from 'react-router-dom'
import { SectionCard } from '../../components'
import { money, useAdminOutletState } from '../../adminShared'
import { OperatorAccessCard } from '../../operatorAccess'

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
  const followUpOrders = (admin.ordersQuery.data ?? []).filter((entry) => entry.order.is_follow_up)
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
    <div className="page-layout-admin admin-management-page admin-overview-page ops-surface">
      <SectionCard>
        <div className="ops-hero-card admin-overview-command-card">
          <div className="section-heading-row ops-hero-row">
            <div>
              <p className="eyebrow">Operations pulse</p>
              <h3 className="section-title">Management overview</h3>
              <p className="muted ops-hero-copy">
                One owner view for readiness, revenue, stock risk, and live table access across the café.
              </p>
            </div>
            <div className="ops-hero-chips admin-overview-command-chips">
              <span className={admin.connected ? 'info-chip info-chip-success' : 'info-chip info-chip-danger'}>
                {admin.connected ? 'Connected' : 'Offline'}
              </span>
              <span className={admin.setupChecks.isComplete ? 'info-chip info-chip-success' : 'info-chip'}>
                Setup {admin.setupChecks.completed}/{admin.setupChecks.total}
              </span>
              <span className={unavailableItems.length ? 'info-chip info-chip-danger' : 'info-chip info-chip-success'}>
                {unavailableItems.length} unavailable items
              </span>
            </div>
          </div>

          <div className="ops-stat-strip">
            <div className="ops-stat-card">
              <span>Catalog</span>
              <strong>{menuItems.length}</strong>
              <small>{categories.length} categories tracked</small>
            </div>
            <div className="ops-stat-card ops-stat-card-warning">
              <span>Inventory attention</span>
              <strong>{lowStockItems.length}</strong>
              <small>{unavailableItems.length} unavailable right now</small>
            </div>
            <div className="ops-stat-card ops-stat-card-success">
              <span>Revenue reported</span>
              <strong>{revenue ? money(revenue.total_revenue, admin.currency_code) : '—'}</strong>
              <small>{revenue ? `${revenue.order_count} paid orders` : 'Awaiting analytics data'}</small>
            </div>
            <div className="ops-stat-card">
              <span>Live table links</span>
              <strong>{activeTableAccess.length}</strong>
              <small>{activeOperationalTables.length} active floor tables</small>
            </div>
          </div>
        </div>
      </SectionCard>

      <section className="admin-overview-top-grid admin-overview-top-grid-polished">
        <SectionCard>
          <div className="section-heading-row admin-overview-card-heading">
            <div>
              <p className="eyebrow">Quick actions</p>
              <h3 className="section-title">Jump into work</h3>
            </div>
            <span className="info-chip">Owner flow</span>
          </div>
          <div className="admin-overview-action-grid">
            <NavLink className="admin-overview-quick-link" to="/admin/menu">
              <strong>Edit menu</strong>
              <span>{menuItems.length} items across {categories.length} categories</span>
            </NavLink>
            <NavLink className="admin-overview-quick-link" to="/admin/inventory">
              <strong>Review inventory</strong>
              <span>{lowStockItems.length} items need attention</span>
            </NavLink>
            <NavLink className="admin-overview-quick-link" to="/admin/settings">
              <strong>Manage tables & links</strong>
              <span>{activeTableAccess.length} live table links</span>
            </NavLink>
            <NavLink className="admin-overview-quick-link" to="/admin/analytics">
              <strong>Check analytics</strong>
              <span>{revenue ? `${revenue.order_count} paid orders tracked` : 'Analytics available'}</span>
            </NavLink>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="section-heading-row admin-overview-card-heading">
            <div>
              <p className="eyebrow">Readiness</p>
              <h3 className="section-title">Setup pulse</h3>
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
        </SectionCard>
      </section>

      <section className="admin-overview-hero-grid admin-overview-hero-grid-polished">
        <SectionCard>
          <div className="section-heading-row admin-overview-card-heading">
            <div>
              <p className="eyebrow">Ownership snapshot</p>
              <h3 className="section-title">Operator KPIs</h3>
            </div>
            <span className="info-chip">Live database view</span>
          </div>
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
            <div className="admin-overview-kpi-card">
              <span className="inventory-summary-label">Follow-up adds</span>
              <strong>{followUpOrders.length}</strong>
              <small>Orders updated after first submit</small>
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
              <p className="eyebrow">Access</p>
              <h3 className="section-title">Admin token</h3>
            </div>
            <span className={admin.token ? 'info-chip info-chip-success' : 'info-chip'}>
              {admin.token ? 'Loaded' : 'Missing'}
            </span>
          </div>
          <OperatorAccessCard
            role="admin"
            token={admin.token}
            invalid={admin.tokenInvalid}
            connected={admin.connected}
            heading="Admin workspace sign-in"
            compact
            onTokenChange={(value) => {
              admin.setToken(value)
            }}
            onReset={() => {
              admin.clearToken()
            }}
          />
        </SectionCard>
      </section>

      <section className="two-column page-layout-admin admin-overview-main-grid">
        <div className="admin-overview-main-stack">
          <SectionCard>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Priority panel</p>
                <h3 className="section-title">What needs action</h3>
              </div>
              <span className="info-chip">Owner focus</span>
            </div>
            <div className="admin-overview-priority-grid">
              <div className="admin-edit-card admin-overview-priority-card admin-overview-priority-card-danger">
                <strong>Low-stock items</strong>
                <p className="muted inventory-helper-text">{lowStockItems.length} records need inventory review.</p>
                <NavLink className="admin-overview-inline-link" to="/admin/inventory">Open inventory</NavLink>
              </div>
              <div className="admin-edit-card admin-overview-priority-card">
                <strong>Table links</strong>
                <p className="muted inventory-helper-text">{activeTableAccess.length}/{admin.settingsDraft.table_count} customer entry links are live.</p>
                <NavLink className="admin-overview-inline-link" to="/admin/settings">Open settings</NavLink>
              </div>
              <div className="admin-edit-card admin-overview-priority-card">
                <strong>Catalog hygiene</strong>
                <p className="muted inventory-helper-text">{archivedItems.length} archived items and {archivedCategories.length} archived categories are stored.</p>
                <NavLink className="admin-overview-inline-link" to="/admin/menu">Open menu</NavLink>
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
            <div className="admin-watchlist admin-watchlist-polished">
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
