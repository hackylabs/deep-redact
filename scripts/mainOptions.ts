import {renderTable, type TableData} from './_renderTable'

const tableData: TableData = [
  {
    key: 'blacklistedKeys',
    description: 'Deeply compare names of these keys against the keys in your object.',
    type: 'array',
    options: 'Array<string￨BlacklistKeyConfig>',
    default: '[]',
    required: 'N',
  },
  {
    key: 'stringTests',
    description: 'Array of regular expressions to perform against string values, whether that value is a flat string or nested within an object.',
    type: 'array',
    options: 'RegExp[]',
    default: '[]',
    required: 'N',
  },
  {
    key: 'fuzzyKeyMatch',
    description: 'Loosely compare key names by checking if the key name of your unredacted object is included anywhere within the name of your blacklisted key. For example, is "pass" (your key) included in "password" (from config).',
    type: 'boolean',
    options: '',
    default: 'false',
    required: 'N',
  },
  {
    key: 'caseSensitiveKeyMatch',
    description: 'Loosely compare key names by normalising the strings. This involves removing non-word characters and transforms the string to lowercase. This means you never have to worry having to list duplicate keys in different formats such as snake_case, camelCase, PascalCase or any other case.',
    type: 'boolean',
    options: '',
    default: 'true',
    required: 'N',
  },
  {
    key: 'retainStructure',
    description: 'Determines whether or not keep all nested values of a key that is going to be redacted.',
    type: 'boolean',
    options: '',
    default: 'false',
    required: 'N',
  },
  {
    key: 'replacement',
    description: 'When a value is going to be redacted, what would you like to replace it with?',
    type: 'string',
    options: '',
    default: '[REDACTED]',
    required: 'N',
  },
  {
    key: 'replaceStringByLength',
    description: 'When a string value is going to be replaced, optionally replace it by repeating the `replacement` to match the length of the value. For example, if `replaceStringByLength` were set to `true` and `replacement` was set to "x", then redacting "secret" would return "xxxxxx". This is sometimes useful for debugging purposes, although it may be less secure as it could give hints to the original value.',
    type: 'boolean',
    options: '',
    default: 'false',
    required: 'N',
  },
  {
    key: 'types',
    description: "JS types (values of `typeof` keyword). Only values with a typeof equal to `string`, `number`, `bigint`, `boolean` or `object` may be redacted. The other types are only listed as options to keep TypeScript happy, so you never need to list them.",
    type: 'array',
    options: "Array<'string'￨'number'￨'bigint'￨'boolean'￨'symbol'￨'undefined'￨'object'￨'function'>",
    default: "['string']",
    required: 'N',
  },
];

export const mainOptions = renderTable(tableData)