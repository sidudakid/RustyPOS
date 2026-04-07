import type { ChangeEvent } from 'react'
import { SectionCard } from '../../components'
import { centsToMajorUnits, majorUnitsToCents, useAdminOutletState } from '../../adminShared'
import type { MenuCategory, MenuItem } from '../../api'

export function AdminMenuPage() {
  const admin = useAdminOutletState()

  return (
    <section className="two-column page-layout-admin">
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
            Admin owns category CRUD here: register new groups, edit labels/order, or archive old structure without touching live floor operations.
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

          <div className="admin-edit-list">
            {admin.draftCategories.map((category) => (
              <CategoryEditor key={category.id} category={category} />
            ))}
          </div>
        </SectionCard>
      </div>

      <div>
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
            <span className="info-chip">{admin.draftMenuItems.length} total</span>
          </div>
          <p className="muted inventory-helper-text">
            Edit, disable, or archive any record here. This page is the owner-facing menu database, not a live order dashboard.
          </p>
          <div className="admin-edit-list">
            {admin.draftMenuItems.map((item) => (
              <MenuItemEditor key={item.id} item={item} />
            ))}
          </div>
        </SectionCard>
      </div>
    </section>
  )
}

function CategoryEditor({ category }: { category: MenuCategory }) {
  const admin = useAdminOutletState()
  const updateDraft = (patch: Partial<MenuCategory>) => {
    admin.setDraftCategories((current) => current.map((entry) => (entry.id === category.id ? { ...entry, ...patch } : entry)))
  }

  const draft = admin.draftCategories.find((entry) => entry.id === category.id) ?? category

  return (
    <div className="admin-edit-card">
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

function MenuItemEditor({ item }: { item: MenuItem }) {
  const admin = useAdminOutletState()
  const draft = admin.draftMenuItems.find((entry) => entry.id === item.id) ?? item

  const updateDraft = (patch: Partial<MenuItem>) => {
    admin.setDraftMenuItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, ...patch } : entry)))
  }

  return (
    <div className="admin-edit-card">
      <input value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })} />
      <input value={draft.description} onChange={(e) => updateDraft({ description: e.target.value })} />
      <input value={draft.image_url} onChange={(e) => updateDraft({ image_url: e.target.value })} placeholder="Image URL" />
      <input
        value={centsToMajorUnits(draft.price).toString()}
        inputMode="decimal"
        onChange={(e) => updateDraft({ price: safeMoneyInput(e) })}
      />
      <select value={draft.category} onChange={(e) => updateDraft({ category: e.target.value })}>
        {admin.draftCategories.map((category) => (
          <option key={category.id} value={category.name}>
            {category.name}
          </option>
        ))}
      </select>
      <div className="admin-inline-actions">
        <label className="inline-check">
          <input type="checkbox" checked={draft.active} onChange={(e) => updateDraft({ active: e.target.checked })} />
          Active
        </label>
        <label className="inline-check">
          <input type="checkbox" checked={draft.available} onChange={(e) => updateDraft({ available: e.target.checked })} />
          Available
        </label>
      </div>
      <div className="admin-inline-actions">
        <button onClick={() => admin.updateMenuItem.mutate(draft)}>Save item</button>
        <button className="secondary-button" onClick={() => admin.updateInventory.mutate(draft)}>
          Save stock
        </button>
        <button className="secondary-button" onClick={() => admin.toggleAvailability.mutate({ itemId: draft.id, available: !draft.available })}>
          {draft.available ? 'Mark unavailable' : 'Mark available'}
        </button>
        <button className="secondary-button" onClick={() => admin.archiveMenuItem.mutate(draft.id)}>
          Archive item
        </button>
      </div>
    </div>
  )
}

function safeMoneyInput(event: ChangeEvent<HTMLInputElement>) {
  return majorUnitsToCents(event.target.value)
}
