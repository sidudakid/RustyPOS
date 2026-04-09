import type { AdminTableAccessArtifact, TableOperationalSummary } from '../../api'

export type TableFilter = 'all' | 'open' | 'inactive'

export function sanitizeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function filterTableAccess(
  tableAccess: AdminTableAccessArtifact[],
  tableOperations: TableOperationalSummary[],
  tableQuery: string,
  tableFilter: TableFilter,
) {
  const needle = tableQuery.trim().toLowerCase()

  return tableAccess.filter((table) => {
    const ops = tableOperations.find((entry) => entry.table_id === table.id)
    const matchesText = !needle || [table.name, table.token_label, table.token].some((value) => value.toLowerCase().includes(needle))
    const matchesFilter =
      (tableFilter === 'all' && table.active) ||
      (tableFilter === 'open' && table.active && Boolean(ops?.open_order_count)) ||
      (tableFilter === 'inactive' && !table.active)

    return matchesText && matchesFilter
  })
}
