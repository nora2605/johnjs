import { test, expect } from 'bun:test';
import { format, format_default } from '../lib';

test('format is correct', () => {
    expect(format(`key "value" arr_key [1 2 3]`, format_default)).toBe(`key: "value",\narr_key: [1, 2, 3]`);
    expect(format(`key "value" obj { key2 "value2" key3 "value3" }`))
        .toBe(`key: "value",
obj: {
    key2: "value2",
    key3: "value3"
}`);
});