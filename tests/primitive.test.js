import {expect, test} from 'bun:test';
import { parse } from '../lib';


test('integer parses correctly', () => {
    expect(parse(`123`)).toBe(123);
    expect(parse(`-123`)).toBe(-123);
    expect(() => parse(`+123`)).toThrow();
    expect(parse(`0xff`)).toBe(255);
    expect(parse(`0b101`)).toBe(5);
    expect(parse(`-0o10`)).toBe(-8);
});

test('float parses correctly', () => {
    expect(parse(`123.456`)).toBe(123.456);
    expect(parse(`-123.456`)).toBe(-123.456);
    expect(parse(`1.23e4`)).toBe(12300);
    expect(parse(`1.23e-4`)).toBe(0.000123);
    expect(parse(`0x407A4B0A3D70A3D7r`)).toBe(420.69);
});

test('string parses correctly', () => {
    expect(parse(`"abc"`)).toBe('abc');
    expect(parse(`"a\\nbc"`)).toBe('a\nbc');
    expect(parse(`"a\\u0062c"`)).toBe('abc');
    expect(parse(`"a\\U0001f600c"`)).toBe('a\u{1F600}c');
});

test('char parses correctly', () => {
    expect(parse(`'a'`)).toBe('a');
    expect(parse(`'\\n'`)).toBe('\n');
    expect(parse(`'\\u0062'`)).toBe('b');
    expect(parse(`'\\U0001f600'`)).toBe('\u{1F600}');
});

test('boolean parses correctly', () => {
    expect(parse(`true`)).toBe(true);
    expect(parse(`false`)).toBe(false);
});

test('abyss parses correctly', () => {
    expect(parse(`abyss`)).toBe(undefined);
    expect(parse(`#`)).toBe(undefined);
});

test('index parses correctly', () => {
    expect(parse(`*1`)).toBe(1);
    expect(parse(`^4`)).toBe(-4);
    expect(() => parse(`*.6`)).toThrow();
});

test('range parses correctly', () => {
    expect(parse(`1..5`)).toMatchObject({start: 1, end: 5, step: 1, start_exclusive: false, end_exclusive: false});
    expect(parse(`1..0.5`)).toMatchObject({ start: 1, end: 0.5, step: 1, start_exclusive: false, end_exclusive: false });
});

test('version parses correctly', () => {
    expect(parse(`v1.2.3`)).toMatchObject({ major: 1, minor: 2, patch: 3 });
    expect(parse(`v1.2`)).toMatchObject({ major: 1, minor: 2, patch: 0 });
    expect(parse(`v1`)).toMatchObject({ major: 1, minor: 0, patch: 0 });
    expect(parse(`v1.2.3.99-alpha`)).toMatchObject({ major: 1, minor: 2, patch: 3, build: 99, tag: 'alpha' });
});

test('date, time and datetime parse correctly', () => {
    expect(parse(`2021-01-01`)).toBeInstanceOf(Date);
    expect(parse(`2021-01-01T00:00:00`)).toBeInstanceOf(Date);
    expect(parse(`2021-01-01T00:00:00Z`)).toBeInstanceOf(Date);
    expect(parse(`2021-01-01T00:00:00+01:00`)).toBeInstanceOf(Date);

    expect(parse(`2021-01-01`).valueOf()).toBe(new Date('2021-01-01').valueOf());
    expect(parse(`2021-01-01T00:00:00`).valueOf()).toBe(new Date('2021-01-01T00:00:00').valueOf());
    expect(parse(`2021-01-01T00:00:00Z`).valueOf()).toBe(new Date('2021-01-01T00:00:00Z').valueOf());
    expect(parse(`2021-01-01T00:00:00+01:00`).valueOf()).toBe(new Date('2021-01-01T00:00:00+01:00').valueOf());

    expect(parse(`01:11:10`)).toBeInstanceOf(Date);
    expect(parse(`00:11:00Z`)).toBeInstanceOf(Date);
    expect(parse(`11:11:10+01:00`)).toBeInstanceOf(Date);

    expect(parse(`01:11:10`).valueOf()).toBe(new Date('1970-01-01T01:11:10').valueOf());
    expect(parse(`00:11:00Z`).valueOf()).toBe(new Date('1970-01-01T00:11:00Z').valueOf());
    expect(parse(`11:11:10+01:00`).valueOf()).toBe(new Date('1970-01-01T11:11:10+01:00').valueOf());
});

test('time interval parses correctly', () => {
    expect(parse(`PT3S`)).toMatchObject({ seconds: 3});
    expect(parse(`PT45M`)).toMatchObject({ minutes: 45 });
    expect(parse(`PT55H`)).toMatchObject({ hours: 55 });
    expect(parse(`P2D`)).toMatchObject({ days: 2 });
    expect(parse(`P88W`)).toMatchObject({ weeks: 88 });
    expect(parse(`P23Y`)).toMatchObject({ years: 23 });
    expect(parse(`P12M`)).toMatchObject({ months: 12 });
    expect(parse(`P10Y2M3DT2H2M2S`)).toMatchObject({ years: 10, months: 2, days: 3, hours: 2, minutes: 2, seconds: 2 });
});

test('information unit parses correctly', () => {
    // variety of numbers
    expect(parse(`7B`)).toBe(56);
    expect(parse(`2KB`)).toBe(16000);
    expect(parse(`3MB`)).toBe(24000000);
    expect(parse(`4GB`)).toBe(32000000000);
    expect(parse(`5TB`)).toBe(40000000000000);
    expect(() => parse(`6PB`)).toThrow();
    expect(() => parse(`7EB`)).toThrow();
    expect(parse('9Gib')).toBe(9 * 1024 ** 3);
});

