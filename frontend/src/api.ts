const rawApiBase = import.meta.env.VITE_API_BASE?.trim()
const browserHost = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'
const defaultApiBase = `http://${browserHost}:8081`
export const API_BASE = rawApiBase && rawApiBase.length > 0 ? rawApiBase : defaultApiBase

export type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  category: string
  active: boolean
  available: boolean
}

export type MenuCategory = {
  id: string
  name: string
  hot_pick: boolean
  active: boolean
  sort_order: number
}

export type OrderStatus = 'pending' | 'preparing' | 'ready'

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
  }
  items: OrderItemView[]
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
