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
  const supportPhone = settings.support_phone.trim()
  const supportEmail = settings.support_email.trim()
  const previewTables = settings.table_name_preview.slice(0, 8)
  const activeTables = settings.table_access.filter((table) => table.active)
  const heroTitle = settings.name?.trim() || 'Welcome to our café'
  const tagline = settings.tagline?.trim() || 'A calmer, faster way to order from your table.'
  const serviceModeLabel = formatServiceMode(settings.service_mode)
  const tableStyleLabel = formatTableStyle(settings.table_name_style)
  const guestTableCount = activeTables.length || settings.table_count
  const brandStyle = {
    '--landing-primary': settings.primary_color || '#8B5CF6',
    '--landing-accent': settings.accent_color || '#F59E0B',
  } as React.CSSProperties

  return (
    <main className="customer-landing-page customer-landing-page-premium" style={brandStyle} aria-labelledby="customer-landing-title">
      <section className="customer-landing-premium-hero" aria-labelledby="customer-landing-title">
        <SectionCard>
          <div className="customer-landing-premium-shell">
            <div className="customer-landing-premium-copy">
              <div className="customer-landing-badge-row">
                <span className="customer-landing-service-pill">{serviceModeLabel}</span>
                <span className="customer-landing-service-note">Guest ordering, refined for the table</span>
              </div>

              <div className="customer-landing-premium-heading">
                <p className="eyebrow">Welcome in</p>
                <h1 className="section-title customer-landing-premium-title" id="customer-landing-title">{heroTitle}</h1>
                <p className="customer-landing-premium-tagline">{tagline}</p>
                <p className="muted customer-landing-premium-intro">
                  Skip the awkward waiting game. Open the table link in front of you, browse what&apos;s available right now,
                  and send your order straight to the right station without losing your seat context.
                </p>
              </div>

              <div className="customer-landing-cta-row" id="guest-start">
                <a href="#guest-how" className="customer-landing-primary-link customer-landing-primary-link-premium">
                  Start with your table QR or link
                </a>
                <div className="customer-landing-cta-support">
                  <strong>No sign-up required</strong>
                  <span>Use the QR code, tap point, or exact link for your own table.</span>
                </div>
              </div>

              <div className="customer-landing-trust-grid">
                <div className="customer-landing-trust-card">
                  <span aria-hidden="true">⚡</span>
                  <div>
                    <strong>Fast to open</strong>
                    <p className="muted">Scan once and the menu is already tied to your seat.</p>
                  </div>
                </div>
                <div className="customer-landing-trust-card">
                  <span aria-hidden="true">🪑</span>
                  <div>
                    <strong>Table-aware ordering</strong>
                    <p className="muted">The right table matters so food and drinks land exactly where they should.</p>
                  </div>
                </div>
                <div className="customer-landing-trust-card">
                  <span aria-hidden="true">📱</span>
                  <div>
                    <strong>Built for phones</strong>
                    <p className="muted">Browse, add items, and follow progress from the same screen.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="customer-landing-premium-aside">
              <div className="customer-landing-brand-panel">
                <div className="customer-landing-brand-visual" aria-hidden={!settings.image_url?.trim()}>
                  {settings.image_url?.trim() ? (
                    <img src={settings.image_url} alt={settings.name} className="customer-landing-brand-image" />
                  ) : (
                    <div className="customer-landing-brand-placeholder">
                      <span aria-hidden="true">☕</span>
                      <small>Table service</small>
                    </div>
                  )}
                </div>

                <div className="customer-landing-brand-panel-copy">
                  <p className="eyebrow">Today&apos;s service</p>
                  <h3>Your table is the entry point</h3>
                  <p className="muted">
                    Use the QR code, NFC tap, or staff-shared link for <strong>your exact seat</strong> so the kitchen and floor team
                    see the right destination from the start.
                  </p>
                </div>

                <div className="customer-landing-metric-row">
                  <div className="customer-landing-metric-card">
                    <span>Guest tables</span>
                    <strong>{guestTableCount}</strong>
                  </div>
                  <div className="customer-landing-metric-card">
                    <span>Currency</span>
                    <strong>{settings.currency_code}</strong>
                  </div>
                </div>
              </div>

              <div className="customer-landing-start-card">
                <p className="eyebrow">How to begin</p>
                <h3>Three quick steps</h3>
                <ol className="customer-landing-step-list customer-landing-step-list-premium">
                  <li>
                    <strong>Find the code at your seat</strong>
                    <span>Look for the table QR card or tap point placed at your table.</span>
                  </li>
                  <li>
                    <strong>Open the exact table menu</strong>
                    <span>That link loads the menu already assigned to your table.</span>
                  </li>
                  <li>
                    <strong>Order and stay settled</strong>
                    <span>Add items, send the order, and keep your phone handy for progress updates.</span>
                  </li>
                </ol>
                <p className="customer-landing-warning" role="note">
                  <strong>Table check:</strong> if the page shows the wrong table name, stop and ask staff before placing the order.
                </p>
                <p className="muted customer-landing-floating-note">
                  Missing the code? Staff can hand you the correct table link in a few seconds.
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="customer-landing-showcase-grid" id="guest-how" aria-labelledby="customer-landing-how-title">
        <SectionCard>
          <p className="eyebrow">Designed for guests</p>
          <h2 className="section-title" id="customer-landing-how-title">A cleaner way to order without the friction</h2>
          <div className="customer-landing-experience-grid">
            <div className="customer-landing-experience-card">
              <span className="customer-landing-experience-kicker">01</span>
              <strong>Enter from the table, not a generic homepage</strong>
              <p className="muted">Each table opens its own ordering flow so there&apos;s less confusion and fewer delivery mistakes.</p>
            </div>
            <div className="customer-landing-experience-card">
              <span className="customer-landing-experience-kicker">02</span>
              <strong>See only what the restaurant can serve</strong>
              <p className="muted">Guests browse what&apos;s live now instead of ordering items that turn into apologies later.</p>
            </div>
            <div className="customer-landing-experience-card">
              <span className="customer-landing-experience-kicker">03</span>
              <strong>Keep the visit moving at its own pace</strong>
              <p className="muted">Order when ready, relax at the table, and let staff focus on hospitality instead of chasing tickets.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <p className="eyebrow">Guest guidance</p>
          <h2 className="section-title">What to know before placing an order</h2>
          <div className="customer-landing-guidance-list">
            <div className="customer-landing-guidance-row">
              <span aria-hidden="true">✅</span>
              <div>
                <strong>Always use your own table&apos;s link</strong>
                <p className="muted">Nearby table links may look similar, but your order needs your exact table assignment.</p>
              </div>
            </div>
            <div className="customer-landing-guidance-row">
              <span aria-hidden="true">🔓</span>
              <div>
                <strong>No account or download needed</strong>
                <p className="muted">Open the link on your phone and start browsing right away.</p>
              </div>
            </div>
            <div className="customer-landing-guidance-row">
              <span aria-hidden="true">🙋</span>
              <div>
                <strong>Staff can help if the code is missing</strong>
                <p className="muted">A damaged card or tag isn&apos;t a blocker. Just ask for the link for your table.</p>
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="customer-landing-details-grid" aria-labelledby="customer-landing-details-title">
        <SectionCard>
          <p className="eyebrow">Visit details</p>
          <h2 className="section-title" id="customer-landing-details-title">Everything guests may need at a glance</h2>
          <div className="customer-landing-details-list">
            <div className="customer-landing-detail-card">
              <span>Address</span>
              <strong>{address || 'Address not configured yet'}</strong>
            </div>
            <div className="customer-landing-detail-card">
              <span>Guest help</span>
              <strong>
                {support.length ? (
                  <span className="customer-landing-support-links">
                    {supportPhone ? <a href={`tel:${supportPhone}`}>{supportPhone}</a> : null}
                    {supportPhone && supportEmail ? <span aria-hidden="true">·</span> : null}
                    {supportEmail ? <a href={`mailto:${supportEmail}`}>{supportEmail}</a> : null}
                  </span>
                ) : 'Ask staff at your table for help'}
              </strong>
            </div>
            <div className="customer-landing-detail-card">
              <span>Table naming</span>
              <strong>{settings.table_prefix} · {tableStyleLabel}</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <p className="eyebrow">Table examples</p>
          <h2 className="section-title">The format staff will usually reference</h2>
          <div className="pill-list customer-landing-pill-list customer-landing-pill-list-premium" aria-label="Example table names">
            {previewTables.length ? previewTables.map((tableName) => (
              <span key={tableName} className="info-chip">{tableName}</span>
            )) : <span className="customer-landing-empty-state">Table names will appear here once they are configured.</span>}
          </div>
          <div className="customer-landing-summary-band">
            <div className="customer-landing-summary-card">
              <span>Configured tables</span>
              <strong>{settings.table_count}</strong>
            </div>
            <div className="customer-landing-summary-card">
              <span>Live guest links</span>
              <strong>{activeTables.length}</strong>
            </div>
          </div>
          <p className="muted inventory-helper-text customer-landing-summary-note">
            Your menu only opens from a valid table link or QR code assigned to that table.
          </p>
        </SectionCard>
      </section>
    </main>
  )
}
