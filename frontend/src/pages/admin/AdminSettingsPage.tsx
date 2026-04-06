import { SectionCard } from '../../components'
import { useAdminOutletState } from '../../adminShared'
import type { CafeSettings } from '../../api'
import { shortId } from '../../lib'

function tableLink(token: string) {
  if (typeof window === 'undefined') return `/t/${token}`
  return `${window.location.origin}/t/${token}`
}

export function AdminSettingsPage() {
  const admin = useAdminOutletState()
  const draft = admin.settingsDraft
  const tableAccess = admin.settingsQuery.data?.table_access ?? []
  const activeTableAccess = tableAccess.filter((table) => table.active)
  const actualTableCount = activeTableAccess.length
  const configuredTableCount = draft.table_count
  const tableCountMismatch = actualTableCount !== configuredTableCount

  const updateDraft = <K extends keyof CafeSettings>(key: K, value: CafeSettings[K]) => {
    admin.setSettingsDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <section className="two-column page-layout-admin">
      <div>
        <SectionCard>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Brand and tenant</p>
              <h3 className="section-title">Cafe settings</h3>
            </div>
            <span className="info-chip">Slug: {draft.slug}</span>
          </div>

          <div className="form-stack">
            <input value={draft.name} onChange={(e) => updateDraft('name', e.target.value)} placeholder="Cafe name" />
            <input value={draft.legal_name} onChange={(e) => updateDraft('legal_name', e.target.value)} placeholder="Legal name" />
            <input value={draft.slug} onChange={(e) => updateDraft('slug', e.target.value)} placeholder="Slug" />
            <input value={draft.tagline} onChange={(e) => updateDraft('tagline', e.target.value)} placeholder="Tagline" />
            <input value={draft.image_url} onChange={(e) => updateDraft('image_url', e.target.value)} placeholder="Image URL" />
            <div className="two-column">
              <input value={draft.currency_code} onChange={(e) => updateDraft('currency_code', e.target.value)} placeholder="Currency" />
              <input value={draft.timezone} onChange={(e) => updateDraft('timezone', e.target.value)} placeholder="Timezone" />
            </div>
            <div className="two-column">
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

          <div className="form-stack">
            <input value={draft.address_line_1} onChange={(e) => updateDraft('address_line_1', e.target.value)} placeholder="Address line 1" />
            <input value={draft.address_line_2} onChange={(e) => updateDraft('address_line_2', e.target.value)} placeholder="Address line 2" />
            <div className="two-column">
              <input value={draft.city} onChange={(e) => updateDraft('city', e.target.value)} placeholder="City" />
              <input value={draft.state_region} onChange={(e) => updateDraft('state_region', e.target.value)} placeholder="State / region" />
            </div>
            <div className="two-column">
              <input value={draft.postal_code} onChange={(e) => updateDraft('postal_code', e.target.value)} placeholder="Postal code" />
              <input value={draft.country_code} onChange={(e) => updateDraft('country_code', e.target.value)} placeholder="Country code" />
            </div>
            <select value={draft.service_mode} onChange={(e) => updateDraft('service_mode', e.target.value as CafeSettings['service_mode'])}>
              <option value="table_service">Table service</option>
              <option value="counter_service">Counter service</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <div className="two-column">
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
          <div className="pill-list">
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

          <div className="admin-edit-list">
            {activeTableAccess.map((table) => {
              const link = tableLink(table.token)
              return (
                <div className="admin-edit-card" key={table.id}>
                  <div className="section-heading-row">
                    <div>
                      <strong>{table.name}</strong>
                      <div className="muted">Table #{table.table_number} · {shortId(table.id)}</div>
                    </div>
                    <span className="info-chip info-chip-success">Live token</span>
                  </div>

                  <div className="table-token-list">
                    <div className="table-token-card">
                      <div>
                        <strong>{table.token_label}</strong>
                        <div className="muted token-mono">{table.token}</div>
                      </div>
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
      </div>
    </section>
  )
}
