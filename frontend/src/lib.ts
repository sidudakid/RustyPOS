import type { OrderStatus } from './api'

export function money(cents: number, currencyCode = 'USD') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function statusClass(status: OrderStatus) {
  return `status-badge status-${status}`
}

export function shortId(id: string) {
  return id.slice(0, 8)
}
