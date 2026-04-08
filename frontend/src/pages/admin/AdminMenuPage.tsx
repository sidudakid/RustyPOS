import { useMemo, useState, type ChangeEvent } from 'react'
import { AdminEntityList, AdminListToolbar, SectionCard } from '../../components'
import { centsToMajorUnits, majorUnitsToCents, useAdminOutletState } from '../../adminShared'
import type { MenuCategory, MenuItem } from '../../api'

type MenuModalState = { itemId: string } | null

type MenuFilter = 'all' | 'active' | 'inactive' | 'unavailable'

export function AdminMenuPage() {
  const admin = useAdminOutletState()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<MenuFilter>('all')
  const [modal, setModal] = useState<MenuModalState>(null)

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return admin.draftMenuItems.filter((item) => {
      const matchesText = !needle || [item.name, item.category, item.description].some((value) => value.toLowerCase().includes(needle))
      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && item.active) ||
        (filter === 'inactive' && !item.active) ||
        (filter === 'unavailable' && !item.available)

      return matchesText && matchesFilter
    })
  }, [admin.draftMenuItems, filter, query])

  return (
    <section className="two-column page-layout-admin admin-menu-page">
      <div>
        <SectionCard>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Menu structure</p>
              <h3 className="section-title">Categories</h3>
            </div>
            <span className="info-chip">{admin.draftCategories.length} categories</span>
          </div>
          <p className="muted inventory-helper-text">
            Categories stay compact here so phone/tablet admins can manage structure without a wall of forms.
          </p>

          <div className="form-stack">
            <input placeholder="New category name" value={admin.categoryName} onChange={(e) => admin.setCategoryName(e.target.value)} />
            <label className="inline-check">
              <input type="checkbox" checked={admin.categoryHotPick} onChange={(e) => admin.setCategoryHotPick(e.target.checked)} />
              Feature as hot pick
            </label>
            <button disabled={!admin.categoryName.trim() || admin.createCategory.isPending} onClick={() => admin.createCategory.mutate()}>
              {admin.createCategory.isPending ? 'Creating…' : 'Create category'}
            </button>
          </div>

          <CategoryEditorList />
        </SectionCard>
      </div>

      <div className="admin-settings-main-stack">
        <SectionCard>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Menu catalog</p>
              <h3 className="section-title">Register item</h3>
            </div>
            <span className="info-chip">{admin.draftMenuItems.filter((item) => item.active).length} active items</span>
          </div>
          <div className="form-stack">
            <input placeholder="Item name" value={admin.itemName} onChange={(e) => admin.setItemName(e.target.value)} />
            <input placeholder="Description" value={admin.itemDescription} onChange={(e) => admin.setItemDescription(e.target.value)} />
            <input placeholder="Image URL" value={admin.itemImageUrl} onChange={(e) => admin.setItemImageUrl(e.target.value)} />
            <input placeholder="Price" inputMode="decimal" value={admin.itemPrice} onChange={(e) => admin.setItemPrice(e.target.value)} />
            <select value={admin.itemCategory} onChange={(e) => admin.setItemCategory(e.target.value)}>
              {admin.draftCategories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              disabled={!admin.itemName.trim() || !admin.itemPrice.trim() || admin.createMenuItem.isPending}
              onClick={() => admin.createMenuItem.mutate()}
            >
              {admin.createMenuItem.isPending ? 'Saving…' : 'Register menu item'}
            </button>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Menu edits</p>
              <h3 className="section-title">Existing items</h3>
            </div>
            <span className="info-chip">{filteredItems.length} shown</span>
          </div>
          <AdminListToolbar>
            <label>
              Search items
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, category, or description" />
            </label>
            <label>
              Filter
              <select value={filter} onChange={(event) => setFilter(event.target.value as MenuFilter)}>
                <option value="all">All items</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </label>
          </AdminListToolbar>
          <AdminEntityList>
            {filteredItems.map((item) => (
              <button key={item.id} type="button" className="admin-settings-table-row" onClick={() => setModal({ itemId: item.id })}>
                <div>
                  <strong>{item.name}</strong>
                  <div className="muted">{item.category} · {centsToMajorUnits(item.price)}</div>
                </div>
                <div className="admin-settings-table-row-meta">
                  <span className={!item.active ? 'info-chip' : item.available ? 'info-chip info-chip-success' : 'info-chip info-chip-danger'}>
                    {!item.active ? 'Archived' : item.available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </button>
            ))}
            {!filteredItems.length ? <p className="muted">No items match the current search/filter.</p> : null}
          </AdminEntityList>
        </SectionCard>
      </div>

      {modal ? <MenuItemModal itemId={modal.itemId} onClose={() => setModal(null)} /> : null}
    </section>
  )
}

function CategoryEditorList() {
  const admin = useAdminOutletState()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(admin.draftCategories[0]?.id ?? null)

  const selectedCategory = admin.draftCategories.find((category) => category.id === selectedCategoryId) ?? null

  return (
    <div className="admin-edit-list">
      {admin.draftCategories.map((category) => {
        const isSelected = category.id === selectedCategoryId

        return (
          <div key={category.id} className="admin-edit-card">
            <div className="section-heading-row">
              <div>
                <strong>{category.name}</strong>
                <p className="muted inventory-helper-text">
                  Order {category.sort_order} · {category.hot_pick ? 'Hot pick' : 'Standard'} · {category.active ? 'Active' : 'Archived'}
                </p>
              </div>
              <button className={isSelected ? 'secondary-button' : ''} onClick={() => setSelectedCategoryId(isSelected ? null : category.id)}>
                {isSelected ? 'Close edit' : 'Edit'}
              </button>
            </div>

            {isSelected ? <CategoryEditor category={category} /> : null}
          </div>
        )
      })}

      {!admin.draftCategories.length ? <p className="muted inventory-helper-text">No categories yet.</p> : null}

      {admin.draftCategories.length > 0 && !selectedCategory ? (
        <p className="muted inventory-helper-text">Choose a category to edit.</p>
      ) : null}
    </div>
  )
}

function CategoryEditor({ category }: { category: MenuCategory }) {
  const admin = useAdminOutletState()
  const updateDraft = (patch: Partial<MenuCategory>) => {
    admin.setDraftCategories((current) => current.map((entry) => (entry.id === category.id ? { ...entry, ...patch } : entry)))
  }

  const draft = admin.draftCategories.find((entry) => entry.id === category.id) ?? category

  return (
    <div className="form-stack" style={{ marginTop: '0.85rem' }}>
      <input value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })} />
      <div className="admin-inline-actions">
        <label className="inline-check">
          <input type="checkbox" checked={draft.hot_pick} onChange={(e) => updateDraft({ hot_pick: e.target.checked })} />
          Hot pick
        </label>
        <label className="inline-check">
          <input type="checkbox" checked={draft.active} onChange={(e) => updateDraft({ active: e.target.checked })} />
          Active
        </label>
      </div>
      <input
        type="number"
        min="0"
        value={draft.sort_order}
        onChange={(e) => updateDraft({ sort_order: Number(e.target.value) })}
      />
      <div className="admin-inline-actions">
        <button onClick={() => admin.updateCategory.mutate(draft)}>Save category</button>
        <button className="secondary-button" onClick={() => admin.archiveCategory.mutate(draft.id)}>
          Archive category
        </button>
      </div>
    </div>
  )
}

function MenuItemModal({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const admin = useAdminOutletState()
  const item = admin.draftMenuItems.find((entry) => entry.id === itemId)
  if (!item) return null

  const draft = item

  const updateDraft = (patch: Partial<MenuItem>) => {
    admin.setDraftMenuItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, ...patch } : entry)))
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="admin-modal" role="dialog" aria-modal="true" aria-label={`Edit ${draft.name}`} onClick={(event) => event.stopPropagation()}>
        <div className="section-heading-row admin-modal-header">
          <div>
            <p className="eyebrow">Menu editor</p>
            <h3 className="section-title">{draft.name}</h3>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="admin-modal-body admin-modal-body-stack">
          <div className="admin-modal-section-grid">
            <label>
              Item name
              <input value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })} />
            </label>
            <label>
              Category
              <select value={draft.category} onChange={(e) => updateDraft({ category: e.target.value })}>
                {admin.draftCategories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Description
            <textarea rows={4} value={draft.description} onChange={(e) => updateDraft({ description: e.target.value })} />
          </label>

          <div className="admin-modal-section-grid admin-modal-section-grid-three">
            <label>
              Price
              <input value={centsToMajorUnits(draft.price).toString()} inputMode="decimal" onChange={(e) => updateDraft({ price: safeMoneyInput(e) })} />
            </label>
            <label>
              Image URL
              <input value={draft.image_url} onChange={(e) => updateDraft({ image_url: e.target.value })} placeholder="Image URL" />
            </label>
            <label className="inline-check admin-inventory-check">
              <input type="checkbox" checked={draft.available} onChange={(e) => updateDraft({ available: e.target.checked })} />
              Available
            </label>
          </div>

          <div className="admin-inventory-toggle-row admin-modal-toggle-grid">
            <label className="inline-check admin-inventory-check">
              <input type="checkbox" checked={draft.active} onChange={(e) => updateDraft({ active: e.target.checked })} />
              Active
            </label>
            <label className="inline-check admin-inventory-check">
              <input type="checkbox" checked={draft.available} onChange={(e) => updateDraft({ available: e.target.checked })} />
              Available for orders
            </label>
          </div>
        </div>

        <div className="admin-modal-footer">
          <div className="admin-inline-actions admin-inventory-actions admin-inventory-actions-secondary admin-inventory-actions-stack">
            <button type="button" className="secondary-button" onClick={() => admin.updateInventory.mutate(draft)}>
              Save stock
            </button>
            <button type="button" className="secondary-button" onClick={() => admin.archiveMenuItem.mutate(draft.id)}>
              Archive item
            </button>
          </div>
          <div className="admin-inline-actions admin-inventory-actions admin-inventory-actions-primary admin-inventory-actions-stack">
            <button type="button" className="secondary-button" onClick={() => admin.toggleAvailability.mutate({ itemId: draft.id, available: !draft.available })}>
              {draft.available ? 'Mark unavailable' : 'Mark available'}
            </button>
            <button type="button" onClick={() => admin.updateMenuItem.mutate(draft)}>
              Save item
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function safeMoneyInput(event: ChangeEvent<HTMLInputElement>) {
  return majorUnitsToCents(event.target.value)
}
