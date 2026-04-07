import { Link } from 'react-router-dom'
import { SectionCard } from '../components'
import { useCafeSettings } from '../cafeSettings'

function buildAddress(parts: string[]) {
  return parts.filter((part) => part.trim().length > 0).join(', ')
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
  const serviceModeLabel = settings.service_mode.replace(/_/g, ' ')
  const previewTables = settings.table_name_preview.slice(0, 6)

  return (
    <div className="customer-landing-page">
      <section className="customer-landing-hero">
        <SectionCard>
          <div className="hero-row customer-landing-hero-row">
            <div className="customer-landing-copy">
              <p className="eyebrow">Welcome</p>
              <h2 className="section-title">{settings.name || 'Welcome to our café'}</h2>
              <p className="muted customer-landing-tagline">
                {settings.tagline?.trim() || 'Fast café ordering for customers, kitchen, and staff.'}
              </p>
              <p className="muted customer-landing-intro">
                Scan your table QR code or open your direct table link to browse the menu, place an order, and track it from your seat.
              </p>
              <div className="hero-chip-group">
                <span className="info-chip">{settings.table_count} managed tables</span>
                <span className="info-chip">{serviceModeLabel}</span>
                <span className="info-chip">{settings.currency_code}</span>
              </div>
            </div>

            <div className="customer-landing-media-card">
              {settings.image_url?.trim() ? (
                <img src={settings.image_url} alt={settings.name} className="customer-landing-image" />
              ) : (
                <div className="customer-landing-placeholder">
                  <span aria-hidden="true">☕</span>
                  <strong>{settings.name || 'Cafe'}</strong>
                  <p className="muted">Your restaurant image can be set from Admin → Settings.</p>
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="customer-landing-grid">
        <SectionCard>
          <p className="eyebrow">How ordering works</p>
          <h3 className="section-title">Start from your table link</h3>
          <div className="setup-callout-grid">
            <div className="setup-callout-card">
              <strong>1. Scan or tap</strong>
              <p className="muted">Use the QR code or NFC/table link provided at your seat.</p>
            </div>
            <div className="setup-callout-card">
              <strong>2. Browse the menu</strong>
              <p className="muted">See live menu items tied to the correct table.</p>
            </div>
            <div className="setup-callout-card">
              <strong>3. Order and track</strong>
              <p className="muted">Place your order and follow progress right from your phone.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <p className="eyebrow">Need help?</p>
          <h3 className="section-title">Guest information</h3>
          <div className="customer-landing-info-list">
            <div className="customer-landing-info-row">
              <span>Address</span>
              <strong>{address || 'Address not configured yet'}</strong>
            </div>
            <div className="customer-landing-info-row">
              <span>Support</span>
              <strong>{support.length ? support.join(' · ') : 'Ask staff for help'}</strong>
            </div>
            <div className="customer-landing-info-row">
              <span>Table naming</span>
              <strong>{settings.table_prefix} · {settings.table_name_style}</strong>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="customer-landing-grid customer-landing-bottom-grid">
        <SectionCard>
          <p className="eyebrow">Preview</p>
          <h3 className="section-title">Example table names</h3>
          <div className="pill-list">
            {previewTables.map((tableName) => (
              <span key={tableName} className="info-chip">{tableName}</span>
            ))}
          </div>
          <p className="muted inventory-helper-text">
            Your exact ordering menu opens only from a valid table link or QR code.
          </p>
        </SectionCard>

        <SectionCard>
          <p className="eyebrow">Operations</p>
          <h3 className="section-title">Internal workspaces</h3>
          <div className="admin-inline-actions">
            <Link to="/staff" className="secondary-button">Open staff station</Link>
            <Link to="/admin/settings" className="secondary-button">Open admin settings</Link>
          </div>
          <p className="muted inventory-helper-text">
            These links are for staff and admins. Guests should start from their own table QR code.
          </p>
        </SectionCard>
      </section>
    </div>
  )
}
