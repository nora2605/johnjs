import { test, expect } from 'bun:test';
import { stringify } from '../lib';

test('stringify is correct', () => {
    expect(stringify(1)).toBe('1');
    expect(stringify('foo')).toBe('"foo"');
    expect(stringify(true)).toBe('true');
    expect(stringify(false)).toBe('false');
    expect(stringify(null)).toBe('#');
    expect(stringify(undefined)).toBe('#');

    expect(stringify({ foo: 'bar' })).toBe('foo "bar"');
    expect(stringify([1, 2, 3])).toBe('[1 2 3]');

    expect(stringify({ foo: 'bar', baz: 42 })).toBe('foo "bar" baz 42');
    expect(stringify([1, 2, 3, 'foo'])).toBe('[1 2 3 "foo"]');

    expect(stringify({ foo: 'bar', baz: { qux: 42 } })).toBe('foo "bar" baz {qux 42}');
    expect(stringify(new Map([['foo', 'bar'], ['baz', 42]]))).toBe('{{"foo" "bar" "baz" 42}}');
    expect(stringify(new Set([1, 2, 3]))).toBe('{[1 2 3]}');
    expect(stringify(stringify)).toBe(undefined);

    expect(stringify(new Date(0))).toBe('1970-01-01T00:00:00.000Z');
});