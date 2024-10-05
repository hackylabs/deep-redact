import { renderTable, type TableData } from './_renderTable'

const tableData: TableData = [
  {
    key: 'pattern',
    description: 'A regular expression to perform against a string value, whether that value is a flat string or nested within an object.',
    type: 'RegExp',
    required: 'Y',
  },
  {
    key: 'replacer',
    description: 'A function that will be called with the value of the string that matched the pattern and the pattern itself. This function should return the new (redacted) value to replace the original value.',
    type: 'function',
    required: 'Y',
  },
]

export const stringTestConfig = renderTable(tableData)
