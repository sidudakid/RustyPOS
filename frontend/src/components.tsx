import type { PropsWithChildren } from 'react'
import type { OrderStatus } from './api'
import { statusClass } from './lib'

export function NotificationButton({
  enabled,
  onClick,
}: {
  enabled: boolean
  onClick: () => void | Promise<void>
}) {
  return (
    <button className="secondary-button notification-button" onClick={() => void onClick()}>
      <span aria-hidden="true">{enabled ? '🔕' : '🔔'}</span> {enabled ? 'Mute sound' : 'Enable sound'}
    </button>
  )
}

export function NotificationBanner({
  message,
  tone = 'info',
}: {
  message: string
  tone?: 'info' | 'success' | 'muted' | 'alert'
}) {
  return <div className={`notification-banner notification-banner-${tone}`}>{message}</div>
}

export function SectionCard({ children }: PropsWithChildren) {
  return <div className="card">{children}</div>
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={statusClass(status)}>{status}</span>
}

export function AuthTokenInput({
  value,
  onChange,
  invalid,
  onReset,
}: {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  onReset?: () => void
}) {
  return (
    <div>
      <input
        placeholder="Admin token"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {invalid ? <p className="connection-bad">Token invalid. Re-enter admin token.</p> : null}
      {onReset ? (
        <button className="secondary-button" onClick={onReset}>
          Reset token
        </button>
      ) : null}
    </div>
  )
}
