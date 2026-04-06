import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { API_BASE, fetchJson, MenuItem, OpenTableSummary, OrderWithItemsView } from '../api'
import { AuthTokenInput, NotificationBanner, NotificationButton, SectionCard, StatusBadge } from '../components'
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

type InventoryTone = 'out' | 'low' | 'ok'

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

export function StaffPage() {
  const [token, setToken] = useState(localStorage.getItem('adminToken') ?? '')
  const { currency_code } = useCafeSettings()
  const [lastEvent, setLastEvent] = useState<string>('none yet')
  const [connected, setConnected] = useState(false)
  const [tokenInvalid, setTokenInvalid] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => notificationsEnabled())
  const [banner, setBanner] = useState('🔔 Staff alerts are on by default. Ready orders and cashier updates will pop here.')
  const [bannerTone, setBannerTone] = useState<'info' | 'success' | 'muted' | 'alert'>('info')
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

  useEffect(() => {
    refetchRef.current = () => {
      void inventoryQuery.refetch()
      void ordersQuery.refetch()
      void openTablesQuery.refetch()
    }
  }, [inventoryQuery, ordersQuery, openTablesQuery])

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
        showBanner(`✅ Order ${payload.order_id.slice(0, 8)} is ready for handoff or checkout.`, 'success')
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
      await Promise.all([inventoryQuery.refetch(), openTablesQuery.refetch()])
    },
  })

  const settleTable = useMutation({
    mutationFn: async (table: OpenTableSummary) =>
      fetchJson<OrderWithItemsView[]>(`/staff/tables/${table.table_id}/settle`, {
        method: 'POST',
        headers: authHeaders,
      }),
    onSuccess: async (settledOrders) => {
      const tableName = settledOrders[0]?.order.table_name ?? 'table'
      showBanner(`💸 ${tableName} settled successfully.`, 'success')
      await Promise.all([ordersQuery.refetch(), openTablesQuery.refetch()])
    },
  })

  const inventoryItems = (inventoryQuery.data ?? []).filter((item) => item.active)
  const inventoryAttention = inventoryItems.filter((item) => inventoryTone(item) !== 'ok')
  const inventoryOut = inventoryItems.filter((item) => inventoryTone(item) === 'out')
  const inventoryLow = inventoryItems.filter((item) => inventoryTone(item) === 'low')
  const readyOrders = (ordersQuery.data ?? []).filter((entry) => entry.order.status === 'ready')
  const openTables = openTablesQuery.data ?? []

  return (
    <section className="two-column page-layout-admin">
      <div>
        <SectionCard>
          <div className="hero-row">
            <div>
              <p className="eyebrow">Front of house</p>
              <h2 className="section-title">Staff station</h2>
              <p className="muted">Cashier and inventory controls live here now. Kitchen stays focused on prep and pickup flow.</p>
            </div>
            <div className="hero-chip-group">
              <span className={connected ? 'info-chip info-chip-success' : 'info-chip info-chip-danger'}>
                {connected ? 'Live connected' : 'Disconnected'}
              </span>
              <span className="info-chip">Last: {lastEvent}</span>
            </div>
          </div>
          <div className="notification-row">
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
          {banner ? <NotificationBanner message={banner} tone={bannerTone} /> : null}
          <AuthTokenInput
            value={token}
            invalid={tokenInvalid}
            onChange={(value) => {
              setToken(value)
              localStorage.setItem('adminToken', value)
            }}
            onReset={() => {
              setToken('')
              localStorage.removeItem('adminToken')
            }}
          />
        </SectionCard>

        <SectionCard>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Cashier</p>
              <h3 className="section-title">Open tables</h3>
            </div>
            <span className="info-chip">{openTables.length} open</span>
          </div>
          <div className="order-list">
            {openTables.map((table) => (
              <div className="admin-order-card" key={table.table_id}>
                <div className="order-meta">
                  <div>
                    <strong>{table.table_name}</strong>
                    <div className="muted">{table.order_count} unpaid orders</div>
                  </div>
                  <strong>{money(table.total_amount, currency_code)}</strong>
                </div>
                <div className="pill-list">
                  {table.statuses.map((status) => (
                    <StatusBadge key={`${table.table_id}-${status}`} status={status} />
                  ))}
                </div>
                <div className="admin-inline-actions">
                  <button onClick={() => settleTable.mutate(table)} disabled={settleTable.isPending}>
                    Mark table paid
                  </button>
                </div>
              </div>
            ))}
            {openTables.length === 0 ? <p className="muted">No unpaid tables right now.</p> : null}
          </div>
        </SectionCard>

        <SectionCard>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Pickup</p>
              <h3 className="section-title">Ready orders</h3>
            </div>
            <span className="info-chip">{readyOrders.length} ready</span>
          </div>
          <div className="order-list compact-order-list">
            {readyOrders.map((entry) => {
              const total = entry.items.reduce((sum, item) => sum + item.menu_item_price * item.quantity, 0)
              return (
                <div className="admin-order-card admin-order-card-compact" key={entry.order.id}>
                  <div className="order-meta">
                    <div>
                      <strong>#{shortId(entry.order.id)}</strong>
                      <div className="muted">{entry.order.table_name ?? shortId(entry.order.table_id)}</div>
                    </div>
                    <strong>{money(total, currency_code)}</strong>
                  </div>
                  <div className="pill-list">
                    <StatusBadge status={entry.order.status} />
                    {entry.order.paid_at ? <span className="info-chip info-chip-success">Paid</span> : <span className="info-chip">Unpaid</span>}
                  </div>
                </div>
              )
            })}
            {readyOrders.length === 0 ? <p className="muted">Nothing waiting at pickup.</p> : null}
          </div>
        </SectionCard>
      </div>

      <div className="admin-sidebar-stack">
        <SectionCard>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Inventory</p>
              <h3 className="section-title">Stock controls</h3>
            </div>
            <span className="info-chip">{inventoryAttention.length} flagged</span>
          </div>
          <div className="inventory-summary-grid">
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
