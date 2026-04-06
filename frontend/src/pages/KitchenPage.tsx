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
        <h2 className="section-title">Kitchen board</h2>
        <p className={connected ? 'connection-good' : 'connection-bad'}>
          {connected ? 'Live updates connected' : 'Live updates disconnected'}
        </p>
        <p className="muted">Last event: {lastEvent}</p>
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

      <SectionCard>
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Kitchen only</p>
            <h3 className="section-title">Prep queue</h3>
          </div>
          <span className="info-chip">Pending, preparing, and ready only</span>
        </div>
        <p className="muted">
          Inventory and cashier controls moved to the staff station so the kitchen can stay focused on prep, finishing drinks, and handing off ready orders.
        </p>
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
