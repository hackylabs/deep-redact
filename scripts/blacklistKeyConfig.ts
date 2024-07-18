import { renderTable, type TableData } from './_renderTable'

const tableData: TableData = [
  {
    key: 'key',
    type: 'string',
    default: '',
    required: 'Y',
  },
  {
    key: 'fuzzyKeyMatch',
    type: 'boolean',
    default: 'Main options `fuzzyKeyMatch`',
    required: 'N',
  },
  {
    key: 'caseSensitiveKeyMatch',
    type: 'boolean',
    default: 'Main options `caseSensitiveKeyMatch`',
    required: 'N',
  },
  {
    key: 'remove',
    type: 'boolean',
    default: 'Main options `remove`',
    required: 'N',
  },
  {
    key: 'retainStructure',
    type: 'boolean',
    default: 'Main options `retainStructure`',
    required: 'N',
  },
]

export const blacklistKeyConfig = renderTable(tableData)
