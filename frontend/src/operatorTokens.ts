const LEGACY_TOKEN_KEY = 'adminToken'
const LAST_ROLE_KEY = 'operatorLastRole'

const ROLE_TOKEN_KEYS = {
  admin: 'operatorToken.admin',
  kitchen: 'operatorToken.kitchen',
  staff: 'operatorToken.staff',
} as const

const ROLE_LOGIN_ID_KEYS = {
  admin: 'operatorLoginId.admin',
  kitchen: 'operatorLoginId.kitchen',
  staff: 'operatorLoginId.staff',
} as const

export type OperatorRole = keyof typeof ROLE_TOKEN_KEYS

export function readLastOperatorRole(): OperatorRole {
  const value = localStorage.getItem(LAST_ROLE_KEY)
  return value === 'admin' || value === 'kitchen' || value === 'staff' ? value : 'staff'
}

export function writeLastOperatorRole(role: OperatorRole) {
  localStorage.setItem(LAST_ROLE_KEY, role)
}

export function maskOperatorToken(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return 'No access key loaded'
  if (trimmed.length <= 6) return '••••••'
  return `${trimmed.slice(0, 2)}••••••${trimmed.slice(-2)}`
}

export function readOperatorToken(role: OperatorRole) {
  const scoped = localStorage.getItem(ROLE_TOKEN_KEYS[role])
  if (scoped) return scoped

  const lastRole = localStorage.getItem(LAST_ROLE_KEY)
  if (lastRole !== role) return ''

  return localStorage.getItem(LEGACY_TOKEN_KEY) ?? ''
}

export function writeOperatorToken(role: OperatorRole, token: string) {
  const trimmed = token.trim()
  if (!trimmed) {
    clearOperatorToken(role)
    return
  }

  localStorage.setItem(ROLE_TOKEN_KEYS[role], trimmed)
  writeLastOperatorRole(role)
}

export function clearOperatorToken(role: OperatorRole) {
  localStorage.removeItem(ROLE_TOKEN_KEYS[role])

  if (localStorage.getItem(LAST_ROLE_KEY) === role) {
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  }
}

export function readOperatorLoginId(role: OperatorRole) {
  return localStorage.getItem(ROLE_LOGIN_ID_KEYS[role]) ?? ''
}

export function writeOperatorLoginId(role: OperatorRole, loginId: string) {
  const trimmed = loginId.trim().toLowerCase()
  if (!trimmed) {
    localStorage.removeItem(ROLE_LOGIN_ID_KEYS[role])
    return
  }

  localStorage.setItem(ROLE_LOGIN_ID_KEYS[role], trimmed)
}
