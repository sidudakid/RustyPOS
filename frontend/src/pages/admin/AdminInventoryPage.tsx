import { SectionCard } from '../../components'
import { money, useAdminOutletState } from '../../adminShared'
import type { MenuItem } from '../../api'

function inventoryTone(item: MenuItem) {
  if (item.stock_count <= 0 || !item.available) return 'out'
  if (item.restock_needed || item.stock_count <= item.low_stock_threshold) return 'low'
  return 'ok'
}

function inventoryLabel(item: MenuItem) {
  const tone = inventoryTone(item)
  if (tone === 'out') return 'Out of stock'
  if (tone === 'low') return 'Low stock'
  return 'Healthy'
}

export function AdminInventoryPage() {
  const admin = useAdminOutletState()
  const items = (admin.inventoryQuery.data ?? []).filter((item) => item.active)
  const out = items.filter((item) => inventoryTone(item) === 'out')
  const low = items.filter((item) => inventoryTone(item) === 'low')

  return (
    <div>
      <section className="inventory-summary-grid">
        <SectionCard>
          <p className="eyebrow">Inventory</p>
          <h3 className="section-title">Tracked items</h3>
          <strong className="stat-value">{items.length}</strong>
        </SectionCard>
        <SectionCard>
          <p className="eyebrow">Attention</p>
          <h3 className="section-title">Low stock</h3>
          <strong className="stat-value">{low.length}</strong>
        </SectionCard>
        <SectionCard>
          <p className="eyebrow">Critical</p>
          <h3 className="section-title">Out of stock</h3>
          <strong className="stat-value">{out.length}</strong>
        </SectionCard>
      </section>

      <SectionCard>
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Stock controls</p>
            <h3 className="section-title">Inventory roster</h3>
          </div>
          <span className="info-chip">{items.length} live items</span>
        </div>

        <div className="inventory-grid">
          {items.map((item) => {
            const tone = inventoryTone(item)
            const badgeClass = tone === 'out' ? 'inventory-badge inventory-badge-out' : tone === 'low' ? 'inventory-badge inventory-badge-low' : 'inventory-badge inventory-badge-ok'
            const cardClass = tone === 'out' ? 'inventory-card inventory-card-out' : tone === 'low' ? 'inventory-card inventory-card-low' : 'inventory-card inventory-card-ok'

            return (
              <InventoryEditorCard key={item.id} item={item} badgeClass={badgeClass} cardClass={cardClass} />
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}

function InventoryEditorCard({ item, badgeClass, cardClass }: { item: MenuItem; badgeClass: string; cardClass: string }) {
  const admin = useAdminOutletState()
  const draft = admin.draftMenuItems.find((entry) => entry.id === item.id) ?? item

  const updateDraft = (patch: Partial<MenuItem>) => {
    admin.setDraftMenuItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, ...patch } : entry)))
  }

  return (
    <div className={cardClass}>
      <div className="section-heading-row">
        <div>
          <strong>{draft.name}</strong>
          <p className="muted inventory-price-row">{money(draft.price, admin.currency_code)}</p>
        </div>
        <span className={badgeClass}>{inventoryLabel(draft)}</span>
      </div>
      <div className="inventory-staff-metrics">
        <label>
          Stock count
          <input type="number" min="0" value={draft.stock_count} onChange={(e) => updateDraft({ stock_count: Number(e.target.value) })} />
        </label>
        <label>
          Low-stock threshold
          <input
            type="number"
            min="0"
            value={draft.low_stock_threshold}
            onChange={(e) => updateDraft({ low_stock_threshold: Number(e.target.value) })}
          />
        </label>
        <label className="inline-check">
          <input type="checkbox" checked={draft.restock_needed} onChange={(e) => updateDraft({ restock_needed: e.target.checked })} />
          Needs restock
        </label>
      </div>
      <div className="admin-inline-actions">
        <label className="inline-check">
          <input type="checkbox" checked={draft.available} onChange={(e) => updateDraft({ available: e.target.checked })} />
          Available for orders
        </label>
        <button onClick={() => admin.updateInventory.mutate(draft)}>Save inventory</button>
      </div>
    </div>
  )
}
