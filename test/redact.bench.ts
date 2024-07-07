import {bench, describe} from 'vitest';
import fastRedact from 'fast-redact';
import {Redaction} from '../src';
import {dummyUser} from './setup/dummyUser';

const blacklistedKeys = [
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
];

const fastRedactBlacklistedKeys = [
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
  'crypto.*.wallet',
  'address.*.*',
  'bank.cardNumber',
  'bank.iban',
  'company.address.*',
  'ein',
  'ssn',
];

describe('Redaction benchmark', () => {
  bench('fast redact, single user', () => {
    const redact = fastRedact({paths: fastRedactBlacklistedKeys});
    redact(dummyUser);
  });

  bench('fast redact, 1000 users', () => {
    const redact = fastRedact({paths: fastRedactBlacklistedKeys});
    Array(1000).fill(dummyUser).map(redact);
  });

  bench('default config, single user', () => {
    const redaction = new Redaction({blacklistedKeys});
    redaction.redact(dummyUser);
  });

  bench('fuzzy matching, single user', () => {
    const redaction = new Redaction({blacklistedKeys, fuzzy: true});
    redaction.redact(dummyUser);
  });

  bench('case insensitive matching, single user', () => {
    const redaction = new Redaction({blacklistedKeys, caseSensitive: false});
    redaction.redact(dummyUser);
  });

  bench('fuzzy and case insensitive matching, single user', () => {
    const redaction = new Redaction({blacklistedKeys, fuzzy: true, caseSensitive: false});
    redaction.redact(dummyUser);
  });

  bench('replace string by length, single user', () => {
    const redaction = new Redaction({blacklistedKeys, replaceStringByLength: true, replacement: '*'});
    redaction.redact(dummyUser);
  });

  bench('retain structure, single user', () => {
    const redaction = new Redaction({blacklistedKeys, retainStructure: true});
    redaction.redact(dummyUser);
  });

  bench('default config, 1000 users', () => {
    const redaction = new Redaction({blacklistedKeys});
    Array(1000).fill(dummyUser).map((user) => redaction.redact(user));
  });
});
