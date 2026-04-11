import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
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
    <button className="secondary-button notification-button" type="button" onClick={() => void onClick()}>
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
  return <div className={`notification-banner notification-banner-${tone}`} role="status" aria-live="polite">{message}</div>
}

export function SectionCard({ children }: PropsWithChildren) {
  return <div className="card">{children}</div>
}

export function AdminListToolbar({ children }: PropsWithChildren) {
  return <div className="admin-list-toolbar">{children}</div>
}

export function AdminEntityList({ children }: PropsWithChildren) {
  return <div className="admin-entity-list">{children}</div>
}

export function AdminEntityRow({ children }: PropsWithChildren) {
  return <div className="admin-entity-row">{children}</div>
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={statusClass(status)}>{status}</span>
}

export function AuthTokenInput({
  value,
  onChange,
  invalid,
  onReset,
  compactWhenFilled = false,
  loadedLabel = 'Token loaded',
  switchLabel = 'Use a different token',
  title = 'Admin token',
  description = 'Paste the owner token to unlock admin CRUD actions, analytics, and settings writes. Keep it private — this is the control key for the restaurant database.',
  placeholder = 'Paste admin token',
  helperText = 'First-time setup tip: save restaurant settings first, then test a live table link after the token is in place.',
  connected,
}: {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  onReset?: () => void
  compactWhenFilled?: boolean
  loadedLabel?: string
  switchLabel?: string
  title?: string
  description?: string
  placeholder?: string
  helperText?: string
  connected?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const tokenPreview = useMemo(() => {
    const trimmed = value.trim()
    if (!trimmed) return 'No token'
    if (trimmed.length <= 8) return trimmed
    return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`
  }, [value])

  useEffect(() => {
    if (!value || invalid) setEditing(true)
    else if (!compactWhenFilled) setEditing(true)
    else setEditing(false)
  }, [compactWhenFilled, invalid, value])

  const showCompactState = compactWhenFilled && value && !invalid && !editing

  return (
    <div className={`auth-token-panel${showCompactState ? ' auth-token-panel-compact' : ''}`}>
      <div>
        <p className="eyebrow">Access</p>
        <h3 className="section-title">{title}</h3>
        {showCompactState ? (
          <p className="muted auth-token-copy">Keep this station signed in, but make switching or logging out one tap away.</p>
        ) : (
          <p className="muted auth-token-copy">{description}</p>
        )}
      </div>

      {showCompactState ? (
        <div className="auth-token-compact-row">
          <div className="auth-token-compact-status">
            <span className={connected === false ? 'info-chip' : 'info-chip info-chip-success'}>
              {connected === false ? 'Reconnecting' : connected === true ? loadedLabel : 'Token active'}
            </span>
            <code className="auth-token-preview">{tokenPreview}</code>
          </div>
          <div className="auth-token-compact-actions">
            <button className="secondary-button" type="button" onClick={() => setEditing(true)}>
              {switchLabel}
            </button>
            {onReset ? (
              <button className="secondary-button" onClick={onReset} type="button">
                Logout
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="auth-token-row">
            <input
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
            <div className="auth-token-row-actions">
              {compactWhenFilled && value ? (
                <button className="secondary-button" type="button" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              ) : null}
              {onReset ? (
                <button className="secondary-button" onClick={onReset} type="button">
                  Reset token
                </button>
              ) : null}
            </div>
          </div>

          {invalid ? <p className="connection-bad">Token invalid. Re-enter the current owner/admin token.</p> : null}
          {!value && !invalid ? <p className="muted auth-token-helper">{helperText}</p> : null}
        </>
      )}
    </div>
  )
}
