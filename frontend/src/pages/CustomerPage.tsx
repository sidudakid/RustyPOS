import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchJson, MenuItem, OrderWithItemsView } from '../api'
import { NotificationBanner, SectionCard } from '../components'
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
  const [checkoutMessage, setCheckoutMessage] = useState('')
  const [checkoutTone, setCheckoutTone] = useState<'info' | 'success' | 'muted' | 'alert'>('info')

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

      if (items.length === 0) {
        throw new Error('Your cart is empty.')
      }

      return fetchJson<OrderWithItemsView>('/orders/by-token', {
        method: 'POST',
        body: JSON.stringify({ token, items }),
      })
    },
    onMutate: () => {
      setCheckoutTone('info')
      setCheckoutMessage('Submitting your order…')
    },
    onSuccess: (data) => {
      setQuantities({})
      setCheckoutTone('success')
      setCheckoutMessage('Order placed! Taking you to your order tracker…')
      window.setTimeout(() => navigate(`/t/${token}/order/${data.order.id}`), 900)
    },
    onError: () => {
      setCheckoutTone('alert')
      setCheckoutMessage('We could not place your order just now. Nothing was charged, and your cart is still here — please try again.')
    },
  })

  const interactionsDisabled = createOrder.isPending || createOrder.isSuccess

  useEffect(() => {
    if (cartItems.length === 0 && !createOrder.isPending && !createOrder.isSuccess && !createOrder.isError) {
      setCheckoutTone('muted')
      setCheckoutMessage('Your cart is empty. Add a few items to start checkout.')
    }
  }, [cartItems.length, createOrder.isError, createOrder.isPending, createOrder.isSuccess])

  const setItemQuantity = (itemId: string, nextQuantity: number) => {
    if (interactionsDisabled) {
      return
    }

    if (createOrder.isError || checkoutTone !== 'muted') {
      setCheckoutMessage('')
    }

    createOrder.reset()
    setQuantities((current) => {
      const safeQuantity = Math.max(0, nextQuantity)
      if (safeQuantity === 0) {
        const { [itemId]: _removed, ...rest } = current
        return rest
      }

      return { ...current, [itemId]: safeQuantity }
    })
  }

  const clearCart = () => {
    if (interactionsDisabled) {
      return
    }

    createOrder.reset()
    setCheckoutTone('muted')
    setCheckoutMessage('Your cart is empty. Add a few items to start checkout.')
    setQuantities({})
  }

  const submitOrder = () => {
    if (interactionsDisabled) {
      return
    }

    if (cartItems.length === 0) {
      createOrder.reset()
      setCheckoutTone('muted')
      setCheckoutMessage('Your cart is empty. Add a few items before checkout.')
      return
    }

    createOrder.mutate()
  }

  const renderMenuCard = (item: MenuItem) => {
    const quantity = quantities[item.id] ?? 0

    return (
      <div key={item.id} className="card menu-item">
        {item.image_url ? <img src={item.image_url} alt={item.name} className="menu-item-image" /> : null}
        <div className="menu-copy">
          <div className="menu-header-row">
            <strong>{item.name}</strong>
            <div className="menu-price">{money(item.price, currency_code)}</div>
          </div>
          {item.description ? <p className="menu-description">{item.description}</p> : null}
          <div className="muted menu-category">{item.category}</div>
        </div>
        <div className="quantity-row">
          <button onClick={() => setItemQuantity(item.id, quantity - 1)} disabled={interactionsDisabled}>-</button>
          <span className="quantity-chip">{quantity}</span>
          <button onClick={() => setItemQuantity(item.id, quantity + 1)} disabled={interactionsDisabled}>+</button>
        </div>
      </div>
    )
  }

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
            <div className="grid">{hotPicks.map(renderMenuCard)}</div>
          </SectionCard>
        ) : null}

        {Object.entries(grouped).map(([category, items]) => (
          <SectionCard key={category}>
            <div className="section-heading-row">
              <h3>{category}</h3>
              <span className="muted">Freshly available</span>
            </div>
            <div className="grid">{items.map(renderMenuCard)}</div>
          </SectionCard>
        ))}
      </div>

      <div className="sidebar-sticky cart-sidebar">
        <SectionCard>
          <div className="section-heading-row">
            <h3 className="section-title">Your cart</h3>
            <span className="info-chip">{cartItems.length} items</span>
          </div>
          {checkoutMessage ? <NotificationBanner message={checkoutMessage} tone={checkoutTone} /> : null}
          {cartItems.length === 0 ? (
            <p className="muted">Your cart is empty. Add something tasty from the menu to get started.</p>
          ) : (
            <>
              <div className="order-list cart-edit-list">
                {cartItems.map((item) => (
                  <div key={item.id} className="cart-line-item">
                    <div className="order-meta cart-line-copy">
                      <div>
                        <strong>{item.name}</strong>
                        <div className="muted">{money(item.price, currency_code)} each</div>
                      </div>
                      <strong>{money(item.price * item.quantity, currency_code)}</strong>
                    </div>
                    <div className="cart-line-actions">
                      <div className="quantity-row">
                        <button onClick={() => setItemQuantity(item.id, item.quantity - 1)} disabled={interactionsDisabled}>-</button>
                        <span className="quantity-chip">{item.quantity}</span>
                        <button onClick={() => setItemQuantity(item.id, item.quantity + 1)} disabled={interactionsDisabled}>+</button>
                      </div>
                      <button
                        className="secondary-button cart-remove-button"
                        onClick={() => setItemQuantity(item.id, 0)}
                        disabled={interactionsDisabled}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="secondary-button cart-clear-button" onClick={clearCart} disabled={interactionsDisabled}>
                Clear cart
              </button>
            </>
          )}
          <hr />
          <div className="order-meta">
            <strong>Total</strong>
            <strong>{money(cartTotal, currency_code)}</strong>
          </div>
          <button onClick={submitOrder} disabled={interactionsDisabled || cartItems.length === 0}>
            {createOrder.isPending ? 'Placing order…' : createOrder.isSuccess ? 'Order confirmed' : 'Place order'}
          </button>
        </SectionCard>
      </div>

      {cartItems.length > 0 ? (
        <div className="mobile-cart-bar">
          <div>
            <div className="mobile-cart-count">{cartItems.length} items in cart</div>
            <strong>{money(cartTotal, currency_code)}</strong>
          </div>
          <button onClick={submitOrder} disabled={interactionsDisabled || cartItems.length === 0}>
            {createOrder.isPending ? 'Placing…' : createOrder.isSuccess ? 'Confirmed' : 'Checkout'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
