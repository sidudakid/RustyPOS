import { useEffect, useMemo, useState } from 'react'
import { SectionCard } from '../../components'
import { useAdminOutletState } from '../../adminShared'
import { PUBLIC_ORIGIN, type CafeSettings, type TableOperationalSummary } from '../../api'
import { shortId } from '../../lib'

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

function sanitizeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

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

export function AdminSettingsPage() {
  const admin = useAdminOutletState()
  const draft = admin.settingsDraft
  const tableAccess = admin.settingsQuery.data?.table_access ?? []
  const activeTableAccess = tableAccess.filter((table) => table.active)
  const tableOperations = (admin.tableOperationsQuery.data ?? []) as TableOperationalSummary[]
  const actualTableCount = activeTableAccess.length
  const configuredTableCount = draft.table_count
  const tableCountMismatch = actualTableCount !== configuredTableCount
  const [qrModal, setQrModal] = useState<QrModalState>(null)

  const updateDraft = <K extends keyof CafeSettings>(key: K, value: CafeSettings[K]) => {
    admin.setSettingsDraft((current) => ({ ...current, [key]: value }))
  }

  useEffect(() => {
    if (!qrModal) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setQrModal(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [qrModal])

  const modalTitle = useMemo(() => {
    if (!qrModal) return ''
    return `${qrModal.tableName} QR code`
  }, [qrModal])

  return (
    <>
      <section className="two-column page-layout-admin admin-settings-page">
        <div>
          <SectionCard>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Brand and tenant</p>
                <h3 className="section-title">Cafe settings</h3>
              </div>
              <span className="info-chip">Slug: {draft.slug}</span>
            </div>

            <div className="form-stack admin-settings-form-stack">
              <input value={draft.name} onChange={(e) => updateDraft('name', e.target.value)} placeholder="Cafe name" />
              <input value={draft.legal_name} onChange={(e) => updateDraft('legal_name', e.target.value)} placeholder="Legal name" />
              <input value={draft.slug} onChange={(e) => updateDraft('slug', e.target.value)} placeholder="Slug" />
              <input value={draft.tagline} onChange={(e) => updateDraft('tagline', e.target.value)} placeholder="Tagline" />
              <input value={draft.image_url} onChange={(e) => updateDraft('image_url', e.target.value)} placeholder="Image URL" />
              <div className="two-column admin-settings-inline-grid">
                <input value={draft.currency_code} onChange={(e) => updateDraft('currency_code', e.target.value)} placeholder="Currency" />
                <input value={draft.timezone} onChange={(e) => updateDraft('timezone', e.target.value)} placeholder="Timezone" />
              </div>
              <div className="two-column admin-settings-inline-grid">
                <input value={draft.primary_color} onChange={(e) => updateDraft('primary_color', e.target.value)} placeholder="Primary color" />
                <input value={draft.accent_color} onChange={(e) => updateDraft('accent_color', e.target.value)} placeholder="Accent color" />
              </div>
              <input value={draft.support_email} onChange={(e) => updateDraft('support_email', e.target.value)} placeholder="Support email" />
              <input value={draft.support_phone} onChange={(e) => updateDraft('support_phone', e.target.value)} placeholder="Support phone" />
            </div>
          </SectionCard>
        </div>

        <div>
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

            <p className="muted inventory-helper-text">
              {tableCountMismatch
                ? `Settings are configured for ${configuredTableCount} tables, but the backend currently has ${actualTableCount} active table records. Save settings to provision or reconcile the managed table set.`
                : 'Configured table count matches the currently provisioned backend tables.'}
            </p>
          </SectionCard>

          <SectionCard>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Service flow</p>
                <h3 className="section-title">Tables and address</h3>
              </div>
              <span className="info-chip">{admin.tablePreview.length} preview names</span>
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
                  onChange={(e) => updateDraft('table_count', Number(e.target.value))}
                  placeholder="Table count"
                />
                <input value={draft.table_prefix} onChange={(e) => updateDraft('table_prefix', e.target.value)} placeholder="Table prefix" />
              </div>
              <select value={draft.table_name_style} onChange={(e) => updateDraft('table_name_style', e.target.value as CafeSettings['table_name_style'])}>
                <option value="numeric">Numeric</option>
                <option value="padded">Padded</option>
                <option value="hyphenated">Hyphenated</option>
              </select>
              <button onClick={() => admin.updateCafeSettings.mutate()} disabled={admin.updateCafeSettings.isPending}>
                {admin.updateCafeSettings.isPending ? 'Saving settings…' : 'Save settings'}
              </button>
            </div>
          </SectionCard>

          <SectionCard>
            <p className="eyebrow">Preview</p>
            <h3 className="section-title">Generated table names</h3>
            <div className="pill-list admin-settings-preview-pills">
              {admin.tablePreview.map((tableName) => (
                <span className="info-chip" key={tableName}>
                  {tableName}
                </span>
              ))}
            </div>
            <p className="muted inventory-helper-text">Address summary: {admin.setupAddress || 'No address configured yet.'}</p>
          </SectionCard>

          <SectionCard>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Live access</p>
                <h3 className="section-title">Table links and tokens</h3>
              </div>
              <span className="info-chip">{activeTableAccess.length} live tables</span>
            </div>

            {admin.settingsQuery.isLoading ? <p className="muted">Loading table access data…</p> : null}
            {admin.settingsQuery.isError ? <p className="connection-bad">Failed to load live table access data.</p> : null}

            <div className="admin-edit-list admin-settings-token-list">
              {activeTableAccess.map((table) => {
                const link = tableLink(table.token)
                const ops = tableOperations.find((entry) => entry.table_id === table.id)
                return (
                  <div className="admin-edit-card admin-settings-token-card" key={table.id}>
                    <div className="section-heading-row">
                      <div>
                        <strong>{table.name}</strong>
                        <div className="muted">Table #{table.table_number} · {shortId(table.id)}</div>
                      </div>
                      <span className={ops?.open_order_count ? 'info-chip info-chip-danger' : 'info-chip info-chip-success'}>
                        {ops?.open_order_count ? `${ops.open_order_count} open` : 'Live token'}
                      </span>
                    </div>

                    {ops ? (
                      <div className="pill-list">
                        <span className="info-chip">Unpaid {(ops.unpaid_total_amount / 100).toFixed(2)}</span>
                        {ops.ready_order_count > 0 ? <span className="info-chip info-chip-success">{ops.ready_order_count} ready</span> : null}
                        {ops.paid_order_count > 0 ? <span className="info-chip">{ops.paid_order_count} paid</span> : null}
                      </div>
                    ) : null}

                    <div className="table-token-list">
                      <div className="table-token-card table-token-card-rich">
                        <div>
                          <strong>{table.token_label}</strong>
                          <div className="muted token-mono">{table.token}</div>
                        </div>

                        <TableQrPreview
                          tableName={table.name}
                          tokenLabel={table.token_label}
                          link={link}
                          onPreview={(dataUrl) => setQrModal({
                            tableName: table.name,
                            tokenLabel: table.token_label,
                            token: table.token,
                            link,
                            dataUrl,
                          })}
                        />

                        <div className="table-token-actions">
                          <a href={link} target="_blank" rel="noreferrer" className="secondary-button">
                            Open link
                          </a>
                          <button
                            className="secondary-button"
                            onClick={() => void navigator.clipboard?.writeText(link)}
                            type="button"
                          >
                            Copy URL
                          </button>
                        </div>
                        <div className="muted token-link">{link}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Operations roster</p>
                <h3 className="section-title">Active and inactive tables</h3>
              </div>
              <span className="info-chip">{tableOperations.length} total tables</span>
            </div>
            {admin.tableOperationsQuery.isLoading ? <p className="muted">Loading operational table state…</p> : null}
            {admin.tableOperationsQuery.isError ? <p className="connection-bad">Failed to load operational table state.</p> : null}
            <div className="admin-edit-list admin-settings-operations-list">
              {tableOperations.map((table) => (
                <div className="admin-edit-card" key={`ops-${table.table_id}`}>
                  <div className="section-heading-row">
                    <div>
                      <strong>{table.table_name}</strong>
                      <div className="muted">
                        {table.active ? 'Active on floor' : 'Inactive / hidden'}
                        {table.table_number ? ` · Table #${table.table_number}` : ''}
                      </div>
                    </div>
                    <span className={table.active ? 'info-chip info-chip-success' : 'info-chip'}>
                      {table.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="pill-list">
                    <span className="info-chip">{table.open_order_count} open</span>
                    <span className="info-chip">{table.paid_order_count} paid</span>
                    {table.ready_order_count > 0 ? <span className="info-chip info-chip-success">{table.ready_order_count} ready</span> : null}
                    {table.unpaid_statuses.map((status) => <span className="info-chip" key={`${table.table_id}-${status}`}>{status}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>

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
              <button className="secondary-button" type="button" onClick={() => void navigator.clipboard?.writeText(qrModal.link)}>
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
