import { createContext, useContext } from 'react'
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
  table_name_preview: ['Table 1', 'Table 2', 'Table 3'],
}

const CafeSettingsContext = createContext<CafeSettingsContextValue>(defaultSettings)

export function CafeSettingsProvider({ children }: { children: React.ReactNode }) {
  const query = useQuery({
    queryKey: ['cafe-settings'],
    queryFn: () => fetchJson<CafeSettingsResponse>('/cafe-settings'),
  })

  return <CafeSettingsContext.Provider value={query.data ?? defaultSettings}>{children}</CafeSettingsContext.Provider>
}

export function useCafeSettings() {
  return useContext(CafeSettingsContext)
}
