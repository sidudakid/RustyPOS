const LEGACY_TOKEN_KEY = 'adminToken'

const ROLE_TOKEN_KEYS = {
  admin: 'operatorToken.admin',
  kitchen: 'operatorToken.kitchen',
  staff: 'operatorToken.staff',
} as const

export type OperatorRole = keyof typeof ROLE_TOKEN_KEYS

export function readOperatorToken(role: OperatorRole) {
  return localStorage.getItem(ROLE_TOKEN_KEYS[role]) ?? localStorage.getItem(LEGACY_TOKEN_KEY) ?? ''
}

export function writeOperatorToken(role: OperatorRole, token: string) {
  const trimmed = token.trim()
  if (!trimmed) {
    clearOperatorToken(role)
    return
  }

  localStorage.setItem(ROLE_TOKEN_KEYS[role], trimmed)
  localStorage.setItem(LEGACY_TOKEN_KEY, trimmed)
  localStorage.setItem('operatorLastRole', role)
}

export function clearOperatorToken(role: OperatorRole) {
  localStorage.removeItem(ROLE_TOKEN_KEYS[role])
  localStorage.removeItem(LEGACY_TOKEN_KEY)
}
