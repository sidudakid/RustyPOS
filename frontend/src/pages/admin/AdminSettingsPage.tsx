import { useEffect, useMemo, useState } from 'react'
import { AdminEntityList, AdminListToolbar, SectionCard } from '../../components'
import { coerceCafeSettings, useAdminOutletState } from '../../adminShared'
import { PUBLIC_ORIGIN, type CafeSettings, type TableOperationalSummary } from '../../api'
import { shortId } from '../../lib'
import { filterTableAccess, sanitizeFilePart, type TableFilter } from './adminSettingsUtils'

function tableLink(token: string) {
  if (PUBLIC_ORIGIN) return `${PUBLIC_ORIGIN}/t/${token}`
  if (typeof window === 'undefined') return `/t/${token}`
  return `${window.location.origin}/t/${token}`
}

type QrModalState = {
  tableName: string
  tokenLabel: string
  token: string
  link: string
  dataUrl: string
} | null

type TableAccessModalState = {
  tableId: string
} | null

type SettingsSection = 'general' | 'tables' | 'access'

async function buildQrDataUrl(link: string) {
  const QRCode = await import('qrcode')
  return QRCode.toDataURL(link, {
    errorCorrectionLevel: 'H',
    margin: 1,
    scale: 12,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  })
}

async function downloadQrSvg(tableName: string, tokenLabel: string, link: string) {
  const QRCode = await import('qrcode')
  const svg = await QRCode.toString(link, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 1,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  })

  const filenameBase = [sanitizeFilePart(tableName), sanitizeFilePart(tokenLabel)]
    .filter(Boolean)
    .join('-') || 'table-qr'

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = `${filenameBase}.svg`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

function TableQrPreview({
  tableName,
  tokenLabel,
  link,
  onPreview,
}: {
  tableName: string
  tokenLabel: string
  link: string
  onPreview: (dataUrl: string) => void
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [qrState, setQrState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

  useEffect(() => {
    let cancelled = false
    setQrState('loading')
    setQrDataUrl('')

    void buildQrDataUrl(link)
      .then((dataUrl) => {
        if (cancelled) return
        setQrDataUrl(dataUrl)
        setQrState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setQrState('error')
      })

    return () => {
      cancelled = true
    }
  }, [link])

  return (
    <div className="table-qr-panel">
      <div className="table-qr-preview-shell">
        {qrState === 'ready' && qrDataUrl ? (
          <button className="table-qr-preview-button" type="button" onClick={() => onPreview(qrDataUrl)} aria-label={`Preview QR code for ${tableName}`}>
            <img src={qrDataUrl} alt={`QR code for ${tableName}`} className="table-qr-preview-image" />
          </button>
        ) : (
          <div className="table-qr-preview-placeholder">
            <strong>{qrState === 'error' ? 'QR unavailable' : 'Generating QR…'}</strong>
            <span>{qrState === 'error' ? 'Try refreshing the page.' : 'Preparing a downloadable code for this table link.'}</span>
          </div>
        )}
      </div>

      <div className="table-qr-copy">
        <strong>Customer QR</strong>
        <p className="muted inventory-helper-text">
          Scan opens the exact customer ordering link for <strong>{tableName}</strong>.
        </p>
        <div className="table-token-actions">
          <button className="secondary-button" type="button" onClick={() => qrDataUrl && onPreview(qrDataUrl)} disabled={!qrDataUrl}>
            View QR
          </button>
          <button className="secondary-button" type="button" onClick={() => void downloadQrSvg(tableName, tokenLabel, link)}>
            Download SVG
          </button>
        </div>
      </div>
    </div>
  )
}

function copyText(value: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value)
  }
  return Promise.reject(new Error('Clipboard unavailable'))
}

export function AdminSettingsPage() {
  const admin = useAdminOutletState()
  const draft = coerceCafeSettings(admin.settingsDraft)
  const tableAccess = admin.settingsQuery.data?.table_access ?? []
  const activeTableAccess = tableAccess.filter((table) => table.active)
  const tableOperations = (admin.tableOperationsQuery.data ?? []) as TableOperationalSummary[]
  const actualTableCount = activeTableAccess.length
  const configuredTableCount = draft.table_count
  const tableCountMismatch = actualTableCount !== configuredTableCount
  const missingLinks = Math.max(configuredTableCount - activeTableAccess.length, 0)
  const supportReady = Boolean(draft.support_email.trim() || draft.support_phone.trim())
  const brandReady = /^#[0-9a-f]{6}$/i.test(draft.primary_color.trim()) && /^#[0-9a-f]{6}$/i.test(draft.accent_color.trim())
  const paymentConfigured =
    draft.payment_provider !== 'none' &&
    draft.payment_mode !== 'disabled' &&
    Boolean(draft.payment_vpa.trim() && draft.payment_payee_name.trim())
  const [qrModal, setQrModal] = useState<QrModalState>(null)
  const [tableModal, setTableModal] = useState<TableAccessModalState>(null)
  const [tableQuery, setTableQuery] = useState('')
  const [tableFilter, setTableFilter] = useState<TableFilter>('all')
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')

  const updateDraft = <K extends keyof CafeSettings>(key: K, value: CafeSettings[K]) => {
    admin.setSettingsDraft((current) => ({ ...current, [key]: value }))
  }

  useEffect(() => {
    if (!qrModal && !tableModal) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setQrModal(null)
        setTableModal(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [qrModal, tableModal])

  const modalTitle = useMemo(() => {
    if (!qrModal) return ''
    return `${qrModal.tableName} QR code`
  }, [qrModal])

  const filteredTableAccess = useMemo(
    () => filterTableAccess(tableAccess, tableOperations, tableQuery, tableFilter),
    [tableAccess, tableFilter, tableOperations, tableQuery],
  )

  const selectedTable = tableModal ? tableAccess.find((table) => table.id === tableModal.tableId) ?? null : null
  const selectedTableOps = selectedTable ? tableOperations.find((entry) => entry.table_id === selectedTable.id) ?? null : null

  return (
    <>
      <section className="admin-settings-page admin-settings-page-single ops-surface">
        <SectionCard>
          <div className="ops-hero-card admin-settings-hero-card">
            <div className="section-heading-row ops-hero-row admin-settings-top-strip admin-settings-top-strip-slim">
              <div>
                <p className="eyebrow">Settings</p>
                <h3 className="section-title">Admin settings</h3>
                <p className="muted ops-hero-copy">Organize brand identity, table provisioning, and customer access links from one polished control surface.</p>
              </div>
              <div className="ops-hero-chips admin-settings-top-strip-meta admin-settings-top-strip-meta-slim">
                <span className={tableCountMismatch ? 'info-chip info-chip-danger' : 'info-chip info-chip-success'}>
                  {tableCountMismatch ? `${missingLinks} links missing` : 'Tables aligned'}
                </span>
                <span className="info-chip">{activeTableAccess.length} live tables</span>
                <span className={supportReady ? 'info-chip info-chip-success' : 'info-chip'}>{supportReady ? 'Support ready' : 'Support missing'}</span>
              </div>
            </div>

            <div className="ops-stat-strip ops-stat-strip-compact admin-settings-hero-stats">
              <div className="ops-stat-card">
                <span>Configured tables</span>
                <strong>{configuredTableCount}</strong>
                <small>{admin.tablePreview.length} preview names</small>
              </div>
              <div className="ops-stat-card ops-stat-card-success">
                <span>Live access links</span>
                <strong>{activeTableAccess.length}</strong>
                <small>{filteredTableAccess.length} currently in view</small>
              </div>
              <div className="ops-stat-card ops-stat-card-warning">
                <span>Missing links</span>
                <strong>{missingLinks}</strong>
                <small>{tableCountMismatch ? 'Save settings to reprovision' : 'Provisioning looks aligned'}</small>
              </div>
              <div className="ops-stat-card">
                <span>Brand + support + payment</span>
                <strong>{Number(brandReady) + Number(supportReady) + Number(paymentConfigured)}/3</strong>
                <small>{paymentConfigured ? 'QR payment configured' : 'Payment config still optional'}</small>
              </div>
            </div>
          </div>
          <div className="admin-settings-section-nav admin-settings-section-nav-compact">
            <button type="button" className={activeSection === 'general' ? 'admin-settings-section-tab admin-settings-section-tab-active' : 'admin-settings-section-tab'} onClick={() => setActiveSection('general')}>
              General
            </button>
            <button type="button" className={activeSection === 'tables' ? 'admin-settings-section-tab admin-settings-section-tab-active' : 'admin-settings-section-tab'} onClick={() => setActiveSection('tables')}>
              Tables
            </button>
            <button type="button" className={activeSection === 'access' ? 'admin-settings-section-tab admin-settings-section-tab-active' : 'admin-settings-section-tab'} onClick={() => setActiveSection('access')}>
              Access
            </button>
          </div>
        </SectionCard>

        <div className="admin-settings-main-stack">
          {activeSection === 'general' ? (
            <>
              <SectionCard>
                <div className="section-heading-row">
                  <div>
                    <p className="eyebrow">Brand and tenant</p>
                    <h3 className="section-title">Cafe settings</h3>
                  </div>
                  <span className="info-chip">Slug: {draft.slug}</span>
                </div>

                <div className="admin-settings-form-group-grid">
                  <div className="admin-settings-form-group-card">
                    <div className="admin-settings-form-group-heading">
                      <strong>Identity</strong>
                      <span className="muted">What guests and operators see</span>
                    </div>
                    <div className="form-stack admin-settings-form-stack">
                      <input value={draft.name} onChange={(e) => updateDraft('name', e.target.value)} placeholder="Cafe name" />
                      <input value={draft.legal_name} onChange={(e) => updateDraft('legal_name', e.target.value)} placeholder="Legal name" />
                      <input value={draft.slug} onChange={(e) => updateDraft('slug', e.target.value)} placeholder="Slug" />
                      <input value={draft.tagline} onChange={(e) => updateDraft('tagline', e.target.value)} placeholder="Tagline" />
                      <input value={draft.image_url} onChange={(e) => updateDraft('image_url', e.target.value)} placeholder="Image URL" />
                    </div>
                  </div>

                  <div className="admin-settings-form-group-card">
                    <div className="admin-settings-form-group-heading">
                      <strong>Locale and brand</strong>
                      <span className="muted">Visual identity and local formatting</span>
                    </div>
                    <div className="form-stack admin-settings-form-stack">
                      <div className="two-column admin-settings-inline-grid">
                        <input value={draft.currency_code} onChange={(e) => updateDraft('currency_code', e.target.value)} placeholder="Currency" />
                        <input value={draft.timezone} onChange={(e) => updateDraft('timezone', e.target.value)} placeholder="Timezone" />
                      </div>
                      <div className="two-column admin-settings-inline-grid">
                        <input value={draft.primary_color} onChange={(e) => updateDraft('primary_color', e.target.value)} placeholder="Primary color" />
                        <input value={draft.accent_color} onChange={(e) => updateDraft('accent_color', e.target.value)} placeholder="Accent color" />
                      </div>
                      <div className="admin-settings-inline-status-row">
                        <span className={brandReady ? 'info-chip info-chip-success' : 'info-chip'}>{brandReady ? 'Colors valid' : 'Use full hex colors'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="admin-settings-form-group-card">
                    <div className="admin-settings-form-group-heading">
                      <strong>Support contacts</strong>
                      <span className="muted">Where staff and guests can reach you</span>
                    </div>
                    <div className="form-stack admin-settings-form-stack">
                      <input value={draft.support_email} onChange={(e) => updateDraft('support_email', e.target.value)} placeholder="Support email" />
                      <input value={draft.support_phone} onChange={(e) => updateDraft('support_phone', e.target.value)} placeholder="Support phone" />
                    </div>
                  </div>

                  <div className="admin-settings-form-group-card">
                    <div className="admin-settings-form-group-heading">
                      <strong>QR payment</strong>
                      <span className="muted">Safe config-first PhonePe / UPI setup for cashier screens and printed bills</span>
                    </div>
                    <div className="form-stack admin-settings-form-stack">
                      <div className="two-column admin-settings-inline-grid">
                        <select value={draft.payment_provider} onChange={(e) => updateDraft('payment_provider', e.target.value as CafeSettings['payment_provider'])}>
                          <option value="none">Disabled</option>
                          <option value="upi_qr">Generic UPI QR</option>
                          <option value="phonepe">PhonePe-style UPI QR</option>
                        </select>
                        <select value={draft.payment_mode} onChange={(e) => updateDraft('payment_mode', e.target.value as CafeSettings['payment_mode'])}>
                          <option value="disabled">Disabled</option>
                          <option value="demo">Demo / training</option>
                          <option value="live">Live</option>
                        </select>
                      </div>
                      <input value={draft.payment_display_name} onChange={(e) => updateDraft('payment_display_name', e.target.value)} placeholder="Payment display name" />
                      <input value={draft.payment_payee_name} onChange={(e) => updateDraft('payment_payee_name', e.target.value)} placeholder="UPI payee / merchant name" />
                      <input value={draft.payment_vpa} onChange={(e) => updateDraft('payment_vpa', e.target.value)} placeholder="UPI VPA (example@bank)" />
                      <div className="two-column admin-settings-inline-grid">
                        <input value={draft.payment_phone_number} onChange={(e) => updateDraft('payment_phone_number', e.target.value)} placeholder="Phone number (optional)" />
                        <input value={draft.payment_reference_prefix} onChange={(e) => updateDraft('payment_reference_prefix', e.target.value)} placeholder="Reference prefix" maxLength={24} />
                      </div>
                      <textarea value={draft.payment_instructions} onChange={(e) => updateDraft('payment_instructions', e.target.value)} placeholder="Optional staff/customer payment instructions" rows={4} />
                      <label className="checkbox-row">
                        <input type="checkbox" checked={draft.payment_qr_enabled} onChange={(e) => updateDraft('payment_qr_enabled', e.target.checked)} />
                        <span>Show QR payment on bills and cashier cards</span>
                      </label>
                      <div className="admin-settings-inline-status-row">
                        <span className={paymentConfigured ? 'info-chip info-chip-success' : 'info-chip'}>
                          {paymentConfigured ? `Ready: ${draft.payment_mode === 'live' ? 'live' : draft.payment_mode === 'demo' ? 'demo' : 'configured'}` : 'Needs VPA + payee name'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={() => admin.updateCafeSettings.mutate()} disabled={admin.updateCafeSettings.isPending}>
                  {admin.updateCafeSettings.isPending ? 'Saving settings…' : 'Save settings'}
                </button>
              </SectionCard>

              <SectionCard>
                <div className="section-heading-row">
                  <div>
                    <p className="eyebrow">Setup health</p>
                    <h3 className="section-title">Restaurant setup status</h3>
                  </div>
                  <span className={tableCountMismatch ? 'info-chip info-chip-danger' : 'info-chip info-chip-success'}>
                    {tableCountMismatch ? 'Needs provisioning' : 'Tables aligned'}
                  </span>
                </div>

                <div className="settings-summary-grid">
                  <div className="settings-summary-card">
                    <span className="inventory-summary-label">Configured tables</span>
                    <strong>{configuredTableCount}</strong>
                  </div>
                  <div className="settings-summary-card">
                    <span className="inventory-summary-label">Actual backend tables</span>
                    <strong>{actualTableCount}</strong>
                  </div>
                  <div className="settings-summary-card">
                    <span className="inventory-summary-label">Tables with access tokens</span>
                    <strong>{activeTableAccess.length}</strong>
                  </div>
                  <div className="settings-summary-card">
                    <span className="inventory-summary-label">Missing table links</span>
                    <strong>{Math.max(configuredTableCount - activeTableAccess.length, 0)}</strong>
                  </div>
                </div>
              </SectionCard>
            </>
          ) : null}

          {activeSection === 'tables' ? (
            <>
              <SectionCard>
                <div className="section-heading-row">
                  <div>
                    <p className="eyebrow">Service flow</p>
                    <h3 className="section-title">Tables and address</h3>
                  </div>
                  <span className="info-chip">{admin.tablePreview.length} preview names</span>
                </div>

                <div className="admin-settings-form-group-grid">
                  <div className="admin-settings-form-group-card">
                    <div className="admin-settings-form-group-heading">
                      <strong>Restaurant address</strong>
                      <span className="muted">Used in receipts, links, and setup context</span>
                    </div>
                    <div className="form-stack admin-settings-form-stack">
                      <input value={draft.address_line_1} onChange={(e) => updateDraft('address_line_1', e.target.value)} placeholder="Address line 1" />
                      <input value={draft.address_line_2} onChange={(e) => updateDraft('address_line_2', e.target.value)} placeholder="Address line 2" />
                      <div className="two-column admin-settings-inline-grid">
                        <input value={draft.city} onChange={(e) => updateDraft('city', e.target.value)} placeholder="City" />
                        <input value={draft.state_region} onChange={(e) => updateDraft('state_region', e.target.value)} placeholder="State / region" />
                      </div>
                      <div className="two-column admin-settings-inline-grid">
                        <input value={draft.postal_code} onChange={(e) => updateDraft('postal_code', e.target.value)} placeholder="Postal code" />
                        <input value={draft.country_code} onChange={(e) => updateDraft('country_code', e.target.value)} placeholder="Country code" />
                      </div>
                    </div>
                  </div>

                  <div className="admin-settings-form-group-card">
                    <div className="admin-settings-form-group-heading">
                      <strong>Table provisioning</strong>
                      <span className="muted">Controls generated table labels and access scale</span>
                    </div>
                    <div className="form-stack admin-settings-form-stack">
                      <select value={draft.service_mode} onChange={(e) => updateDraft('service_mode', e.target.value as CafeSettings['service_mode'])}>
                        <option value="table_service">Table service</option>
                        <option value="counter_service">Counter service</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                      <div className="two-column admin-settings-inline-grid">
                        <input
                          type="number"
                          min="1"
                          value={draft.table_count}
                          onChange={(e) => updateDraft('table_count', Math.max(1, Number(e.target.value) || 1))}
                          placeholder="Table count"
                        />
                        <input value={draft.table_prefix} onChange={(e) => updateDraft('table_prefix', e.target.value)} placeholder="Table prefix" />
                      </div>
                      <select value={draft.table_name_style} onChange={(e) => updateDraft('table_name_style', e.target.value as CafeSettings['table_name_style'])}>
                        <option value="numeric">Numeric</option>
                        <option value="padded">Padded</option>
                        <option value="hyphenated">Hyphenated</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button onClick={() => admin.updateCafeSettings.mutate()} disabled={admin.updateCafeSettings.isPending}>
                  {admin.updateCafeSettings.isPending ? 'Saving settings…' : 'Save table settings'}
                </button>
              </SectionCard>

              <SectionCard>
                <div className="section-heading-row">
                  <div>
                    <p className="eyebrow">Preview</p>
                    <h3 className="section-title">Generated table names</h3>
                  </div>
                  <span className="info-chip">{admin.tablePreview.length} names</span>
                </div>
                <div className="admin-settings-table-preview-grid">
                  {admin.tablePreview.map((tableName) => (
                    <div className="admin-settings-table-preview-card" key={tableName}>
                      <strong>{tableName}</strong>
                    </div>
                  ))}
                </div>
                <div className="admin-settings-address-card">
                  <span className="inventory-summary-label">Address summary</span>
                  <strong>{admin.setupAddress || 'No address configured yet.'}</strong>
                </div>
              </SectionCard>
            </>
          ) : null}

          {activeSection === 'access' ? (
            <>
              <SectionCard>
                <div className="section-heading-row">
                  <div>
                    <p className="eyebrow">Role credentials</p>
                    <h3 className="section-title">Admin, kitchen, and staff login IDs</h3>
                  </div>
                  <span className="info-chip">Per-role auth</span>
                </div>
                {admin.operatorCredentialsQuery.isLoading ? <p className="muted">Loading operator credentials…</p> : null}
                {admin.operatorCredentialsQuery.isError ? <p className="connection-bad">Could not load operator credentials.</p> : null}
                <div className="admin-settings-access-summary-row admin-settings-access-summary-row-polished">
                  {(admin.operatorCredentialsQuery.data?.credentials ?? []).map((credential) => {
                    const uiRole = credential.role === 'owner' ? 'admin' : credential.role
                    return (
                      <div key={credential.role} className="admin-settings-quick-card admin-settings-quick-card-inline" style={{ alignItems: 'flex-start' }}>
                        <span className="inventory-summary-label">{uiRole}</span>
                        <strong>{credential.login_id}</strong>
                        <span className="muted">Session reset rotates active access for this role.</span>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={async () => {
                            const next = await admin.resetOperatorCredential.mutateAsync(credential.role)
                            window.alert(`${uiRole.toUpperCase()}\nlogin ID: ${next.login_id}\nsecret: ${next.secret}\n\nCopy this now. The secret is only shown after reset.`)
                          }}
                        >
                          Reset {uiRole}
                        </button>
                      </div>
                    )
                  })}
                </div>

                <div className="section-heading-row">
                  <div>
                    <p className="eyebrow">Quick access</p>
                    <h3 className="section-title">Tables, links, and previews</h3>
                  </div>
                  <span className="info-chip">Fast actions</span>
                </div>
                <div className="admin-settings-access-summary-row admin-settings-access-summary-row-polished">
                  <button type="button" className="admin-settings-quick-card admin-settings-quick-card-inline" onClick={() => setTableFilter('all')}>
                    <span className="inventory-summary-label">Live access</span>
                    <strong>{activeTableAccess.length} tables</strong>
                  </button>
                  <button type="button" className="admin-settings-quick-card admin-settings-quick-card-inline" onClick={() => setTableQuery('TABLE-')}>
                    <span className="inventory-summary-label">Generated names</span>
                    <strong>{admin.tablePreview.length} previews</strong>
                  </button>
                  <div className="admin-settings-address-card admin-settings-address-card-compact admin-settings-address-card-inline">
                    <span className="inventory-summary-label">Address summary</span>
                    <strong>{admin.setupAddress || 'No address configured yet.'}</strong>
                  </div>
                </div>
              </SectionCard>

              <SectionCard>
                <div className="section-heading-row">
                  <div>
                    <p className="eyebrow">Live access</p>
                    <h3 className="section-title">Table links and tokens</h3>
                  </div>
                  <span className="info-chip">{filteredTableAccess.length} shown</span>
                </div>

                <div className="admin-sticky-toolbar-shell">
                  <AdminListToolbar>
                    <label>
                      Search tables
                      <input value={tableQuery} onChange={(event) => setTableQuery(event.target.value)} placeholder="Search table name, label, or token" />
                    </label>
                    <label>
                      Filter
                      <select value={tableFilter} onChange={(event) => setTableFilter(event.target.value as TableFilter)}>
                        <option value="all">All live tables</option>
                        <option value="open">Open orders</option>
                        <option value="inactive">Inactive / hidden</option>
                      </select>
                    </label>
                  </AdminListToolbar>
                </div>

                {admin.settingsQuery.isLoading ? <p className="muted">Loading table access data…</p> : null}
                {admin.settingsQuery.isError ? <p className="connection-bad">Failed to load live table access data.</p> : null}

                <AdminEntityList>
                  {filteredTableAccess.map((table) => {
                    const ops = tableOperations.find((entry) => entry.table_id === table.id)
                    return (
                      <button key={table.id} type="button" className="admin-settings-table-row admin-settings-table-row-rich" onClick={() => setTableModal({ tableId: table.id })}>
                        <div className="admin-settings-table-row-copy">
                          <strong>{table.name}</strong>
                          <div className="muted">Table #{table.table_number} · {table.token_label}</div>
                        </div>
                        <div className="admin-settings-table-row-meta admin-settings-table-row-meta-rich">
                          {ops?.open_order_count ? <span className="info-chip info-chip-danger">{ops.open_order_count} open</span> : null}
                          <span className={ops?.open_order_count ? 'info-chip' : 'info-chip info-chip-success'}>
                            Live token
                          </span>
                        </div>
                      </button>
                    )
                  })}
                  {!filteredTableAccess.length ? <p className="muted">No tables match the current search/filter.</p> : null}
                </AdminEntityList>
              </SectionCard>
            </>
          ) : null}
        </div>
      </section>

      {tableModal && selectedTable ? (
        <div className="admin-modal-backdrop" role="presentation" onClick={() => setTableModal(null)}>
          <div className="admin-modal" role="dialog" aria-modal="true" aria-label={`Table access for ${selectedTable.name}`} onClick={(event) => event.stopPropagation()}>
            <div className="section-heading-row admin-modal-header">
              <div>
                <p className="eyebrow">Table access</p>
                <h3 className="section-title">{selectedTable.name}</h3>
                <div className="muted">Table #{selectedTable.table_number} · {shortId(selectedTable.id)}</div>
              </div>
              <button className="secondary-button" type="button" onClick={() => setTableModal(null)}>Close</button>
            </div>

            {selectedTableOps ? (
              <div className="pill-list">
                <span className="info-chip">Unpaid {(selectedTableOps.unpaid_total_amount / 100).toFixed(2)}</span>
                <span className="info-chip">{selectedTableOps.paid_order_count} paid</span>
                {selectedTableOps.ready_order_count > 0 ? <span className="info-chip info-chip-success">{selectedTableOps.ready_order_count} ready</span> : null}
                {selectedTableOps.unpaid_statuses.map((status) => <span className="info-chip" key={`${selectedTableOps.table_id}-${status}`}>{status}</span>)}
              </div>
            ) : null}

            <div className="table-token-list">
              <div className="table-token-card table-token-card-rich">
                <div>
                  <strong>{selectedTable.token_label}</strong>
                  <div className="muted token-mono">{selectedTable.token}</div>
                </div>

                <TableQrPreview
                  tableName={selectedTable.name}
                  tokenLabel={selectedTable.token_label}
                  link={tableLink(selectedTable.token)}
                  onPreview={(dataUrl) => setQrModal({
                    tableName: selectedTable.name,
                    tokenLabel: selectedTable.token_label,
                    token: selectedTable.token,
                    link: tableLink(selectedTable.token),
                    dataUrl,
                  })}
                />

                <div className="table-token-actions">
                  <a href={tableLink(selectedTable.token)} target="_blank" rel="noreferrer" className="secondary-button">
                    Open link
                  </a>
                  <button className="secondary-button" onClick={() => void copyText(tableLink(selectedTable.token)).catch(() => window.alert('Clipboard access is unavailable on this browser/device.'))} type="button">
                    Copy URL
                  </button>
                </div>
                <div className="muted token-link">{tableLink(selectedTable.token)}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {qrModal ? (
        <div className="table-qr-modal-backdrop" role="presentation" onClick={() => setQrModal(null)}>
          <div
            className="table-qr-modal"
            role="dialog"
            aria-modal="true"
            aria-label={modalTitle}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">QR code</p>
                <h3 className="section-title">{qrModal.tableName}</h3>
                <div className="muted token-mono">{qrModal.token}</div>
              </div>
              <button className="secondary-button table-qr-close-button" type="button" onClick={() => setQrModal(null)}>
                Close
              </button>
            </div>

            <div className="table-qr-modal-image-shell">
              <img src={qrModal.dataUrl} alt={`Large QR code for ${qrModal.tableName}`} className="table-qr-modal-image" />
            </div>

            <div className="table-qr-modal-copy">
              <strong>{qrModal.tokenLabel}</strong>
              <p className="muted inventory-helper-text">
                Guests can scan this code to open the customer ordering flow directly at <strong>{qrModal.tableName}</strong>.
              </p>
              <div className="muted token-link">{qrModal.link}</div>
            </div>

            <div className="table-token-actions">
              <button className="secondary-button" type="button" onClick={() => void copyText(qrModal.link).catch(() => window.alert('Clipboard access is unavailable on this browser/device.'))}>
                Copy URL
              </button>
              <button className="secondary-button" type="button" onClick={() => void downloadQrSvg(qrModal.tableName, qrModal.tokenLabel, qrModal.link)}>
                Download SVG
              </button>
              <a href={qrModal.link} target="_blank" rel="noreferrer" className="secondary-button">
                Open link
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
