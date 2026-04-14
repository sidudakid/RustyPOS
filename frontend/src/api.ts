const rawApiBase = import.meta.env.VITE_API_BASE?.trim()
const rawPublicOrigin = import.meta.env.VITE_PUBLIC_ORIGIN?.trim()
const browserHost = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'
const defaultApiBase = `http://${browserHost}:8081`
export const API_BASE = rawApiBase && rawApiBase.length > 0 ? rawApiBase : defaultApiBase
export const PUBLIC_ORIGIN = rawPublicOrigin && rawPublicOrigin.length > 0
  ? rawPublicOrigin.replace(/\/$/, '')
  : (typeof window !== 'undefined' ? window.location.origin : '')

export type MenuItem = {
  id: string
  name: string
  description: string
  image_url: string
  price: number
  category: string
  active: boolean
  available: boolean
  stock_count: number
  low_stock_threshold: number
  restock_needed: boolean
}

export type MenuCategory = {
  id: string
  name: string
  hot_pick: boolean
  active: boolean
  sort_order: number
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'paid'

export type OrderItemView = {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  menu_item_name: string
  menu_item_category: string
  menu_item_price: number
}

export type OrderWithItemsView = {
  order: {
    id: string
    table_id: string
    table_name?: string | null
    table_number?: number | null
    tracking_token?: string | null
    status: OrderStatus
    created_at: string
    updated_at: string
    paid_at?: string | null
    follow_up_additions_count: number
    is_follow_up: boolean
  }
  items: OrderItemView[]
}

export type AddOrderItemsRequest = {
  token: string
  items: Array<{
    menu_item_id: string
    quantity: number
  }>
}

export type OpenTableSummary = {
  table_id: string
  table_name: string
  table_number?: number | null
  tracking_token?: string | null
  order_count: number
  total_amount: number
  statuses: OrderStatus[]
}

export type TableOperationalSummary = {
  table_id: string
  table_name: string
  table_number?: number | null
  active: boolean
  open_order_count: number
  paid_order_count: number
  ready_order_count: number
  unpaid_total_amount: number
  unpaid_statuses: OrderStatus[]
  last_order_at?: string | null
}

export type CafeSettings = {
  name: string
  legal_name: string
  slug: string
  tagline: string
  image_url: string
  currency_code: string
  primary_color: string
  accent_color: string
  support_email: string
  support_phone: string
  address_line_1: string
  address_line_2: string
  city: string
  state_region: string
  postal_code: string
  country_code: string
  timezone: string
  service_mode: 'table_service' | 'counter_service' | 'hybrid'
  table_count: number
  table_prefix: string
  table_name_style: 'numeric' | 'padded' | 'hyphenated'
  payment_provider: 'none' | 'esewa' | 'bank_qr' | 'upi_qr' | 'phonepe'
  payment_mode: 'disabled' | 'demo' | 'live'
  payment_display_name: string
  payment_payee_name: string
  payment_vpa: string
  payment_phone_number: string
  payment_reference_prefix: string
  payment_qr_enabled: boolean
  payment_instructions: string
}

export type AdminTableAccessArtifact = {
  id: string
  table_number: number
  name: string
  active: boolean
  token: string
  token_label: string
  menu_path: string
}

export type CafeSettingsResponse = CafeSettings & {
  table_name_preview: string[]
  table_access: AdminTableAccessArtifact[]
}

export const defaultCafeSettings: CafeSettings = {
  name: 'OpenClaw Café',
  legal_name: 'OpenClaw Café',
  slug: 'openclaw-cafe',
  tagline: 'Fast café ordering for customers, kitchen, and staff.',
  image_url: '',
  currency_code: 'USD',
  primary_color: '#2563EB',
  accent_color: '#F59E0B',
  support_email: '',
  support_phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state_region: '',
  postal_code: '',
  country_code: 'US',
  timezone: 'America/New_York',
  service_mode: 'table_service',
  table_count: 12,
  table_prefix: 'Table',
  table_name_style: 'numeric',
  payment_provider: 'none',
  payment_mode: 'disabled',
  payment_display_name: 'eSewa QR Pay',
  payment_payee_name: 'OpenClaw Café Nepal Demo',
  payment_vpa: '',
  payment_phone_number: '',
  payment_reference_prefix: 'OCNPL',
  payment_qr_enabled: false,
  payment_instructions: 'Ask the guest to confirm the eSewa wallet name and reference before marking the bill paid.',
}

export function coerceCafeSettings(value?: Partial<CafeSettings> | null): CafeSettings {
  return {
    ...defaultCafeSettings,
    ...(value ?? {}),
    name: value?.name ?? defaultCafeSettings.name,
    legal_name: value?.legal_name ?? defaultCafeSettings.legal_name,
    slug: value?.slug ?? defaultCafeSettings.slug,
    tagline: value?.tagline ?? defaultCafeSettings.tagline,
    image_url: value?.image_url ?? defaultCafeSettings.image_url,
    currency_code: value?.currency_code ?? defaultCafeSettings.currency_code,
    primary_color: value?.primary_color ?? defaultCafeSettings.primary_color,
    accent_color: value?.accent_color ?? defaultCafeSettings.accent_color,
    support_email: value?.support_email ?? defaultCafeSettings.support_email,
    support_phone: value?.support_phone ?? defaultCafeSettings.support_phone,
    address_line_1: value?.address_line_1 ?? defaultCafeSettings.address_line_1,
    address_line_2: value?.address_line_2 ?? defaultCafeSettings.address_line_2,
    city: value?.city ?? defaultCafeSettings.city,
    state_region: value?.state_region ?? defaultCafeSettings.state_region,
    postal_code: value?.postal_code ?? defaultCafeSettings.postal_code,
    country_code: value?.country_code ?? defaultCafeSettings.country_code,
    timezone: value?.timezone ?? defaultCafeSettings.timezone,
    service_mode: value?.service_mode ?? defaultCafeSettings.service_mode,
    table_count: value?.table_count ?? defaultCafeSettings.table_count,
    table_prefix: value?.table_prefix ?? defaultCafeSettings.table_prefix,
    table_name_style: value?.table_name_style ?? defaultCafeSettings.table_name_style,
    payment_provider: value?.payment_provider ?? defaultCafeSettings.payment_provider,
    payment_mode: value?.payment_mode ?? defaultCafeSettings.payment_mode,
    payment_display_name: value?.payment_display_name ?? defaultCafeSettings.payment_display_name,
    payment_payee_name: value?.payment_payee_name ?? defaultCafeSettings.payment_payee_name,
    payment_vpa: value?.payment_vpa ?? defaultCafeSettings.payment_vpa,
    payment_phone_number: value?.payment_phone_number ?? defaultCafeSettings.payment_phone_number,
    payment_reference_prefix: value?.payment_reference_prefix ?? defaultCafeSettings.payment_reference_prefix,
    payment_qr_enabled: value?.payment_qr_enabled ?? defaultCafeSettings.payment_qr_enabled,
    payment_instructions: value?.payment_instructions ?? defaultCafeSettings.payment_instructions,
  }
}

export function coerceCafeSettingsResponse(value?: Partial<CafeSettingsResponse> | null): CafeSettingsResponse {
  return {
    ...coerceCafeSettings(value),
    table_name_preview: Array.isArray(value?.table_name_preview) ? value!.table_name_preview : ['Table 1', 'Table 2', 'Table 3'],
    table_access: Array.isArray(value?.table_access) ? value!.table_access : [],
  }
}

export type OperatorRole = 'admin' | 'kitchen' | 'staff'

export type OperatorLoginRequest = {
  role: OperatorRole
  login_id: string
  secret: string
}

export type OperatorLoginResponse = {
  role: 'owner' | 'kitchen' | 'staff'
  login_id: string
  session_token: string
}

export type OperatorCredentialSummary = {
  role: 'owner' | 'kitchen' | 'staff'
  login_id: string
  active: boolean
  rotated_at: string
  secret_preview: string
}

export type OperatorCredentialListResponse = {
  credentials: OperatorCredentialSummary[]
}

export type ResetOperatorCredentialResponse = {
  role: 'owner' | 'kitchen' | 'staff'
  login_id: string
  secret: string
}

export type MenuRecommendation = {
  item: MenuItem
  score: number
  paired_order_count: number
  matched_cart_items: number
  reason: string
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  return response.json() as Promise<T>
}
