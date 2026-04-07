import { SectionCard } from '../../components'
import { money, useAdminOutletState } from '../../adminShared'

function formatMonthLabel(value: string) {
  const direct = new Date(`${value}-01T00:00:00Z`)
  if (!Number.isNaN(direct.getTime())) {
    return direct.toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' })
  }

  const fallback = new Date(value)
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  }

  return value
}

function profitLossTone(profit: number) {
  if (profit > 0) return 'analytics-tonal-value analytics-tonal-value-profit'
  if (profit < 0) return 'analytics-tonal-value analytics-tonal-value-loss'
  return 'analytics-tonal-value'
}

export function AdminAnalyticsPage() {
  const admin = useAdminOutletState()
  const analytics = admin.analyticsQuery.data
  const revenue = admin.revenueQuery.data
  const monthlyProfitLoss = analytics?.monthly_profit_loss ?? []
  const latestMonth = monthlyProfitLoss[0]
  const profitableMonths = monthlyProfitLoss.filter((entry) => entry.profit > 0).length
  const lossMonths = monthlyProfitLoss.filter((entry) => entry.profit < 0).length

  return (
    <section className="two-column page-layout-admin">
      <div>
        <SectionCard>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Stakeholder view</p>
              <h3 className="section-title">Monthly profit &amp; loss</h3>
            </div>
            <span className="info-chip">{monthlyProfitLoss.length} months</span>
          </div>

          <div className="admin-overview-kpi-grid analytics-kpi-grid">
            <div className="admin-overview-kpi-card">
              <span className="muted">Latest profit</span>
              <strong className={latestMonth ? profitLossTone(latestMonth.profit) : undefined}>
                {latestMonth ? money(latestMonth.profit, admin.currency_code) : '—'}
              </strong>
              <small>{latestMonth ? formatMonthLabel(latestMonth.month) : 'Waiting for backend data'}</small>
            </div>

            <div className="admin-overview-kpi-card admin-overview-kpi-card-low">
              <span className="muted">Profitable months</span>
              <strong>{profitableMonths}</strong>
              <small>Months above break-even</small>
            </div>

            <div className="admin-overview-kpi-card">
              <span className="muted">Loss months</span>
              <strong>{lossMonths}</strong>
              <small>Months below break-even</small>
            </div>
          </div>

          <div className="admin-edit-list analytics-subsection">
            {monthlyProfitLoss.map((month) => (
              <div className="admin-edit-card analytics-profit-loss-card" key={month.month}>
                <div className="section-heading-row analytics-profit-loss-header">
                  <strong>{formatMonthLabel(month.month)}</strong>
                  <span className={profitLossTone(month.profit)}>{money(month.profit, admin.currency_code)}</span>
                </div>

                <div className="analytics-profit-loss-grid">
                  <div>
                    <p className="muted">Revenue</p>
                    <strong>{money(month.revenue, admin.currency_code)}</strong>
                  </div>
                  <div>
                    <p className="muted">Costs</p>
                    <strong>{money(month.costs, admin.currency_code)}</strong>
                  </div>
                  <div>
                    <p className="muted">Margin</p>
                    <strong>{typeof month.margin_percent === 'number' ? `${month.margin_percent.toFixed(1)}%` : '—'}</strong>
                  </div>
                </div>
              </div>
            ))}

            {!monthlyProfitLoss.length ? (
              <p className="muted">
                Monthly profit/loss data will appear here once the admin analytics API returns revenue, costs, and profit by month.
              </p>
            ) : null}
          </div>
        </SectionCard>

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
                <strong>{formatMonthLabel(month.month)}</strong>
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
