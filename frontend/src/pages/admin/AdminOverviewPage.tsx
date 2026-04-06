import { SectionCard, StatusBadge } from '../../components'
import { money, shortId, type AdminState, useAdminOutletState } from '../../adminShared'

export function AdminOverviewPage() {
  const admin = useAdminOutletState()
  const revenue = admin.revenueQuery.data
  const totalOrders = admin.ordersQuery.data?.length ?? 0
  const pendingOrders = admin.activeOrders.filter((entry) => entry.order.status === 'pending').length
  const preparingOrders = admin.activeOrders.filter((entry) => entry.order.status === 'preparing').length

  return (
    <div className="page-layout-admin">
      <section className="grid stats-grid">
        <SectionCard>
          <p className="eyebrow">Orders</p>
          <h3 className="section-title">Live queue</h3>
          <strong className="stat-value">{admin.activeOrders.length}</strong>
          <p className="muted">Pending: {pendingOrders} · Preparing: {preparingOrders}</p>
        </SectionCard>
        <SectionCard>
          <p className="eyebrow">Pickup</p>
          <h3 className="section-title">Ready now</h3>
          <strong className="stat-value">{admin.readyOrders.length}</strong>
          <p className="muted">Orders waiting at handoff.</p>
        </SectionCard>
        <SectionCard>
          <p className="eyebrow">Revenue</p>
          <h3 className="section-title">Total captured</h3>
          <strong className="stat-value">{revenue ? money(revenue.total_revenue, admin.currency_code) : '—'}</strong>
          <p className="muted">Avg ticket {revenue ? money(revenue.average_order_value, admin.currency_code) : '—'}</p>
        </SectionCard>
        <SectionCard>
          <p className="eyebrow">Volume</p>
          <h3 className="section-title">Orders tracked</h3>
          <strong className="stat-value">{revenue?.order_count ?? totalOrders}</strong>
          <p className="muted">Across the current admin session.</p>
        </SectionCard>
      </section>

      <section className="two-column page-layout-admin">
        <div>
          <SectionCard>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Operations</p>
                <h3 className="section-title">Active orders</h3>
              </div>
              <span className="info-chip">{admin.activeOrders.length} in flight</span>
            </div>

            <div className="order-list">
              {admin.activeOrders.length ? (
                admin.activeOrders.map((entry) => (
                  <AdminOrderCard key={entry.order.id} admin={admin} compact={false} entry={entry} />
                ))
              ) : (
                <p className="muted">No active orders right now.</p>
              )}
            </div>
          </SectionCard>
        </div>

        <aside className="admin-sidebar-stack">
          <SectionCard>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Pickup rail</p>
                <h3 className="section-title">Ready orders</h3>
              </div>
              <span className="info-chip">{admin.readyOrders.length} ready</span>
            </div>
            <div className="order-list compact-order-list">
              {admin.readyOrders.length ? (
                admin.readyOrders.map((entry) => (
                  <AdminOrderCard key={entry.order.id} admin={admin} compact entry={entry} />
                ))
              ) : (
                <p className="muted">Nothing waiting for pickup.</p>
              )}
            </div>
          </SectionCard>
        </aside>
      </section>
    </div>
  )
}

function AdminOrderCard({
  admin,
  compact,
  entry,
}: {
  admin: AdminState
  compact?: boolean
  entry: AdminState['activeOrders'][number]
}) {
  return (
    <div className={compact ? 'admin-order-card admin-order-card-compact' : 'admin-order-card'}>
      <div className="order-meta">
        <div>
          <strong>{entry.order.table_name ?? 'Walk-in order'}</strong>
          <p className="muted">#{shortId(entry.order.id)} · {new Date(entry.order.created_at).toLocaleString()}</p>
        </div>
        <StatusBadge status={entry.order.status} />
      </div>
      <p className="muted">
        {entry.items.map((item) => `${item.quantity}× ${item.menu_item_name}`).join(' · ')}
      </p>
      {entry.order.status !== 'ready' ? (
        <div className="admin-action-row">
          <button onClick={() => admin.updateStatus.mutate({ orderId: entry.order.id, status: 'pending' })}>Pending</button>
          <button onClick={() => admin.updateStatus.mutate({ orderId: entry.order.id, status: 'preparing' })}>Preparing</button>
          <button onClick={() => admin.updateStatus.mutate({ orderId: entry.order.id, status: 'ready' })}>Ready</button>
        </div>
      ) : null}
    </div>
  )
}
