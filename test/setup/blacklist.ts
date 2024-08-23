import { BaseDeepRedactConfig } from '../../src/types'

export type Blacklist = BaseDeepRedactConfig['blacklistedKeys']

export const blacklistedKeys: Blacklist = [
  'firstName',
  'lastName',
  'surname',
  'maidenName',
  'email',
  'phone',
  'username',
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
