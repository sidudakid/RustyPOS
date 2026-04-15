import type React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchJson, PaymentSessionResult, PaymentSessionView } from '../api'
import { money } from '../lib'

export function CustomerPaymentPage() {
  const { sessionToken = '' } = useParams()
  const navigate = useNavigate()

  const sessionQuery = useQuery({
    queryKey: ['payment-session', sessionToken],
    queryFn: () => fetchJson<PaymentSessionView>(`/payment-sessions/${sessionToken}`),
    enabled: Boolean(sessionToken),
    refetchInterval: (query) => {
      const status = (query.state.data as PaymentSessionView | undefined)?.status
      return status === 'pending' ? 5000 : false
    },
  })

  const confirmMutation = useMutation({
    mutationFn: () =>
      fetchJson<PaymentSessionResult>(`/payment-sessions/${sessionToken}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ demo_confirmation_note: 'confirmed from customer demo pay page' }),
      }),
    onSuccess: (result) => {
      const orderId = result.settled_orders[0]?.order.id
      if (result.session.tracking_token && orderId) {
        window.setTimeout(() => navigate(`/t/${result.session.tracking_token}/order/${orderId}`), 1200)
      }
    },
  })

  if (sessionQuery.isLoading) {
    return <div style={shell}><p style={muted}>Loading payment page…</p></div>
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return <div style={shell}><p style={muted}>Payment session not found.</p></div>
  }

  const session = sessionQuery.data
  const done = confirmMutation.data?.session ?? session
  const status = done.status
  const canConfirm = status === 'pending' && !confirmMutation.isPending

  return (
    <div style={shell}>
      <div style={card}>
        <p style={eyebrow}>Customer payment</p>
        <h1 style={title}>Pay {session.table_name}</h1>
        <p style={muted}>Demo bill payment flow for printed-bill QR scans.</p>

        <div style={summary}>
          <div><span style={label}>Amount</span><strong>{money(session.amount_total, session.currency_code)}</strong></div>
          <div><span style={label}>Reference</span><strong>{session.reference_code}</strong></div>
          <div><span style={label}>Method</span><strong>{session.payment_label}</strong></div>
          <div><span style={label}>Status</span><strong style={{ textTransform: 'capitalize' }}>{status}</strong></div>
        </div>

        {status === 'confirmed' ? (
          <div style={successBox}>
            Payment confirmed. The table has been settled.
          </div>
        ) : status === 'expired' || status === 'cancelled' ? (
          <div style={errorBox}>
            This payment link is no longer active. Please ask staff for a fresh bill.
          </div>
        ) : (
          <>
            <div style={infoBox}>
              This is demo mode. Tap confirm to simulate a successful wallet payment and automatically settle the table.
            </div>
            <button style={primaryButton} disabled={!canConfirm} onClick={() => confirmMutation.mutate()}>
              {confirmMutation.isPending ? 'Confirming payment…' : `Confirm demo payment · ${money(session.amount_total, session.currency_code)}`}
            </button>
          </>
        )}

        {confirmMutation.isError ? (
          <div style={errorBox}>Could not confirm payment right now. Please try again or ask staff.</div>
        ) : null}

        {done.tracking_token ? (
          <button style={secondaryButton} onClick={() => navigate(`/t/${done.tracking_token}`)}>
            Open table page
          </button>
        ) : null}
      </div>
    </div>
  )
}

const shell: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  background: '#f6f2ea',
  fontFamily: 'Inter, system-ui, sans-serif',
}
const card: React.CSSProperties = {
  width: '100%',
  maxWidth: '560px',
  background: '#fff',
  borderRadius: '20px',
  padding: '28px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
  display: 'grid',
  gap: '16px',
}
const eyebrow: React.CSSProperties = { fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#a07840', margin: 0 }
const title: React.CSSProperties = { fontSize: '36px', lineHeight: 1, margin: 0, color: '#1c1810' }
const muted: React.CSSProperties = { color: '#6b7280', margin: 0 }
const summary: React.CSSProperties = { display: 'grid', gap: '12px', padding: '16px', background: '#faf7f2', borderRadius: '14px' }
const label: React.CSSProperties = { display: 'block', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9a8e78', marginBottom: '4px' }
const infoBox: React.CSSProperties = { padding: '14px 16px', borderRadius: '12px', background: '#eef5ff', color: '#264b7a' }
const successBox: React.CSSProperties = { padding: '14px 16px', borderRadius: '12px', background: '#edf9f0', color: '#24613c' }
const errorBox: React.CSSProperties = { padding: '14px 16px', borderRadius: '12px', background: '#fff1ef', color: '#9b3b2b' }
const primaryButton: React.CSSProperties = { border: 'none', borderRadius: '12px', padding: '14px 18px', background: '#1c1810', color: '#fff', fontWeight: 700, cursor: 'pointer' }
const secondaryButton: React.CSSProperties = { borderRadius: '12px', padding: '12px 18px', background: '#fff', color: '#1c1810', fontWeight: 600, cursor: 'pointer', border: '1px solid #ddd5c0' }
