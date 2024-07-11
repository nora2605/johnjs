import { test, expect } from 'bun:test';
import { parse } from '../lib';

import React from 'react';
import { renderToString } from 'react-dom/server';

test('object parses correctly', () => {
    expect(parse(`{}`)).toMatchObject({});
    expect(parse(`{ key1 "value1" key2 "value2" }`)).toMatchObject({ key1: 'value1', key2: 'value2' });
    expect(parse(`{ key1 "value1" key2 "value2" key3 { key4 "value4" } }`)).toMatchObject({ key1: 'value1', key2: 'value2', key3: { key4: 'value4' } });
    expect(parse(`{ key1 "value1" key2 "value2" key3 { key4 "value4" } key5 { key6 "value6" } }`)).toMatchObject({ key1: 'value1', key2: 'value2', key3: { key4: 'value4' }, key5: { key6: 'value6' } });
    expect(parse(`{ key1 "value1" key2 "value2" key3 { key4 "value4" } key5 { key6 "value6" } key7 { key8 "value8" } }`)).toMatchObject({ key1: 'value1', key2: 'value2', key3: { key4: 'value4' }, key5: { key6: 'value6' }, key7: { key8: 'value8' } });
});

test('array parses correctly', () => {
    expect(parse(`[]`)).toMatchObject([]);
    expect(parse(`[ "value1" "value2" ]`)).toMatchObject(['value1', 'value2']);
    expect(parse(`[ "value1" "value2" "value3" ]`)).toMatchObject(['value1', 'value2', 'value3']);
    expect(parse(`[ "value1" "value2" "value3" "value4" ]`)).toMatchObject(['value1', 'value2', 'value3', 'value4']);
    expect(parse(`[ "value1" "value2" "value3" "value4" "value5" ]`)).toMatchObject(['value1', 'value2', 'value3', 'value4', 'value5']);
});

test('tuple parses correctly', () => {
    expect(parse(`()`)).toMatchObject([]);
    expect(parse(`("value1" "value2")`)).toMatchObject(['value1', 'value2']);
    expect(parse(`("value1" "value2" "value3")`)).toMatchObject(['value1', 'value2', 'value3']);
    expect(parse(`("value1" "value2" "value3" "value4")`)).toMatchObject(['value1', 'value2', 'value3', 'value4']);
    expect(parse(`("value1" "value2" "value3" "value4" "value5")`)).toMatchObject(['value1', 'value2', 'value3', 'value4', 'value5']);
});

test('set parses correctly', () => {
    expect(parse(`{[]}`)).toMatchObject(new Set());
    expect(parse(`{[ "value1" "value2" ]}`)).toMatchObject(new Set(['value1', 'value2']));
    expect(parse(`{[ "value1" "value2" "value3" ]}`)).toMatchObject(new Set(['value1', 'value2', 'value3']));
    expect(parse(`{[ "value1" "value2" "value3" "value4" ]}`)).toMatchObject(new Set(['value1', 'value2', 'value3', 'value4']));
    expect(parse(`{[ "value1" "value2" "value3" "value4" "value5" ]}`)).toMatchObject(new Set(['value1', 'value2', 'value3', 'value4', 'value5']));
});

test('dict parses correctly', () => {
    expect(parse(`{{}}`)).toMatchObject(new Map());
    expect(parse(`{{ "key1" "value1" "key2" "value2" }}`)).toMatchObject(new Map([['key1', 'value1'], ['key2', 'value2']]));
    expect(parse(`{{ "key1" "value1" "key2" "value2" "key3" "value3" }}`))
        .toMatchObject(new Map([['key1', 'value1'], ['key2', 'value2'], ['key3', 'value3']]));
});

test('node parses correctly', () => {
    expect(parse(`|html| "hi"`).props).toMatchObject(React.createElement('html', null, 'hi').props);
    expect(parse(`|html| [
        |head| [
            |title| "hi"
        ]
        |body| [
            |h1 id="heading"| "hi"
        ]
    ]`)).toMatchObject({type: 'html', props: { children: [{ type: 'head', props: { children: [{ type: 'title', props: {children: 'hi'}}]}},{type: 'body',props: {children: [{type: 'h1',props: {id: 'heading', children: 'hi'}}]}}]}});
    let dom = parse(`|html| [
        |head| [
            |title| "hi"
        ]
        |body| [
            |h1 id="heading" class="text-4xl"| "hi"
        ]
    ]`, {node_compat: 'react'});
    expect(renderToString(dom)).toBe('<html><head><title>hi</title></head><body><h1 id="heading" class="text-4xl">hi</h1></body></html>');
});