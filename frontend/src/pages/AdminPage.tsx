import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { API_BASE, fetchJson, MenuCategory, MenuItem, OrderStatus, OrderWithItemsView } from '../api'
import { AuthTokenInput, SectionCard, StatusBadge } from '../components'
import { useCafeSettings } from '../cafeSettings'
import { money, shortId } from '../lib'

type RevenueSummary = {
  total_revenue: number
  order_count: number
  average_order_value: number
}

type CafeSettings = {
  name: string
  image_url: string
  currency_code: string
}

type AnalyticsSummary = {
  monthly_revenue: { month: string; revenue: number; order_count: number }[]
  peak_hours: { hour: number; order_count: number; revenue: number }[]
}

export function AdminPage() {
  const [token, setToken] = useState(localStorage.getItem('adminToken') ?? '')
  const { currency_code } = useCafeSettings()
  const [lastEvent, setLastEvent] = useState('none yet')
  const [connected, setConnected] = useState(false)
  const [tokenInvalid, setTokenInvalid] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categoryHotPick, setCategoryHotPick] = useState(false)
  const [itemName, setItemName] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemCategory, setItemCategory] = useState('coffee')
  const [draftCategories, setDraftCategories] = useState<MenuCategory[]>([])
  const [draftMenuItems, setDraftMenuItems] = useState<MenuItem[]>([])
  const [settingsDraft, setSettingsDraft] = useState<CafeSettings>({
    name: 'OpenClaw Café',
    image_url: '',
    currency_code: 'USD',
  })
  const refetchRef = useRef<null | (() => void)>(null)

  const authHeaders = { Authorization: `Bearer ${token}` }

  const ordersQuery = useQuery({
    queryKey: ['admin-orders', token],
    queryFn: async () => {
      try {
        const data = await fetchJson<OrderWithItemsView[]>('/orders', {
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

  const revenueQuery = useQuery({
    queryKey: ['admin-revenue', token],
    queryFn: () => fetchJson<RevenueSummary>('/admin/revenue', { headers: authHeaders }),
    enabled: Boolean(token),
  })

  const categoriesQuery = useQuery({
    queryKey: ['admin-categories', token],
    queryFn: () => fetchJson<MenuCategory[]>('/admin/categories', { headers: authHeaders }),
    enabled: Boolean(token),
  })

  const menuItemsQuery = useQuery({
    queryKey: ['admin-menu-items', token],
    queryFn: () => fetchJson<MenuItem[]>('/admin/menu-items', { headers: authHeaders }),
    enabled: Boolean(token),
  })

  const settingsQuery = useQuery({
    queryKey: ['admin-cafe-settings'],
    queryFn: () => fetchJson<CafeSettings>('/cafe-settings'),
  })

  const analyticsQuery = useQuery({
    queryKey: ['admin-analytics', token],
    queryFn: () => fetchJson<AnalyticsSummary>('/admin/analytics', { headers: authHeaders }),
    enabled: Boolean(token),
  })

  useEffect(() => {
    setDraftCategories(categoriesQuery.data ?? [])
  }, [categoriesQuery.data])

  useEffect(() => {
    setDraftMenuItems(menuItemsQuery.data ?? [])
  }, [menuItemsQuery.data])

  useEffect(() => {
    if (settingsQuery.data) {
      setSettingsDraft(settingsQuery.data)
    }
  }, [settingsQuery.data])

  useEffect(() => {
    refetchRef.current = () => {
      void ordersQuery.refetch()
      void categoriesQuery.refetch()
      void revenueQuery.refetch()
      void menuItemsQuery.refetch()
      void settingsQuery.refetch()
      void analyticsQuery.refetch()
    }
  }, [ordersQuery, categoriesQuery, revenueQuery, menuItemsQuery, settingsQuery, analyticsQuery])

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
      refetchRef.current?.()
    }

    return () => socket.close()
  }, [token])

  const refreshAdminData = async () => {
    await Promise.all([
      ordersQuery.refetch(),
      categoriesQuery.refetch(),
      revenueQuery.refetch(),
      menuItemsQuery.refetch(),
      settingsQuery.refetch(),
      analyticsQuery.refetch(),
    ])
  }

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      fetchJson<OrderWithItemsView>(`/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => ordersQuery.refetch(),
  })

  const createCategory = useMutation({
    mutationFn: async () =>
      fetchJson<MenuCategory>('/admin/categories', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: categoryName, hot_pick: categoryHotPick }),
      }),
    onSuccess: async () => {
      setCategoryName('')
      setCategoryHotPick(false)
      await categoriesQuery.refetch()
    },
  })

  const updateCategory = useMutation({
    mutationFn: async (category: MenuCategory) =>
      fetchJson<MenuCategory>(`/admin/categories/${category.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          name: category.name,
          hot_pick: category.hot_pick,
          active: category.active,
          sort_order: category.sort_order,
        }),
      }),
    onSuccess: refreshAdminData,
  })

  const archiveCategory = useMutation({
    mutationFn: async (categoryId: string) =>
      fetchJson<MenuCategory>(`/admin/categories/${categoryId}/archive`, {
        method: 'POST',
        headers: authHeaders,
      }),
    onSuccess: refreshAdminData,
  })

  const createMenuItem = useMutation({
    mutationFn: async () =>
      fetchJson<MenuItem>('/admin/menu-items', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: itemName,
          description: itemDescription,
          price: Number(itemPrice),
          category: itemCategory,
        }),
      }),
    onSuccess: async () => {
      setItemName('')
      setItemDescription('')
      setItemPrice('')
      await menuItemsQuery.refetch()
    },
  })

  const updateMenuItem = useMutation({
    mutationFn: async (item: MenuItem) =>
      fetchJson<MenuItem>(`/admin/menu-items/${item.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          active: item.active,
          available: item.available,
        }),
      }),
    onSuccess: refreshAdminData,
  })

  const archiveMenuItem = useMutation({
    mutationFn: async (itemId: string) =>
      fetchJson<MenuItem>(`/admin/menu-items/${itemId}/archive`, {
        method: 'POST',
        headers: authHeaders,
      }),
    onSuccess: refreshAdminData,
  })

  const toggleAvailability = useMutation({
    mutationFn: async ({ itemId, available }: { itemId: string; available: boolean }) =>
      fetchJson<MenuItem>(`/admin/menu-items/${itemId}/availability`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ available }),
      }),
    onSuccess: refreshAdminData,
  })

  const updateCafeSettings = useMutation({
    mutationFn: async () =>
      fetchJson<CafeSettings>('/admin/cafe-settings', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(settingsDraft),
      }),
    onSuccess: refreshAdminData,
  })

  const activeOrders = useMemo(
    () => (ordersQuery.data ?? []).filter((entry) => entry.order.status !== 'ready'),
    [ordersQuery.data],
  )
  const readyOrders = useMemo(
    () => (ordersQuery.data ?? []).filter((entry) => entry.order.status === 'ready'),
    [ordersQuery.data],
  )

  return (
    <section className="two-column page-layout-admin">
      <div>
        <SectionCard>
          <div className="hero-row">
            <div>
              <p className="eyebrow">Operations</p>
              <h2 className="section-title">Admin panel</h2>
              <p className="muted">Monitor orders, revenue, categories, menu updates, and business trends from one place.</p>
            </div>
            <div className="hero-chip-group">
              <span className={connected ? 'info-chip info-chip-success' : 'info-chip info-chip-danger'}>
                {connected ? 'Live connected' : 'Disconnected'}
              </span>
              <span className="info-chip">Last: {lastEvent}</span>
            </div>
          </div>
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

        {revenueQuery.data ? (
          <div className="three-column stats-grid">
            <SectionCard>
              <p className="eyebrow">Revenue</p>
              <h3>Total revenue</h3>
              <strong className="stat-value">{money(revenueQuery.data.total_revenue, currency_code)}</strong>
            </SectionCard>
            <SectionCard>
              <p className="eyebrow">Orders</p>
              <h3>Total orders</h3>
              <strong className="stat-value">{revenueQuery.data.order_count}</strong>
            </SectionCard>
            <SectionCard>
              <p className="eyebrow">Average</p>
              <h3>Average order</h3>
              <strong className="stat-value">{money(revenueQuery.data.average_order_value, currency_code)}</strong>
            </SectionCard>
          </div>
        ) : null}

        {analyticsQuery.data ? (
          <SectionCard>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Analytics</p>
                <h3 className="section-title">Monthly revenue</h3>
              </div>
              <span className="info-chip">Last 6 months</span>
            </div>
            <div className="admin-edit-list">
              {analyticsQuery.data.monthly_revenue.map((point) => (
                <div className="admin-order-card admin-order-card-compact" key={point.month}>
                  <div className="order-meta">
                    <div>
                      <strong>{point.month}</strong>
                      <div className="muted">{point.order_count} orders</div>
                    </div>
                    <strong>{money(point.revenue, currency_code)}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="section-heading-row analytics-subsection">
              <div>
                <p className="eyebrow">Heavy hours</p>
                <h3 className="section-title">Peak order hours</h3>
              </div>
              <span className="info-chip">Top 5</span>
            </div>
            <div className="admin-edit-list">
              {analyticsQuery.data.peak_hours.map((point) => (
                <div className="admin-order-card admin-order-card-compact" key={point.hour}>
                  <div className="order-meta">
                    <div>
                      <strong>{String(point.hour).padStart(2, '0')}:00</strong>
                      <div className="muted">{point.order_count} orders</div>
                    </div>
                    <strong>{money(point.revenue, currency_code)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Order flow</p>
              <h3 className="section-title">Active orders</h3>
            </div>
            <span className="info-chip">{activeOrders.length} active</span>
          </div>
          <div className="order-list">
            {activeOrders.map((entry) => {
              const total = entry.items.reduce((sum, item) => sum + item.menu_item_price * item.quantity, 0)
              return (
                <div className="admin-order-card" key={entry.order.id}>
                  <div className="order-meta">
                    <div>
                      <strong>#{shortId(entry.order.id)}</strong>
                      <div className="muted">{entry.order.table_name ?? entry.order.table_id}</div>
                    </div>
                    <StatusBadge status={entry.order.status} />
                  </div>
                  <ul>
                    {entry.items.map((item) => (
                      <li key={item.id}>
                        {item.quantity} × {item.menu_item_name} — {money(item.menu_item_price * item.quantity, currency_code)}
                      </li>
                    ))}
                  </ul>
                  <div className="order-meta">
                    <span className="muted">Created: {new Date(entry.order.created_at).toLocaleString()}</span>
                    <strong>Total: {money(total, currency_code)}</strong>
                  </div>
                  <div className="admin-action-row">
                    <button onClick={() => updateStatus.mutate({ orderId: entry.order.id, status: 'pending' })}>Set pending</button>
                    <button onClick={() => updateStatus.mutate({ orderId: entry.order.id, status: 'preparing' })}>Set preparing</button>
                    <button onClick={() => updateStatus.mutate({ orderId: entry.order.id, status: 'ready' })}>Set ready</button>
                  </div>
                </div>
              )
            })}
            {activeOrders.length === 0 ? <p className="muted">No active orders right now.</p> : null}
          </div>
        </SectionCard>

        <SectionCard>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Completed</p>
              <h3 className="section-title">Ready for pickup</h3>
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
                      <div className="muted">{entry.order.table_name ?? entry.order.table_id}</div>
                    </div>
                    <strong>{money(total, currency_code)}</strong>
                  </div>
                </div>
              )
            })}
            {readyOrders.length === 0 ? <p className="muted">No ready orders yet.</p> : null}
          </div>
        </SectionCard>
      </div>

      <div className="admin-sidebar-stack">
        <SectionCard>
          <p className="eyebrow">Branding</p>
          <h3 className="section-title">Café settings</h3>
          <div className="form-stack">
            <input
              placeholder="Café name"
              value={settingsDraft.name}
              onChange={(e) => setSettingsDraft((current) => ({ ...current, name: e.target.value }))}
            />
            <input
              placeholder="Logo / image URL"
              value={settingsDraft.image_url}
              onChange={(e) => setSettingsDraft((current) => ({ ...current, image_url: e.target.value }))}
            />
            <input
              placeholder="Currency code"
              value={settingsDraft.currency_code}
              onChange={(e) => setSettingsDraft((current) => ({ ...current, currency_code: e.target.value.toUpperCase() }))}
            />
            <button onClick={() => updateCafeSettings.mutate()} disabled={!settingsDraft.name.trim() || !settingsDraft.currency_code.trim()}>
              Save café settings
            </button>
          </div>
        </SectionCard>

        <SectionCard>
          <p className="eyebrow">Menu setup</p>
          <h3 className="section-title">Categories</h3>
          <div className="form-stack">
            <input placeholder="Category name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
            <label className="inline-check muted">
              <input type="checkbox" checked={categoryHotPick} onChange={(e) => setCategoryHotPick(e.target.checked)} /> Hot pick
            </label>
            <button onClick={() => createCategory.mutate()} disabled={!categoryName.trim()}>
              Add category
            </button>
          </div>
          <div className="admin-edit-list">
            {draftCategories.map((category) => (
              <div className="admin-edit-card" key={category.id}>
                <input
                  value={category.name}
                  onChange={(e) =>
                    setDraftCategories((current) =>
                      current.map((entry) => (entry.id === category.id ? { ...entry, name: e.target.value } : entry)),
                    )
                  }
                />
                <div className="inline-check muted">
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={category.hot_pick}
                      onChange={(e) =>
                        setDraftCategories((current) =>
                          current.map((entry) => (entry.id === category.id ? { ...entry, hot_pick: e.target.checked } : entry)),
                        )
                      }
                    />
                    Hot pick
                  </label>
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={category.active}
                      onChange={(e) =>
                        setDraftCategories((current) =>
                          current.map((entry) => (entry.id === category.id ? { ...entry, active: e.target.checked } : entry)),
                        )
                      }
                    />
                    Active
                  </label>
                </div>
                <input
                  type="number"
                  value={category.sort_order}
                  onChange={(e) =>
                    setDraftCategories((current) =>
                      current.map((entry) =>
                        entry.id === category.id ? { ...entry, sort_order: Number(e.target.value) } : entry,
                      ),
                    )
                  }
                />
                <div className="admin-inline-actions">
                  <button onClick={() => updateCategory.mutate(category)}>Save</button>
                  <button className="secondary-button" onClick={() => archiveCategory.mutate(category.id)}>
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <p className="eyebrow">Menu setup</p>
          <h3 className="section-title">Menu items</h3>
          <div className="form-stack">
            <input placeholder="Item name" value={itemName} onChange={(e) => setItemName(e.target.value)} />
            <input placeholder="Description" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} />
            <input placeholder="Price in cents" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} />
            <input placeholder="Category" value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} />
            <button onClick={() => createMenuItem.mutate()} disabled={!itemName.trim() || !itemPrice.trim()}>
              Add item
            </button>
          </div>
          <div className="admin-edit-list">
            {draftMenuItems.map((item) => (
              <div className="admin-edit-card" key={item.id}>
                <input
                  value={item.name}
                  onChange={(e) =>
                    setDraftMenuItems((current) =>
                      current.map((entry) => (entry.id === item.id ? { ...entry, name: e.target.value } : entry)),
                    )
                  }
                />
                <input
                  value={item.description}
                  onChange={(e) =>
                    setDraftMenuItems((current) =>
                      current.map((entry) => (entry.id === item.id ? { ...entry, description: e.target.value } : entry)),
                    )
                  }
                />
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) =>
                    setDraftMenuItems((current) =>
                      current.map((entry) => (entry.id === item.id ? { ...entry, price: Number(e.target.value) } : entry)),
                    )
                  }
                />
                <input
                  value={item.category}
                  onChange={(e) =>
                    setDraftMenuItems((current) =>
                      current.map((entry) => (entry.id === item.id ? { ...entry, category: e.target.value } : entry)),
                    )
                  }
                />
                <div className="inline-check muted">
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={(e) =>
                        setDraftMenuItems((current) =>
                          current.map((entry) => (entry.id === item.id ? { ...entry, active: e.target.checked } : entry)),
                        )
                      }
                    />
                    Active
                  </label>
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={item.available}
                      onChange={(e) =>
                        setDraftMenuItems((current) =>
                          current.map((entry) => (entry.id === item.id ? { ...entry, available: e.target.checked } : entry)),
                        )
                      }
                    />
                    Available
                  </label>
                </div>
                <div className="admin-inline-actions">
                  <button onClick={() => updateMenuItem.mutate(item)}>Save</button>
                  <button
                    className="secondary-button"
                    onClick={() => toggleAvailability.mutate({ itemId: item.id, available: !item.available })}
                  >
                    {item.available ? 'Mark unavailable' : 'Mark available'}
                  </button>
                  <button className="secondary-button" onClick={() => archiveMenuItem.mutate(item.id)}>
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </section>
  )
}
