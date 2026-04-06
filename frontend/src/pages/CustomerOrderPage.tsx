import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { API_BASE, fetchJson, OrderStatus, OrderWithItemsView } from '../api'
import { NotificationBanner, NotificationButton, SectionCard, StatusBadge } from '../components'
import { useCafeSettings } from '../cafeSettings'
import { money } from '../lib'
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

export function CustomerOrderPage() {
  const { token = 'table-1-qr', orderId } = useParams()
  const { currency_code } = useCafeSettings()
  const navigate = useNavigate()
  const [liveStatus, setLiveStatus] = useState<OrderStatus | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(() => notificationsEnabled())
  const [banner, setBanner] = useState('🔔 Sound alerts are on by default. Tap mute if you want quiet.')
  const [bannerTone, setBannerTone] = useState<'info' | 'success' | 'muted' | 'alert'>('info')
  const lastPlayedStatusRef = useRef<OrderStatus | null>(null)
  const bannerTimeoutRef = useRef<number | null>(null)

  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => fetchJson<OrderWithItemsView>(`/orders/${orderId}`),
    enabled: Boolean(orderId),
  })

  useEffect(() => {
    const wsBase = API_BASE.replace('http://', 'ws://').replace('https://', 'wss://')
    const socket = new WebSocket(`${wsBase}/ws/orders`)

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { order_id?: string; status?: OrderStatus }
      if (payload.order_id === orderId && payload.status) {
        setLiveStatus(payload.status)
      }
    }

    return () => socket.close()
  }, [orderId])

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

  const status = liveStatus ?? orderQuery.data?.order.status ?? null

  useEffect(() => {
    if (!status) return

    if (
      status === 'ready' &&
      lastPlayedStatusRef.current !== 'ready' &&
      orderId &&
      claimNotification(`customer-ready:${orderId}`)
    ) {
      showBanner('✅ Your order is ready for pickup.', 'success')
      showBrowserNotification('Order ready', 'Your order is ready for pickup.')
      void playAlertTone('customer-order-ready')
    }

    lastPlayedStatusRef.current = status
  }, [status])

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) {
        window.clearTimeout(bannerTimeoutRef.current)
      }
    }
  }, [])

  if (orderQuery.isLoading) return <SectionCard>Loading order…</SectionCard>
  if (orderQuery.isError || !orderQuery.data) return <SectionCard>Order not found.</SectionCard>

  const total = orderQuery.data.items.reduce((sum, item) => sum + item.menu_item_price * item.quantity, 0)

  return (
    <SectionCard>
      <h2 className="section-title">Order tracker</h2>
      <div className="order-meta">
        <div>
          <div className="muted">Table</div>
          <strong>{orderQuery.data.order.table_name ?? orderQuery.data.order.table_id}</strong>
        </div>
        <StatusBadge status={status ?? orderQuery.data.order.status} />
      </div>
      <div className="notification-row">
        <p className="muted">Notifications: {soundEnabled ? 'sound on' : 'sound muted'}</p>
        <NotificationButton
          enabled={soundEnabled}
          onClick={async () => {
            if (soundEnabled) {
              disableNotifications()
              setSoundEnabled(false)
              showBanner('🔕 Customer alerts muted.', 'muted')
              return
            }

            const enabled = await enableNotifications()
            setSoundEnabled(enabled)
            if (enabled) {
              const permission = canShowBrowserNotifications() ? browserNotificationPermission() : 'unsupported'
              showBanner(
                permission === 'granted'
                  ? '✅ Customer alerts enabled with browser popups.'
                  : '✅ Customer alerts enabled. Browser popups may still need permission.',
                'success',
              )
            } else {
              showBanner('⚠️ Tap again if your browser is still blocking sound.', 'alert')
            }
          }}
        />
      </div>
      {banner ? <NotificationBanner message={banner} tone={bannerTone} /> : null}
      <div className="order-list">
        {orderQuery.data.items.map((item) => (
          <div key={item.id} className="order-meta">
            <span>{item.quantity} × {item.menu_item_name}</span>
            <strong>{money(item.menu_item_price * item.quantity, currency_code)}</strong>
          </div>
        ))}
      </div>
      <hr />
      <div className="order-meta">
        <strong>Total</strong>
        <strong>{money(total, currency_code)}</strong>
      </div>
      <div className="grid">
        <button onClick={() => navigate(`/t/${token}`)}>Add more items</button>
        <button className="secondary-button" onClick={() => navigate('/')}>Back to start</button>
      </div>
    </SectionCard>
  )
}
