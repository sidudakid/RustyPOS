import { useEffect, useMemo, useState } from 'react'
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

function inventoryGapLabel(item: MenuItem) {
  if (item.stock_count <= 0 || !item.available) return 'Guest orders blocked'
  const gap = item.stock_count - item.low_stock_threshold
  if (gap <= 0) return 'At threshold'
  return `${gap} above threshold`
}

type InventoryFilter = 'all' | 'attention' | 'healthy' | 'inactive'
type InventorySort = 'attention' | 'name' | 'stock-low' | 'stock-high'
type InventoryModalState = { itemId: string } | null

function syncDraftItem(item: MenuItem, admin: ReturnType<typeof useAdminOutletState>, patch: Partial<MenuItem>) {
  admin.setDraftMenuItems((current) => {
    if (current.some((entry) => entry.id === item.id)) {
      return current.map((entry) => (entry.id === item.id ? { ...entry, ...patch } : entry))
    }

    return [...current, { ...item, ...patch }]
  })
}

export function AdminInventoryPage() {
  const admin = useAdminOutletState()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<InventoryFilter>('all')
  const [sort, setSort] = useState<InventorySort>('attention')
  const [modal, setModal] = useState<InventoryModalState>(null)

  const items = admin.inventoryQuery.data ?? []
  const activeItems = items.filter((item) => item.active)
  const inactiveItems = items.filter((item) => !item.active)
  const out = activeItems.filter((item) => inventoryTone(item) === 'out')
  const low = activeItems.filter((item) => inventoryTone(item) === 'low')
  const healthy = activeItems.filter((item) => inventoryTone(item) === 'ok')
  const hidden = activeItems.filter((item) => !item.available)

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
    <div className="admin-management-page admin-inventory-page ops-surface">
      <SectionCard>
        <div className="ops-hero-card admin-inventory-hero-card-shell">
          <div className="section-heading-row ops-hero-row">
            <div>
              <p className="eyebrow">Stock controls</p>
              <h3 className="section-title">Inventory command center</h3>
              <p className="muted ops-hero-copy">
                Keep counts clean, spot risk before guests see it, and push quick adjustments without leaving the admin workspace.
              </p>
            </div>
            <div className="ops-hero-chips admin-inventory-hero-chips">
              <span className="info-chip">{filteredItems.length} shown</span>
              <span className="info-chip">{hidden.length} hidden from guests</span>
              <span className={out.length ? 'info-chip info-chip-danger' : 'info-chip info-chip-success'}>{out.length} critical</span>
            </div>
          </div>

          <div className="ops-stat-strip ops-stat-strip-compact">
            <div className="ops-stat-card">
              <span>Tracked items</span>
              <strong>{items.length}</strong>
              <small>{activeItems.length} active · {inactiveItems.length} inactive</small>
            </div>
            <div className="ops-stat-card ops-stat-card-danger">
              <span>Critical now</span>
              <strong>{out.length}</strong>
              <small>Out of stock or guest-hidden</small>
            </div>
            <div className="ops-stat-card ops-stat-card-warning">
              <span>Low stock</span>
              <strong>{low.length}</strong>
              <small>Near threshold and needs eyes</small>
            </div>
            <div className="ops-stat-card ops-stat-card-success">
              <span>Healthy items</span>
              <strong>{healthy.length}</strong>
              <small>Safe buffer above threshold</small>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="section-heading-row admin-inventory-workspace-heading">
          <div>
            <p className="eyebrow">Workspace</p>
            <h3 className="section-title">Review, filter, and adjust stock</h3>
            <p className="muted inventory-helper-text admin-inventory-workspace-copy">
              Search the catalog, focus the queue, then use quick controls for common stock updates before opening full item editing.
            </p>
          </div>
          <div className="admin-inventory-results-meta">
            <span className="info-chip">{filter === 'attention' ? 'Attention view' : filter === 'healthy' ? 'Healthy view' : filter === 'inactive' ? 'Inactive view' : 'All records'}</span>
            <span className="info-chip">Sort: {sort === 'attention' ? 'Urgency' : sort === 'name' ? 'Name' : sort === 'stock-low' ? 'Lowest stock' : 'Highest stock'}</span>
          </div>
        </div>

        <div className="admin-inventory-priority-bar" aria-label="Inventory priority summary">
          <button type="button" className="admin-inventory-priority-pill admin-inventory-priority-pill-danger" onClick={() => setFilter('attention')}>
            <span>Critical</span>
            <strong>{out.length}</strong>
            <small>Open the risk queue</small>
          </button>
          <button type="button" className="admin-inventory-priority-pill admin-inventory-priority-pill-warning" onClick={() => setFilter('attention')}>
            <span>Low stock</span>
            <strong>{low.length}</strong>
            <small>Near threshold</small>
          </button>
          <button type="button" className="admin-inventory-priority-pill" onClick={() => setFilter('healthy')}>
            <span>Healthy</span>
            <strong>{healthy.length}</strong>
            <small>No warning</small>
          </button>
        </div>

        <div className="admin-sticky-toolbar-shell">
          <div className="admin-inventory-toolbar admin-inventory-toolbar-responsive ops-toolbar ops-toolbar-sticky">
            <div className="ops-toolbar-main">
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
            </div>

            <div className="ops-toolbar-main admin-inventory-toolbar-row-secondary">
              <label>
                Sort
                <select value={sort} onChange={(event) => setSort(event.target.value as InventorySort)}>
                  <option value="attention">Attention first</option>
                  <option value="name">Name</option>
                  <option value="stock-low">Lowest stock</option>
                  <option value="stock-high">Highest stock</option>
                </select>
              </label>
              <div className="admin-inventory-toolbar-tip">
                <span className="inventory-summary-label">Fastest workflow</span>
                <strong>Use +1 / +5 / Sold out, then Save now</strong>
              </div>
            </div>
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
        </div>

        <div className="admin-inventory-results-header">
          <div>
            <p className="eyebrow">Results</p>
            <h4 className="section-title admin-inventory-results-title">{filter === 'attention' ? 'Priority queue' : filter === 'healthy' ? 'Healthy stock list' : filter === 'inactive' ? 'Inactive records' : 'All inventory records'}</h4>
          </div>
          <p className="muted admin-inventory-results-copy">
            {query.trim()
              ? `Filtered by “${query.trim()}” and sorted ${sort === 'attention' ? 'by urgency' : sort === 'name' ? 'alphabetically' : sort === 'stock-low' ? 'from lowest stock upward' : 'from highest stock downward'}.`
              : `Sorted ${sort === 'attention' ? 'by urgency so the riskiest items stay near the top' : sort === 'name' ? 'alphabetically for quick scanning' : sort === 'stock-low' ? 'from lowest stock upward' : 'from highest stock downward'}.`}
          </p>
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

              return (
                <InventoryEditorCard
                  key={item.id}
                  item={item}
                  badgeClass={badgeClass}
                  cardClass={cardClass}
                  onOpen={() => setModal({ itemId: item.id })}
                />
              )
            })}
          </div>
        )}
      </SectionCard>

      {modal ? <InventoryEditorModal itemId={modal.itemId} onClose={() => setModal(null)} /> : null}
    </div>
  )
}

function InventoryEditorCard({ item, badgeClass, cardClass, onOpen }: { item: MenuItem; badgeClass: string; cardClass: string; onOpen: () => void }) {
  const admin = useAdminOutletState()
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

  const applyStockDelta = (delta: number) => {
    syncDraftItem(serverItem, admin, {
      stock_count: Math.max(0, draft.stock_count + delta),
      available: draft.stock_count + delta > 0 ? draft.available : false,
    })
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
        <div className="admin-inventory-card-status admin-inventory-card-status-stack">
          <span className={badgeClass}>{inventoryLabel(draft)}</span>
          <span className="info-chip">{draft.available ? 'Visible to guests' : 'Hidden from guests'}</span>
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
          <span className="inventory-summary-label">Coverage</span>
          <strong>{inventoryGapLabel(draft)}</strong>
        </div>
      </div>

      <div className="admin-inventory-inline-adjustments">
        <span className="inventory-summary-label">Quick stock</span>
        <div className="admin-inventory-adjustment-row">
          <button type="button" className="secondary-button" onClick={() => applyStockDelta(-1)} disabled={draft.stock_count <= 0}>-1</button>
          <button type="button" className="secondary-button" onClick={() => applyStockDelta(1)}>+1</button>
          <button type="button" className="secondary-button" onClick={() => applyStockDelta(5)}>+5</button>
          <button type="button" className="secondary-button" onClick={() => syncDraftItem(serverItem, admin, { stock_count: 0, available: false })}>Sold out</button>
          <button type="button" className="secondary-button" onClick={() => syncDraftItem(serverItem, admin, { available: !draft.available })}>
            {draft.available ? 'Hide item' : 'Show item'}
          </button>
        </div>
      </div>

      <div className="admin-inventory-card-quick-actions">
        <button type="button" className="secondary-button admin-inventory-expand-button" onClick={onOpen}>
          Open editor
        </button>
        <button type="button" onClick={() => admin.updateInventory.mutate(draft)} disabled={!dirty || admin.updateInventory.isPending}>
          {admin.updateInventory.isPending ? 'Saving…' : dirty ? 'Save now' : 'Saved'}
        </button>
      </div>
    </div>
  )
}

function InventoryEditorModal({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const admin = useAdminOutletState()
  const [confirmArchive, setConfirmArchive] = useState(false)
  const item = admin.inventoryQuery.data?.find((entry) => entry.id === itemId) ?? admin.draftMenuItems.find((entry) => entry.id === itemId)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  if (!item) return null

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
    syncDraftItem(serverItem, admin, patch)
  }

  const resetDraft = () => {
    admin.setDraftMenuItems((current) => current.map((entry) => (entry.id === item.id ? serverItem : entry)))
  }

  const tone = inventoryTone(draft)
  const badgeClass = tone === 'out' ? 'inventory-badge inventory-badge-out' : tone === 'low' ? 'inventory-badge inventory-badge-low' : 'inventory-badge inventory-badge-ok'

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="admin-modal admin-modal-inventory admin-modal-ops" role="dialog" aria-modal="true" aria-label={`Edit ${draft.name}`} onClick={(event) => event.stopPropagation()}>
        <div className="section-heading-row admin-modal-header">
          <div>
            <p className="eyebrow">Inventory editor</p>
            <h3 className="section-title">{draft.name}</h3>
            <div className="admin-inventory-meta-row">
              <span className={badgeClass}>{inventoryLabel(draft)}</span>
              <span className="info-chip">{draft.available ? 'Visible to guests' : 'Hidden from guests'}</span>
              {!draft.active ? <span className="info-chip">Inactive</span> : null}
              {dirty ? <span className="info-chip">Unsaved</span> : <span className="info-chip">Saved</span>}
            </div>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="admin-modal-body admin-modal-body-stack">
          <div className="admin-inventory-modal-hero-strip">
            <div className="admin-inventory-modal-hero-card">
              <span className="inventory-summary-label">On hand</span>
              <strong>{draft.stock_count}</strong>
              <small>{inventoryGapLabel(draft)}</small>
            </div>
            <div className="admin-inventory-modal-hero-card">
              <span className="inventory-summary-label">Threshold</span>
              <strong>{draft.low_stock_threshold}</strong>
              <small>Alert line for operators</small>
            </div>
            <div className="admin-inventory-modal-hero-card">
              <span className="inventory-summary-label">Price</span>
              <strong>{money(draft.price, admin.currency_code)}</strong>
              <small>{draft.category}</small>
            </div>
          </div>

          <div className="admin-inventory-inline-adjustments admin-inventory-inline-adjustments-modal">
            <span className="inventory-summary-label">Quick stock actions</span>
            <div className="admin-inventory-adjustment-row">
              <button type="button" className="secondary-button" onClick={() => updateDraft({ stock_count: Math.max(0, draft.stock_count - 1), available: draft.stock_count - 1 > 0 ? draft.available : false })} disabled={draft.stock_count <= 0}>-1</button>
              <button type="button" className="secondary-button" onClick={() => updateDraft({ stock_count: Math.max(0, draft.stock_count - 5), available: draft.stock_count - 5 > 0 ? draft.available : false })} disabled={draft.stock_count <= 0}>-5</button>
              <button type="button" className="secondary-button" onClick={() => updateDraft({ stock_count: draft.stock_count + 1 })}>+1</button>
              <button type="button" className="secondary-button" onClick={() => updateDraft({ stock_count: draft.stock_count + 5 })}>+5</button>
              <button type="button" className="secondary-button" onClick={() => updateDraft({ stock_count: 0, available: false, restock_needed: true })}>Mark sold out</button>
            </div>
          </div>

          <div className="admin-modal-section-grid">
            <label>
              Item name
              <input value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })} />
            </label>
            <label>
              Category
              <input value={draft.category} onChange={(e) => updateDraft({ category: e.target.value })} />
            </label>
          </div>

          <label>
            Description
            <textarea value={draft.description} onChange={(e) => updateDraft({ description: e.target.value })} rows={4} />
          </label>

          <div className="admin-modal-section-grid admin-modal-section-grid-three">
            <label>
              Stock count
              <input type="number" min="0" value={draft.stock_count} onChange={(e) => updateDraft({ stock_count: Number(e.target.value) })} />
            </label>
            <label>
              Low-stock threshold
              <input type="number" min="0" value={draft.low_stock_threshold} onChange={(e) => updateDraft({ low_stock_threshold: Number(e.target.value) })} />
            </label>
            <label>
              Price
              <input type="number" min="0" step="0.01" value={(draft.price / 100).toString()} onChange={(e) => updateDraft({ price: Math.max(0, Math.round(Number(e.target.value || 0) * 100)) })} />
            </label>
          </div>

          <div className="admin-inventory-toggle-row admin-modal-toggle-grid">
            <label className="inline-check admin-inventory-check">
              <input type="checkbox" checked={draft.restock_needed} onChange={(e) => updateDraft({ restock_needed: e.target.checked })} />
              Needs restock
            </label>
            <label className="inline-check admin-inventory-check">
              <input type="checkbox" checked={draft.available} onChange={(e) => updateDraft({ available: e.target.checked })} />
              Available for orders
            </label>
            <label className="inline-check admin-inventory-check">
              <input type="checkbox" checked={draft.active} onChange={(e) => updateDraft({ active: e.target.checked })} />
              Record active
            </label>
          </div>
        </div>

        <div className="admin-modal-footer">
          <div className="admin-inline-actions admin-inventory-actions admin-inventory-actions-secondary admin-inventory-actions-stack">
            <button type="button" className="secondary-button" onClick={resetDraft} disabled={!dirty}>Reset draft</button>
            {confirmArchive ? (
              <button type="button" className="secondary-button" onClick={() => admin.archiveMenuItem.mutate(draft.id)}>
                Confirm archive
              </button>
            ) : (
              <button type="button" className="secondary-button" onClick={() => setConfirmArchive(true)}>
                Delete / archive
              </button>
            )}
          </div>
          <div className="admin-inline-actions admin-inventory-actions admin-inventory-actions-primary admin-inventory-actions-stack">
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button type="button" onClick={() => admin.updateMenuItem.mutate(draft)} disabled={!dirty || admin.updateMenuItem.isPending}>
              {admin.updateMenuItem.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
