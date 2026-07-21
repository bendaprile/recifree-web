/**
 * Scales an ingredient quantity by a multiplier scale (e.g. 1, 2, 3).
 * Supports numbers, string numbers ("2"), and fractions ("1/2").
 *
 * @param {string|number|null|undefined} amountStr - The original ingredient amount
 * @param {number} scale - Scale multiplier (default 1)
 * @returns {string|number} Scaled string or original value if invalid/unscalable
 */
export const scaleAmount = (amountStr, scale = 1) => {
    if (amountStr === null || amountStr === undefined || amountStr === '') return '';
    if (scale === 1) return amountStr;

    if (typeof amountStr === 'number') {
        const scaled = amountStr * scale;
        return Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(1);
    }

    const str = String(amountStr).trim();

    if (str.includes('/')) {
        const parts = str.split('/');
        const num = parseFloat(parts[0]);
        const den = parseFloat(parts[1]);
        if (!isNaN(num) && !isNaN(den) && den !== 0) {
            const val = (num / den) * scale;
            if (Number.isInteger(val)) return val.toString();
            if (val === 0.5) return '1/2';
            if (val === 1.5) return '1 1/2';
            if (val === 2.5) return '2 1/2';
            return val.toFixed(1);
        }
    }

    const num = parseFloat(str);
    if (!isNaN(num) && String(num) === str) {
        const val = num * scale;
        return Number.isInteger(val) ? val.toString() : val.toFixed(1);
    }

    return str;
};

export default scaleAmount;
