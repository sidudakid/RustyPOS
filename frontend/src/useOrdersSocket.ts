import { useEffect, useRef, useState } from 'react'
import { API_BASE, OrderStatus } from './api'

export type OrderEvent = {
  type: 'new_order' | 'order_status_updated'
  order_id?: string
  table_id?: string
  status?: OrderStatus
}

export function useOrdersSocket(onEvent: (event: OrderEvent) => void) {
  const [connected, setConnected] = useState(false)
  const onEventRef = useRef(onEvent)

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    let cancelled = false
    let socket: WebSocket | null = null

    const connect = () => {
      const wsBase = API_BASE.replace('http://', 'ws://').replace('https://', 'wss://')
      socket = new WebSocket(`${wsBase}/ws/orders`)

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
  }, [])

  return { connected }
}
