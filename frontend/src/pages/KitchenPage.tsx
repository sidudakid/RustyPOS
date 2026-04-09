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

export function KitchenPage() {
  const [token, setToken] = useState(localStorage.getItem('adminToken') ?? '')
  const { currency_code } = useCafeSettings()
  const [lastEvent, setLastEvent] = useState<string>('none yet')
  const [connected, setConnected] = useState(false)
  const [tokenInvalid, setTokenInvalid] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => notificationsEnabled())
  const [banner, setBanner] = useState('🔔 Sound alerts are on by default. Tap mute if you want quiet.')
  const [bannerTone, setBannerTone] = useState<'info' | 'success' | 'muted' | 'alert'>('info')
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

  const grouped: Record<OrderStatus, OrderWithItemsView[]> = {
    pending: [],
    preparing: [],
    ready: [],
    paid: [],
  }

  for (const order of ordersQuery.data ?? []) {
    if (order.order.status === 'paid') continue
    grouped[order.order.status].push(order)
  }

  return (
    <section>
      <SectionCard>
        <div className="section-heading-row kitchen-header-compact">
          <div>
            <p className="eyebrow">Kitchen</p>
            <h2 className="section-title">Prep queue</h2>
          </div>
          <div className="hero-chip-group">
            <span className={connected ? 'info-chip info-chip-success' : 'info-chip info-chip-danger'}>
              {connected ? 'Live connected' : 'Disconnected'}
            </span>
            <span className="info-chip">Last: {lastEvent}</span>
          </div>
        </div>
        <div className="notification-row">
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
        {banner ? <NotificationBanner message={banner} tone={bannerTone} /> : null}
        <AuthTokenInput
          value={token}
          invalid={tokenInvalid}
          onChange={(value) => {
            setToken(value)
            localStorage.setItem('adminToken', value)
          }}
        />
      </SectionCard>

      <div className="three-column">
        {(['pending', 'preparing', 'ready'] as OrderStatus[]).map((status) => (
          <SectionCard key={status}>
            <h3>{status}</h3>
            <div className="order-list">
              {(grouped[status] ?? []).map((entry) => {
                const total = entry.items.reduce((sum, item) => sum + item.menu_item_price * item.quantity, 0)
                return (
                  <div className="card" key={entry.order.id}>
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
                    <ul>
                      {entry.items.map((item) => (
                        <li key={item.id}>
                          {item.quantity} × {item.menu_item_name}
                        </li>
                      ))}
                    </ul>
                    <div className="order-meta">
                      <span className="muted">{new Date(entry.order.created_at).toLocaleTimeString()}</span>
                      <strong>{money(total, currency_code)}</strong>
                    </div>
                    {status === 'pending' && (
                      <button onClick={() => updateStatus.mutate({ orderId: entry.order.id, status: 'preparing' })}>
                        Start preparing
                      </button>
                    )}
                    {status === 'preparing' && (
                      <button onClick={() => updateStatus.mutate({ orderId: entry.order.id, status: 'ready' })}>
                        Mark ready
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </SectionCard>
        ))}
      </div>
    </section>
  )
}
