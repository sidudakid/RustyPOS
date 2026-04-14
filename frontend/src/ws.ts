import { API_BASE } from './api'

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export function getOrdersWebSocketUrl() {
  const apiBase = trimTrailingSlash(API_BASE)

  if (/^https?:\/\//i.test(apiBase)) {
    return apiBase.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://') + '/ws/orders'
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws/orders`
  }

  return 'ws://127.0.0.1:8081/ws/orders'
}
