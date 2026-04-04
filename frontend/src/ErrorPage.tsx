import { useRouteError } from 'react-router-dom'
import { SectionCard } from './components'

export function ErrorPage() {
  const error = useRouteError()
  const message = error instanceof Error ? error.message : 'Something went wrong.'

  return (
    <SectionCard>
      <h2>Something broke</h2>
      <p>{message}</p>
    </SectionCard>
  )
}
