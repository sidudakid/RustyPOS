const rawApiBase = import.meta.env.VITE_API_BASE?.trim()
const browserHost = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'
const defaultApiBase = `http://${browserHost}:8081`
export const API_BASE = rawApiBase && rawApiBase.length > 0 ? rawApiBase : defaultApiBase

export type MenuItem = {
  id: string
  name: string
  description: string
  image_url: string
  price: number
  category: string
  active: boolean
  available: boolean
  stock_count: number
  low_stock_threshold: number
  restock_needed: boolean
}

export type MenuCategory = {
  id: string
  name: string
  hot_pick: boolean
  active: boolean
  sort_order: number
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'paid'

export type OrderItemView = {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  menu_item_name: string
  menu_item_category: string
  menu_item_price: number
}

export type OrderWithItemsView = {
  order: {
    id: string
    table_id: string
    table_name?: string | null
    status: OrderStatus
    created_at: string
    paid_at?: string | null
  }
  items: OrderItemView[]
}

export type OpenTableSummary = {
  table_id: string
  table_name: string
  order_count: number
  total_amount: number
  statuses: OrderStatus[]
}

export type CafeSettings = {
  name: string
  legal_name: string
  slug: string
  tagline: string
  image_url: string
  currency_code: string
  primary_color: string
  accent_color: string
  support_email: string
  support_phone: string
  address_line_1: string
  address_line_2: string
  city: string
  state_region: string
  postal_code: string
  country_code: string
  timezone: string
  service_mode: 'table_service' | 'counter_service' | 'hybrid'
  table_count: number
  table_prefix: string
  table_name_style: 'numeric' | 'padded' | 'hyphenated'
}

export type AdminTableAccessArtifact = {
  id: string
  table_number: number
  name: string
  active: boolean
  token: string
  token_label: string
  menu_path: string
}

export type CafeSettingsResponse = CafeSettings & {
  table_name_preview: string[]
  table_access: AdminTableAccessArtifact[]
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  return response.json() as Promise<T>
}
