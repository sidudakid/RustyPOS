import { SectionCard } from '../../components'
import { money, useAdminOutletState } from '../../adminShared'

export function AdminAnalyticsPage() {
  const admin = useAdminOutletState()
  const analytics = admin.analyticsQuery.data
  const revenue = admin.revenueQuery.data

  return (
    <section className="two-column page-layout-admin">
      <div>
        <SectionCard>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Trends</p>
              <h3 className="section-title">Monthly revenue</h3>
            </div>
            <span className="info-chip">{analytics?.monthly_revenue.length ?? 0} months</span>
          </div>
          <div className="admin-edit-list">
            {(analytics?.monthly_revenue ?? []).map((month) => (
              <div className="admin-edit-card" key={month.month}>
                <strong>{month.month}</strong>
                <p className="muted">Revenue: {money(month.revenue, admin.currency_code)}</p>
                <p className="muted">Orders: {month.order_count}</p>
              </div>
            ))}
            {!analytics?.monthly_revenue.length ? <p className="muted">No revenue trend data yet.</p> : null}
          </div>
        </SectionCard>
      </div>

      <div>
        <SectionCard>
          <p className="eyebrow">Snapshot</p>
          <h3 className="section-title">Revenue summary</h3>
          <p className="muted">Total revenue: {revenue ? money(revenue.total_revenue, admin.currency_code) : '—'}</p>
          <p className="muted">Average order: {revenue ? money(revenue.average_order_value, admin.currency_code) : '—'}</p>
          <p className="muted">Orders counted: {revenue?.order_count ?? 0}</p>
        </SectionCard>

        <SectionCard>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Demand</p>
              <h3 className="section-title">Peak hours</h3>
            </div>
            <span className="info-chip">{analytics?.peak_hours.length ?? 0} slots</span>
          </div>
          <div className="admin-edit-list analytics-subsection">
            {(analytics?.peak_hours ?? []).map((slot) => (
              <div className="admin-edit-card" key={slot.hour}>
                <strong>{slot.hour.toString().padStart(2, '0')}:00</strong>
                <p className="muted">Orders: {slot.order_count}</p>
                <p className="muted">Revenue: {money(slot.revenue, admin.currency_code)}</p>
              </div>
            ))}
            {!analytics?.peak_hours.length ? <p className="muted">No peak-hour data yet.</p> : null}
          </div>
        </SectionCard>
      </div>
    </section>
  )
}
