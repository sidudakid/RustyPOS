import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchJson, OperatorLoginResponse } from './api'
import {
  clearOperatorToken,
  maskOperatorToken,
  readLastOperatorRole,
  readOperatorLoginId,
  readOperatorToken,
  writeLastOperatorRole,
  writeOperatorLoginId,
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
    helper: 'Use the admin login ID and secret issued for this café.',
  },
  kitchen: {
    role: 'kitchen',
    label: 'Kitchen',
    subtitle: 'भान्सा',
    title: 'Kitchen board',
    route: '/kitchen',
    icon: '👨‍🍳',
    summary: 'Live prep queue, ready states, and handoff visibility.',
    helper: 'Use the kitchen login ID and secret for this station.',
  },
  staff: {
    role: 'staff',
    label: 'Staff',
    subtitle: 'कर्मचारी',
    title: 'Staff station',
    route: '/staff',
    icon: '💳',
    summary: 'Cashier, pickup handoff, bills, and inventory attention.',
    helper: 'Use the staff login ID and secret for this counter or floor device.',
  },
}

async function loginOperator(role: OperatorRole, loginId: string, secret: string) {
  const trimmedLoginId = loginId.trim().toLowerCase()
  const trimmedSecret = secret.trim()
  if (!trimmedLoginId || !trimmedSecret) {
    throw new Error('Enter both the login ID and secret for this role.')
  }

  try {
    return await fetchJson<OperatorLoginResponse>('/auth/operator/login', {
      method: 'POST',
      body: JSON.stringify({ role, login_id: trimmedLoginId, secret: trimmedSecret }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const normalized = message.toLowerCase()
    if (normalized.includes('unauthorized') || normalized.includes('invalid')) {
      throw new Error(`That ${operatorRoleConfig[role].label.toLowerCase()} login ID or secret was rejected. Ask an admin for the current login ID, or have them reset that role in Admin Settings to issue a new secret.`)
    }
    throw new Error('Could not verify those credentials right now. Check the network/server and try again.')
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
  const [loginId, setLoginId] = useState(() => readOperatorLoginId(role))
  const [secret, setSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoginId(readOperatorLoginId(role))
    setSecret('')
    setError('')
  }, [role, token])

  const tokenPreview = useMemo(() => maskOperatorToken(token), [token])

  const handleContinue = async () => {
    setSubmitting(true)
    setError('')
    try {
      const session = await loginOperator(role, loginId, secret)
      writeOperatorLoginId(role, session.login_id)
      onTokenChange(session.session_token)
      navigate(config.route)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
    } finally {
      setSubmitting(false)
    }
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
            <div className="operator-access-step"><span>1</span><div><strong>Confirm this device role</strong><p>{config.title}</p></div></div>
            <div className="operator-access-step"><span>2</span><div><strong>Enter login ID + secret</strong><p>{config.helper}</p></div></div>
            <div className="operator-access-step"><span>3</span><div><strong>Open the station</strong><p>The session token stays saved on this device until someone logs out.</p></div></div>
          </div>

          <label className="operator-access-input-group">
            <span>Login ID</span>
            <input value={loginId} onChange={(event) => setLoginId(event.target.value)} placeholder={`Enter ${config.label.toLowerCase()} login ID`} autoComplete="username" />
          </label>

          <label className="operator-access-input-group">
            <span>Secret</span>
            <div className="operator-access-key-row">
              <input
                type={showSecret ? 'text' : 'password'}
                autoComplete="current-password"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                placeholder={`Enter ${config.label.toLowerCase()} secret`}
                onKeyDown={(event) => { if (event.key === 'Enter') void handleContinue() }}
              />
              <button type="button" className="secondary-button operator-access-toggle" onClick={() => setShowSecret((value) => !value)}>
                {showSecret ? 'Hide' : 'Show'} secret
              </button>
            </div>
          </label>

          {error ? <p className="connection-bad">{error}</p> : null}
          {invalid ? <p className="connection-bad">Saved session is no longer valid. Log in again with the current credential set.</p> : null}

          <div className="operator-access-actions">
            <button type="button" onClick={() => void handleContinue()} disabled={!loginId.trim() || !secret.trim() || submitting}>
              {submitting ? 'Signing in…' : `Open ${config.label}`}
            </button>
            <Link to="/ops" className="secondary-button operator-access-link-button">Change role</Link>
          </div>
        </>
      ) : (
        <>
          <div className="operator-access-session-row">
            <div>
              <p className="muted operator-access-copy">This device is signed in for the {config.label.toLowerCase()} flow.</p>
              <code className="auth-token-preview">{tokenPreview}</code>
              {loginId ? <p className="muted operator-access-copy">Login ID: <code>{loginId}</code></p> : null}
            </div>
            <div className="operator-access-actions operator-access-actions-inline">
              <button type="button" onClick={() => navigate(config.route)}>Continue</button>
              <button type="button" className="secondary-button" onClick={onReset}>Reset login</button>
              <Link to="/ops" className="secondary-button operator-access-link-button">Change role</Link>
            </div>
          </div>
          {invalid ? <p className="connection-bad">Saved session is no longer valid. Reset it and log in again with the current credential set.</p> : null}
        </>
      )}
    </div>
  )
}

export function OperatorHubPage() {
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState<OperatorRole>(() => readLastOperatorRole())
  const [token, setToken] = useState(() => readOperatorToken(readLastOperatorRole()))
  const [loginId, setLoginId] = useState(() => readOperatorLoginId(readLastOperatorRole()))
  const [secret, setSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [editingSavedKey, setEditingSavedKey] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const syncFromStorage = () => {
      const storedRole = readLastOperatorRole()
      setSelectedRole(storedRole)
      setToken(readOperatorToken(storedRole))
      setLoginId(readOperatorLoginId(storedRole))
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
    setLoginId(readOperatorLoginId(selectedRole))
    setSecret('')
    setEditingSavedKey(false)
    setShowSecret(false)
    setError('')
  }, [selectedRole])

  const savedToken = readOperatorToken(selectedRole)
  const savedLoginId = readOperatorLoginId(selectedRole)
  const hasSavedKey = Boolean(savedToken)

  const handleOpen = async () => {
    setSubmitting(true)
    setError('')
    try {
      const session = await loginOperator(selectedRole, loginId, secret)
      writeOperatorLoginId(selectedRole, session.login_id)
      writeOperatorToken(selectedRole, session.session_token)
      setToken(session.session_token)
      setLoginId(session.login_id)
      setSecret('')
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
            <h2 className="section-title">Pick a role and sign in with real role credentials</h2>
            <p className="muted ops-hero-copy">Each station now uses its own login ID + secret, then stores only a role-scoped session token on the device.</p>
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
            <button key={entry.role} type="button" className={selectedRole === entry.role ? 'operator-role-card operator-role-card-active' : 'operator-role-card'} onClick={() => setSelectedRole(entry.role)} aria-pressed={selectedRole === entry.role}>
              <div className="operator-role-card-top"><span className="operator-role-icon" aria-hidden="true">{entry.icon}</span>{selectedRole === entry.role ? <span className="operator-role-selected-badge">Selected</span> : null}</div>
              <div className="operator-role-copy"><strong>{entry.label}</strong><small>{entry.subtitle}</small><span>{entry.summary}</span></div>
            </button>
          ))}
        </div>

        <div className="card operator-hub-form-card">
          <div className="section-heading-row operator-hub-form-header">
            <div>
              <p className="eyebrow">Selected role</p>
              <h3 className="section-title">{operatorRoleConfig[selectedRole].title}</h3>
              <p className="muted operator-access-copy">{operatorRoleConfig[selectedRole].helper}</p>
            </div>
            <span className={hasSavedKey ? 'info-chip info-chip-success' : 'info-chip'}>{hasSavedKey ? 'Saved session on this device' : 'Needs sign-in'}</span>
          </div>

          {savedToken && !editingSavedKey ? (
            <div className="operator-saved-key-banner">
              <div>
                <strong>Saved session on this device</strong>
                <p className="muted operator-access-copy">{maskOperatorToken(savedToken)}</p>
                {savedLoginId ? <p className="muted operator-access-copy">Login ID: <code>{savedLoginId}</code></p> : null}
              </div>
              <div className="operator-access-actions operator-access-actions-inline">
                <button type="button" onClick={() => navigate(operatorRoleConfig[selectedRole].route)}>Use saved session</button>
                <button type="button" className="secondary-button" onClick={() => { setEditingSavedKey(true); setSecret(''); setError('') }}>Sign in again</button>
                <button type="button" className="secondary-button" onClick={() => { clearOperatorToken(selectedRole); setToken(''); setSecret(''); setError('') }}>Forget this device</button>
              </div>
            </div>
          ) : null}

          {(!hasSavedKey || editingSavedKey) ? (
            <>
              <label className="operator-access-input-group">
                <span>Login ID</span>
                <input value={loginId} onChange={(event) => { setLoginId(event.target.value); if (error) setError('') }} placeholder={`Enter ${operatorRoleConfig[selectedRole].label.toLowerCase()} login ID`} autoComplete="username" />
              </label>

              <label className="operator-access-input-group">
                <span>Secret</span>
                <div className="operator-access-key-row">
                  <input type={showSecret ? 'text' : 'password'} autoComplete="current-password" value={secret} onChange={(event) => { setSecret(event.target.value); if (error) setError('') }} placeholder={`Enter ${operatorRoleConfig[selectedRole].label.toLowerCase()} secret`} onKeyDown={(event) => { if (event.key === 'Enter') void handleOpen() }} />
                  <button type="button" className="secondary-button operator-access-toggle" onClick={() => setShowSecret((value) => !value)}>{showSecret ? 'Hide' : 'Show'} secret</button>
                </div>
              </label>

              {error ? <p className="connection-bad operator-access-error">{error}</p> : null}

              <div className="operator-access-actions operator-hub-actions">
                <button type="button" onClick={() => void handleOpen()} disabled={!loginId.trim() || !secret.trim() || submitting}>
                  {submitting ? 'Signing in…' : `Open ${operatorRoleConfig[selectedRole].label}`}
                </button>
                {hasSavedKey ? <button type="button" className="secondary-button" onClick={() => { setEditingSavedKey(false); setSecret(''); setError('') }}>Cancel</button> : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
}
