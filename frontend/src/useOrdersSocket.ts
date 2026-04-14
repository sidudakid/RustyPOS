import { useEffect, useRef, useState } from 'react'
import { OrderStatus } from './api'
import { getOrdersWebSocketUrl } from './ws'

export type OrderEvent = {
  type: 'new_order' | 'order_status_updated'
  order_id?: string
  table_id?: string
  status?: OrderStatus
}

export function useOrdersSocket(onEvent: (event: OrderEvent) => void, token?: string) {
  const [connected, setConnected] = useState(false)
  const onEventRef = useRef(onEvent)

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    let cancelled = false
    let socket: WebSocket | null = null

    const connect = () => {
      socket = new WebSocket(getOrdersWebSocketUrl(token))

      socket.onopen = () => {
        if (!cancelled) setConnected(true)
      }

      socket.onclose = () => {
        if (!cancelled) {
          setConnected(false)
          window.setTimeout(connect, 1000)
        }
      }

      socket.onerror = () => {
        if (!cancelled) setConnected(false)
      }

      socket.onmessage = (event) => {
        onEventRef.current(JSON.parse(event.data) as OrderEvent)
      }
    }

    connect()

    return () => {
      cancelled = true
      setConnected(false)
      socket?.close()
    }
  }, [token])

  return { connected }
}
