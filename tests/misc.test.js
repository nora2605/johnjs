import { test, expect } from 'bun:test';
import { parse } from '../lib';

test('comments are ignored', () => {
    expect(
        parse(`abc [ "value1"\n // "value2" \n "value3" ]`)
    ).toMatchObject({ abc: ['value1', 'value3']});

    expect(
        parse(`key1 "value1"\n // key2 "value2" \n key3 "value3"`)
    ).toMatchObject({ key1: 'value1', key3: 'value3' });
});

test('as_dict annotation works', () => {
    let map = new Map();
    map.set('key1', 'value1');
    map.set('key2', 'value2');
    expect(
        parse(`abc @as_dict { key1 "value1" key2 "value2" }`)
    ).toMatchObject({ abc: map });
});

test('mini annotation is ignored', () => {
    expect(
        parse(`@mini abc *1`)
    ).toMatchObject({ abc: 1 });
});

test('schema annotation is ignored', () => {
    expect(
        parse(`@schema(schema.john) abc *1`)
    ).toMatchObject({ abc: 1 });
});

test('object wrong key format gets rejected', () => {
    expect(() => parse(`{ ke+%&y1 "value1" }`)).toThrow();
});