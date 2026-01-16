
import { describe, it, expect } from '../mini-test-framework';
// Import the Universal module
// We need to use require or import. Since it's a TS file in src/renderer, but run by ts-node, we can import it if it's correct.
// The file has a conditional module.exports.
// @ts-ignore
const imported = require('../../renderer/tide-visuals');
const { TideVisuals } = imported;

describe('Premium Tide Visuals Logic', () => {

    it('should initialize with default config', () => {
        const visuals = new TideVisuals();
        expect(visuals).toBeDefined();
    });

    it('should smooth inputs over time', () => {
        const visuals = new TideVisuals({ smoothTau: 0.1 });
        // Initial state is 0.5
        // First update with level 1.0, dt 0.1
        // alpha = 1 - exp(-0.1/0.1) = 1 - e^-1 = 1 - 0.367 = 0.632
        // delta = 1.0 - 0.5 = 0.5
        // newLevel = 0.5 + 0.5 * 0.632 = 0.5 + 0.316 = 0.816

        visuals.update(0.1, { level: 1.0, trend: 0, confidence: 1.0, hasWifi: true });

        // We can't easily inspect private state without exposing getters or "any" cast
        // Let's inspect indirectly via render results?
        // Or cast to any for testing internals
        const currentLevel = (visuals as any).currentLevel;
        expect(currentLevel).toBeGreaterThan(0.5);
        expect(currentLevel).toBeLessThan(1.0);
    });

    it('should render correct number of pixels', () => {
        const visuals = new TideVisuals();
        const pixels = visuals.render(10, 1, 10); // 10 LEDs strip
        expect(pixels.length).toBe(10);
    });

    it('should produce low brightness if max brightness constrained', () => {
        const visuals = new TideVisuals({ brightnessMax: 100 });
        visuals.update(1.0, { level: 1.0, trend: 0, confidence: 1.0, hasWifi: true });
        // Render full bar
        const pixels = visuals.render(10, 1, 10);
        // Bottom pixel should be roughly max * color
        const bottomPixel = pixels[0];
        // Base color R=200. 200 * (100/255) ~= 78.
        expect(bottomPixel.r).toBeLessThan(100);
        expect(bottomPixel.r).toBeGreaterThan(50);
    });
});
