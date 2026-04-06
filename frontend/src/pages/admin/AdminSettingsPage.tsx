import { SectionCard } from '../../components'
import { useAdminOutletState } from '../../adminShared'
import type { CafeSettings } from '../../api'

export function AdminSettingsPage() {
  const admin = useAdminOutletState()
  const draft = admin.settingsDraft

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
      </div>
    </section>
  )
}
