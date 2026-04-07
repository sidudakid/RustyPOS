import type React from 'react'
import { SectionCard } from '../components'
import { useCafeSettings } from '../cafeSettings'

function buildAddress(parts: string[]) {
  return parts.filter((part) => part.trim().length > 0).join(', ')
}

function formatServiceMode(serviceMode: string) {
  return serviceMode
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatTableStyle(style: string) {
  return style
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function CustomerLandingPage() {
  const settings = useCafeSettings()
  const address = buildAddress([
    settings.address_line_1,
    settings.address_line_2,
    settings.city,
    settings.state_region,
    settings.postal_code,
    settings.country_code,
  ])
  const support = [settings.support_phone, settings.support_email].filter((item) => item.trim().length > 0)
  const previewTables = settings.table_name_preview.slice(0, 6)
  const activeTables = settings.table_access.filter((table) => table.active)
  const heroTitle = settings.name?.trim() || 'Welcome to our café'
  const tagline = settings.tagline?.trim() || 'Fresh ordering from your table, without waiting around.'
  const serviceModeLabel = formatServiceMode(settings.service_mode)
  const tableStyleLabel = formatTableStyle(settings.table_name_style)
  const brandStyle = {
    '--landing-primary': settings.primary_color || '#2563EB',
    '--landing-accent': settings.accent_color || '#F59E0B',
  } as React.CSSProperties

  return (
    <div className="customer-landing-page" style={brandStyle}>
      <section className="customer-landing-hero">
        <SectionCard>
          <div className="hero-row customer-landing-hero-row">
            <div className="customer-landing-copy">
              <p className="eyebrow">Guest ordering</p>
              <h2 className="section-title customer-landing-title">{heroTitle}</h2>
              <p className="muted customer-landing-tagline">{tagline}</p>
              <p className="muted customer-landing-intro">
                The fastest way to order is right from your seat. Scan the QR code on your table, tap the NFC link if available,
                or open the exact table link shared by staff.
              </p>

              <div className="hero-chip-group customer-landing-chip-group">
                <span className="info-chip">{serviceModeLabel}</span>
                <span className="info-chip">{activeTables.length || settings.table_count} guest tables</span>
                <span className="info-chip">Pay in {settings.currency_code}</span>
              </div>

              <div className="customer-landing-primary-actions">
                <a href="#guest-start" className="customer-landing-primary-link">How to start ordering</a>
                <span className="customer-landing-inline-note">Each table link is unique so your order goes to the right seat.</span>
              </div>

              <div className="customer-landing-assurance-grid">
                <div className="customer-landing-assurance-card">
                  <strong>Scan once, order from your phone</strong>
                  <p className="muted">No account setup. Open the table link and your menu is ready.</p>
                </div>
                <div className="customer-landing-assurance-card">
                  <strong>Stay table-aware automatically</strong>
                  <p className="muted">Orders route to the correct table so food and drinks land where they should.</p>
                </div>
              </div>
            </div>

            <div className="customer-landing-media-card">
              <div className="customer-landing-image-shell">
                {settings.image_url?.trim() ? (
                  <img src={settings.image_url} alt={settings.name} className="customer-landing-image" />
                ) : (
                  <div className="customer-landing-placeholder">
                    <span aria-hidden="true">☕</span>
                    <strong>{settings.name || 'Cafe'}</strong>
                    <p className="muted">Add a restaurant photo in Admin → Settings to make this feel more like your place.</p>
                  </div>
                )}
              </div>

              <div className="customer-landing-floating-card" id="guest-start">
                <p className="eyebrow">Start here</p>
                <h3>Open your exact table</h3>
                <ol className="customer-landing-step-list">
                  <li>Find the QR code or tap point at your seat</li>
                  <li>Open the table-specific menu on your phone</li>
                  <li>Add items and track the order without flagging staff down</li>
                </ol>
                <p className="muted customer-landing-floating-note">
                  Don&apos;t have the code? Ask staff for the link for <strong>your table</strong>, not a nearby one.
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="customer-landing-grid customer-landing-grid-featured">
        <SectionCard>
          <p className="eyebrow">How it works</p>
          <h3 className="section-title">A clearer path for guests</h3>
          <div className="setup-callout-grid customer-landing-steps-grid">
            <div className="setup-callout-card customer-landing-step-card">
              <strong>1. Scan the code at your seat</strong>
              <p className="muted">Use the printed QR or tap the table device. That opens the menu assigned to your table.</p>
            </div>
            <div className="setup-callout-card customer-landing-step-card">
              <strong>2. Browse what&apos;s live right now</strong>
              <p className="muted">You only see items the restaurant currently has available, so there&apos;s less back-and-forth.</p>
            </div>
            <div className="setup-callout-card customer-landing-step-card">
              <strong>3. Place the order and relax</strong>
              <p className="muted">Your order is sent to the right station and stays tied to your table for tracking.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <p className="eyebrow">Good to know</p>
          <h3 className="section-title">Before you order</h3>
          <div className="customer-landing-checklist">
            <div className="customer-landing-checklist-row">
              <span aria-hidden="true">✅</span>
              <div>
                <strong>Use your own table&apos;s link</strong>
                <p className="muted">Every table has its own ordering entry point, so nearby tables won&apos;t work correctly for your order.</p>
              </div>
            </div>
            <div className="customer-landing-checklist-row">
              <span aria-hidden="true">📶</span>
              <div>
                <strong>Works best on your phone</strong>
                <p className="muted">Scan, choose items, and keep the page open if you want to follow order progress.</p>
              </div>
            </div>
            <div className="customer-landing-checklist-row">
              <span aria-hidden="true">🙋</span>
              <div>
                <strong>Need help?</strong>
                <p className="muted">If the code is missing or damaged, staff can point you to the correct table link right away.</p>
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="customer-landing-grid">
        <SectionCard>
          <p className="eyebrow">Restaurant details</p>
          <h3 className="section-title">Visit information</h3>
          <div className="customer-landing-info-list">
            <div className="customer-landing-info-row">
              <span>Address</span>
              <strong>{address || 'Address not configured yet'}</strong>
            </div>
            <div className="customer-landing-info-row">
              <span>Guest help</span>
              <strong>{support.length ? support.join(' · ') : 'Ask staff for help at your table'}</strong>
            </div>
            <div className="customer-landing-info-row">
              <span>Table naming</span>
              <strong>{settings.table_prefix} · {tableStyleLabel}</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <p className="eyebrow">Table examples</p>
          <h3 className="section-title">What to look for when staff mentions your table</h3>
          <div className="pill-list customer-landing-pill-list">
            {previewTables.map((tableName) => (
              <span key={tableName} className="info-chip">{tableName}</span>
            ))}
          </div>
          <div className="customer-landing-metadata-grid">
            <div className="customer-landing-metadata-card">
              <span className="customer-landing-metadata-label">Configured tables</span>
              <strong>{settings.table_count}</strong>
            </div>
            <div className="customer-landing-metadata-card">
              <span className="customer-landing-metadata-label">Live guest links</span>
              <strong>{activeTables.length}</strong>
            </div>
          </div>
          <p className="muted inventory-helper-text">
            Your exact menu only opens from a valid table link or QR code assigned to that table.
          </p>
        </SectionCard>
      </section>
    </div>
  )
}
