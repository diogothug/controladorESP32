
import { describe, it, expect } from '../mini-test-framework';
import { generateModularMicroPython } from '../../main/modular-firmware-generator';
import { ModuleConfig } from '../../shared/types';

describe('Phase 5: Polish', () => {

    function gen(modules: ModuleConfig[]) {
        return generateModularMicroPython({
            appName: 'PolishTest',
            semanticVersion: '1.0.0',
            modules,
            meta: { generatedBy: 'Test' }
        });
    }

    it('should generate LDR Auto-Brightness logic', () => {
        const fw = gen([{
            id: 'ldr1', type: 'LDR', name: 'Ambient', pin: 34,
            ldrConfig: {
                enabled: true, interval: 500,
                minReading: 0, maxReading: 4095,
                minBrightness: 10, maxBrightness: 255
            }
        }]);

        expect(fw).toContain('SHARED_DATA[\'BRIGHTNESS\'] = bright');
        expect(fw).toContain('import ADC');
        expect(fw).toContain('ldr_Ambient.read()');
    });

    it('should inject Auto-Brightness check in NeoPixel loop', () => {
        const fw = gen([{
            id: 'led1', type: 'NEOPIXEL', name: 'MainStrip', pin: 15,
            neoPixelConfig: { pixelCount: 16, brightness: 50, colorOrder: 'GRB', colorDepth: '24bit', defaultAnimation: 'NONE' }
        }]);

        expect(fw).toContain('if \'BRIGHTNESS\' in SHARED_DATA:');
        expect(fw).toContain('TARGET_BRIGHTNESS_MainStrip = SHARED_DATA[\'BRIGHTNESS\'] / 255.0');
    });

    it('should support Multi-Strip (Multiple NeoPixel Modules)', () => {
        const fw = gen([
            {
                id: 'led1', type: 'NEOPIXEL', name: 'Strip1', pin: 15,
                neoPixelConfig: { pixelCount: 10, brightness: 50, colorOrder: 'GRB', colorDepth: '24bit', defaultAnimation: 'NONE' }
            },
            {
                id: 'led2', type: 'NEOPIXEL', name: 'Strip2', pin: 16,
                neoPixelConfig: { pixelCount: 20, brightness: 100, colorOrder: 'RGB', colorDepth: '24bit', defaultAnimation: 'RAINBOW' }
            }
        ]);

        // Check for distinct objects
        expect(fw).toContain('np_Strip1 = neopixel.NeoPixel(machine.Pin(15), 10)');
        expect(fw).toContain('np_Strip2 = neopixel.NeoPixel(machine.Pin(16), 20)');

        // Check for distinct loops/configs
        expect(fw).toContain('TARGET_BRIGHTNESS_Strip1');
        expect(fw).toContain('TARGET_BRIGHTNESS_Strip2');
    });

});
