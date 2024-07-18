import { RedactionConfig } from '../../src'

export type Blacklist = RedactionConfig['blacklistedKeys']

export const blacklistedKeys: Blacklist = [
  'firstName',
  'lastName',
  'surname',
  'maidenName',
  'email',
  'phone',
  'password',
  'birthDate',
  'ip',
  'macAddress',
  'wallet',
  'address',
  'iban',
  'cardNumber',
  'ein',
  'ssn',
]
