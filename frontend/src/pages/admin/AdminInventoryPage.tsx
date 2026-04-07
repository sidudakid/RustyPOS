import { useMemo, useState } from 'react'
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

type InventoryFilter = 'all' | 'attention' | 'healthy' | 'inactive'
type InventorySort = 'attention' | 'name' | 'stock-low' | 'stock-high'

export function AdminInventoryPage() {
  const admin = useAdminOutletState()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<InventoryFilter>('all')
  const [sort, setSort] = useState<InventorySort>('attention')

  const items = admin.inventoryQuery.data ?? []
  const activeItems = items.filter((item) => item.active)
  const inactiveItems = items.filter((item) => !item.active)
  const out = activeItems.filter((item) => inventoryTone(item) === 'out')
  const low = activeItems.filter((item) => inventoryTone(item) === 'low')
  const healthy = activeItems.filter((item) => inventoryTone(item) === 'ok')

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase()

    const matchesSearch = (item: MenuItem) => {
      if (!needle) return true
      return [item.name, item.category, item.description].some((value) => value.toLowerCase().includes(needle))
    }

    const matchesFilter = (item: MenuItem) => {
      if (filter === 'inactive') return !item.active
      if (filter === 'attention') return item.active && inventoryTone(item) !== 'ok'
      if (filter === 'healthy') return item.active && inventoryTone(item) === 'ok'
      return true
    }

    const sorted = [...items]
      .filter((item) => matchesSearch(item) && matchesFilter(item))
      .sort((left, right) => {
        if (sort === 'name') return left.name.localeCompare(right.name)
        if (sort === 'stock-low') return left.stock_count - right.stock_count
        if (sort === 'stock-high') return right.stock_count - left.stock_count

        const score = (item: MenuItem) => {
          const tone = inventoryTone(item)
          const toneWeight = tone === 'out' ? 3 : tone === 'low' ? 2 : 1
          return toneWeight * 1000 - item.stock_count + (item.active ? 100 : 0)
        }

        return score(right) - score(left)
      })

    return sorted
  }, [filter, items, query, sort])

  return (
    <div className="admin-management-page admin-inventory-page">
      <section className="inventory-summary-grid admin-inventory-summary-grid admin-inventory-summary-grid-three">
        <SectionCard>
          <p className="eyebrow">Inventory</p>
          <h3 className="section-title">Tracked items</h3>
          <strong className="stat-value">{items.length}</strong>
          <p className="muted">{activeItems.length} active · {inactiveItems.length} inactive</p>
        </SectionCard>
        <SectionCard>
          <p className="eyebrow">Attention</p>
          <h3 className="section-title">Needs attention</h3>
          <strong className="stat-value">{out.length + low.length}</strong>
          <p className="muted">{out.length} critical · {low.length} low stock</p>
        </SectionCard>
        <SectionCard>
          <p className="eyebrow">Healthy</p>
          <h3 className="section-title">Stable items</h3>
          <strong className="stat-value">{healthy.length}</strong>
          <p className="muted">Active items with no stock warning</p>
        </SectionCard>
      </section>

      <SectionCard>
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Stock controls</p>
            <h3 className="section-title">Inventory workspace</h3>
          </div>
          <span className="info-chip">{filteredItems.length} shown</span>
        </div>
        <p className="muted inventory-helper-text">
          This view is for database maintenance: stock counts, thresholds, availability, and archived records. It intentionally stays separate from live staff handling.
        </p>

        <div className="admin-inventory-hero-strip">
          <div className="admin-inventory-hero-card admin-inventory-hero-card-danger">
            <span className="inventory-summary-label">Critical stock-outs</span>
            <strong>{out.length}</strong>
            <p className="muted">Items unavailable or fully out of stock.</p>
          </div>
          <div className="admin-inventory-hero-card admin-inventory-hero-card-warning">
            <span className="inventory-summary-label">Low stock</span>
            <strong>{low.length}</strong>
            <p className="muted">Items approaching threshold and needing attention soon.</p>
          </div>
          <div className="admin-inventory-hero-card">
            <span className="inventory-summary-label">Healthy active items</span>
            <strong>{healthy.length}</strong>
            <p className="muted">Sellable records with no active warning right now.</p>
          </div>
        </div>

        <div className="admin-inventory-toolbar admin-inventory-toolbar-responsive">
          <label>
            Search items
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, category, or description" />
          </label>
          <label>
            View
            <select value={filter} onChange={(event) => setFilter(event.target.value as InventoryFilter)}>
              <option value="all">All records</option>
              <option value="attention">Needs attention</option>
              <option value="healthy">Healthy active</option>
              <option value="inactive">Inactive records</option>
            </select>
          </label>
          <label>
            Sort
            <select value={sort} onChange={(event) => setSort(event.target.value as InventorySort)}>
              <option value="attention">Attention first</option>
              <option value="name">Name</option>
              <option value="stock-low">Lowest stock</option>
              <option value="stock-high">Highest stock</option>
            </select>
          </label>
        </div>

        <div className="admin-inventory-chip-row admin-inventory-chip-row-responsive">
          <button type="button" className={filter === 'all' ? 'secondary-button admin-filter-chip admin-filter-chip-active' : 'secondary-button admin-filter-chip'} onClick={() => setFilter('all')}>
            All {items.length}
          </button>
          <button type="button" className={filter === 'attention' ? 'secondary-button admin-filter-chip admin-filter-chip-active' : 'secondary-button admin-filter-chip'} onClick={() => setFilter('attention')}>
            Attention {out.length + low.length}
          </button>
          <button type="button" className={filter === 'healthy' ? 'secondary-button admin-filter-chip admin-filter-chip-active' : 'secondary-button admin-filter-chip'} onClick={() => setFilter('healthy')}>
            Healthy {healthy.length}
          </button>
          <button type="button" className={filter === 'inactive' ? 'secondary-button admin-filter-chip admin-filter-chip-active' : 'secondary-button admin-filter-chip'} onClick={() => setFilter('inactive')}>
            Inactive {inactiveItems.length}
          </button>
        </div>

        {admin.inventoryQuery.isLoading ? (
          <div className="inventory-grid admin-inventory-grid admin-inventory-skeleton-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`inventory-skeleton-${index}`} className="inventory-card admin-inventory-card admin-inventory-skeleton-card">
                <div className="admin-inventory-skeleton-line admin-inventory-skeleton-line-title" />
                <div className="admin-inventory-skeleton-line admin-inventory-skeleton-line-meta" />
                <div className="admin-inventory-skeleton-block" />
                <div className="admin-inventory-skeleton-metrics">
                  <div className="admin-inventory-skeleton-chip" />
                  <div className="admin-inventory-skeleton-chip" />
                  <div className="admin-inventory-skeleton-chip" />
                </div>
                <div className="admin-inventory-skeleton-actions">
                  <div className="admin-inventory-skeleton-button" />
                  <div className="admin-inventory-skeleton-button" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="admin-inventory-empty-state">
            <strong>No inventory records match this view.</strong>
            <p className="muted">Try a different filter or search term, or add menu items from the Menu workspace first.</p>
          </div>
        ) : (
          <div className="inventory-grid admin-inventory-grid">
            {filteredItems.map((item) => {
              const tone = inventoryTone(item)
              const badgeClass = tone === 'out' ? 'inventory-badge inventory-badge-out' : tone === 'low' ? 'inventory-badge inventory-badge-low' : 'inventory-badge inventory-badge-ok'
              const cardClass = tone === 'out' ? 'inventory-card inventory-card-out' : tone === 'low' ? 'inventory-card inventory-card-low' : 'inventory-card inventory-card-ok'

              return <InventoryEditorCard key={item.id} item={item} badgeClass={badgeClass} cardClass={cardClass} />
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function InventoryEditorCard({ item, badgeClass, cardClass }: { item: MenuItem; badgeClass: string; cardClass: string }) {
  const admin = useAdminOutletState()
  const [expanded, setExpanded] = useState(false)
  const serverItem = admin.inventoryQuery.data?.find((entry) => entry.id === item.id) ?? item
  const draft = admin.draftMenuItems.find((entry) => entry.id === item.id) ?? serverItem
  const dirty = JSON.stringify({
    name: draft.name,
    description: draft.description,
    category: draft.category,
    price: draft.price,
    active: draft.active,
    available: draft.available,
    stock_count: draft.stock_count,
    low_stock_threshold: draft.low_stock_threshold,
    restock_needed: draft.restock_needed,
  }) !== JSON.stringify({
    name: serverItem.name,
    description: serverItem.description,
    category: serverItem.category,
    price: serverItem.price,
    active: serverItem.active,
    available: serverItem.available,
    stock_count: serverItem.stock_count,
    low_stock_threshold: serverItem.low_stock_threshold,
    restock_needed: serverItem.restock_needed,
  })

  const updateDraft = (patch: Partial<MenuItem>) => {
    admin.setDraftMenuItems((current) => {
      if (current.some((entry) => entry.id === item.id)) {
        return current.map((entry) => (entry.id === item.id ? { ...entry, ...patch } : entry))
      }
      return [...current, { ...serverItem, ...patch }]
    })
  }

  const resetDraft = () => {
    admin.setDraftMenuItems((current) => current.map((entry) => (entry.id === item.id ? serverItem : entry)))
  }

  return (
    <div className={`${cardClass} admin-inventory-card ${!draft.active ? 'admin-inventory-card-inactive' : ''}`}>
      <div className="section-heading-row admin-inventory-card-top">
        <div className="admin-inventory-card-copy">
          <div className="admin-inventory-card-title-row">
            <strong>{draft.name}</strong>
            {!draft.active ? <span className="info-chip">Inactive</span> : null}
            {dirty ? <span className="info-chip">Unsaved</span> : null}
          </div>
          <div className="admin-inventory-meta-row">
            <p className="muted inventory-price-row">{money(draft.price, admin.currency_code)}</p>
            <span className="admin-inventory-meta-dot">•</span>
            <p className="muted inventory-price-row">{draft.category}</p>
          </div>
          <p className="muted admin-inventory-description">{draft.description || 'No description yet.'}</p>
        </div>
        <div className="admin-inventory-card-status">
          <span className={badgeClass}>{inventoryLabel(draft)}</span>
        </div>
      </div>

      <div className="admin-inventory-metric-strip admin-inventory-metric-strip-compact">
        <div>
          <span className="inventory-summary-label">On hand</span>
          <strong>{draft.stock_count}</strong>
        </div>
        <div>
          <span className="inventory-summary-label">Threshold</span>
          <strong>{draft.low_stock_threshold}</strong>
        </div>
        <div>
          <span className="inventory-summary-label">Availability</span>
          <strong>{draft.available ? 'Sellable' : 'Hidden'}</strong>
        </div>
      </div>

      <div className="admin-inventory-card-quick-actions">
        <button type="button" className="secondary-button admin-inventory-expand-button" onClick={() => setExpanded((current) => !current)}>
          {expanded ? 'Hide editor' : 'Edit item'}
        </button>
        <button type="button" onClick={() => admin.updateInventory.mutate(draft)} disabled={!dirty || admin.updateInventory.isPending}>
          {admin.updateInventory.isPending ? 'Saving…' : 'Quick save'}
        </button>
      </div>

      {expanded ? (
        <div className="admin-inventory-editor-stack">
          <div className="inventory-staff-metrics admin-inventory-form-grid admin-inventory-form-grid-compact">
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
            <label className="inline-check admin-inventory-check admin-inventory-check-primary">
              <input type="checkbox" checked={draft.restock_needed} onChange={(e) => updateDraft({ restock_needed: e.target.checked })} />
              Needs restock
            </label>
          </div>

          <div className="admin-inventory-toggle-row admin-inventory-toggle-row-compact">
            <label className="inline-check admin-inventory-check">
              <input type="checkbox" checked={draft.available} onChange={(e) => updateDraft({ available: e.target.checked })} />
              Available for orders
            </label>
            <label className="inline-check admin-inventory-check">
              <input type="checkbox" checked={draft.active} onChange={(e) => updateDraft({ active: e.target.checked })} />
              Record active
            </label>
          </div>

          <div className="admin-inline-actions admin-inventory-actions admin-inventory-actions-primary admin-inventory-actions-stack">
            <button type="button" onClick={() => admin.updateInventory.mutate(draft)} disabled={!dirty || admin.updateInventory.isPending}>
              {admin.updateInventory.isPending ? 'Saving inventory…' : 'Save inventory'}
            </button>
            <button type="button" className="secondary-button" onClick={() => admin.updateMenuItem.mutate(draft)} disabled={!dirty || admin.updateMenuItem.isPending}>
              {admin.updateMenuItem.isPending ? 'Saving full record…' : 'Save full record'}
            </button>
          </div>

          <div className="admin-inline-actions admin-inventory-actions admin-inventory-actions-secondary admin-inventory-actions-stack">
            <button type="button" className="secondary-button" onClick={resetDraft} disabled={!dirty}>
              Reset draft
            </button>
            <button type="button" className="secondary-button" onClick={() => admin.archiveMenuItem.mutate(draft.id)}>
              Archive item
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
