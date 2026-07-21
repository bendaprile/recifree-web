import { describe, it, expect } from 'vitest';
import { scaleAmount } from './recipeScaler';

describe('recipeScaler utility', () => {
    it('returns empty string for empty/null/undefined inputs', () => {
        expect(scaleAmount(null, 2)).toBe('');
        expect(scaleAmount(undefined, 2)).toBe('');
        expect(scaleAmount('', 2)).toBe('');
    });

    it('returns original input when scale is 1', () => {
        expect(scaleAmount('2', 1)).toBe('2');
        expect(scaleAmount('1/2', 1)).toBe('1/2');
        expect(scaleAmount(4, 1)).toBe(4);
    });

    it('scales numeric types accurately', () => {
        expect(scaleAmount(2, 2)).toBe('4');
        expect(scaleAmount(1.5, 2)).toBe('3');
        expect(scaleAmount(1.2, 2)).toBe('2.4');
    });

    it('scales numeric strings accurately', () => {
        expect(scaleAmount('2', 2)).toBe('4');
        expect(scaleAmount('3', 3)).toBe('9');
    });

    it('scales fractions accurately', () => {
        expect(scaleAmount('1/2', 2)).toBe('1');
        expect(scaleAmount('1/2', 3)).toBe('1 1/2');
        expect(scaleAmount('1/4', 2)).toBe('1/2');
    });

    it('returns unparseable text unmodified', () => {
        expect(scaleAmount('to taste', 2)).toBe('to taste');
        expect(scaleAmount('pinch', 3)).toBe('pinch');
    });
});
