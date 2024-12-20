import { renderTable, type TableData } from './_renderTable'

const tableData: TableData = [
  {
    key: 'blacklistedKeys',
    description: 'Deeply compare names of these keys against the keys in your object.',
    type: 'array',
    options: 'Array<string￨RegExp￨BlacklistKeyConfig>',
    default: '[]',
    required: 'N',
  },
  {
    key: 'stringTests',
    description: 'Array of regular expressions to perform against string values, whether that value is a flat string or nested within an object. Will redact whole string values. If you want to redact only part of the string, use `partialStringTests` instead. If a replacer function is provided in the config for the associated test, it will be used to redact the value.',
    type: 'array',
    options: 'Array<RegExp￨StringTestConfig>',
    default: '[]',
    required: 'N',
  },
  {
    key: 'partialStringTests',
    description: 'Array of regular expressions to perform against string values, whether that value is a flat string or nested within an object. Will redact only the matched part of the string using the replacer function provided in the config for the associated test.',
    type: 'array',
    options: 'StringTestConfig[]',
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
    key: 'remove',
    description: 'Determines whether or not to remove the key from the object when it is redacted.',
    type: 'boolean',
    options: '',
    default: 'false',
    required: 'N',
  },
  {
    key: 'retainStructure',
    description: 'Determines whether or not keep all nested values of a key that is going to be redacted. Circular references are always removed.',
    type: 'boolean',
    options: '',
    default: 'false',
    required: 'N',
  },
  {
    key: 'replacement',
    description: 'When a value is going to be redacted, what would you like to replace it with?',
    type: 'string ￨ function',
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
    description: 'JS types (values of `typeof` keyword). Only values with a typeof equal to `string`, `number`, `bigint`, `boolean`, `symbol`, `object`, or `function` will be redacted. Undefined values will never be redacted, although the type `undefined` is included in this list to keep TypeScript happy.',
    type: 'array',
    options: 'Array<\'string\'￨\'number\'￨\'bigint\'￨\'boolean\'￨\'symbol\'￨\'undefined\'￨\'object\'￨\'function\'>',
    default: '[\'string\']',
    required: 'N',
  },
  {
    key: 'serialise',
    description: 'Determines whether or not to serialise the object after redacting. Typical use cases for this are when you want to send it over the network or save to a file, both of which are common use cases for redacting sensitive information.',
    type: 'boolean',
    options: '',
    default: 'false',
    required: 'N',
  },
  {
    key: 'serialize',
    description: 'Alias of `serialise` for International-English users.',
    type: 'boolean',
    options: '',
    default: 'false',
    required: 'N',
  },
]

export const mainOptions = renderTable(tableData)
