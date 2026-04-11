import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { API_BASE, fetchJson, OrderStatus, OrderWithItemsView } from '../api'
import { AuthTokenInput, NotificationBanner, NotificationButton, SectionCard, StatusBadge } from '../components'
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
import { money, shortId } from '../lib'
import { useCafeSettings } from '../cafeSettings'

const kitchenStatuses: OrderStatus[] = ['pending', 'preparing', 'ready']

type KitchenView = 'all' | 'follow-up' | 'rush'

export function KitchenPage() {
  const [token, setToken] = useState(localStorage.getItem('adminToken') ?? '')
  const { currency_code } = useCafeSettings()
  const [lastEvent, setLastEvent] = useState<string>('none yet')
  const [connected, setConnected] = useState(false)
  const [tokenInvalid, setTokenInvalid] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => notificationsEnabled())
  const [banner, setBanner] = useState('🔔 Sound alerts are on by default. Tap mute if you want quiet.')
  const [bannerTone, setBannerTone] = useState<'info' | 'success' | 'muted' | 'alert'>('info')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<KitchenView>('all')
  const bannerTimeoutRef = useRef<number | null>(null)
  const refetchRef = useRef<null | (() => void)>(null)

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const ordersQuery = useQuery({
    queryKey: ['kitchen-orders', token],
    queryFn: async () => {
      try {
        const data = await fetchJson<OrderWithItemsView[]>('/kitchen/orders', {
          headers: authHeaders,
        })
        setTokenInvalid(false)
        return data
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message.includes('unauthorized')) {
          setTokenInvalid(true)
        }
        throw error
      }
    },
    enabled: Boolean(token),
  })

  useEffect(() => {
    refetchRef.current = () => {
      void ordersQuery.refetch()
    }
  }, [ordersQuery])

  const showBanner = (message: string, tone: 'info' | 'success' | 'muted' | 'alert') => {
    setBanner(message)
    setBannerTone(tone)
    if (bannerTimeoutRef.current) {
      window.clearTimeout(bannerTimeoutRef.current)
    }
    bannerTimeoutRef.current = window.setTimeout(() => {
      setBanner('')
    }, 3500)
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
      const payload = JSON.parse(event.data) as { type?: string; order_id?: string }
      setLastEvent(`${payload.type ?? 'unknown'}:${payload.order_id ?? 'unknown'}`)
      if (payload.type === 'new_order' && payload.order_id && claimNotification(`kitchen:${payload.order_id}`)) {
        showBanner(`⚠️ New order received: ${payload.order_id.slice(0, 8)}`, 'alert')
        showBrowserNotification('New kitchen order', `Order ${payload.order_id.slice(0, 8)} just arrived.`)
        void playAlertTone('kitchen-new-order')
      }
      refetchRef.current?.()
    }

    return () => socket.close()
  }, [token])

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) {
        window.clearTimeout(bannerTimeoutRef.current)
      }
    }
  }, [])

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      fetchJson<OrderWithItemsView>(`/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => ordersQuery.refetch(),
  })

  const orders = ordersQuery.data ?? []
  const needle = query.trim().toLowerCase()
  const filteredOrders = orders.filter((entry) => {
    const matchesText =
      !needle ||
      [entry.order.table_name ?? '', shortId(entry.order.id), entry.items.map((item) => item.menu_item_name).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(needle)

    const matchesView =
      view === 'all' ||
      (view === 'follow-up' && entry.order.is_follow_up) ||
      (view === 'rush' && (entry.order.status === 'pending' || entry.order.status === 'ready'))

    return matchesText && matchesView
  })

  const grouped: Record<OrderStatus, OrderWithItemsView[]> = {
    pending: [],
    preparing: [],
    ready: [],
    paid: [],
  }

  for (const order of filteredOrders) {
    if (order.order.status === 'paid') continue
    grouped[order.order.status].push(order)
  }

  const pendingCount = grouped.pending.length
  const preparingCount = grouped.preparing.length
  const readyCount = grouped.ready.length
  const followUps = filteredOrders.filter((entry) => entry.order.is_follow_up).length

  return (
    <section className="ops-surface ops-surface-kitchen">
      <div className="ops-hero-card ops-hero-card-kitchen">
        <div className="section-heading-row kitchen-header-compact ops-hero-row">
          <div>
            <p className="eyebrow">Kitchen operations</p>
            <h2 className="section-title">Prep queue</h2>
            <p className="muted ops-hero-copy">Dark-board view with faster scanning, persistent controls, and clearer handoff states for live service.</p>
          </div>
          <div className="hero-chip-group ops-hero-chips">
            <span className={connected ? 'info-chip info-chip-success' : 'info-chip info-chip-danger'}>
              {connected ? 'Live connected' : 'Disconnected'}
            </span>
            <span className="info-chip">Pending {pendingCount}</span>
            <span className="info-chip">Ready {readyCount}</span>
            <span className="info-chip">Last: {lastEvent}</span>
          </div>
        </div>

        <div className="ops-stat-strip ops-stat-strip-compact">
          <div className="ops-stat-card">
            <span>New / pending</span>
            <strong>{pendingCount}</strong>
            <small>Orders waiting to be claimed</small>
          </div>
          <div className="ops-stat-card">
            <span>In progress</span>
            <strong>{preparingCount}</strong>
            <small>Currently being worked</small>
          </div>
          <div className="ops-stat-card ops-stat-card-success">
            <span>Ready for pickup</span>
            <strong>{readyCount}</strong>
            <small>Needs front-of-house handoff</small>
          </div>
          <div className="ops-stat-card">
            <span>Follow-up adds</span>
            <strong>{followUps}</strong>
            <small>Changes attached to active tables</small>
          </div>
        </div>
      </div>

      <SectionCard>
        <div className="ops-toolbar ops-toolbar-sticky">
          <div className="ops-toolbar-main">
            <label>
              Search orders
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search table, ticket, or item" />
            </label>
            <label>
              View focus
              <select value={view} onChange={(event) => setView(event.target.value as KitchenView)}>
                <option value="all">All active orders</option>
                <option value="rush">Rush lanes</option>
                <option value="follow-up">Follow-up additions</option>
              </select>
            </label>
          </div>
          <div className="ops-toolbar-side">
            <div className="notification-row ops-toolbar-notifications">
              <p className="muted">Notifications: {soundEnabled ? 'sound on' : 'sound muted'}</p>
              <NotificationButton
                enabled={soundEnabled}
                onClick={async () => {
                  if (soundEnabled) {
                    disableNotifications()
                    setSoundEnabled(false)
                    showBanner('🔕 Kitchen alerts muted.', 'muted')
                    return
                  }

                  const enabled = await enableNotifications()
                  setSoundEnabled(enabled)
                  if (enabled) {
                    const permission = canShowBrowserNotifications() ? browserNotificationPermission() : 'unsupported'
                    showBanner(
                      permission === 'granted'
                        ? '✅ Kitchen alerts enabled with browser popups.'
                        : '✅ Kitchen alerts enabled. Browser popups may still need permission.',
                      'success',
                    )
                  } else {
                    showBanner('⚠️ Tap again if your browser is still blocking sound.', 'alert')
                  }
                }}
              />
            </div>
            <AuthTokenInput
              value={token}
              invalid={tokenInvalid}
              connected={connected}
              compactWhenFilled
              loadedLabel="Kitchen station connected"
              switchLabel="Switch token"
              title="Kitchen token"
              description="Paste the active owner or kitchen token to unlock the live kitchen board and order controls on this station."
              placeholder="Paste kitchen token"
              helperText="Enter the token once to unlock the kitchen board. After that, this box will collapse so cooks can focus on tickets."
              onChange={(value) => {
                setToken(value)
                localStorage.setItem('adminToken', value)
              }}
              onReset={() => {
                setToken('')
                localStorage.removeItem('adminToken')
              }}
            />
          </div>
        </div>

        {banner ? <NotificationBanner message={banner} tone={bannerTone} /> : null}
      </SectionCard>

      <div className="three-column kitchen-board-grid ops-board-grid">
        {kitchenStatuses.map((status) => (
          <SectionCard key={status}>
            <div className="ops-lane-header">
              <div>
                <p className="eyebrow">{status === 'pending' ? 'Triage' : status === 'preparing' ? 'Active cook' : 'Handoff'}</p>
                <h3 className="section-title">{status === 'pending' ? 'Queued' : status === 'preparing' ? 'Preparing' : 'Ready'}</h3>
              </div>
              <span className="info-chip">{grouped[status].length}</span>
            </div>
            <div className="order-list ops-order-list">
              {(grouped[status] ?? []).map((entry) => {
                const total = entry.items.reduce((sum, item) => sum + item.menu_item_price * item.quantity, 0)
                return (
                  <div className="card admin-order-card ops-order-card" key={entry.order.id}>
                    <div className="order-meta">
                      <div>
                        <strong>#{shortId(entry.order.id)}</strong>
                        <div className="muted">{entry.order.table_name ?? shortId(entry.order.table_id)}</div>
                      </div>
                      <StatusBadge status={entry.order.status} />
                    </div>
                    {entry.order.is_follow_up ? (
                      <div className="pill-list kitchen-follow-up-pills">
                        <span className="info-chip info-chip-success">Follow-up to active table order</span>
                        <span className="info-chip">{entry.order.follow_up_additions_count} add-on update{entry.order.follow_up_additions_count === 1 ? '' : 's'}</span>
                      </div>
                    ) : null}
                    <ul className="ops-order-items">
                      {entry.items.map((item) => (
                        <li key={item.id}>
                          <span>{item.quantity} × {item.menu_item_name}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="ops-order-footer">
                      <div className="muted">
                        <div>{new Date(entry.order.created_at).toLocaleTimeString()}</div>
                        <div>{entry.items.length} line{entry.items.length === 1 ? '' : 's'}</div>
                      </div>
                      <strong>{money(total, currency_code)}</strong>
                    </div>
                    {status === 'pending' && (
                      <button onClick={() => updateStatus.mutate({ orderId: entry.order.id, status: 'preparing' })}>
                        Start preparing
                      </button>
                    )}
                    {status === 'preparing' && (
                      <button onClick={() => updateStatus.mutate({ orderId: entry.order.id, status: 'ready' })}>
                        Mark ready for pickup
                      </button>
                    )}
                    {status === 'ready' && (
                      <button className="secondary-button" disabled>
                        Waiting on staff handoff
                      </button>
                    )}
                  </div>
                )
              })}
              {grouped[status].length === 0 ? <p className="muted">No orders in this lane.</p> : null}
            </div>
          </SectionCard>
        ))}
      </div>
    </section>
  )
}
