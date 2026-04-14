import { API_BASE } from './api'

const rawWsBase = import.meta.env.VITE_WS_BASE?.trim()

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function toWebSocketUrl(base: string) {
  return trimTrailingSlash(base)
    .replace(/^http:\/\//i, 'ws://')
    .replace(/^https:\/\//i, 'wss://') + '/ws/orders'
}

function withAccessToken(url: string, token?: string) {
  if (!token) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}access_token=${encodeURIComponent(token)}`
}

export function getOrdersWebSocketUrl(token?: string) {
  if (rawWsBase) {
    return withAccessToken(toWebSocketUrl(rawWsBase), token)
  }

  if (typeof window !== 'undefined') {
    if (import.meta.env.DEV) {
      const apiBase = trimTrailingSlash(API_BASE)
      if (/^https?:\/\//i.test(apiBase)) {
        return withAccessToken(toWebSocketUrl(apiBase), token)
      }
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return withAccessToken(`${protocol}//${window.location.host}/ws/orders`, token)
  }

  const apiBase = trimTrailingSlash(API_BASE)
  if (/^https?:\/\//i.test(apiBase)) {
    return withAccessToken(toWebSocketUrl(apiBase), token)
  }

  return withAccessToken('ws://127.0.0.1:8081/ws/orders', token)
}
