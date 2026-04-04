import { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchJson } from './api'

type CafeSettings = {
  name: string
  image_url: string
  currency_code: string
}

const CafeSettingsContext = createContext<CafeSettings>({
  name: 'OpenClaw Café',
  image_url: '',
  currency_code: 'USD',
})

export function CafeSettingsProvider({ children }: { children: React.ReactNode }) {
  const query = useQuery({
    queryKey: ['cafe-settings'],
    queryFn: () => fetchJson<CafeSettings>('/cafe-settings'),
  })

  const value = query.data ?? {
    name: 'OpenClaw Café',
    image_url: '',
    currency_code: 'USD',
  }

  return <CafeSettingsContext.Provider value={value}>{children}</CafeSettingsContext.Provider>
}

export function useCafeSettings() {
  return useContext(CafeSettingsContext)
}
