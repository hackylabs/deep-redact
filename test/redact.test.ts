import {describe, expect, it} from 'vitest';
import {Redaction} from '../src';

describe('Redaction', () => {
  it('should deep redact an object', () => {
    const redaction = new Redaction({blacklistedKeys: ['password']});
    const obj = {
      userid: 'USERID',
      password: 'PASSWORD',
      nested: {
        userid: 'USERID',
        password: 'PASSWORD',
      },
    };

    expect(redaction.redact(obj)).toEqual({
      userid: 'USERID',
      password: 'REDACTED',
      nested: {
        userid: 'USERID',
        password: 'REDACTED',
      },
    });
  });

  it('should deep redact an array of objects', () => {
    const redaction = new Redaction({blacklistedKeys: ['password']});
    const arr = Array.from({length: 3}, () => ({
      userid: 'USERID',
      password: 'PASSWORD',
      nested: {
        userid: 'USERID',
        password: 'PASSWORD',
      },
    }));

    expect(redaction.redact(arr)).toEqual(Array.from({length: 3}, () => ({
      userid: 'USERID',
      password: 'REDACTED',
      nested: {
        userid: 'USERID',
        password: 'REDACTED',
      },
    })));
  });

  it('should redact a string', () => {
    const redaction = new Redaction({stringTests: [/\d{13,16}/]});

    expect(redaction.redact('1234567890123456')).toBe('REDACTED');
  });

  it('should redact a string by length', () => {
    const redaction = new Redaction({stringTests: [/\d{13,16}/], replaceStringByLength: true, replacement: '*'});

    expect(redaction.redact('1234567890123456')).toBe('****************');
  });

  it('should redact multiple types', () => {
    const redaction = new Redaction({
      types: ['string', 'number', 'boolean', 'bigint', 'symbol', 'undefined', 'object', 'function'],
      blacklistedKeys: ['password', 'age', 'isAdult', 'bigInt', 'symbol', 'undef', 'func'],
    });
    const func = () => {
    };
    const obj = {
      age: 20,
      isAdult: true,
      bigInt: BigInt(10),
      symbol: Symbol('symbol'),
      undef: undefined,
      func,
      obj: {
        password: 'PASSWORD',
        userid: 'USERID',
      },
    };

    expect(redaction.redact(obj)).toEqual({
      age: 'REDACTED',
      isAdult: 'REDACTED',
      bigInt: 'REDACTED',
      symbol: 'REDACTED',
      undef: 'REDACTED',
      func: 'REDACTED',
      obj: {
        password: 'REDACTED',
        userid: 'USERID',
      },
    });
  });

  it('should redact an object of strings with fuzzy matching', () => {
    const redaction = new Redaction({blacklistedKeys: ['pass'], fuzzy: true});
    const obj = {
      user: 'USERID',
      password: 'PASSWORD',
      nested: {
        user: 'USERID',
        password: 'PASSWORD',
      },
    };

    expect(redaction.redact(obj)).toEqual({
      user: 'USERID',
      password: 'REDACTED',
      nested: {
        user: 'USERID',
        password: 'REDACTED',
      },
    });
  });

  it('should redact an object of strings with case insensitive matching', () => {
    const redaction = new Redaction({blacklistedKeys: ['password'], caseSensitive: false});
    const obj = {
      user: 'USERID',
      PASSWORD: 'PASSWORD',
      nested: {
        user: 'USERID',
        PASSWORD: 'PASSWORD',
      },
    };

    expect(redaction.redact(obj)).toEqual({
      user: 'USERID',
      PASSWORD: 'REDACTED',
      nested: {
        user: 'USERID',
        PASSWORD: 'REDACTED',
      },
    });
  });

  it('should redact an object of strings with case insensitive and fuzzy matching', () => {
    const redaction = new Redaction({blacklistedKeys: ['pass'], fuzzy: true, caseSensitive: false});
    const obj = {
      user: 'USERID',
      PASSWORD: 'PASSWORD',
      nested: {
        user: 'USERID',
        PASSWORD: 'PASSWORD',
      },
    };

    expect(redaction.redact(obj)).toEqual({
      user: 'USERID',
      PASSWORD: 'REDACTED',
      nested: {
        user: 'USERID',
        PASSWORD: 'REDACTED',
      },
    });
  });

  it('should not redact null', () => {
    const redaction = new Redaction({types: ['object']});
    const obj = {
      user: 'USERID',
      other: null,
    };

    expect(redaction.redact(obj)).toEqual(obj);
  });

  it('should not redact undefined', () => {
    const redaction = new Redaction({types: ['undefined']});
    const obj = {
      user: 'USERID',
      other: undefined,
    };

    expect(redaction.redact(obj)).toEqual(obj);
  });
});
