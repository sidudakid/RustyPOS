import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { clearOperatorToken, readOperatorToken, writeOperatorToken } from './operatorTokens'

export type OperatorRole = 'admin' | 'kitchen' | 'staff'

type OperatorRoleConfig = {
  role: OperatorRole
  label: string
  title: string
  route: string
  icon: string
  summary: string
  helper: string
}

export const operatorRoleConfig: Record<OperatorRole, OperatorRoleConfig> = {
  admin: {
    role: 'admin',
    label: 'Admin',
    title: 'Admin workspace',
    route: '/admin/orders',
    icon: '📊',
    summary: 'Menu, inventory, analytics, settings, and full café controls.',
    helper: 'Use the owner/admin access key already issued for this café.',
  },
  kitchen: {
    role: 'kitchen',
    label: 'Kitchen',
    title: 'Kitchen board',
    route: '/kitchen',
    icon: '👨‍🍳',
    summary: 'Live prep queue, ready states, and handoff visibility.',
    helper: 'Paste the kitchen or owner access key once, then keep this station signed in.',
  },
  staff: {
    role: 'staff',
    label: 'Staff',
    title: 'Staff station',
    route: '/staff',
    icon: '💳',
    summary: 'Cashier, pickup handoff, bills, and inventory attention.',
    helper: 'Use the staff or owner access key for this counter or floor device.',
  },
}

export function readLastOperatorRole(): OperatorRole {
  const value = localStorage.getItem('operatorLastRole')
  return value === 'admin' || value === 'kitchen' || value === 'staff' ? value : 'staff'
}

export function OperatorAccessCard({
  role,
  token,
  onTokenChange,
  onReset,
  invalid,
  connected,
  heading = 'Station sign-in',
  compact = false,
}: {
  role: OperatorRole
  token: string
  onTokenChange: (value: string) => void
  onReset: () => void
  invalid?: boolean
  connected?: boolean
  heading?: string
  compact?: boolean
}) {
  const config = operatorRoleConfig[role]
  const navigate = useNavigate()
  const [draft, setDraft] = useState(token)

  const trimmed = draft.trim()
  const tokenPreview = useMemo(() => {
    const current = token.trim()
    if (!current) return 'No access key loaded'
    if (current.length <= 8) return current
    return `${current.slice(0, 4)}••••${current.slice(-4)}`
  }, [token])

  const handleContinue = () => {
    if (!trimmed) return
    onTokenChange(trimmed)
    navigate(config.route)
  }

  return (
    <div className={compact ? 'operator-access-card operator-access-card-compact' : 'operator-access-card'}>
      <div className="operator-access-header">
        <div>
          <p className="eyebrow">Operator access</p>
          <h3 className="section-title">{heading}</h3>
          <p className="muted operator-access-copy">{config.icon} {config.summary}</p>
        </div>
        <span className={token ? 'info-chip info-chip-success' : 'info-chip'}>
          {token ? (connected === false ? 'Reconnecting' : 'Ready') : config.label}
        </span>
      </div>

      {!token ? (
        <>
          <div className="operator-access-steps">
            <div className="operator-access-step">
              <span>1</span>
              <div>
                <strong>Confirm this device role</strong>
                <p>{config.title}</p>
              </div>
            </div>
            <div className="operator-access-step">
              <span>2</span>
              <div>
                <strong>Enter access key</strong>
                <p>{config.helper}</p>
              </div>
            </div>
            <div className="operator-access-step">
              <span>3</span>
              <div>
                <strong>Open the station</strong>
                <p>The key stays saved on this device until someone logs out.</p>
              </div>
            </div>
          </div>

          <label className="operator-access-input-group">
            <span>Access key</span>
            <input
              type="password"
              autoComplete="current-password"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Enter ${config.label.toLowerCase()} access key`}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleContinue()
              }}
            />
          </label>

          <div className="operator-access-actions">
            <button type="button" onClick={handleContinue} disabled={!trimmed}>
              Open {config.label}
            </button>
            <Link to="/ops" className="secondary-button operator-access-link-button">
              Choose a different role
            </Link>
          </div>

          {invalid ? <p className="connection-bad">That access key was rejected. Re-enter the current key for this café.</p> : null}
        </>
      ) : (
        <>
          <div className="operator-access-session-row">
            <div>
              <p className="muted operator-access-copy">This device is signed in for the {config.label.toLowerCase()} flow.</p>
              <code className="auth-token-preview">{tokenPreview}</code>
            </div>
            <div className="operator-access-actions operator-access-actions-inline">
              <button type="button" onClick={() => navigate(config.route)}>Continue</button>
              <button type="button" className="secondary-button" onClick={onReset}>Log out</button>
            </div>
          </div>
          {invalid ? <p className="connection-bad">Saved access key is no longer valid. Log in again with the current key.</p> : null}
        </>
      )}
    </div>
  )
}

export function OperatorHubPage() {
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState<OperatorRole>(readLastOperatorRole())
  const [token, setToken] = useState(() => readOperatorToken(selectedRole))

  const handleOpen = () => {
    const trimmed = token.trim()
    if (!trimmed) return
    writeOperatorToken(selectedRole, trimmed)
    navigate(operatorRoleConfig[selectedRole].route)
  }

  return (
    <section className="ops-surface operator-hub-page">
      <div className="ops-hero-card operator-hub-hero">
        <div className="section-heading-row ops-hero-row">
          <div>
            <p className="eyebrow">Operator entry</p>
            <h2 className="section-title">Pick a role and open the right station</h2>
            <p className="muted ops-hero-copy">Designed for real café devices: choose Admin, Kitchen, or Staff first, then enter the access key only once.</p>
          </div>
          <div className="hero-chip-group ops-hero-chips">
            <span className="info-chip">Admin</span>
            <span className="info-chip">Kitchen</span>
            <span className="info-chip">Staff</span>
          </div>
        </div>
      </div>

      <div className="operator-role-grid">
        {(Object.values(operatorRoleConfig) as OperatorRoleConfig[]).map((entry) => (
          <button
            key={entry.role}
            type="button"
            className={selectedRole === entry.role ? 'operator-role-card operator-role-card-active' : 'operator-role-card'}
            onClick={() => {
              setSelectedRole(entry.role)
              setToken(readOperatorToken(entry.role))
            }}
          >
            <span className="operator-role-icon" aria-hidden="true">{entry.icon}</span>
            <strong>{entry.label}</strong>
            <span>{entry.summary}</span>
          </button>
        ))}
      </div>

      <div className="card operator-hub-form-card">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Selected role</p>
            <h3 className="section-title">{operatorRoleConfig[selectedRole].title}</h3>
          </div>
          <span className={token.trim() ? 'info-chip info-chip-success' : 'info-chip'}>
            {token.trim() ? 'Saved key ready' : 'Needs access key'}
          </span>
        </div>

        <p className="muted operator-access-copy">{operatorRoleConfig[selectedRole].helper}</p>

        <label className="operator-access-input-group">
          <span>Access key</span>
          <input
            type="password"
            autoComplete="current-password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder={`Enter ${operatorRoleConfig[selectedRole].label.toLowerCase()} access key`}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleOpen()
            }}
          />
        </label>

        <div className="operator-access-actions">
          <button type="button" onClick={handleOpen} disabled={!token.trim()}>
            Open {operatorRoleConfig[selectedRole].label}
          </button>
          {readOperatorToken(selectedRole) ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                clearOperatorToken(selectedRole)
                setToken('')
              }}
            >
              Clear saved key
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
