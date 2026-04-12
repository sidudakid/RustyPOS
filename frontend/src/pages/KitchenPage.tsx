import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { API_BASE, fetchJson, OrderStatus, OrderWithItemsView } from '../api'
import { NotificationBanner, NotificationButton, SectionCard, StatusBadge } from '../components'
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
import { OperatorAccessCard } from '../operatorAccess'
import { clearOperatorToken, readOperatorToken, writeOperatorToken } from '../operatorTokens'

const kitchenStatuses: OrderStatus[] = ['pending', 'preparing', 'ready']
const SOCKET_RECONNECT_MS = 2500
const POLL_FALLBACK_MS = 15000
const ELAPSED_REFRESH_MS = 30000

type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline'

function createdAtMs(dateLike?: string | null) {
  if (!dateLike) return 0
  const value = new Date(dateLike).getTime()
  return Number.isNaN(value) ? 0 : value
}

function formatElapsedTime(dateLike: string, now: number) {
  const createdAt = createdAtMs(dateLike)
  if (!createdAt) return 'Time unknown'

  const diffMs = Math.max(0, now - createdAt)
  const totalMinutes = Math.floor(diffMs / 60000)

  if (totalMinutes < 1) return 'Just now'
  if (totalMinutes < 60) return `${totalMinutes}m ago`

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours < 24) return minutes === 0 ? `${hours}h ago` : `${hours}h ${minutes}m ago`

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours === 0 ? `${days}d ago` : `${days}d ${remainingHours}h ago`
}

function kitchenAgeTone(dateLike: string, now: number) {
  const ageMinutes = Math.max(0, Math.floor((now - createdAtMs(dateLike)) / 60000))
  if (ageMinutes >= 20) return 'info-chip info-chip-danger'
  if (ageMinutes >= 10) return 'info-chip'
  return 'info-chip info-chip-success'
}

export function KitchenPage() {
  const [token, setToken] = useState(() => readOperatorToken('kitchen'))
  const { currency_code } = useCafeSettings()
  const [connected, setConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [tokenInvalid, setTokenInvalid] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => notificationsEnabled())
  const [banner, setBanner] = useState('🔔 Sound alerts are on by default. Tap mute if you want quiet.')
  const [bannerTone, setBannerTone] = useState<'info' | 'success' | 'muted' | 'alert'>('info')
  const [clockNow, setClockNow] = useState(() => Date.now())
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null)
  const [orderErrors, setOrderErrors] = useState<Record<string, string>>({})
  const bannerTimeoutRef = useRef<number | null>(null)
  const refetchRef = useRef<null | (() => void)>(null)
  const pollingIntervalRef = useRef<number | null>(null)

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
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    refetchRef.current = () => {
      void ordersQuery.refetch()
    }
  }, [ordersQuery])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockNow(Date.now())
    }, ELAPSED_REFRESH_MS)

    return () => window.clearInterval(timer)
  }, [])

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
    const stopPolling = () => {
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }

    const startPolling = () => {
      if (pollingIntervalRef.current || !token) return
      pollingIntervalRef.current = window.setInterval(() => {
        refetchRef.current?.()
      }, POLL_FALLBACK_MS)
    }

    if (!token) {
      setConnected(false)
      setConnectionState('offline')
      stopPolling()
      return
    }

    let cancelled = false
    let socket: WebSocket | null = null
    let reconnectTimer: number | null = null

    const connect = (initial = false) => {
      if (cancelled) return
      setConnectionState(initial ? 'connecting' : 'reconnecting')

      const wsBase = API_BASE.replace('http://', 'ws://').replace('https://', 'wss://')
      socket = new WebSocket(`${wsBase}/ws/orders`)

      socket.onopen = () => {
        if (cancelled) return
        setConnected(true)
        setConnectionState('live')
        stopPolling()
        refetchRef.current?.()
      }

      socket.onclose = () => {
        if (cancelled) return
        setConnected(false)
        setConnectionState('reconnecting')
        startPolling()
        reconnectTimer = window.setTimeout(() => connect(), SOCKET_RECONNECT_MS)
      }

      socket.onerror = () => {
        if (cancelled) return
        setConnected(false)
        setConnectionState('reconnecting')
        startPolling()
      }

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string; order_id?: string }
          if (payload.type === 'new_order' && payload.order_id && claimNotification(`kitchen:${payload.order_id}`)) {
            showBanner(`⚠️ New order received: ${payload.order_id.slice(0, 8)}`, 'alert')
            showBrowserNotification('New kitchen order', `Order ${payload.order_id.slice(0, 8)} just arrived.`)
            void playAlertTone('kitchen-new-order')
          }
        } catch {
          // Ignore malformed socket messages and rely on the next refetch.
        }
        refetchRef.current?.()
      }
    }

    connect(true)
    startPolling()

    return () => {
      cancelled = true
      setConnected(false)
      setConnectionState('offline')
      stopPolling()
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer)
      }
      socket?.close()
    }
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
  const sortLaneOrders = (entries: OrderWithItemsView[]) =>
    [...entries].sort((left, right) => new Date(left.order.created_at).getTime() - new Date(right.order.created_at).getTime())

  const grouped: Record<OrderStatus, OrderWithItemsView[]> = {
    pending: [],
    preparing: [],
    ready: [],
    paid: [],
  }

  for (const order of orders) {
    if (order.order.status === 'paid') continue
    grouped[order.order.status].push(order)
  }

  for (const status of kitchenStatuses) {
    grouped[status].sort((left, right) => createdAtMs(left.order.created_at) - createdAtMs(right.order.created_at))
  }

  grouped.pending = sortLaneOrders(grouped.pending)
  grouped.preparing = sortLaneOrders(grouped.preparing)
  grouped.ready = sortLaneOrders(grouped.ready)

  const pendingCount = grouped.pending.length
  const preparingCount = grouped.preparing.length
  const readyCount = grouped.ready.length
  const totalActive = pendingCount + preparingCount + readyCount

  const connectionLabel =
    connectionState === 'live'
      ? 'Live updates on'
      : connectionState === 'connecting'
        ? 'Connecting…'
        : connectionState === 'reconnecting'
          ? 'Reconnecting… polling backup on'
          : 'Offline'

  const connectionToneClass =
    connectionState === 'live'
      ? 'info-chip info-chip-success'
      : connectionState === 'offline'
        ? 'info-chip info-chip-danger'
        : 'info-chip'

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    if (pendingOrderId) return

    setPendingOrderId(orderId)
    setOrderErrors((current) => {
      const next = { ...current }
      delete next[orderId]
      return next
    })

    try {
      await updateStatus.mutateAsync({ orderId, status })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Status update failed.'
      setOrderErrors((current) => ({
        ...current,
        [orderId]: message || 'Status update failed.',
      }))
    } finally {
      setPendingOrderId(null)
    }
  }

  if (!token) {
    return (
      <section className="ops-surface ops-surface-kitchen">
        <div className="ops-hero-card ops-hero-card-kitchen">
          <div className="section-heading-row ops-hero-row">
            <div>
              <p className="eyebrow">Kitchen entry</p>
              <h2 className="section-title">Open the prep queue</h2>
              <p className="muted ops-hero-copy">Sign this screen in once, then leave cooks on the live board instead of a raw token field.</p>
            </div>
            <div className="hero-chip-group ops-hero-chips">
              <span className="info-chip">Role: Kitchen</span>
              <span className="info-chip">Live orders</span>
              <span className="info-chip">One-time access</span>
            </div>
          </div>
        </div>
        <SectionCard>
          <OperatorAccessCard
            role="kitchen"
            token={token}
            invalid={tokenInvalid}
            connected={connected}
            heading="Kitchen station sign-in"
            onTokenChange={(value) => {
              setToken(value)
              writeOperatorToken('kitchen', value)
            }}
            onReset={() => {
              setToken('')
              clearOperatorToken('kitchen')
            }}
          />
        </SectionCard>
      </section>
    )
  }

  return (
    <section className="ops-surface ops-surface-kitchen kitchen-page-practical">
      <div className="ops-hero-card ops-hero-card-kitchen kitchen-service-strip">
        <div className="section-heading-row kitchen-header-compact ops-hero-row">
          <div>
            <p className="eyebrow">Kitchen board</p>
            <h2 className="section-title">Prep queue</h2>
            <p className="muted ops-hero-copy">Big cards, elapsed timers, and fewer distractions for active service.</p>
          </div>
          <div className="hero-chip-group ops-hero-chips kitchen-service-chips">
            <span className={connectionToneClass}>{connectionLabel}</span>
            <span className="info-chip">Active {totalActive}</span>
            {tokenInvalid ? <span className="info-chip info-chip-danger">Saved key rejected</span> : null}
          </div>
        </div>
      </div>

      <SectionCard>
        <div className="ops-toolbar ops-toolbar-sticky kitchen-toolbar-slim">
          <div className="ops-toolbar-side kitchen-toolbar-side">
            <div className="notification-row ops-toolbar-notifications">
              <p className="muted">
                Alerts: {soundEnabled ? 'sound on' : 'sound muted'}
                {connectionState !== 'live' ? ' · fallback polling active' : ''}
              </p>
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
            <div className="pill-list kitchen-toolbar-pills">
              <span className={connectionToneClass}>{connected ? 'Kitchen signed in' : 'Watching for reconnect'}</span>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setToken('')
                  clearOperatorToken('kitchen')
                }}
              >
                Log out station
              </button>
            </div>
          </div>
        </div>

        {banner ? <NotificationBanner message={banner} tone={bannerTone} /> : null}
      </SectionCard>

      <div className="three-column kitchen-board-grid ops-board-grid kitchen-board-grid-practical">
        {kitchenStatuses.map((status) => (
          <SectionCard key={status}>
            <div className={`ops-lane-header kitchen-lane-header ${status === 'preparing' ? 'kitchen-lane-header-spotlight' : ''}`}>
              <div>
                <p className="eyebrow">{status === 'pending' ? 'Up next' : status === 'preparing' ? 'Cooking now' : 'Ready out'}</p>
                <h3 className="section-title">{status === 'pending' ? 'Queued' : status === 'preparing' ? 'Cooking' : 'Ready'}</h3>
              </div>
              <span className="info-chip">{grouped[status].length}</span>
            </div>
            <div className={`order-list ops-order-list ${status === 'preparing' ? 'kitchen-lane-list-spotlight' : ''}`}>
              {(grouped[status] ?? []).map((entry) => {
                const total = entry.items.reduce((sum, item) => sum + item.menu_item_price * item.quantity, 0)
                const isPending = pendingOrderId === entry.order.id
                const errorMessage = orderErrors[entry.order.id]
                const elapsed = formatElapsedTime(entry.order.created_at, clockNow)
                return (
                  <div className={`card admin-order-card ops-order-card kitchen-order-card ${status === 'preparing' ? 'kitchen-order-card-cooking' : ''}`} key={entry.order.id}>
                    <div className="order-meta kitchen-order-meta">
                      <div>
                        <strong className="kitchen-ticket-id">#{shortId(entry.order.id)}</strong>
                        <div className="muted kitchen-ticket-table">{entry.order.table_name ?? shortId(entry.order.table_id)}{entry.order.table_number ? ` · Table #${entry.order.table_number}` : ''}</div>
                      </div>
                      <StatusBadge status={entry.order.status} />
                    </div>
                    <div className="kitchen-order-timer-row">
                      <strong className="kitchen-order-elapsed">{elapsed}</strong>
                      <div className="pill-list">
                        <span className={kitchenAgeTone(entry.order.created_at, clockNow)}>
                          {status === 'ready' ? 'Waiting for handoff' : status === 'preparing' ? 'Actively cooking' : 'Waiting to start'}
                        </span>
                        <span className="muted">{entry.items.reduce((sum, item) => sum + item.quantity, 0)} item{entry.items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? '' : 's'} · {entry.items.length} line{entry.items.length === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                    {entry.order.is_follow_up ? (
                      <div className="pill-list kitchen-follow-up-pills">
                        <span className="info-chip info-chip-success">Follow-up to active table order</span>
                        <span className="info-chip">{entry.order.follow_up_additions_count} add-on update{entry.order.follow_up_additions_count === 1 ? '' : 's'}</span>
                      </div>
                    ) : null}
                    <ul className="ops-order-items kitchen-order-items">
                      {entry.items.map((item) => (
                        <li key={item.id}>
                          <span>{item.quantity} × {item.menu_item_name}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="ops-order-footer kitchen-order-footer">
                      <div className="muted">
                        <div>Opened {elapsed}</div>
                        <div>{new Date(entry.order.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                      </div>
                      <strong>{money(total, currency_code)}</strong>
                    </div>
                    {errorMessage ? <div className="notification-banner notification-banner-alert kitchen-order-error">⚠️ {errorMessage}</div> : null}
                    {status === 'pending' && (
                      <button className="kitchen-action-button" disabled={isPending || updateStatus.isPending} onClick={() => void handleStatusChange(entry.order.id, 'preparing')}>
                        {isPending ? 'Starting…' : 'Start cooking'}
                      </button>
                    )}
                    {status === 'preparing' && (
                      <button className="kitchen-action-button kitchen-action-button-ready" disabled={isPending || updateStatus.isPending} onClick={() => void handleStatusChange(entry.order.id, 'ready')}>
                        {isPending ? 'Saving…' : 'Mark ready'}
                      </button>
                    )}
                    {status === 'ready' && (
                      <div className="pill-list kitchen-ready-note">
                        <span className="info-chip info-chip-success">Front of house pickup</span>
                        <button className="secondary-button kitchen-action-button" disabled>
                          Waiting on staff handoff
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
              {grouped[status].length === 0 ? <p className="muted kitchen-empty-lane">No orders in this lane.</p> : null}
            </div>
          </SectionCard>
        ))}
      </div>
    </section>
  )
}
