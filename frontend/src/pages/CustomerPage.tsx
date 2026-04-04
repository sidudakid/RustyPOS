import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { API_BASE, fetchJson, MenuItem, OrderWithItemsView } from '../api'
import { SectionCard } from '../components'
import { useCafeSettings } from '../cafeSettings'
import { money } from '../lib'

const defaultToken = 'table-1-qr'

type CustomerMenuResponse = {
  hot_picks: MenuItem[]
  menu: MenuItem[]
}

export function CustomerPage() {
  const { token = defaultToken } = useParams()
  const navigate = useNavigate()
  const { currency_code } = useCafeSettings()
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const menuQuery = useQuery({
    queryKey: ['menu', token],
    queryFn: () => fetchJson<CustomerMenuResponse>(`/table-tokens/${token}/menu`),
  })

  const menuItems = menuQuery.data?.menu ?? []
  const hotPicks = menuQuery.data?.hot_picks ?? []

  const grouped = useMemo(() => {
    return menuItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
      acc[item.category] ??= []
      acc[item.category].push(item)
      return acc
    }, {})
  }, [menuItems])

  const cartItems = useMemo(
    () =>
      menuItems.filter((item) => (quantities[item.id] ?? 0) > 0).map((item) => ({
        ...item,
        quantity: quantities[item.id],
      })),
    [menuItems, quantities],
  )

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const createOrder = useMutation({
    mutationFn: async () => {
      const items = cartItems.map((item) => ({ menu_item_id: item.id, quantity: item.quantity }))
      return fetchJson<OrderWithItemsView>('/orders/by-token', {
        method: 'POST',
        body: JSON.stringify({ token, items }),
      })
    },
    onSuccess: (data) => navigate(`/t/${token}/order/${data.order.id}`),
  })

  return (
    <section className="two-column page-layout-customer">
      <div>
        <SectionCard>
          <div className="hero-row">
            <div>
              <p className="eyebrow">Table service</p>
              <h2 className="section-title">Order at your table</h2>
              <p className="muted">Browse the menu, add items, and place your order in seconds.</p>
            </div>
            <div className="hero-chip-group">
              <span className="info-chip">Token: {token}</span>
              <span className="info-chip">{hotPicks.length} hot picks</span>
              <span className="info-chip">{menuItems.length} menu items</span>
            </div>
          </div>
          {menuQuery.isLoading ? <p className="muted">Loading menu…</p> : null}
          {menuQuery.isError ? <p className="connection-bad">Failed to load menu.</p> : null}
        </SectionCard>

        {hotPicks.length > 0 ? (
          <SectionCard>
            <div className="section-heading-row">
              <h3 className="section-title">🔥 Hot picks</h3>
              <span className="muted">Popular right now</span>
            </div>
            <div className="grid">
              {hotPicks.map((item) => {
                const quantity = quantities[item.id] ?? 0
                return (
                  <div key={item.id} className="card menu-item">
                    <div>
                      <strong>{item.name}</strong>
                      <div className="menu-price">{money(item.price, currency_code)}</div>
                      <div className="muted">{item.category}</div>
                    </div>
                    <div className="quantity-row">
                      <button onClick={() => setQuantities((current) => ({ ...current, [item.id]: Math.max(0, quantity - 1) }))}>-</button>
                      <span className="quantity-chip">{quantity}</span>
                      <button onClick={() => setQuantities((current) => ({ ...current, [item.id]: quantity + 1 }))}>+</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        ) : null}

        {Object.entries(grouped).map(([category, items]) => (
          <SectionCard key={category}>
            <div className="section-heading-row">
              <h3>{category}</h3>
              <span className="muted">Freshly available</span>
            </div>
            <div className="grid">
              {items.map((item) => {
                const quantity = quantities[item.id] ?? 0
                return (
                  <div key={item.id} className="card menu-item">
                    <div>
                      <strong>{item.name}</strong>
                      <div className="menu-price">{money(item.price, currency_code)}</div>
                    </div>
                    <div className="quantity-row">
                      <button onClick={() => setQuantities((current) => ({ ...current, [item.id]: Math.max(0, quantity - 1) }))}>-</button>
                      <span className="quantity-chip">{quantity}</span>
                      <button onClick={() => setQuantities((current) => ({ ...current, [item.id]: quantity + 1 }))}>+</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        ))}
      </div>

      <div className="sidebar-sticky cart-sidebar">
        <SectionCard>
          <div className="section-heading-row">
            <h3 className="section-title">Your cart</h3>
            <span className="info-chip">{cartItems.length} items</span>
          </div>
          {cartItems.length === 0 ? (
            <p className="muted">Add something tasty.</p>
          ) : (
            <div className="order-list">
              {cartItems.map((item) => (
                <div key={item.id} className="order-meta">
                  <span>{item.quantity} × {item.name}</span>
                  <strong>{money(item.price * item.quantity, currency_code)}</strong>
                </div>
              ))}
            </div>
          )}
          <hr />
          <div className="order-meta">
            <strong>Total</strong>
            <strong>{money(cartTotal, currency_code)}</strong>
          </div>
          <button onClick={() => createOrder.mutate()} disabled={createOrder.isPending || cartItems.length === 0}>
            {createOrder.isPending ? 'Placing order…' : 'Place order'}
          </button>
        </SectionCard>
      </div>
    </section>
  )
}
