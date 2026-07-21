import { canonicalize, digest, finiteNumber, requiredText } from '../../src/core/domain';

test('canonical digest is stable across object key order', () => expect(digest({ z: 1, nested: { b: 2, a: 3 } })).toBe(digest({ nested: { a: 3, b: 2 }, z: 1 })));
test('canonicalize preserves array order while sorting objects', () => expect(canonicalize([{ b: 2, a: 1 }, 3])).toEqual([{ a: 1, b: 2 }, 3]));
test('required text rejects control characters', () => expect(() => requiredText('unsafe\u0000value', 'value')).toThrow(/required/));
test('finite number rejects infinity and unsafe magnitudes', () => { expect(() => finiteNumber(Infinity, 'value')).toThrow(/between/); expect(() => finiteNumber(1e16, 'value')).toThrow(/between/); });
