import { SectionCard } from '../../components'
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

  return (
    <div className="page-layout-admin admin-management-page">
      <section className="grid stats-grid">
        <SectionCard>
          <p className="eyebrow">Catalog</p>
          <h3 className="section-title">Menu items</h3>
          <strong className="stat-value">{menuItems.length}</strong>
          <p className="muted">{archivedItems.length} archived · {menuItems.filter((item) => item.active).length} active</p>
        </SectionCard>
        <SectionCard>
          <p className="eyebrow">Structure</p>
          <h3 className="section-title">Categories</h3>
          <strong className="stat-value">{categories.length}</strong>
          <p className="muted">{archivedCategories.length} archived · {categories.filter((category) => category.active).length} active</p>
        </SectionCard>
        <SectionCard>
          <p className="eyebrow">Inventory</p>
          <h3 className="section-title">Needs attention</h3>
          <strong className="stat-value">{lowStockItems.length}</strong>
          <p className="muted">{unavailableItems.length} unavailable or empty</p>
        </SectionCard>
        <SectionCard>
          <p className="eyebrow">Revenue</p>
          <h3 className="section-title">Reported total</h3>
          <strong className="stat-value">{revenue ? money(revenue.total_revenue, admin.currency_code) : '—'}</strong>
          <p className="muted">Analytics-only view for ownership</p>
        </SectionCard>
      </section>

      <section className="two-column page-layout-admin">
        <div>
          <SectionCard>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Management scope</p>
                <h3 className="section-title">Admin database workspace</h3>
              </div>
              <span className="info-chip">No live order rail here</span>
            </div>
            <div className="admin-edit-list">
              <div className="admin-edit-card">
                <strong>Menu & categories</strong>
                <p className="muted inventory-helper-text">
                  Register new categories and items, edit names/prices/images, toggle availability, and archive records that should no longer appear.
                </p>
              </div>
              <div className="admin-edit-card">
                <strong>Inventory values</strong>
                <p className="muted inventory-helper-text">
                  Update stock counts, thresholds, restock flags, and availability without mixing that work into floor operations.
                </p>
              </div>
              <div className="admin-edit-card">
                <strong>Restaurant identity & table access</strong>
                <p className="muted inventory-helper-text">
                  Edit branding, address, service mode, managed table counts, table links, and QR assets from Settings.
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
              Admin manages the structure and records. Staff handles live service activity separately in the Staff workspace.
            </p>
          </SectionCard>
        </div>

        <aside className="admin-sidebar-stack">
          <SectionCard>
            <div className="section-heading-row">
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
              <span className={admin.setupChecks.tableRecordsReady ? 'info-chip info-chip-success' : 'info-chip'}>Tables</span>
              <span className={admin.setupChecks.tableLinksReady ? 'info-chip info-chip-success' : 'info-chip'}>Links</span>
              <span className={admin.setupChecks.supportReady ? 'info-chip info-chip-success' : 'info-chip'}>Support</span>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Data hygiene</p>
                <h3 className="section-title">Admin watchlist</h3>
              </div>
              <span className="info-chip">CRUD focus</span>
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
        </aside>
      </section>
    </div>
  )
}
