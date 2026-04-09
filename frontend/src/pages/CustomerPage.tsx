import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchJson, MenuItem, MenuRecommendation, OrderWithItemsView } from '../api'
import { NotificationBanner, SectionCard } from '../components'
import { useCafeSettings } from '../cafeSettings'
import { money } from '../lib'

type CustomerMenuResponse = {
  hot_picks: MenuItem[]
  menu: MenuItem[]
  recommendations: MenuRecommendation[]
}

export function CustomerPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { currency_code, table_access } = useCafeSettings()
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [checkoutMessage, setCheckoutMessage] = useState('')
  const [checkoutTone, setCheckoutTone] = useState<'info' | 'success' | 'muted' | 'alert'>('info')
  const [cartExpanded, setCartExpanded] = useState(false)

  const menuQuery = useQuery({
    queryKey: ['menu', token],
    queryFn: () => fetchJson<CustomerMenuResponse>(`/table-tokens/${token}/menu`),
    enabled: Boolean(token),
  })

  const menuItems = menuQuery.data?.menu ?? []
  const hotPicks = menuQuery.data?.hot_picks ?? []
  const recommendationPool = menuQuery.data?.recommendations ?? []

  const grouped = useMemo(() => {
    return menuItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
      acc[item.category] ??= []
      acc[item.category].push(item)
      return acc
    }, {})
  }, [menuItems])

  const categoryEntries = useMemo(() => {
    const hotPickIds = new Set(hotPicks.map((item) => item.id))

    return Object.entries(grouped)
      .map(([category, items]) => ({
        category,
        items,
        inCart: items.reduce((sum, item) => sum + (quantities[item.id] ?? 0), 0),
        hotCount: items.filter((item) => hotPickIds.has(item.id)).length,
      }))
      .sort((left, right) => right.inCart - left.inCart || right.hotCount - left.hotCount || left.category.localeCompare(right.category))
  }, [grouped, hotPicks, quantities])

  const cartItems = useMemo(
    () =>
      menuItems.filter((item) => (quantities[item.id] ?? 0) > 0).map((item) => ({
        ...item,
        quantity: quantities[item.id],
      })),
    [menuItems, quantities],
  )

  const tableLabel = useMemo(() => {
    const matchedTable = table_access.find((entry) => entry.token === token)
    return matchedTable?.name ?? 'Your table'
  }, [table_access, token])

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const recommendedItems = useMemo(() => {
    const cartIds = new Set(cartItems.map((item) => item.id))
    const availableCandidates = recommendationPool.filter((entry) => !cartIds.has(entry.item.id))

    if (!cartIds.size) {
      return availableCandidates.slice(0, 4)
    }

    const byCategory = new Set(cartItems.map((item) => item.category))

    return availableCandidates
      .sort(
        (left, right) => {
          const leftCategoryBonus = byCategory.has(left.item.category) ? 0 : 1
          const rightCategoryBonus = byCategory.has(right.item.category) ? 0 : 1

          return (
            leftCategoryBonus - rightCategoryBonus ||
            right.matched_cart_items - left.matched_cart_items ||
            right.score - left.score ||
            right.paired_order_count - left.paired_order_count
          )
        },
      )
      .slice(0, 4)
  }, [cartItems, recommendationPool])

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

  useEffect(() => {
    if (cartItems.length === 0) {
      setCartExpanded(false)
    }
  }, [cartItems.length])

  useEffect(() => {
    if (!cartExpanded) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCartExpanded(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cartExpanded])

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

  const renderMenuCard = (item: MenuItem, featured = false) => {
    const quantity = quantities[item.id] ?? 0
    const soldOut = !item.available || item.stock_count === 0
    const stockLabel = soldOut ? 'Unavailable' : item.restock_needed ? 'Low stock' : 'Available now'

    return (
      <article key={item.id} className={`card menu-item menu-item-elevated ${featured ? 'menu-item-featured' : ''} ${quantity > 0 ? 'menu-item-selected' : ''}`}>
        <div className="menu-item-visual-shell">
          {item.image_url ? (
            <div className="menu-item-image-shell">
              <img src={item.image_url} alt={item.name} className="menu-item-image" />
            </div>
          ) : (
            <div className="menu-item-image-shell menu-item-image-shell-fallback" aria-hidden="true">
              <span>{item.category.slice(0, 1).toUpperCase()}</span>
            </div>
          )}
          <div className="menu-item-overlay-row">
            <span className="menu-item-badge">{featured ? 'Hot pick' : item.category}</span>
            <span className={`menu-item-stock ${soldOut ? 'menu-item-stock-off' : ''}`}>{stockLabel}</span>
          </div>
        </div>

        <div className="menu-copy menu-copy-rich">
          <div className="menu-header-row menu-header-row-rich">
            <div>
              <strong className="menu-item-title">{item.name}</strong>
              {item.description ? <p className="menu-description">{item.description}</p> : null}
            </div>
            <div className="menu-price">{money(item.price, currency_code)}</div>
          </div>

          <div className="menu-card-footer menu-card-footer-rich">
            <div className="menu-meta-inline">
              {quantity > 0 ? <span className="info-chip info-chip-success">{quantity} in cart</span> : <span className="info-chip">Tap + to add</span>}
            </div>
            <button
              type="button"
              className="secondary-button menu-quick-add"
              onClick={() => setItemQuantity(item.id, quantity + 1)}
              disabled={interactionsDisabled || soldOut}
            >
              {quantity > 0 ? 'Add another' : 'Quick add'}
            </button>
          </div>
        </div>

        <div className="quantity-row quantity-row-rich">
          <button type="button" onClick={() => setItemQuantity(item.id, quantity - 1)} disabled={interactionsDisabled || quantity === 0}>−</button>
          <span className="quantity-chip">{quantity}</span>
          <button type="button" onClick={() => setItemQuantity(item.id, quantity + 1)} disabled={interactionsDisabled || soldOut}>+</button>
        </div>
      </article>
    )
  }

  if (!token) {
    return (
      <section className="page-layout-customer">
        <SectionCard>
          <div className="hero-row">
            <div>
              <p className="eyebrow">Customer ordering</p>
              <h2 className="section-title">Open your table link to start ordering</h2>
              <p className="muted">
                This restaurant uses table-specific QR or NFC links. Scan the code at your table, or ask staff for your direct link.
              </p>
            </div>
            <div className="hero-chip-group">
              <span className="info-chip">No table selected</span>
              <span className="info-chip">Menu stays table-aware</span>
            </div>
          </div>

          <div className="setup-callout-grid">
            <div className="setup-callout-card">
              <strong>Guests</strong>
              <p className="muted">Scan the QR code on the table to load the right menu and send orders to the correct station.</p>
            </div>
            <div className="setup-callout-card">
              <strong>Staff</strong>
              <p className="muted">Need a direct URL? Grab it from Admin → Settings → Table access links.</p>
            </div>
          </div>

          <div className="admin-inline-actions">
            <Link to="/staff" className="secondary-button">Open staff station</Link>
            <Link to="/admin/settings" className="secondary-button">Open setup dashboard</Link>
          </div>
        </SectionCard>
      </section>
    )
  }

  return (
    <section className="two-column page-layout-customer customer-order-page-shell customer-menu-page">
      <div className="customer-menu-main">
        <SectionCard>
          <div className="hero-row customer-order-hero-row customer-menu-hero-row">
            <div className="customer-order-hero-copy customer-menu-hero-copy">
              <p className="eyebrow">Table service</p>
              <h2 className="section-title customer-menu-hero-title">Order at your table</h2>
              <p className="muted customer-order-hero-text">A faster mobile menu: browse by section, add in one tap, then check out when your cart feels right.</p>
            </div>
            <div className="hero-chip-group customer-order-hero-chips customer-menu-hero-chips">
              <span className="info-chip">Table ready</span>
              <span className="info-chip">{hotPicks.length} chef picks</span>
              <span className="info-chip">{menuItems.length} items live</span>
            </div>
          </div>

          <div className="customer-menu-top-strip">
            <div className="customer-menu-top-stat">
              <span>Your table</span>
              <strong>{tableLabel}</strong>
            </div>
            <div className="customer-menu-top-stat">
              <span>Popular now</span>
              <strong>{hotPicks.length || 0} picks</strong>
            </div>
            <div className="customer-menu-top-stat">
              <span>In your cart</span>
              <strong>{cartItemCount} items</strong>
            </div>
            <div className="customer-menu-top-stat">
              <span>Current total</span>
              <strong>{money(cartTotal, currency_code)}</strong>
            </div>
          </div>

          {menuQuery.isLoading ? <p className="muted">Loading menu…</p> : null}
          {menuQuery.isError ? <p className="connection-bad">Failed to load menu.</p> : null}
        </SectionCard>

        {categoryEntries.length > 0 ? (
          <div className="customer-category-rail" aria-label="Menu categories">
            {hotPicks.length > 0 ? (
              <a href="#hot-picks" className="customer-category-chip">
                <strong>Hot picks</strong>
                <span>{hotPicks.length}</span>
              </a>
            ) : null}
            {categoryEntries.map(({ category, items, inCart }) => (
              <a key={`chip-${category}`} href={`#category-${encodeURIComponent(category)}`} className="customer-category-chip">
                <strong>{category}</strong>
                <span>{inCart > 0 ? `${inCart} in cart` : `${items.length} items`}</span>
              </a>
            ))}
          </div>
        ) : null}

        {hotPicks.length > 0 ? (
          <SectionCard>
            <div className="section-heading-row customer-section-heading" id="hot-picks">
              <div>
                <h3 className="section-title">🔥 Hot picks</h3>
                <p className="muted customer-section-subcopy">Fastest way to order what people are reaching for most.</p>
              </div>
              <span className="info-chip">Popular right now</span>
            </div>
            <div className="grid customer-menu-grid customer-menu-grid-featured">{hotPicks.map((item) => renderMenuCard(item, true))}</div>
          </SectionCard>
        ) : null}

        {categoryEntries.map(({ category, items, inCart }) => (
          <SectionCard key={category}>
            <div className="section-heading-row customer-section-heading" id={`category-${encodeURIComponent(category)}`}>
              <div>
                <h3 className="section-title customer-category-heading">{category}</h3>
                <p className="muted customer-section-subcopy">{inCart > 0 ? `${inCart} already in your cart from this section.` : `${items.length} items ready to order.`}</p>
              </div>
              <span className="info-chip">{items.length} choices</span>
            </div>
            <div className="grid customer-menu-grid">{items.map((item) => renderMenuCard(item))}</div>
          </SectionCard>
        ))}
      </div>

      <div
        className={cartExpanded ? 'cart-drawer-backdrop cart-drawer-backdrop-open' : 'cart-drawer-backdrop'}
        onClick={() => setCartExpanded(false)}
        aria-hidden="true"
      />

      <div
        className={cartExpanded ? 'sidebar-sticky cart-sidebar cart-sidebar-open' : 'sidebar-sticky cart-sidebar'}
        role={cartExpanded ? 'dialog' : undefined}
        aria-modal={cartExpanded ? 'true' : undefined}
        aria-labelledby={cartExpanded ? 'mobile-cart-heading' : undefined}
      >
        <SectionCard>
          <div className="section-heading-row" id="mobile-cart-heading">
            <h3 className="section-title">Your cart</h3>
            <span className="info-chip">{cartItemCount} items</span>
          </div>
          <div className="cart-mobile-toolbar">
            <button className="secondary-button" type="button" onClick={() => setCartExpanded(false)}>
              Close cart
            </button>
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
          {recommendedItems.length > 0 && cartItems.length > 0 ? (
            <>
              <hr />
              <div className="section-heading-row cart-recommendation-heading">
                <h4 className="section-title cart-recommendation-title">Recommended with your order</h4>
                <span className="info-chip">{recommendedItems.length} ideas</span>
              </div>
              <div className="cart-recommendation-list">
                {recommendedItems.map((entry) => (
                  <div key={`cart-rec-${entry.item.id}`} className="cart-recommendation-card">
                    <div>
                      <strong>{entry.item.name}</strong>
                      <div className="muted">{money(entry.item.price, currency_code)}</div>
                      <span className="cart-recommendation-badge">
                        {entry.matched_cart_items > 0 || entry.score > 0 ? 'Learned pairing' : 'Popular fallback'}
                      </span>
                      <div className="muted recommendation-reason cart-recommendation-reason">{entry.reason}</div>
                    </div>
                    <button
                      type="button"
                      className="secondary-button cart-recommendation-button"
                      onClick={() => setItemQuantity(entry.item.id, (quantities[entry.item.id] ?? 0) + 1)}
                      disabled={interactionsDisabled}
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : null}
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
        <div className="mobile-cart-bar mobile-cart-bar-premium" role="region" aria-label="Cart summary">
          <button type="button" className="mobile-cart-summary mobile-cart-summary-button" onClick={() => setCartExpanded(true)}>
            <div className="mobile-cart-count">{cartItemCount} items in cart</div>
            <strong>{money(cartTotal, currency_code)}</strong>
            <span className="mobile-cart-hint">Review items or keep browsing categories</span>
          </button>
          <button type="button" onClick={submitOrder} disabled={interactionsDisabled || cartItems.length === 0}>
            {createOrder.isPending ? 'Placing…' : createOrder.isSuccess ? 'Confirmed' : `Checkout · ${money(cartTotal, currency_code)}`}
          </button>
        </div>
      ) : null}
    </section>
  )
}
