import type { DeepRedactConfig } from '../../src'

export type Blacklist = DeepRedactConfig['blacklistedKeys']

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
