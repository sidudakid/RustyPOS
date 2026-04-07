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
    <div className="auth-token-panel">
      <div>
        <p className="eyebrow">Access</p>
        <h3 className="section-title">Admin token</h3>
        <p className="muted auth-token-copy">
          Paste the owner token to unlock admin CRUD actions, analytics, and settings writes. Keep it private — this is the control key for the restaurant database.
        </p>
      </div>

      <div className="auth-token-row">
        <input
          placeholder="Paste admin token"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {onReset ? (
          <button className="secondary-button" onClick={onReset} type="button">
            Reset token
          </button>
        ) : null}
      </div>

      {invalid ? <p className="connection-bad">Token invalid. Re-enter the current owner/admin token.</p> : null}
      {!value && !invalid ? <p className="muted auth-token-helper">First-time setup tip: save restaurant settings first, then test a live table link after the token is in place.</p> : null}
    </div>
  )
}
