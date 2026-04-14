import { createContext, useContext, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CafeSettingsResponse, fetchJson } from './api'

type CafeSettingsContextValue = CafeSettingsResponse

const defaultSettings: CafeSettingsContextValue = {
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
  table_name_preview: ['Table 1', 'Table 2', 'Table 3'],
  table_access: [],
}

const CafeSettingsContext = createContext<CafeSettingsContextValue>(defaultSettings)

export function CafeSettingsProvider({ children }: { children: React.ReactNode }) {
  const query = useQuery({
    queryKey: ['cafe-settings'],
    queryFn: () => fetchJson<CafeSettingsResponse>('/cafe-settings'),
  })

  const settings = query.data ?? defaultSettings

  useEffect(() => {
    const cafeName = settings.name?.trim() || defaultSettings.name
    document.title = cafeName
  }, [settings.name])

  return <CafeSettingsContext.Provider value={settings}>{children}</CafeSettingsContext.Provider>
}

export function useCafeSettings() {
  return useContext(CafeSettingsContext)
}
