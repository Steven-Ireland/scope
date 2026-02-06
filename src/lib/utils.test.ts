import { describe, it, expect } from 'vitest';
import { getValueByPath, flattenObject, getTimestampField } from './utils';

describe('getTimestampField', () => {
  const allDateFields = ['@timestamp', 'event_time', 'created_at'];
  const fallback = '@timestamp';

  it('should return the first visible date field', () => {
    const visibleColumns = ['message', 'event_time', '@timestamp'];
    expect(getTimestampField(visibleColumns, allDateFields, fallback)).toBe('event_time');
  });

  it('should return the fallback if no date field is visible', () => {
    const visibleColumns = ['message', 'level', 'user'];
    expect(getTimestampField(visibleColumns, allDateFields, fallback)).toBe(fallback);
  });

  it('should return undefined if there are no date fields at all', () => {
    expect(getTimestampField(['message'], [], fallback)).toBe(undefined);
  });

  it('should prefer the first date field in visibleColumns regardless of alphabetical order', () => {
    const visibleColumns = ['created_at', 'event_time'];
    expect(getTimestampField(visibleColumns, allDateFields, fallback)).toBe('created_at');

    const visibleColumns2 = ['event_time', 'created_at'];
    expect(getTimestampField(visibleColumns2, allDateFields, fallback)).toBe('event_time');
  });

  it('should return the fallback if visibleColumns is empty', () => {
    expect(getTimestampField([], allDateFields, fallback)).toBe(fallback);
  });
});

describe('getValueByPath', () => {
  it('should get a top-level value', () => {
    const obj = { a: 1, b: 2 };
    expect(getValueByPath(obj, 'a')).toBe(1);
  });

  it('should get a nested value', () => {
    const obj = { a: { b: { c: 3 } } };
    expect(getValueByPath(obj, 'a.b.c')).toBe(3);
  });

  it('should return undefined for non-existent path', () => {
    const obj = { a: { b: 2 } };
    expect(getValueByPath(obj, 'a.c')).toBe(undefined);
    expect(getValueByPath(obj, 'x.y.z')).toBe(undefined);
  });

  it('should return the object itself for empty path', () => {
    const obj = { a: 1 };
    expect(getValueByPath(obj, '')).toBe(obj);
  });

  it('should handle null or undefined intermediate values', () => {
    const obj = { a: null, b: undefined };
    expect(getValueByPath(obj, 'a.b')).toBe(undefined);
    expect(getValueByPath(obj, 'b.c')).toBe(undefined);
  });
});

describe('flattenObject', () => {
  it('should flatten a simple nested object', () => {
    const obj = {
      a: 1,
      b: {
        c: 2,
        d: {
          e: 3,
        },
      },
    };
    const expected = {
      a: 1,
      'b.c': 2,
      'b.d.e': 3,
    };
    expect(flattenObject(obj)).toEqual(expected);
  });

  it('should handle empty objects', () => {
    expect(flattenObject({})).toEqual({});
  });

  it('should not flatten arrays', () => {
    const obj = {
      a: [1, 2, { b: 3 }],
      c: 4,
    };
    const expected = {
      a: [1, 2, { b: 3 }],
      c: 4,
    };
    expect(flattenObject(obj)).toEqual(expected);
  });

  it('should handle null values', () => {
    const obj = {
      a: null,
      b: {
        c: null,
      },
    };
    const expected = {
      a: null,
      'b.c': null,
    };
    expect(flattenObject(obj)).toEqual(expected);
  });
});
