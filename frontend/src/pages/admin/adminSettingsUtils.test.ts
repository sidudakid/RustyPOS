import { describe, expect, it } from 'vitest'
import type { AdminTableAccessArtifact, TableOperationalSummary } from '../../api'
import { filterTableAccess, sanitizeFilePart } from './adminSettingsUtils'

const tableAccess: AdminTableAccessArtifact[] = [
  {
    id: 't1',
    table_number: 1,
    name: 'Table 1',
    active: true,
    token: 'table-1-qr',
    token_label: 'QR 1',
    menu_path: '/t/table-1-qr',
  },
  {
    id: 't2',
    table_number: 2,
    name: 'Patio 2',
    active: false,
    token: 'patio-2-qr',
    token_label: 'QR 2',
    menu_path: '/t/patio-2-qr',
  },
]

const tableOperations: TableOperationalSummary[] = [
  {
    table_id: 't1',
    table_name: 'Table 1',
    table_number: 1,
    active: true,
    open_order_count: 2,
    paid_order_count: 0,
    ready_order_count: 1,
    unpaid_total_amount: 2400,
    unpaid_statuses: ['pending'],
    last_order_at: null,
  },
  {
    table_id: 't2',
    table_name: 'Patio 2',
    table_number: 2,
    active: false,
    open_order_count: 0,
    paid_order_count: 3,
    ready_order_count: 0,
    unpaid_total_amount: 0,
    unpaid_statuses: [],
    last_order_at: null,
  },
]

describe('filterTableAccess', () => {
  it('shows active tables by default', () => {
    expect(filterTableAccess(tableAccess, tableOperations, '', 'all').map((table) => table.id)).toEqual(['t1'])
  })

  it('shows active tables with open orders', () => {
    expect(filterTableAccess(tableAccess, tableOperations, '', 'open').map((table) => table.id)).toEqual(['t1'])
  })

  it('shows inactive tables when the inactive filter is selected', () => {
    expect(filterTableAccess(tableAccess, tableOperations, '', 'inactive').map((table) => table.id)).toEqual(['t2'])
  })

  it('matches search text case-insensitively across names and tokens', () => {
    expect(filterTableAccess(tableAccess, tableOperations, 'PATIO-2', 'inactive').map((table) => table.id)).toEqual(['t2'])
    expect(filterTableAccess(tableAccess, tableOperations, 'qr 1', 'all').map((table) => table.id)).toEqual(['t1'])
  })
})

describe('sanitizeFilePart', () => {
  it('normalizes download-safe filenames', () => {
    expect(sanitizeFilePart('  Table #12 / Window  ')).toBe('table-12-window')
  })
})
