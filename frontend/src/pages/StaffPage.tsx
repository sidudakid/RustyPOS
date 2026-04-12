import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { API_BASE, PUBLIC_ORIGIN, fetchJson, MenuItem, OpenTableSummary, OrderWithItemsView, TableOperationalSummary } from '../api'
import { NotificationBanner, NotificationButton, SectionCard, StatusBadge } from '../components'
import { useCafeSettings } from '../cafeSettings'
import { money, shortId } from '../lib'
import {
  browserNotificationPermission,
  canShowBrowserNotifications,
  claimNotification,
  disableNotifications,
  enableNotifications,
  notificationsEnabled,
  playAlertTone,
  showBrowserNotification,
} from '../notifications'
import { OperatorAccessCard } from '../operatorAccess'
import { clearOperatorToken, readOperatorToken, writeOperatorToken } from '../operatorTokens'

type InventoryTone = 'out' | 'low' | 'ok'
type StaffView = 'all' | 'attention' | 'idle'
type FocusLane = 'action' | 'cashier' | 'pickup' | 'stock'

type PrintedBillTable = {
  tableId: string
  tableName: string
  tableNumber?: number | null
  trackingUrl?: string | null
  trackingLabel?: string | null
  orders: OrderWithItemsView[]
  currencyCode: string
  paid: boolean
}

function inventoryTone(item: MenuItem): InventoryTone {
  if (item.stock_count <= 0) return 'out'
  if (item.restock_needed || item.stock_count <= item.low_stock_threshold) return 'low'
  return 'ok'
}

function inventoryLabel(item: MenuItem): string {
  const tone = inventoryTone(item)
  if (tone === 'out') return 'Out of stock'
  if (tone === 'low') return 'Low stock'
  return 'In stock'
}

function sumOrderTotal(entry: OrderWithItemsView) {
  return entry.items.reduce((sum, item) => sum + item.menu_item_price * item.quantity, 0)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildTrackingUrl(trackingToken?: string | null, orderId?: string | null) {
  if (!trackingToken) return null
  const base = PUBLIC_ORIGIN || (typeof window !== 'undefined' ? window.location.origin : '')
  if (!base) return null
  return orderId ? `${base}/t/${trackingToken}/order/${orderId}` : `${base}/t/${trackingToken}`
}

function formatElapsedTime(dateLike?: string | null, now = Date.now()) {
  if (!dateLike) return 'No activity yet'
  const timestamp = new Date(dateLike).getTime()
  if (Number.isNaN(timestamp)) return 'Time unavailable'

  const elapsedMs = Math.max(0, now - timestamp)
  const minutes = Math.floor(elapsedMs / 60000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

async function buildQrDataUrl(link: string) {
  const QRCode = await import('qrcode')
  return QRCode.toDataURL(link, {
    errorCorrectionLevel: 'H',
    margin: 1,
    scale: 10,
    color: { dark: '#111827', light: '#ffffff' },
  })
}

async function printBill({ tableName, tableNumber, trackingUrl, trackingLabel, orders, currencyCode, paid }: PrintedBillTable) {
  const billWindow = window.open('', '_blank', 'width=420,height=900')
  if (!billWindow) return false

  const groupedItems = new Map<string, { quantity: number; total: number }>()
  for (const order of orders) {
    for (const item of order.items) {
      const existing = groupedItems.get(item.menu_item_name)
      const lineTotal = item.menu_item_price * item.quantity
      if (existing) {
        existing.quantity += item.quantity
        existing.total += lineTotal
      } else {
        groupedItems.set(item.menu_item_name, { quantity: item.quantity, total: lineTotal })
      }
    }
  }

  const grandTotal = orders.reduce((sum, order) => sum + sumOrderTotal(order), 0)
  const openedAt = orders[0]?.order.created_at
  const printedAt = new Date().toLocaleString()
  const title = `${tableName} ${paid ? 'Receipt' : 'Bill'}`
  const qrDataUrl = trackingUrl ? await buildQrDataUrl(trackingUrl) : ''
  const rows = Array.from(groupedItems.entries())
    .map(([name, detail]) => `
      <tr>
        <td>${escapeHtml(name)}</td>
        <td>${detail.quantity}</td>
        <td>${escapeHtml(money(detail.total, currencyCode))}</td>
      </tr>
    `)
    .join('')

  billWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Inter, Arial, sans-serif; padding: 20px; color: #111827; }
          h1, h2, p { margin: 0 0 8px; }
          .meta { margin-bottom: 16px; font-size: 13px; color: #4b5563; }
          .stamp { display: inline-block; margin: 8px 0 16px; padding: 6px 10px; border-radius: 999px; background: ${paid ? '#dcfce7' : '#e0f2fe'}; color: #111827; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 14px; }
          th:last-child, td:last-child { text-align: right; }
          .total { margin-top: 18px; display: flex; justify-content: space-between; font-size: 18px; font-weight: 800; }
          .qr-wrap { margin-top: 18px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 16px; display: flex; gap: 14px; align-items: center; }
          .qr-wrap img { width: 104px; height: 104px; object-fit: contain; }
          .qr-label { font-size: 12px; color: #374151; }
          .qr-link { font-size: 11px; color: #6b7280; word-break: break-all; }
          .foot { margin-top: 20px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(tableName)}</h1>
        <h2>${paid ? 'Paid receipt' : 'Customer bill'}</h2>
        ${tableNumber ? `<p><strong>Table #${tableNumber}</strong></p>` : ''}
        <div class="stamp">${paid ? 'PAID' : 'UNPAID'}</div>
        <div class="meta">
          <div>Orders included: ${orders.length}</div>
          <div>Opened: ${openedAt ? escapeHtml(new Date(openedAt).toLocaleString()) : '—'}</div>
          <div>Printed: ${escapeHtml(printedAt)}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="total">
          <span>Total</span>
          <span>${escapeHtml(money(grandTotal, currencyCode))}</span>
        </div>
        ${trackingUrl ? `
          <div class="qr-wrap">
            <img src="${qrDataUrl}" alt="Tracking QR code" />
            <div>
              <strong>${escapeHtml(trackingLabel || 'Scan to track this order')}</strong>
              <div class="qr-label">Guests or staff can scan this code to open the live order/table tracking page.</div>
              <div class="qr-link">${escapeHtml(trackingUrl)}</div>
            </div>
          </div>
        ` : ''}
        <div class="foot">Generated by the staff station for quick cashier handoff.</div>
        <script>window.onload = () => window.print()</script>
      </body>
    </html>
  `)
  billWindow.document.close()
  return true
}

export function StaffPage() {
  const [token, setToken] = useState(() => readOperatorToken('staff'))
  const { currency_code } = useCafeSettings()
  const [lastEvent, setLastEvent] = useState<string>('none yet')
  const [connected, setConnected] = useState(false)
  const [tokenInvalid, setTokenInvalid] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => notificationsEnabled())
  const [banner, setBanner] = useState('🔔 Staff alerts are on by default. Ready orders and cashier updates will pop here.')
  const [bannerTone, setBannerTone] = useState<'info' | 'success' | 'muted' | 'alert'>('info')
  const [tableQuery, setTableQuery] = useState('')
  const [staffView, setStaffView] = useState<StaffView>('attention')
  const [focusLane, setFocusLane] = useState<FocusLane>('action')
  const [lastSettledTable, setLastSettledTable] = useState<PrintedBillTable | null>(null)
  const bannerTimeoutRef = useRef<number | null>(null)
  const refetchRef = useRef<null | (() => void)>(null)

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const inventoryQuery = useQuery({
    queryKey: ['staff-inventory', token],
    queryFn: async () => {
      try {
        const data = await fetchJson<MenuItem[]>('/inventory', { headers: authHeaders })
        setTokenInvalid(false)
        return data
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message.includes('unauthorized')) setTokenInvalid(true)
        throw error
      }
    },
    enabled: Boolean(token),
  })

  const ordersQuery = useQuery({
    queryKey: ['staff-orders', token],
    queryFn: async () => {
      try {
        const data = await fetchJson<OrderWithItemsView[]>('/orders', { headers: authHeaders })
        setTokenInvalid(false)
        return data
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message.includes('unauthorized')) setTokenInvalid(true)
        throw error
      }
    },
    enabled: Boolean(token),
  })

  const openTablesQuery = useQuery({
    queryKey: ['staff-open-tables', token],
    queryFn: async () => {
      try {
        const data = await fetchJson<OpenTableSummary[]>('/staff/open-tables', { headers: authHeaders })
        setTokenInvalid(false)
        return data
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message.includes('unauthorized')) setTokenInvalid(true)
        throw error
      }
    },
    enabled: Boolean(token),
  })

  const tableOperationsQuery = useQuery({
    queryKey: ['staff-table-operations', token],
    queryFn: async () => {
      try {
        const data = await fetchJson<TableOperationalSummary[]>('/staff/tables', { headers: authHeaders })
        setTokenInvalid(false)
        return data
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message.includes('unauthorized')) setTokenInvalid(true)
        throw error
      }
    },
    enabled: Boolean(token),
  })

  useEffect(() => {
    refetchRef.current = () => {
      void inventoryQuery.refetch()
      void ordersQuery.refetch()
      void openTablesQuery.refetch()
      void tableOperationsQuery.refetch()
    }
  }, [inventoryQuery, ordersQuery, openTablesQuery, tableOperationsQuery])

  const showBanner = (message: string, tone: 'info' | 'success' | 'muted' | 'alert') => {
    setBanner(message)
    setBannerTone(tone)
    if (bannerTimeoutRef.current) window.clearTimeout(bannerTimeoutRef.current)
    bannerTimeoutRef.current = window.setTimeout(() => setBanner(''), 3500)
  }

  useEffect(() => {
    if (!token) {
      setConnected(false)
      return
    }

    const wsBase = API_BASE.replace('http://', 'ws://').replace('https://', 'wss://')
    const socket = new WebSocket(`${wsBase}/ws/orders`)

    socket.onopen = () => setConnected(true)
    socket.onclose = () => setConnected(false)
    socket.onerror = () => setConnected(false)
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { type?: string; order_id?: string; status?: string }
      setLastEvent(`${payload.type ?? 'unknown'}:${payload.order_id ?? 'unknown'}`)
      if (
        payload.order_id &&
        payload.status === 'ready' &&
        claimNotification(`staff-ready:${payload.order_id}`)
      ) {
        showBanner(`✅ Order ${payload.order_id.slice(0, 8)} is ready. Open Pickup / handoff when a runner is free.`, 'success')
        showBrowserNotification('Order ready', `Order ${payload.order_id.slice(0, 8)} is ready for the front counter.`)
        void playAlertTone('customer-order-ready')
      }
      refetchRef.current?.()
    }

    return () => socket.close()
  }, [token])

  useEffect(() => () => {
    if (bannerTimeoutRef.current) window.clearTimeout(bannerTimeoutRef.current)
  }, [])

  const updateInventory = useMutation({
    mutationFn: async ({ item, patch }: { item: MenuItem; patch: Partial<MenuItem> }) => {
      const stockCount = Math.max(0, patch.stock_count ?? item.stock_count)
      const lowStockThreshold = Math.max(0, patch.low_stock_threshold ?? item.low_stock_threshold)
      const available = Boolean(patch.available ?? item.available)
      const restockNeeded = Boolean(patch.restock_needed ?? item.restock_needed)

      return fetchJson<MenuItem>(`/inventory/${item.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          stock_count: stockCount,
          low_stock_threshold: lowStockThreshold,
          restock_needed: restockNeeded,
          available,
        }),
      })
    },
    onSuccess: async (item) => {
      showBanner(`📦 ${item.name} inventory updated.`, 'success')
      await Promise.all([inventoryQuery.refetch(), openTablesQuery.refetch(), tableOperationsQuery.refetch()])
    },
  })

  const settleTable = useMutation({
    mutationFn: async (table: OpenTableSummary) =>
      fetchJson<OrderWithItemsView[]>(`/staff/tables/${table.table_id}/settle`, {
        method: 'POST',
        headers: authHeaders,
      }),
    onSuccess: async (settledOrders, table) => {
      const tableName = settledOrders[0]?.order.table_name ?? table.table_name ?? 'table'
      setLastSettledTable({
        tableId: table.table_id,
        tableName,
        tableNumber: table.table_number,
        trackingUrl: buildTrackingUrl(table.tracking_token, settledOrders[0]?.order.id ?? null),
        trackingLabel: table.tracking_token ? 'Scan to reopen this order tracker' : null,
        orders: settledOrders,
        currencyCode: currency_code,
        paid: true,
      })
      showBanner(`💸 ${tableName} marked paid. Bill/receipt is ready to print.`, 'success')
      await Promise.all([ordersQuery.refetch(), openTablesQuery.refetch(), tableOperationsQuery.refetch()])
    },
  })

  const inventoryItems = (inventoryQuery.data ?? []).filter((item) => item.active)
  const inventoryAttention = inventoryItems.filter((item) => inventoryTone(item) !== 'ok')
  const inventoryOut = inventoryItems.filter((item) => inventoryTone(item) === 'out')
  const inventoryLow = inventoryItems.filter((item) => inventoryTone(item) === 'low')
  const orders = ordersQuery.data ?? []
  const readyOrders = orders.filter((entry) => entry.order.status === 'ready')
  const readyUnpaidOrders = readyOrders.filter((entry) => !entry.order.paid_at)
  const openTables = openTablesQuery.data ?? []
  const tableOperations = tableOperationsQuery.data ?? []
  const activeTables = tableOperations.filter((table) => table.active)
  const runnerReadyTables = activeTables.filter((table) => table.ready_order_count > 0)
  const cleanerTables = activeTables.filter((table) => table.open_order_count === 0 && table.paid_order_count > 0)
  const waiterTables = activeTables.filter((table) => table.open_order_count > 0 && table.ready_order_count === 0)
  const inactiveTables = tableOperations.filter((table) => !table.active)
  const idleActiveTables = activeTables.filter((table) => table.open_order_count === 0)
  const activeAttentionTables = activeTables.filter((table) => table.ready_order_count > 0 || table.open_order_count > 0)

  const tableNeedle = tableQuery.trim().toLowerCase()
  const filteredTableOperations = tableOperations.filter((table) => {
    const matchesText =
      !tableNeedle ||
      [table.table_name, table.table_number ? String(table.table_number) : '']
        .join(' ')
        .toLowerCase()
        .includes(tableNeedle)

    const matchesView =
      staffView === 'all' ||
      (staffView === 'attention' && table.active && (table.ready_order_count > 0 || table.open_order_count > 0)) ||
      (staffView === 'idle' && table.active && table.open_order_count === 0)

    return matchesText && matchesView
  })

  const filteredOpenTables = openTables.filter((table) => {
    if (!tableNeedle) return true
    return [table.table_name].join(' ').toLowerCase().includes(tableNeedle)
  })

  const filteredReadyOrders = readyOrders.filter((entry) => {
    if (!tableNeedle) return true
    const tableName = entry.order.table_name ?? ''
    return tableName.toLowerCase().includes(tableNeedle)
  })

  const urgentQueue = useMemo(() => {
    return activeTables
      .filter((table) => table.open_order_count > 0 || table.ready_order_count > 0)
      .sort((left, right) => {
        const leftScore = left.ready_order_count * 100 + left.open_order_count * 10 + left.unpaid_total_amount
        const rightScore = right.ready_order_count * 100 + right.open_order_count * 10 + right.unpaid_total_amount
        return rightScore - leftScore
      })
  }, [activeTables])

  const nextCheckoutTable = filteredOpenTables[0] ?? null
  const nextReadyOrder = filteredReadyOrders[0] ?? null
  const mostUrgentInventoryItem = inventoryAttention[0] ?? null
  const focusSummary =
    focusLane === 'cashier'
      ? {
          title: 'Cashier queue',
          detail: `${filteredOpenTables.length} tables still need checkout.`,
        }
      : focusLane === 'pickup'
        ? {
            title: 'Pickup / handoff queue',
            detail: `${runnerReadyTables.length} tables are waiting for food handoff.`,
          }
        : focusLane === 'stock'
          ? {
              title: 'Stock queue',
              detail: `${inventoryAttention.length} menu items need a stock update.`,
            }
          : {
              title: 'Action board',
              detail: `${waiterTables.length} tables still need floor follow-up and ${cleanerTables.length} look ready to reset.`,
            }

  const unpaidOrdersByTable = useMemo(() => {
    const map = new Map<string, OrderWithItemsView[]>()
    for (const entry of orders) {
      if (entry.order.status === 'paid') continue
      const existing = map.get(entry.order.table_id)
      if (existing) existing.push(entry)
      else map.set(entry.order.table_id, [entry])
    }
    return map
  }, [orders])

  const tableOperationsById = useMemo(() => {
    const map = new Map<string, TableOperationalSummary>()
    for (const table of tableOperations) map.set(table.table_id, table)
    return map
  }, [tableOperations])

  const confirmSettleTable = (table: OpenTableSummary) => {
    const confirmed = window.confirm(
      `Mark ${table.table_name} as paid and close ${table.order_count} unpaid order${table.order_count === 1 ? '' : 's'} for ${money(table.total_amount, currency_code)}?`,
    )
    if (!confirmed) return
    settleTable.mutate(table)
  }

  const printCurrentBill = async (table: OpenTableSummary) => {
    const ordersForTable = unpaidOrdersByTable.get(table.table_id) ?? []
    if (ordersForTable.length === 0) {
      showBanner(`⚠️ ${table.table_name} has no order details ready for a bill yet.`, 'alert')
      return
    }

    const opened = await printBill({
      tableId: table.table_id,
      tableName: table.table_name,
      tableNumber: table.table_number,
      trackingUrl: buildTrackingUrl(table.tracking_token, ordersForTable[0]?.order.id ?? null),
      trackingLabel: table.tracking_token ? 'Scan to track this order live' : null,
      orders: ordersForTable,
      currencyCode: currency_code,
      paid: false,
    })

    if (!opened) {
      showBanner('⚠️ Your browser blocked the bill window. Allow popups and try again.', 'alert')
      return
    }

    showBanner(`🧾 Bill opened for ${table.table_name}.`, 'info')
  }

  const formatLastOrderAt = (value?: string | null) => {
    if (!value) return 'No orders yet'
    const absolute = new Date(value).toLocaleString()
    return `${formatElapsedTime(value)} · ${absolute}`
  }

  if (!token) {
    return (
      <section className="ops-surface ops-surface-staff">
        <div className="ops-hero-card ops-hero-card-staff cashier-hero-card">
          <div className="section-heading-row ops-hero-row">
            <div>
              <p className="eyebrow">Staff entry</p>
              <h2 className="section-title">Open the cashier and floor station</h2>
              <p className="muted ops-hero-copy">Pick up payments, bills, handoff, and stock alerts without making front-of-house staff deal with raw auth plumbing.</p>
            </div>
            <div className="hero-chip-group ops-hero-chips">
              <span className="info-chip">Role: Staff</span>
              <span className="info-chip">Cashier</span>
              <span className="info-chip">Pickup</span>
            </div>
          </div>
        </div>
        <SectionCard>
          <OperatorAccessCard
            role="staff"
            token={token}
            invalid={tokenInvalid}
            connected={connected}
            heading="Staff station sign-in"
            onTokenChange={(value) => {
              setToken(value)
              writeOperatorToken('staff', value)
            }}
            onReset={() => {
              setToken('')
              clearOperatorToken('staff')
            }}
          />
        </SectionCard>
      </section>
    )
  }

  return (
    <section className="two-column page-layout-admin staff-page-shell ops-surface ops-surface-staff">
      <div>
        <div className="ops-hero-card ops-hero-card-staff cashier-hero-card">
          <div className="hero-row ops-hero-row">
            <div>
              <p className="eyebrow">Front of house</p>
              <h2 className="section-title">Cashier station</h2>
              <p className="muted ops-hero-copy">Big obvious actions first: collect money, hand off ready food, print the bill, and only then worry about the rest.</p>
            </div>
            <div className="hero-chip-group ops-hero-chips">
              <span className={connected ? 'info-chip info-chip-success' : 'info-chip info-chip-danger'}>
                {connected ? 'Live connected' : 'Disconnected'}
              </span>
              <span className="info-chip">Need action {urgentQueue.length}</span>
              <span className="info-chip">Ready {readyOrders.length}</span>
              <span className="info-chip">Last: {lastEvent}</span>
            </div>
          </div>

          <div>
            <p className="muted" style={{ margin: '0 0 8px' }}>Tap a card to open that work area. The highlighted card is the lane you are currently working in.</p>
            <div className="ops-stat-strip cashier-stat-strip">
              <button type="button" aria-pressed={focusLane === 'cashier'} title="Open cashier lane" className={`ops-stat-card cashier-stat-card ${focusLane === 'cashier' ? 'cashier-stat-card-active' : ''}`} onClick={() => setFocusLane('cashier')}>
                <span>Take payment now</span>
                <strong>{filteredOpenTables.length}</strong>
                <small>Open cashier lane · tables waiting to be charged</small>
              </button>
              <button type="button" aria-pressed={focusLane === 'pickup'} title="Open pickup / handoff lane" className={`ops-stat-card ops-stat-card-warning cashier-stat-card ${focusLane === 'pickup' ? 'cashier-stat-card-active' : ''}`} onClick={() => setFocusLane('pickup')}>
                <span>Hand off ready food</span>
                <strong>{filteredReadyOrders.length}</strong>
                <small>Open pickup lane · ready for pickup or table handoff</small>
              </button>
              <button type="button" aria-pressed={focusLane === 'action'} title="Open action board" className={`ops-stat-card cashier-stat-card ${focusLane === 'action' ? 'cashier-stat-card-active' : ''}`} onClick={() => setFocusLane('action')}>
                <span>Floor needs eyes</span>
                <strong>{activeAttentionTables.length}</strong>
                <small>Open action board · tables with live work still open</small>
              </button>
              <button type="button" aria-pressed={focusLane === 'stock'} title="Open stock lane" className={`ops-stat-card ops-stat-card-danger cashier-stat-card ${focusLane === 'stock' ? 'cashier-stat-card-active' : ''}`} onClick={() => setFocusLane('stock')}>
                <span>Fix stock alerts</span>
                <strong>{inventoryAttention.length}</strong>
                <small>Open stock lane · items staff may need to block or restock</small>
              </button>
            </div>
          </div>
        </div>

        <SectionCard>
          <div className="ops-toolbar ops-toolbar-sticky cashier-toolbar">
            <div className="cashier-toolbar-topline">
              <strong>What should staff do next?</strong>
              <span className="muted">Search once, then work top to bottom.</span>
            </div>
            <div className="ops-toolbar-main">
              <label>
                Search table
                <input value={tableQuery} onChange={(event) => setTableQuery(event.target.value)} placeholder="Type table name or number" />
              </label>
              <label>
                Show tables
                <select value={staffView} onChange={(event) => setStaffView(event.target.value as StaffView)}>
                  <option value="attention">Needs action first</option>
                  <option value="all">All floor tables</option>
                  <option value="idle">Idle active tables</option>
                </select>
              </label>
            </div>
            <div className="cashier-focus-row" aria-label="Staff work areas">
              <button type="button" className={focusLane === 'action' ? 'cashier-focus-pill cashier-focus-pill-active' : 'cashier-focus-pill'} onClick={() => setFocusLane('action')}>Action board</button>
              <button type="button" className={focusLane === 'cashier' ? 'cashier-focus-pill cashier-focus-pill-active' : 'cashier-focus-pill'} onClick={() => setFocusLane('cashier')}>Cashier</button>
              <button type="button" className={focusLane === 'pickup' ? 'cashier-focus-pill cashier-focus-pill-active' : 'cashier-focus-pill'} onClick={() => setFocusLane('pickup')}>Pickup / handoff</button>
              <button type="button" className={focusLane === 'stock' ? 'cashier-focus-pill cashier-focus-pill-active' : 'cashier-focus-pill'} onClick={() => setFocusLane('stock')}>Stock</button>
            </div>
            <div className="ops-toolbar-side">
              <div className="notification-row ops-toolbar-notifications">
                <p className="muted">Alerts: {soundEnabled ? 'sound on' : 'sound muted'}</p>
                <NotificationButton
                  enabled={soundEnabled}
                  onClick={async () => {
                    if (soundEnabled) {
                      disableNotifications()
                      setSoundEnabled(false)
                      showBanner('🔕 Staff alerts muted.', 'muted')
                      return
                    }

                    const enabled = await enableNotifications()
                    setSoundEnabled(enabled)
                    if (enabled) {
                      const permission = canShowBrowserNotifications() ? browserNotificationPermission() : 'unsupported'
                      showBanner(
                        permission === 'granted'
                          ? '✅ Staff alerts enabled with browser popups.'
                          : '✅ Staff alerts enabled. Browser popups may still need permission.',
                        'success',
                      )
                    } else {
                      showBanner('⚠️ Tap again if your browser is still blocking sound.', 'alert')
                    }
                  }}
                />
              </div>
            </div>
          </div>
          {banner ? <NotificationBanner message={banner} tone={bannerTone} /> : null}
          {lastSettledTable ? (
            <div className="cashier-success-bar" role="status" aria-live="polite">
              <div>
                <p className="eyebrow">Just paid</p>
                <strong>{lastSettledTable.tableName} is settled</strong>
                <div className="muted">Print the bill/receipt now so staff do not have to hunt for it again.</div>
              </div>
              <div className="admin-inline-actions cashier-success-actions">
                <button type="button" onClick={() => void printBill(lastSettledTable)}>Bill / receipt</button>
                <button type="button" className="secondary-button" onClick={() => setLastSettledTable(null)}>Done</button>
              </div>
            </div>
          ) : null}
        </SectionCard>

        {focusLane === 'action' ? (
          <SectionCard>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Do this next</p>
                <h3 className="section-title">Action board</h3>
              </div>
              <span className="info-chip">Top priority first</span>
            </div>
            <div className="inventory-summary-grid staff-summary-grid" style={{ marginBottom: 16 }}>
              <div className="inventory-summary-card"><span className="inventory-summary-label">Cashier</span><strong>{filteredOpenTables.length}</strong></div>
              <div className="inventory-summary-card inventory-summary-card-low"><span className="inventory-summary-label">Waiter follow-up</span><strong>{waiterTables.length}</strong></div>
              <div className="inventory-summary-card inventory-summary-card-out"><span className="inventory-summary-label">Runner handoff</span><strong>{runnerReadyTables.length}</strong></div>
              <div className="inventory-summary-card"><span className="inventory-summary-label">Cleaner reset</span><strong>{cleanerTables.length}</strong></div>
            </div>
            <div className="cashier-next-grid">
              <div className="cashier-next-card cashier-next-card-danger">
                <p className="eyebrow">1. Take payment</p>
                {nextCheckoutTable ? (
                  <>
                    <strong>{nextCheckoutTable.table_name}</strong>
                    <p className="muted">{nextCheckoutTable.order_count} unpaid orders · {money(nextCheckoutTable.total_amount, currency_code)}</p>
                    <div className="admin-inline-actions">
                      <button type="button" onClick={() => confirmSettleTable(nextCheckoutTable)} disabled={settleTable.isPending}>Mark paid & close check</button>
                      <button type="button" className="secondary-button" onClick={() => printCurrentBill(nextCheckoutTable)}>Bill</button>
                    </div>
                  </>
                ) : (
                  <p className="muted">No unpaid tables right now.</p>
                )}
              </div>

              <div className="cashier-next-card cashier-next-card-success">
                <p className="eyebrow">2. Hand off food</p>
                {nextReadyOrder ? (
                  <>
                    <strong>{nextReadyOrder.order.table_name ?? shortId(nextReadyOrder.order.table_id)}{nextReadyOrder.order.table_number ? ` · Table #${nextReadyOrder.order.table_number}` : ''}</strong>
                    <p className="muted">Order #{shortId(nextReadyOrder.order.id)} · {money(sumOrderTotal(nextReadyOrder), currency_code)} · {formatElapsedTime(nextReadyOrder.order.created_at)} · {nextReadyOrder.order.paid_at ? 'already paid' : 'needs payment check'}</p>
                    <div className="pill-list">
                      <StatusBadge status={nextReadyOrder.order.status} />
                      {nextReadyOrder.order.paid_at ? <span className="info-chip info-chip-success">Paid</span> : <span className="info-chip info-chip-danger">Unpaid</span>}
                    </div>
                  </>
                ) : (
                  <p className="muted">No ready orders waiting.</p>
                )}
              </div>

              <div className="cashier-next-card">
                <p className="eyebrow">3. Watch the floor</p>
                <strong>{urgentQueue[0]?.table_name ?? 'All clear'}</strong>
                <p className="muted">
                  {urgentQueue[0]
                    ? `${urgentQueue[0].open_order_count} open · ${urgentQueue[0].ready_order_count} ready · ${money(urgentQueue[0].unpaid_total_amount, currency_code)} unpaid`
                    : 'No active tables are asking for attention.'}
                </p>
              </div>

              <div className="cashier-next-card">
                <p className="eyebrow">Current focus</p>
                <strong>{focusSummary.title}</strong>
                <p className="muted">{focusSummary.detail}</p>
              </div>

              <div className="cashier-next-card cashier-next-card-warning">
                <p className="eyebrow">4. Fix stock</p>
                {mostUrgentInventoryItem ? (
                  <>
                    <strong>{mostUrgentInventoryItem.name}</strong>
                    <p className="muted">{inventoryLabel(mostUrgentInventoryItem)} · On hand {mostUrgentInventoryItem.stock_count}</p>
                    <div className="admin-inline-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => updateInventory.mutate({ item: mostUrgentInventoryItem, patch: { stock_count: 0, available: false, restock_needed: true } })}
                      >
                        Mark out
                      </button>
                      <button
                        type="button"
                        onClick={() => updateInventory.mutate({ item: mostUrgentInventoryItem, patch: { stock_count: Math.max(1, mostUrgentInventoryItem.low_stock_threshold), available: true, restock_needed: false } })}
                      >
                        Restocked
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="muted">No stock alerts right now.</p>
                )}
              </div>
            </div>
          </SectionCard>
        ) : null}

        {focusLane === 'cashier' ? (
          <SectionCard>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Cashier</p>
                <h3 className="section-title">Take payment</h3>
              </div>
              <span className="info-chip">{filteredOpenTables.length} payable</span>
            </div>
            <div className="order-list ops-order-list cashier-primary-list">
              {filteredOpenTables.map((table) => {
                const hasReadyFood = table.statuses.includes('ready')
                const tableOps = tableOperationsById.get(table.table_id)
                return (
                  <div className="admin-order-card ops-order-card cashier-primary-card" key={table.table_id}>
                    <div className="order-meta">
                      <div>
                        <strong>{table.table_name}</strong>
                        <div className="muted">{table.table_number ? `Table #${table.table_number} · ` : ''}{table.order_count} unpaid orders{hasReadyFood ? ' · food ready' : ''}{tableOps?.last_order_at ? ` · ${formatLastOrderAt(tableOps.last_order_at)}` : ''}</div>
                      </div>
                      <strong className="cashier-total-amount">{money(table.total_amount, currency_code)}</strong>
                    </div>
                    <div className="pill-list">
                      {table.statuses.map((status) => (
                        <StatusBadge key={`${table.table_id}-${status}`} status={status} />
                      ))}
                    </div>
                    <div className="cashier-primary-actions">
                      <button type="button" onClick={() => confirmSettleTable(table)} disabled={settleTable.isPending}>
                        Mark paid & close check
                      </button>
                      <button type="button" className="secondary-button" onClick={() => void printCurrentBill(table)}>
                        Bill
                      </button>
                    </div>
                  </div>
                )
              })}
              {filteredOpenTables.length === 0 ? <p className="muted">No unpaid tables right now.</p> : null}
            </div>
          </SectionCard>
        ) : null}

        {focusLane === 'pickup' ? (
          <SectionCard>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Pickup</p>
                <h3 className="section-title">Ready now</h3>
              </div>
              <span className="info-chip">{filteredReadyOrders.length} ready</span>
            </div>
            {nextReadyOrder ? (
              <div className="cashier-ready-spotlight" role="status" aria-live="polite">
                <div>
                  <p className="eyebrow">Hand off now</p>
                  <strong>{nextReadyOrder.order.table_name ?? shortId(nextReadyOrder.order.table_id)} · Order #{shortId(nextReadyOrder.order.id)}</strong>
                  <div className="muted">
                    {nextReadyOrder.order.paid_at
                      ? 'Payment already closed. This one can go straight to the guest.'
                      : 'Pause for payment check before the food leaves the counter.'} Opened {formatElapsedTime(nextReadyOrder.order.created_at)}.
                  </div>
                </div>
                <div className="pill-list cashier-ready-spotlight-pills">
                  <span className="info-chip info-chip-success">Ready for handoff</span>
                  {nextReadyOrder.order.paid_at ? <span className="info-chip info-chip-success">Paid</span> : <span className="info-chip info-chip-danger">Collect payment first</span>}
                </div>
              </div>
            ) : null}
            {readyUnpaidOrders.length > 0 ? (
              <div className="cashier-callout-strip">
                <strong>{readyUnpaidOrders.length} ready orders are still unpaid.</strong>
                <span className="muted">Collect money before the handoff if that matches your service flow.</span>
              </div>
            ) : null}
            <div className="order-list compact-order-list ops-order-list">
              {filteredReadyOrders.map((entry) => {
                const total = sumOrderTotal(entry)
                const tableName = entry.order.table_name ?? shortId(entry.order.table_id)
                return (
                  <div className={`admin-order-card admin-order-card-compact ops-order-card ${entry.order.paid_at ? 'cashier-ready-card cashier-ready-card-paid' : 'cashier-ready-card cashier-ready-card-unpaid'}`} key={entry.order.id}>
                    <div className="order-meta">
                      <div>
                        <strong>{tableName}</strong>
                        <div className="muted">{entry.order.table_number ? `Table #${entry.order.table_number} · ` : ''}Order #{shortId(entry.order.id)} · Opened {formatElapsedTime(entry.order.created_at)}</div>
                      </div>
                      <strong>{money(total, currency_code)}</strong>
                    </div>
                    <div className="pill-list">
                      <StatusBadge status={entry.order.status} />
                      <span className="info-chip info-chip-success">Ready for handoff</span>
                      {entry.order.is_follow_up ? <span className="info-chip info-chip-success">Follow-up add-on</span> : null}
                      {entry.order.paid_at ? <span className="info-chip info-chip-success">Paid</span> : <span className="info-chip info-chip-danger">Collect payment</span>}
                      {entry.order.tracking_token ? <button type="button" className="secondary-button" onClick={() => window.open(buildTrackingUrl(entry.order.tracking_token, entry.order.id) ?? undefined, '_blank')}>Open tracker</button> : null}
                    </div>
                  </div>
                )
              })}
              {filteredReadyOrders.length === 0 ? <p className="muted">Nothing waiting at pickup.</p> : null}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Floor snapshot</p>
              <h3 className="section-title">Tables at a glance</h3>
            </div>
            <span className="info-chip">{filteredTableOperations.length} shown</span>
          </div>
          <div className="inventory-summary-grid staff-summary-grid">
            <div className="inventory-summary-card inventory-summary-card-out">
              <span className="inventory-summary-label">Open checks</span>
              <strong>{openTables.length}</strong>
            </div>
            <div className="inventory-summary-card inventory-summary-card-low">
              <span className="inventory-summary-label">Need attention</span>
              <strong>{activeAttentionTables.length}</strong>
            </div>
            <div className="inventory-summary-card">
              <span className="inventory-summary-label">Idle active</span>
              <strong>{idleActiveTables.length}</strong>
            </div>
            <div className="inventory-summary-card">
              <span className="inventory-summary-label">Inactive</span>
              <strong>{inactiveTables.length}</strong>
            </div>
          </div>
          <div className="order-list compact-order-list ops-order-list">
            {filteredTableOperations.map((table) => {
              const payableTable = openTables.find((entry) => entry.table_id === table.table_id)
              const toneClass = !table.active
                ? 'info-chip'
                : table.open_order_count > 0
                  ? 'info-chip info-chip-danger'
                  : 'info-chip info-chip-success'

              return (
                <div className="admin-order-card ops-order-card" key={table.table_id}>
                  <div className="order-meta">
                    <div>
                      <strong>{table.table_name}</strong>
                      <div className="muted">
                        {table.active ? 'Active on floor' : 'Inactive / hidden'}
                        {table.table_number ? ` · #${table.table_number}` : ''}
                      </div>
                    </div>
                    <span className={toneClass}>
                      {table.active ? (table.open_order_count > 0 ? `${table.open_order_count} open` : 'Clear') : 'Inactive'}
                    </span>
                  </div>
                  <div className="pill-list">
                    {table.unpaid_statuses.map((status) => (
                      <StatusBadge key={`${table.table_id}-${status}`} status={status} />
                    ))}
                    {table.ready_order_count > 0 ? <span className="info-chip info-chip-success">{table.ready_order_count} ready</span> : null}
                    {table.paid_order_count > 0 ? <span className="info-chip">{table.paid_order_count} paid</span> : null}
                  </div>
                  <div className="muted">
                    Unpaid total: {money(table.unpaid_total_amount, currency_code)} · Last activity: {formatLastOrderAt(table.last_order_at)}
                  </div>
                  <div className="admin-inline-actions">
                    {payableTable ? (
                      <>
                        <button type="button" onClick={() => confirmSettleTable(payableTable)} disabled={settleTable.isPending}>
                          Mark paid & close check
                        </button>
                        <button type="button" className="secondary-button" onClick={() => void printCurrentBill(payableTable)}>
                          Bill
                        </button>
                      </>
                    ) : (
                      <button className="secondary-button" disabled>
                        No unpaid check
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {filteredTableOperations.length === 0 ? <p className="muted">No tables match this view.</p> : null}
          </div>
        </SectionCard>
      </div>

      <div className="admin-sidebar-stack">
        <SectionCard>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Station access</p>
              <h3 className="section-title">Entry flow owns sign-in</h3>
            </div>
            <span className={connected ? 'info-chip info-chip-success' : 'info-chip'}>
              {connected ? 'Station live' : 'Saved locally'}
            </span>
          </div>
          <p className="muted">The staff station now stays clean: use the operator entry flow to sign in, and only keep a tiny logout control here for supervisors.</p>
          <div className="pill-list">
            <span className={connected ? 'info-chip info-chip-success' : 'info-chip info-chip-danger'}>{connected ? 'Signed in' : 'Reconnect needed'}</span>
            {tokenInvalid ? <span className="info-chip info-chip-danger">Saved key rejected</span> : null}
            <button type="button" className="secondary-button" onClick={() => { setToken(''); clearOperatorToken('staff') }}>Log out station</button>
          </div>
        </SectionCard>
        <SectionCard>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Inventory</p>
              <h3 className="section-title">Stock controls</h3>
            </div>
            <span className="info-chip">{inventoryAttention.length} flagged</span>
          </div>
          <div className="inventory-summary-grid staff-summary-grid">
            <div className="inventory-summary-card inventory-summary-card-out">
              <span className="inventory-summary-label">Out of stock</span>
              <strong>{inventoryOut.length}</strong>
            </div>
            <div className="inventory-summary-card inventory-summary-card-low">
              <span className="inventory-summary-label">Low stock</span>
              <strong>{inventoryLow.length}</strong>
            </div>
            <div className="inventory-summary-card">
              <span className="inventory-summary-label">Healthy</span>
              <strong>{inventoryItems.length - inventoryAttention.length}</strong>
            </div>
          </div>
          {inventoryItems.length === 0 ? <p className="muted">No active menu items found.</p> : null}
          <div className="inventory-grid inventory-grid-staff">
            {inventoryItems.map((item) => {
              const tone = inventoryTone(item)
              const nextStock = tone === 'out' ? Math.max(1, item.low_stock_threshold) : item.stock_count + 1
              return (
                <div className={`inventory-card inventory-card-${tone}`} key={`staff-inventory-${item.id}`}>
                  <div className="order-meta">
                    <div>
                      <strong>{item.name}</strong>
                      <div className="muted">{item.category}</div>
                    </div>
                    <span className={`inventory-badge inventory-badge-${tone}`}>{inventoryLabel(item)}</span>
                  </div>
                  <div className="inventory-staff-metrics">
                    <div>
                      <span className="muted">On hand</span>
                      <strong>{item.stock_count}</strong>
                    </div>
                    <div>
                      <span className="muted">Par</span>
                      <strong>{item.low_stock_threshold}</strong>
                    </div>
                    <div>
                      <span className="muted">Menu</span>
                      <strong>{item.available ? 'Live' : 'Hidden'}</strong>
                    </div>
                  </div>
                  <p className="muted inventory-helper-text">
                    {tone === 'out'
                      ? 'Customers cannot order this right now. Restock and reopen it when ready.'
                      : tone === 'low'
                        ? 'Still sellable, but the front counter should flag a refill soon.'
                        : 'Stock looks good for service.'}
                  </p>
                  <div className="admin-inline-actions">
                    <button
                      className="secondary-button"
                      onClick={() => updateInventory.mutate({ item, patch: { stock_count: nextStock, available: true, restock_needed: false } })}
                    >
                      +1 stock
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => updateInventory.mutate({ item, patch: { stock_count: 0, available: false, restock_needed: true } })}
                    >
                      Mark out
                    </button>
                    <button
                      onClick={() =>
                        updateInventory.mutate({
                          item,
                          patch: {
                            available: item.stock_count > 0,
                            restock_needed: false,
                          },
                        })
                      }
                    >
                      Clear alert
                    </button>
                  </div>
                  <div className="muted inventory-price-row">Menu price: {money(item.price, currency_code)}</div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      </div>
    </section>
  )
}
