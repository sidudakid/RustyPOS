import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchJson } from './api'
import {
  clearOperatorToken,
  maskOperatorToken,
  readLastOperatorRole,
  readOperatorToken,
  writeLastOperatorRole,
  writeOperatorToken,
} from './operatorTokens'

export type OperatorRole = 'admin' | 'kitchen' | 'staff'

type OperatorRoleConfig = {
  role: OperatorRole
  label: string
  subtitle: string
  title: string
  route: string
  icon: string
  summary: string
  helper: string
  validationPath: string
}

export const operatorRoleConfig: Record<OperatorRole, OperatorRoleConfig> = {
  admin: {
    role: 'admin',
    label: 'Admin',
    subtitle: 'प्रशासन',
    title: 'Admin workspace',
    route: '/admin/orders',
    icon: '📊',
    summary: 'Menu, inventory, analytics, settings, and full café controls.',
    helper: 'Use the owner/admin access key already issued for this café.',
    validationPath: '/orders',
  },
  kitchen: {
    role: 'kitchen',
    label: 'Kitchen',
    subtitle: 'भान्सा',
    title: 'Kitchen board',
    route: '/kitchen',
    icon: '👨‍🍳',
    summary: 'Live prep queue, ready states, and handoff visibility.',
    helper: 'Paste the kitchen or owner access key once, then keep this station signed in.',
    validationPath: '/kitchen/orders',
  },
  staff: {
    role: 'staff',
    label: 'Staff',
    subtitle: 'कर्मचारी',
    title: 'Staff station',
    route: '/staff',
    icon: '💳',
    summary: 'Cashier, pickup handoff, bills, and inventory attention.',
    helper: 'Use the staff or owner access key for this counter or floor device.',
    validationPath: '/staff/orders',
  },
}

async function validateOperatorKey(role: OperatorRole, token: string) {
  const trimmed = token.trim()
  if (!trimmed) {
    throw new Error('Enter the access key for this device role.')
  }

  try {
    await fetchJson(operatorRoleConfig[role].validationPath, {
      headers: { Authorization: `Bearer ${trimmed}` },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const normalized = message.toLowerCase()
    if (normalized.includes('unauthorized') || normalized.includes('forbidden')) {
      throw new Error(`That ${operatorRoleConfig[role].label.toLowerCase()} access key was rejected. Check the current café key and try again.`)
    }
    throw new Error('Could not verify that key right now. Check the network/server and try again.')
  }
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
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    setDraft(token)
  }, [token, role])

  const trimmed = draft.trim()
  const tokenPreview = useMemo(() => maskOperatorToken(token), [token])

  const handleContinue = async () => {
    if (!trimmed) return
    await validateOperatorKey(role, trimmed)
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
            <div className="operator-access-key-row">
              <input
                type={showKey ? 'text' : 'password'}
                autoComplete="current-password"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Enter ${config.label.toLowerCase()} access key`}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleContinue()
                }}
              />
              <button type="button" className="secondary-button operator-access-toggle" onClick={() => setShowKey((value) => !value)}>
                {showKey ? 'Hide' : 'Show'} key
              </button>
            </div>
          </label>

          <div className="operator-access-actions">
            <button type="button" onClick={() => void handleContinue()} disabled={!trimmed}>
              Open {config.label}
            </button>
            <Link to="/ops" className="secondary-button operator-access-link-button">
              Change role
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
              <button type="button" className="secondary-button" onClick={onReset}>Reset key</button>
              <Link to="/ops" className="secondary-button operator-access-link-button">Change role</Link>
            </div>
          </div>
          {invalid ? <p className="connection-bad">Saved access key is no longer valid. Reset it and log in again with the current key.</p> : null}
        </>
      )}
    </div>
  )
}

export function OperatorHubPage() {
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState<OperatorRole>(() => readLastOperatorRole())
  const [token, setToken] = useState(() => readOperatorToken(readLastOperatorRole()))
  const [showKey, setShowKey] = useState(false)
  const [editingSavedKey, setEditingSavedKey] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const syncFromStorage = () => {
      const storedRole = readLastOperatorRole()
      setSelectedRole(storedRole)
      setToken(readOperatorToken(storedRole))
    }

    window.addEventListener('storage', syncFromStorage)
    window.addEventListener('focus', syncFromStorage)
    return () => {
      window.removeEventListener('storage', syncFromStorage)
      window.removeEventListener('focus', syncFromStorage)
    }
  }, [])

  useEffect(() => {
    writeLastOperatorRole(selectedRole)
    setToken(readOperatorToken(selectedRole))
    setEditingSavedKey(false)
    setShowKey(false)
    setError('')
  }, [selectedRole])

  const savedToken = readOperatorToken(selectedRole)
  const trimmedToken = token.trim()
  const hasSavedKey = Boolean(savedToken)

  const handleOpen = async () => {
    const trimmed = trimmedToken
    if (!trimmed) {
      setError(`Enter the ${operatorRoleConfig[selectedRole].label.toLowerCase()} access key to continue.`)
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await validateOperatorKey(selectedRole, trimmed)
      writeOperatorToken(selectedRole, trimmed)
      setToken(trimmed)
      navigate(operatorRoleConfig[selectedRole].route)
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : 'Could not open that station right now.')
    } finally {
      setSubmitting(false)
    }
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

      <div className="operator-entry-layout">
        <div className="operator-role-grid">
          {(Object.values(operatorRoleConfig) as OperatorRoleConfig[]).map((entry) => (
            <button
              key={entry.role}
              type="button"
              className={selectedRole === entry.role ? 'operator-role-card operator-role-card-active' : 'operator-role-card'}
              onClick={() => {
                setSelectedRole(entry.role)
                writeLastOperatorRole(entry.role)
              }}
              aria-pressed={selectedRole === entry.role}
            >
              <div className="operator-role-card-top">
                <span className="operator-role-icon" aria-hidden="true">{entry.icon}</span>
                {selectedRole === entry.role ? <span className="operator-role-selected-badge">Selected</span> : null}
              </div>
              <div className="operator-role-copy">
                <strong>{entry.label}</strong>
                <small>{entry.subtitle}</small>
                <span>{entry.summary}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="card operator-hub-form-card">
          <div className="section-heading-row operator-hub-form-header">
            <div>
              <p className="eyebrow">Selected role</p>
              <h3 className="section-title">{operatorRoleConfig[selectedRole].title}</h3>
              <p className="muted operator-access-copy">{hasSavedKey && !editingSavedKey ? `This device already has a saved ${operatorRoleConfig[selectedRole].label.toLowerCase()} key. Pick exactly what you want to do with it below.` : operatorRoleConfig[selectedRole].helper}</p>
            </div>
            <span className={hasSavedKey ? 'info-chip info-chip-success' : 'info-chip'}>
              {hasSavedKey ? 'Saved key on this device' : 'Needs access key'}
            </span>
          </div>

          {savedToken ? (
            <div className="operator-saved-key-banner">
              <div>
                <strong>Saved key on this device</strong>
                <p className="muted operator-access-copy">{maskOperatorToken(savedToken)}</p>
              </div>
              <div className="operator-access-actions operator-access-actions-inline">
                <button
                  type="button"
                  onClick={() => navigate(operatorRoleConfig[selectedRole].route)}
                >
                  Use saved key
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setEditingSavedKey(true)
                    setToken('')
                    setShowKey(false)
                    setError('')
                  }}
                >
                  Change key
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    clearOperatorToken(selectedRole)
                    setEditingSavedKey(false)
                    setToken('')
                    setShowKey(false)
                    setError('')
                  }}
                >
                  Forget this device
                </button>
              </div>
            </div>
          ) : null}

          {!hasSavedKey || editingSavedKey ? (
            <>
              <label className="operator-access-input-group">
                <span>{hasSavedKey ? 'New access key' : 'Access key'}</span>
                <div className="operator-access-key-row">
                  <input
                    type={showKey ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={token}
                    onChange={(event) => {
                      setToken(event.target.value)
                      if (error) setError('')
                    }}
                    placeholder={`Enter ${operatorRoleConfig[selectedRole].label.toLowerCase()} access key`}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void handleOpen()
                    }}
                  />
                  <button type="button" className="secondary-button operator-access-toggle" onClick={() => setShowKey((value) => !value)}>
                    {showKey ? 'Hide' : 'Show'} key
                  </button>
                </div>
              </label>

              {hasSavedKey ? <p className="muted operator-access-copy">After verification, this new key will replace the saved one for the {operatorRoleConfig[selectedRole].label.toLowerCase()} role on this device.</p> : null}

              {error ? <p className="connection-bad operator-access-error">{error}</p> : null}

              <div className="operator-access-actions operator-hub-actions">
                <button type="button" onClick={() => void handleOpen()} disabled={!trimmedToken || submitting}>
                  {submitting ? 'Checking key…' : hasSavedKey ? `Save new key and open ${operatorRoleConfig[selectedRole].label}` : `Open ${operatorRoleConfig[selectedRole].label}`}
                </button>
                {hasSavedKey ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setEditingSavedKey(false)
                      setToken(savedToken)
                      setShowKey(false)
                      setError('')
                    }}
                  >
                    Cancel key change
                  </button>
                ) : null}
              </div>
            </>
          ) : error ? <p className="connection-bad operator-access-error">{error}</p> : null}
        </div>
      </div>
    </section>
  )
}
