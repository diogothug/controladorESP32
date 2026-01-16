
import { describe, it, expect } from '../mini-test-framework';
import { getPresetDimensions } from '../../renderer/led-presets';

describe('LED Animation Creator Logic', () => {

    it('Preset 32x8 (Matrix) should be Vertical (8x32)', () => {
        const dims = getPresetDimensions('32x8');
        expect(dims.w).toBe(8);
        expect(dims.h).toBe(32);
        expect(dims.h).toBeGreaterThan(dims.w);
    });

    it('Preset 60led (Strip) should be Vertical (1x60)', () => {
        const dims = getPresetDimensions('60led');
        expect(dims.w).toBe(1);
        expect(dims.h).toBe(60);
        expect(dims.h).toBeGreaterThan(dims.w);
    });

    it('Preset 16x16 (Square) should remain Square', () => {
        const dims = getPresetDimensions('16x16');
        expect(dims.w).toBe(16);
        expect(dims.h).toBe(16);
    });

    it('Preset 12ring should be Linear/Vertical', () => {
        const dims = getPresetDimensions('12ring');
        expect(dims.w).toBe(1);
        expect(dims.h).toBe(12);
    });
});
