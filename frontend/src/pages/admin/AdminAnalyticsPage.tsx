import { useEffect, useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import { SectionCard } from '../../components'
import { centsToMajorUnits, majorUnitsToCents, money, MonthlyExpenseRecord, useAdminOutletState } from '../../adminShared'

type ExpenseDraft = {
  month: string
  rent: string
  payroll: string
  utilities: string
  marketing: string
  misc: string
  notes: string
}

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

function monthInputValue() {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

function createDraft(month: string, expense?: MonthlyExpenseRecord): ExpenseDraft {
  return {
    month,
    rent: centsToMajorUnits(expense?.rent ?? 0),
    payroll: centsToMajorUnits(expense?.payroll ?? 0),
    utilities: centsToMajorUnits(expense?.utilities ?? 0),
    marketing: centsToMajorUnits(expense?.marketing ?? 0),
    misc: centsToMajorUnits(expense?.misc ?? 0),
    notes: expense?.notes ?? '',
  }
}

function parseExpenseDraft(draft: ExpenseDraft): MonthlyExpenseRecord {
  return {
    month: draft.month,
    rent: majorUnitsToCents(draft.rent),
    payroll: majorUnitsToCents(draft.payroll),
    utilities: majorUnitsToCents(draft.utilities),
    marketing: majorUnitsToCents(draft.marketing),
    misc: majorUnitsToCents(draft.misc),
    notes: draft.notes.trim(),
  }
}

function totalExpenseFromDraft(draft: ExpenseDraft) {
  const parsed = parseExpenseDraft(draft)
  return parsed.rent + parsed.payroll + parsed.utilities + parsed.marketing + parsed.misc
}

function downloadMonthlyAnalyticsPdf({
  cafeName,
  currencyCode,
  month,
  revenue,
  costs,
  profit,
  marginPercent,
  orderCount,
  expenses,
  notes,
}: {
  cafeName: string
  currencyCode: string
  month: string
  revenue: number
  costs: number
  profit: number
  marginPercent?: number | null
  orderCount?: number | null
  expenses: MonthlyExpenseRecord
  notes?: string
}) {
  const doc = new jsPDF()
  const left = 16
  let y = 18

  const writeRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, left, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, 88, y)
    y += 8
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(cafeName || 'Cafe Analytics', left, y)
  y += 10

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Monthly analytics report · ${formatMonthLabel(month)}`, left, y)
  y += 12

  writeRow('Revenue', money(revenue, currencyCode))
  writeRow('Order-linked costs', money(costs, currencyCode))
  writeRow('Operating profit', money(profit, currencyCode))
  writeRow('Margin', typeof marginPercent === 'number' ? `${marginPercent.toFixed(1)}%` : '—')
  writeRow('Orders counted', typeof orderCount === 'number' ? String(orderCount) : '—')

  y += 4
  doc.setFont('helvetica', 'bold')
  doc.text('Operating expenses', left, y)
  y += 8

  writeRow('Rent', money(expenses.rent, currencyCode))
  writeRow('Payroll', money(expenses.payroll, currencyCode))
  writeRow('Utilities', money(expenses.utilities, currencyCode))
  writeRow('Marketing', money(expenses.marketing, currencyCode))
  writeRow('Misc', money(expenses.misc, currencyCode))

  const totalExpenses = expenses.rent + expenses.payroll + expenses.utilities + expenses.marketing + expenses.misc
  writeRow('Total expenses', money(totalExpenses, currencyCode))

  const reportNotes = notes?.trim() || expenses.notes?.trim()
  if (reportNotes) {
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.text('Notes', left, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(reportNotes, 175)
    doc.text(lines, left, y)
  }

  const safeMonth = month.replace(/[^0-9-]/g, '')
  const safeName = (cafeName || 'cafe').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  doc.save(`${safeName || 'cafe'}-analytics-${safeMonth || 'month'}.pdf`)
}

export function AdminAnalyticsPage() {
  const admin = useAdminOutletState()
  const analytics = admin.analyticsQuery.data
  const revenue = admin.revenueQuery.data
  const monthlyProfitLoss = analytics?.monthly_profit_loss ?? []
  const latestMonth = monthlyProfitLoss[0]
  const profitableMonths = monthlyProfitLoss.filter((entry) => entry.profit > 0).length
  const lossMonths = monthlyProfitLoss.filter((entry) => entry.profit < 0).length
  const expenseRecords = admin.monthlyExpensesQuery.data ?? []
  const expenseMap = useMemo(() => new Map(expenseRecords.map((entry) => [entry.month, entry])), [expenseRecords])
  const [selectedMonth, setSelectedMonth] = useState(monthInputValue())
  const [drafts, setDrafts] = useState<Record<string, ExpenseDraft>>({})

  const expenseMonths = useMemo(() => {
    const months = new Set<string>()
    monthlyProfitLoss.forEach((entry) => months.add(entry.month))
    expenseRecords.forEach((entry) => months.add(entry.month))
    if (!months.size) months.add(selectedMonth)
    return Array.from(months).sort((left, right) => right.localeCompare(left)).slice(0, 6)
  }, [expenseRecords, monthlyProfitLoss, selectedMonth])

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current }
      expenseMonths.forEach((month) => {
        if (!next[month]) {
          next[month] = createDraft(month, expenseMap.get(month))
        }
      })
      return next
    })
  }, [expenseMonths, expenseMap])

  const expenseTotal = expenseRecords.reduce((sum, entry) => sum + entry.rent + entry.payroll + entry.utilities + entry.marketing + entry.misc, 0)
  const monthWithExpenses = expenseRecords.length
  const latestExpenseMonth = expenseRecords[0]
  const selectedMonthSummary = monthlyProfitLoss.find((entry) => entry.month === selectedMonth) ?? monthlyProfitLoss[0] ?? null
  const selectedMonthDraft = drafts[selectedMonth] ?? createDraft(selectedMonth, expenseMap.get(selectedMonth))
  const selectedMonthExpenseRecord = parseExpenseDraft(selectedMonthDraft)
  const selectedMonthExpenseTotal = totalExpenseFromDraft(selectedMonthDraft)

  const addMonthDraft = () => {
    if (!selectedMonth) return
    setDrafts((current) => ({
      ...current,
      [selectedMonth]: current[selectedMonth] ?? createDraft(selectedMonth, expenseMap.get(selectedMonth)),
    }))
  }

  const setDraftValue = (month: string, patch: Partial<ExpenseDraft>) => {
    setDrafts((current) => ({
      ...current,
      [month]: { ...(current[month] ?? createDraft(month, expenseMap.get(month))), ...patch },
    }))
  }

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

          <div className="analytics-expense-toolbar analytics-report-toolbar">
            <label>
              <span className="muted">Report month</span>
              <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                downloadMonthlyAnalyticsPdf({
                  cafeName: admin.settingsDraft.name,
                  currencyCode: admin.currency_code,
                  month: selectedMonthSummary?.month ?? selectedMonth,
                  revenue: selectedMonthSummary?.revenue ?? 0,
                  costs: selectedMonthSummary?.costs ?? 0,
                  profit: selectedMonthSummary?.profit ?? -selectedMonthExpenseTotal,
                  marginPercent: selectedMonthSummary?.margin_percent,
                  orderCount: selectedMonthSummary?.order_count,
                  expenses: selectedMonthExpenseRecord,
                  notes: selectedMonthDraft.notes,
                })
              }
            >
              Download PDF report
            </button>
          </div>

          <div className="admin-edit-card analytics-profit-loss-card analytics-month-report-card">
            <div className="section-heading-row analytics-profit-loss-header">
              <div>
                <strong>{formatMonthLabel(selectedMonthSummary?.month ?? selectedMonth)}</strong>
                <p className="muted analytics-expense-card-caption">Focused monthly report for download and stakeholder review.</p>
              </div>
              <span className={profitLossTone(selectedMonthSummary?.profit ?? -selectedMonthExpenseTotal)}>
                {money(selectedMonthSummary?.profit ?? -selectedMonthExpenseTotal, admin.currency_code)}
              </span>
            </div>

            <div className="analytics-profit-loss-grid">
              <div>
                <p className="muted">Revenue</p>
                <strong>{money(selectedMonthSummary?.revenue ?? 0, admin.currency_code)}</strong>
              </div>
              <div>
                <p className="muted">Order-linked costs</p>
                <strong>{money(selectedMonthSummary?.costs ?? 0, admin.currency_code)}</strong>
              </div>
              <div>
                <p className="muted">Saved expenses</p>
                <strong>{money(selectedMonthExpenseTotal, admin.currency_code)}</strong>
              </div>
              <div>
                <p className="muted">Orders</p>
                <strong>{selectedMonthSummary?.order_count ?? 0}</strong>
              </div>
              <div>
                <p className="muted">Margin</p>
                <strong>{typeof selectedMonthSummary?.margin_percent === 'number' ? `${selectedMonthSummary.margin_percent.toFixed(1)}%` : '—'}</strong>
              </div>
            </div>
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
              <p className="eyebrow">Operating costs</p>
              <h3 className="section-title">Monthly expenses</h3>
            </div>
            <span className="info-chip">{monthWithExpenses} saved months</span>
          </div>

          <p className="muted analytics-expense-intro">
            Capture fixed and discretionary monthly operating costs so profit/loss stays grounded in actual rent, payroll, utilities, marketing, and misc spend.
          </p>

          <div className="analytics-expense-toolbar">
            <label>
              <span className="muted">Open month</span>
              <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
            </label>
            <button type="button" className="secondary-button" onClick={addMonthDraft}>
              Open draft month
            </button>
          </div>

          {admin.monthlyExpensesQuery.isLoading ? <p className="muted">Loading saved expenses…</p> : null}
          {admin.monthlyExpensesQuery.isError ? (
            <div className="admin-inventory-empty-state">
              <strong>Expense storage is unavailable right now.</strong>
              <p className="muted inventory-helper-text">
                The analytics page still works, but the monthly expense editor needs the admin expenses endpoint to load or save data.
              </p>
            </div>
          ) : null}

          <div className="admin-edit-list analytics-subsection">
            {expenseMonths.map((month) => {
              const draft = drafts[month] ?? createDraft(month, expenseMap.get(month))
              const summary = monthlyProfitLoss.find((entry) => entry.month === month)
              const totalExpense = totalExpenseFromDraft(draft)
              const projectedProfit = summary ? summary.revenue - totalExpense : null

              return (
                <div className="admin-edit-card analytics-expense-card" key={month}>
                  <div className="section-heading-row analytics-profit-loss-header">
                    <div>
                      <strong>{formatMonthLabel(month)}</strong>
                      <p className="muted analytics-expense-card-caption">
                        {summary ? `Revenue ${money(summary.revenue, admin.currency_code)} · Orders cost model ${money(summary.costs, admin.currency_code)}` : 'No linked profit/loss row yet — expense data can still be prepared.'}
                      </p>
                    </div>
                    <span className="info-chip">{money(totalExpense, admin.currency_code)} total</span>
                  </div>

                  <div className="analytics-expense-grid">
                    {([
                      ['rent', 'Rent'],
                      ['payroll', 'Payroll'],
                      ['utilities', 'Utilities'],
                      ['marketing', 'Marketing'],
                      ['misc', 'Misc'],
                    ] as const).map(([key, label]) => (
                      <label key={key}>
                        <span className="muted">{label}</span>
                        <input
                          inputMode="decimal"
                          placeholder="0.00"
                          value={draft[key]}
                          onChange={(event) => setDraftValue(month, { [key]: event.target.value } as Partial<ExpenseDraft>)}
                        />
                      </label>
                    ))}
                  </div>

                  <label>
                    <span className="muted">Notes</span>
                    <textarea
                      rows={3}
                      placeholder="Lease changes, seasonal payroll spikes, vendor notes, campaign details…"
                      value={draft.notes}
                      onChange={(event) => setDraftValue(month, { notes: event.target.value })}
                    />
                  </label>

                  <div className="analytics-expense-summary-row">
                    <div>
                      <p className="muted">Projected operating profit</p>
                      <strong className={projectedProfit === null ? 'analytics-tonal-value' : profitLossTone(projectedProfit)}>
                        {projectedProfit === null ? '—' : money(projectedProfit, admin.currency_code)}
                      </strong>
                    </div>
                    <div className="admin-inline-actions">
                      <button
                        type="button"
                        onClick={() => admin.upsertMonthlyExpense.mutate(parseExpenseDraft(draft))}
                        disabled={admin.upsertMonthlyExpense.isPending || admin.monthlyExpensesQuery.isError}
                      >
                        {admin.upsertMonthlyExpense.isPending ? 'Saving…' : 'Save expenses'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
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
          <p className="eyebrow">Expense coverage</p>
          <h3 className="section-title">Saved cost baseline</h3>
          <p className="muted">Tracked months: {monthWithExpenses}</p>
          <p className="muted">Saved operating costs: {money(expenseTotal, admin.currency_code)}</p>
          <p className="muted">Latest expense month: {latestExpenseMonth ? formatMonthLabel(latestExpenseMonth.month) : '—'}</p>
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
