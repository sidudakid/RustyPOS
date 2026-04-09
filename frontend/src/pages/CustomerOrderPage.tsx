import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { AddOrderItemsRequest, API_BASE, fetchJson, MenuRecommendation, OrderStatus, OrderWithItemsView } from '../api'
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

type CustomerMenuResponse = {
  recommendations: MenuRecommendation[]
}

const ORDER_STAGE_META: Record<OrderStatus, { step: number; label: string; description: string }> = {
  pending: {
    step: 0,
    label: 'Received',
    description: 'Your order is in the queue and the team has it.',
  },
  preparing: {
    step: 1,
    label: 'Preparing',
    description: 'The kitchen or bar is actively working on it now.',
  },
  ready: {
    step: 2,
    label: 'Ready',
    description: 'Your order is ready for pickup or table handoff.',
  },
  paid: {
    step: 2,
    label: 'Completed',
    description: 'This order has been settled and closed out.',
  },
}

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
    refetchInterval: 12000,
  })

  const selectedItemIds = useMemo(
    () => Array.from(new Set((orderQuery.data?.items ?? []).map((item) => item.menu_item_id))),
    [orderQuery.data?.items],
  )

  const recommendationsQuery = useQuery({
    queryKey: ['order-recommendations', token, selectedItemIds],
    queryFn: () => fetchJson<CustomerMenuResponse>(`/table-tokens/${token}/menu?${new URLSearchParams(selectedItemIds.map((id) => ['selected', id]))}`),
    enabled: Boolean(token) && selectedItemIds.length > 0,
  })

  useEffect(() => {
    const wsBase = API_BASE.replace('http://', 'ws://').replace('https://', 'wss://')
    const socket = new WebSocket(`${wsBase}/ws/orders`)

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { order_id?: string; status?: OrderStatus }
      if (payload.order_id === orderId && payload.status) {
        setLiveStatus(payload.status)
        void orderQuery.refetch()
      }
    }

    return () => socket.close()
  }, [orderId, orderQuery])

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
  }, [status, orderId])

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) {
        window.clearTimeout(bannerTimeoutRef.current)
      }
    }
  }, [])

  const addToOrder = useMutation({
    mutationFn: async (menuItemId: string) => {
      if (!orderId) {
        throw new Error('Order not found.')
      }

      const payload: AddOrderItemsRequest = {
        token,
        items: [{ menu_item_id: menuItemId, quantity: 1 }],
      }

      return fetchJson<OrderWithItemsView>(`/orders/${orderId}/items`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    onMutate: () => {
      showBanner('Adding that to your current order…', 'info')
    },
    onSuccess: async (updatedOrder) => {
      await orderQuery.refetch()
      await recommendationsQuery.refetch()
      const lastItem = updatedOrder.items[updatedOrder.items.length - 1]
      showBanner(`✅ Added ${lastItem?.menu_item_name ?? 'item'} to this order.`, 'success')
    },
    onError: (error) => {
      showBanner(error instanceof Error ? error.message : 'We could not update your order right now.', 'alert')
    },
  })

  if (orderQuery.isLoading) return <SectionCard>Loading order…</SectionCard>
  if (orderQuery.isError || !orderQuery.data) return <SectionCard>Order not found.</SectionCard>

  const total = orderQuery.data.items.reduce((sum, item) => sum + item.menu_item_price * item.quantity, 0)
  const resolvedStatus = status ?? orderQuery.data.order.status
  const stageMeta = ORDER_STAGE_META[resolvedStatus]
  const itemCount = orderQuery.data.items.reduce((sum, item) => sum + item.quantity, 0)
  const tableLabel = orderQuery.data.order.table_name ?? `Table ${orderQuery.data.order.table_id}`
  const createdAtLabel = orderQuery.data.order.created_at
    ? new Date(orderQuery.data.order.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null
  const lastUpdatedLabel = orderQuery.data.order.updated_at
    ? new Date(orderQuery.data.order.updated_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null
  const recommendedItems = recommendationsQuery.data?.recommendations ?? []
  const orderIsClosed = resolvedStatus === 'paid'

  return (
    <div className="customer-order-page-shell customer-order-tracker-page">
      <SectionCard>
        <div className="customer-order-tracker-hero">
          <div>
            <p className="eyebrow">Live order tracker</p>
            <h2 className="section-title">{stageMeta.label}</h2>
            <p className="muted customer-order-tracker-intro">{stageMeta.description}</p>
          </div>
          <StatusBadge status={resolvedStatus} />
        </div>

        <div className="customer-order-summary-grid">
          <div className="customer-order-summary-card">
            <span>Table</span>
            <strong>{tableLabel}</strong>
          </div>
          <div className="customer-order-summary-card">
            <span>Items</span>
            <strong>{itemCount}</strong>
          </div>
          <div className="customer-order-summary-card">
            <span>Total</span>
            <strong>{money(total, currency_code)}</strong>
          </div>
          <div className="customer-order-summary-card">
            <span>Placed</span>
            <strong>{createdAtLabel ?? 'Just now'}</strong>
          </div>
          <div className="customer-order-summary-card">
            <span>Latest update</span>
            <strong>{lastUpdatedLabel ?? createdAtLabel ?? 'Just now'}</strong>
          </div>
        </div>

        {orderQuery.data.order.is_follow_up ? (
          <div className="customer-follow-up-callout">
            <strong>Follow-up order update</strong>
            <span>
              This table added more items after the first submit. Kitchen and staff are seeing this order as an add-on to the same visit.
            </span>
          </div>
        ) : null}

        <div className="customer-order-stage-strip" aria-label="Order progress">
          {(['pending', 'preparing', 'ready'] as OrderStatus[]).map((stage) => {
            const meta = ORDER_STAGE_META[stage]
            const stateClass =
              meta.step < stageMeta.step
                ? 'customer-order-stage customer-order-stage-complete'
                : meta.step === stageMeta.step
                  ? 'customer-order-stage customer-order-stage-active'
                  : 'customer-order-stage'

            return (
              <div key={stage} className={stateClass}>
                <span className="customer-order-stage-dot" aria-hidden="true">{meta.step + 1}</span>
                <div>
                  <strong>{meta.label}</strong>
                  <p>{meta.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      <SectionCard>
        <div className="notification-row customer-order-notification-row">
          <div>
            <p className="eyebrow">Alerts</p>
            <p className="muted customer-order-notification-copy">
              {soundEnabled ? 'Sound alerts are on for ready updates.' : 'Alerts are muted on this device.'}
            </p>
          </div>
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
      </SectionCard>

      <SectionCard>
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Order summary</p>
            <h3 className="section-title">What you ordered</h3>
          </div>
          <strong>{money(total, currency_code)}</strong>
        </div>
        <div className="order-list customer-order-line-list">
          {orderQuery.data.items.map((item) => (
            <div key={item.id} className="customer-order-line-item">
              <div>
                <strong>{item.menu_item_name}</strong>
                <p className="muted customer-order-line-meta">{item.quantity} × {money(item.menu_item_price, currency_code)}</p>
              </div>
              <strong>{money(item.menu_item_price * item.quantity, currency_code)}</strong>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <div className="section-heading-row customer-order-upsell-heading">
          <div>
            <p className="eyebrow">Add to this order</p>
            <h3 className="section-title">Recommended right now</h3>
            <p className="muted customer-order-upsell-copy">
              Pick something extra and we’ll attach it to this same order tracker.
            </p>
          </div>
          <span className="info-chip">No restart required</span>
        </div>

        {orderIsClosed ? (
          <p className="muted">This order is already settled, so new items need a fresh order.</p>
        ) : recommendationsQuery.isLoading ? (
          <p className="muted">Loading recommendations…</p>
        ) : recommendedItems.length === 0 ? (
          <p className="muted">No recommendations yet, but you can still browse the full menu.</p>
        ) : (
          <div className="customer-order-upsell-list">
            {recommendedItems.map((entry) => (
              <div key={`tracker-rec-${entry.item.id}`} className="customer-order-upsell-card">
                <div className="customer-order-upsell-copy-block">
                  <div className="customer-order-upsell-title-row">
                    <strong>{entry.item.name}</strong>
                    <strong>{money(entry.item.price, currency_code)}</strong>
                  </div>
                  <div className="customer-order-upsell-meta-row">
                    <span className="info-chip">{entry.matched_cart_items > 0 || entry.score > 0 ? 'Recommended pair' : 'Popular add-on'}</span>
                    <span className="muted">{entry.reason}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="secondary-button customer-order-upsell-button"
                  onClick={() => addToOrder.mutate(entry.item.id)}
                  disabled={addToOrder.isPending}
                >
                  {addToOrder.isPending ? 'Adding…' : 'Add to this order'}
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Next steps</p>
            <h3 className="section-title">Keep going</h3>
          </div>
        </div>
        <div className="customer-order-actions-grid">
          <button onClick={() => navigate(`/t/${token}`)}>{orderIsClosed ? 'Start a new order' : 'Browse full menu'}</button>
          <button className="secondary-button" onClick={() => navigate('/')}>Back to start</button>
        </div>
      </SectionCard>
    </div>
  )
}
