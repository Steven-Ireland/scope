import { describe, it, expect } from 'vitest';
import { getValueByPath, flattenObject } from './utils';

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
          e: 3
        }
      }
    };
    const expected = {
      'a': 1,
      'b.c': 2,
      'b.d.e': 3
    };
    expect(flattenObject(obj)).toEqual(expected);
  });

  it('should handle empty objects', () => {
    expect(flattenObject({})).toEqual({});
  });

  it('should not flatten arrays', () => {
    const obj = {
      a: [1, 2, { b: 3 }],
      c: 4
    };
    const expected = {
      'a': [1, 2, { b: 3 }],
      'c': 4
    };
    expect(flattenObject(obj)).toEqual(expected);
  });

  it('should handle null values', () => {
    const obj = {
      a: null,
      b: {
        c: null
      }
    };
    const expected = {
      'a': null,
      'b.c': null
    };
    expect(flattenObject(obj)).toEqual(expected);
  });
});
