import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import {
  API_BASE,
  CafeSettings,
  CafeSettingsResponse,
  fetchJson,
  MenuCategory,
  MenuItem,
  OrderStatus,
  OrderWithItemsView,
} from './api'
import { useCafeSettings } from './cafeSettings'
import { centsToMajorUnits, majorUnitsToCents, money, shortId } from './lib'

export type RevenueSummary = {
  total_revenue: number
  order_count: number
  average_order_value: number
}

export type AnalyticsSummary = {
  monthly_revenue: { month: string; revenue: number; order_count: number }[]
  peak_hours: { hour: number; order_count: number; revenue: number }[]
}

const defaultSettingsDraft: CafeSettings = {
  name: 'OpenClaw Café',
  legal_name: 'OpenClaw Café',
  slug: 'openclaw-cafe',
  tagline: 'Fast café ordering for customers, kitchen, and staff.',
  image_url: '',
  currency_code: 'USD',
  primary_color: '#2563EB',
  accent_color: '#F59E0B',
  support_email: '',
  support_phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state_region: '',
  postal_code: '',
  country_code: 'US',
  timezone: 'America/New_York',
  service_mode: 'table_service',
  table_count: 12,
  table_prefix: 'Table',
  table_name_style: 'numeric',
}

export function useAdminState() {
  const [token, setToken] = useState(localStorage.getItem('adminToken') ?? '')
  const appSettings = useCafeSettings()
  const { currency_code } = appSettings
  const [lastEvent, setLastEvent] = useState('none yet')
  const [connected, setConnected] = useState(false)
  const [tokenInvalid, setTokenInvalid] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categoryHotPick, setCategoryHotPick] = useState(false)
  const [itemName, setItemName] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [itemImageUrl, setItemImageUrl] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemCategory, setItemCategory] = useState('coffee')
  const [draftCategories, setDraftCategories] = useState<MenuCategory[]>([])
  const [draftMenuItems, setDraftMenuItems] = useState<MenuItem[]>([])
  const [settingsDraft, setSettingsDraft] = useState<CafeSettings>(defaultSettingsDraft)
  const [tablePreview, setTablePreview] = useState<string[]>(appSettings.table_name_preview)
  const refetchRef = useRef<null | (() => void)>(null)

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

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
    queryFn: () => fetchJson<CafeSettingsResponse>('/cafe-settings'),
  })

  const analyticsQuery = useQuery({
    queryKey: ['admin-analytics', token],
    queryFn: () => fetchJson<AnalyticsSummary>('/admin/analytics', { headers: authHeaders }),
    enabled: Boolean(token),
  })

  const inventoryQuery = useQuery({
    queryKey: ['admin-inventory', token],
    queryFn: () => fetchJson<MenuItem[]>('/admin/inventory', { headers: authHeaders }),
    enabled: Boolean(token),
  })

  useEffect(() => {
    setDraftCategories(categoriesQuery.data ?? [])
  }, [categoriesQuery.data])

  useEffect(() => {
    setDraftMenuItems(menuItemsQuery.data ?? inventoryQuery.data ?? [])
  }, [menuItemsQuery.data, inventoryQuery.data])

  useEffect(() => {
    if (settingsQuery.data) {
      const { table_name_preview, ...settings } = settingsQuery.data
      setSettingsDraft(settings)
      setTablePreview(table_name_preview)
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
      void inventoryQuery.refetch()
    }
  }, [ordersQuery, categoriesQuery, revenueQuery, menuItemsQuery, settingsQuery, analyticsQuery, inventoryQuery])

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
      inventoryQuery.refetch(),
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
          image_url: itemImageUrl,
          price: majorUnitsToCents(itemPrice),
          category: itemCategory,
        }),
      }),
    onSuccess: async () => {
      setItemName('')
      setItemDescription('')
      setItemImageUrl('')
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
          image_url: item.image_url,
          price: item.price,
          category: item.category,
          active: item.active,
          available: item.available,
          stock_count: item.stock_count,
          low_stock_threshold: item.low_stock_threshold,
          restock_needed: item.restock_needed,
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
      fetchJson<CafeSettingsResponse>('/admin/cafe-settings', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(settingsDraft),
      }),
    onSuccess: async (result) => {
      const { table_name_preview, ...settings } = result
      setSettingsDraft(settings)
      setTablePreview(table_name_preview)
      await refreshAdminData()
    },
  })

  const updateInventory = useMutation({
    mutationFn: async (item: MenuItem) =>
      fetchJson<MenuItem>(`/inventory/${item.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          stock_count: item.stock_count,
          low_stock_threshold: item.low_stock_threshold,
          restock_needed: item.restock_needed,
          available: item.available,
        }),
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

  const setupAddress = [settingsDraft.address_line_1, settingsDraft.city, settingsDraft.state_region, settingsDraft.country_code]
    .filter(Boolean)
    .join(', ')

  return {
    token,
    setToken,
    tokenInvalid,
    connected,
    lastEvent,
    currency_code,
    categoryName,
    setCategoryName,
    categoryHotPick,
    setCategoryHotPick,
    itemName,
    setItemName,
    itemDescription,
    setItemDescription,
    itemImageUrl,
    setItemImageUrl,
    itemPrice,
    setItemPrice,
    itemCategory,
    setItemCategory,
    draftCategories,
    setDraftCategories,
    draftMenuItems,
    setDraftMenuItems,
    settingsDraft,
    setSettingsDraft,
    tablePreview,
    appSettings,
    setupAddress,
    ordersQuery,
    revenueQuery,
    categoriesQuery,
    menuItemsQuery,
    settingsQuery,
    analyticsQuery,
    inventoryQuery,
    activeOrders,
    readyOrders,
    updateStatus,
    createCategory,
    updateCategory,
    archiveCategory,
    createMenuItem,
    updateMenuItem,
    archiveMenuItem,
    toggleAvailability,
    updateCafeSettings,
    updateInventory,
    refreshAdminData,
  }
}

export type AdminState = ReturnType<typeof useAdminState>

export function useAdminOutletState() {
  return useOutletContext<AdminState>()
}

export function adminShellTitle(pathname: string) {
  if (pathname.includes('/admin/analytics')) return 'Analytics'
  if (pathname.includes('/admin/menu')) return 'Menu management'
  if (pathname.includes('/admin/inventory')) return 'Inventory'
  if (pathname.includes('/admin/settings')) return 'Restaurant settings'
  return 'Overview'
}

export { centsToMajorUnits, majorUnitsToCents, money, shortId }
