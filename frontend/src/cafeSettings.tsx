import { createContext, useContext, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CafeSettingsResponse, coerceCafeSettingsResponse, defaultCafeSettings, fetchJson } from './api'

type CafeSettingsContextValue = CafeSettingsResponse

const defaultSettings: CafeSettingsContextValue = {
  ...defaultCafeSettings,
  table_name_preview: ['Table 1', 'Table 2', 'Table 3'],
  table_access: [],
}

const CafeSettingsContext = createContext<CafeSettingsContextValue>(defaultSettings)

export function CafeSettingsProvider({ children }: { children: React.ReactNode }) {
  const query = useQuery({
    queryKey: ['cafe-settings'],
    queryFn: async () => coerceCafeSettingsResponse(await fetchJson<CafeSettingsResponse>('/cafe-settings')),
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
