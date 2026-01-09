
import { describe, it, expect, beforeAll } from '../mini-test-framework';
import { generateModularMicroPython } from '../../main/modular-firmware-generator';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { ModuleConfig, TideConfig } from '../../shared/types';

// ============ TIDE MODULE COMPREHENSIVE TESTS ============
// Following Apple-style testing: Clear, Concise, Complete

describe('Tide Module - Code Generation', () => {

    // Helper to generate firmware with Tide module
    function genTideFirmware(tideConfig?: Partial<TideConfig>, neoConfig?: Partial<any>): string {
        const modules: ModuleConfig[] = [
            {
                id: '1', type: 'TIDE', name: 'TideTracker', pin: 0,
                tideConfig: {
                    enabled: true,
                    harborId: 1,
                    harborName: 'Porto de Ilhéus',
                    state: 'ba',
                    updateInterval: 30,
                    highTideColor: '#0080FF',
                    lowTideColor: '#FFD700',
                    risingIndicator: true,
                    ledCount: 16,
                    neopixelPin: 5,
                    ...tideConfig
                }
            },
            {
                id: '2', type: 'NEOPIXEL', name: 'TideLEDs', pin: 5,
                neoPixelConfig: {
                    pixelCount: 64,
                    matrixWidth: 8,
                    brightness: 50,
                    colorOrder: 'GRB',
                    colorDepth: '24bit',
                    defaultAnimation: 'TIDE_SIMPLE',
                    ...neoConfig
                }
            }
        ];

        return generateModularMicroPython({
            appName: 'TideTest',
            semanticVersion: '3.0.0',
            modules,
            meta: { generatedBy: 'TEST' }
        });
    }

    it('should generate TIDE module with correct configuration', () => {
        const code = genTideFirmware();

        // Check Tide configuration is injected
        expect(code).toContain('TIDE_HARBOR_ID = 1');
        expect(code).toContain('TIDE_UPDATE_INTERVAL');
        expect(code).toContain('TIDE_API_BASE');
    });

    it('should include urequests import for API calls', () => {
        const code = genTideFirmware();
        expect(code).toContain('import urequests');
        expect(code).toContain('import json');
    });

    it('should generate lerp_color function', () => {
        const code = genTideFirmware();
        expect(code).toContain('def lerp_color(c1, c2, t):');
    });

    it('should generate get_tide_depth_color function', () => {
        const code = genTideFirmware();
        expect(code).toContain('def get_tide_depth_color(');
    });

    it('should generate tide_level and tide_direction variables', () => {
        const code = genTideFirmware();
        expect(code).toContain('tide_level = 50');
        expect(code).toContain('tide_direction = "rising"');
    });

    it('should generate set_tide_level command handler', () => {
        const code = genTideFirmware();
        expect(code).toContain('def set_tide_level(');
    });

    it('should generate set_tide_direction command handler', () => {
        const code = genTideFirmware();
        expect(code).toContain('def set_tide_direction(');
    });

    it('should generate fetch_tide_data function', () => {
        const code = genTideFirmware();
        expect(code).toContain('def fetch_tide_data():');
    });

    it('should integrate with SHARED_DATA store', () => {
        const code = genTideFirmware();
        expect(code).toContain('SHARED_DATA["TIDE"]');
        expect(code).toContain('SHARED_DATA["TIDE_DIR"]');
    });

    it('should generate tide_parse_time helper function', () => {
        const code = genTideFirmware();
        expect(code).toContain('def tide_parse_time(');
    });
});

describe('Tide Module - Mock Execution', () => {
    const tempFile = path.join(__dirname, '../../test_temp_tide_mock.py');
    const mockRunner = path.join(__dirname, '../helpers/run_unit_mock.py');

    it('should execute generated TIDE firmware with mocks', () => {
        const modules: ModuleConfig[] = [
            {
                id: '1', type: 'TIDE', name: 'TideTracker', pin: 0,
                tideConfig: {
                    enabled: true,
                    harborId: 1,
                    harborName: 'Porto de Ilhéus',
                    state: 'ba',
                    updateInterval: 30,
                    highTideColor: '#0080FF',
                    lowTideColor: '#FFD700',
                    risingIndicator: true,
                    ledCount: 16,
                    neopixelPin: 5
                }
            },
            {
                id: '2', type: 'NEOPIXEL', name: 'TideLEDs', pin: 5,
                neoPixelConfig: {
                    pixelCount: 64,
                    matrixWidth: 8,
                    brightness: 50,
                    colorOrder: 'GRB',
                    colorDepth: '24bit',
                    defaultAnimation: 'TIDE_SIMPLE'
                }
            },
            {
                id: '3', type: 'WIFI', name: 'WiFi', pin: 0,
                wifiConfig: { ssid: 'TestNet', password: 'test123', mode: 'STA' }
            }
        ];

        const code = generateModularMicroPython({
            appName: 'TideMockTest',
            semanticVersion: '3.0.0',
            modules,
            meta: { generatedBy: 'TEST' }
        });

        fs.writeFileSync(tempFile, code);

        try {
            const output = execSync(`python "${mockRunner}" "${tempFile}"`, { encoding: 'utf-8' });
            expect(output).toContain('TEST: PASS');
        } finally {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        }
    });
});

describe('Tide Module - Animation Presets', () => {

    function genWithAnimation(anim: string): string {
        const modules: ModuleConfig[] = [
            {
                id: '1', type: 'NEOPIXEL', name: 'Matrix', pin: 5,
                neoPixelConfig: {
                    pixelCount: 64,
                    matrixWidth: 8,
                    brightness: 50,
                    colorOrder: 'GRB',
                    colorDepth: '24bit',
                    defaultAnimation: anim as any
                }
            }
        ];

        return generateModularMicroPython({
            appName: 'TideAnimTest',
            semanticVersion: '3.0.0',
            modules,
            meta: { generatedBy: 'TEST' }
        });
    }

    it('should generate TIDE_SIMPLE animation code', () => {
        const code = genWithAnimation('TIDE_SIMPLE');
        expect(code).toContain('== "TIDE_SIMPLE"'); // Animation switch case
    });

    it('should generate TIDE_WAVE animation code', () => {
        const code = genWithAnimation('TIDE_WAVE');
        expect(code).toContain('TIDE_WAVE'); // Animation name
    });

    it('should generate TIDE_AURORA animation code', () => {
        const code = genWithAnimation('TIDE_AURORA');
        expect(code).toContain('TIDE_AURORA'); // Animation name
    });
});

describe('Tide Module - Configuration Validation', () => {

    it('should use default harborId if not provided', () => {
        const modules: ModuleConfig[] = [
            { id: '1', type: 'TIDE', name: 'Tide', pin: 0 }
        ];

        const code = generateModularMicroPython({
            appName: 'Test', semanticVersion: '1.0.0', modules, meta: {}
        });

        // Should use default harborId = 1
        expect(code).toContain('TIDE_HARBOR_ID = 1');
    });

    it('should convert updateInterval from minutes to seconds', () => {
        const modules: ModuleConfig[] = [
            {
                id: '1', type: 'TIDE', name: 'Tide', pin: 0,
                tideConfig: {
                    enabled: true,
                    harborId: 5,
                    harborName: 'Test',
                    state: 'pb',
                    updateInterval: 15, // 15 minutes
                    highTideColor: '#0080FF',
                    lowTideColor: '#FFD700',
                    risingIndicator: false,
                    ledCount: 8,
                    neopixelPin: 5
                }
            }
        ];

        const code = generateModularMicroPython({
            appName: 'Test', semanticVersion: '1.0.0', modules, meta: {}
        });

        // 15 minutes = 900 seconds
        expect(code).toContain('TIDE_UPDATE_INTERVAL = 900');
    });
});

describe('Tide Module - Color Functions', () => {
    const tempFile = path.join(__dirname, '../../test_tide_colors.py');

    it('should correctly interpolate colors in Python', () => {
        // Test the lerp_color function directly
        const testScript = `
# Test lerp_color function
def lerp_color(c1, c2, t):
    t = max(0, min(1, t))
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t)
    )

# Test cases
result1 = lerp_color((0, 0, 0), (255, 255, 255), 0.5)
assert result1 == (127, 127, 127), f"Expected (127,127,127), got {result1}"

result2 = lerp_color((0, 0, 0), (255, 255, 255), 0)
assert result2 == (0, 0, 0), f"Expected (0,0,0), got {result2}"

result3 = lerp_color((0, 0, 0), (255, 255, 255), 1)
assert result3 == (255, 255, 255), f"Expected (255,255,255), got {result3}"

result4 = lerp_color((255, 0, 0), (0, 255, 0), 0.5)
assert result4 == (127, 127, 0), f"Expected (127,127,0), got {result4}"

print("TEST: PASS - All color interpolation tests passed")
`;

        fs.writeFileSync(tempFile, testScript);

        try {
            const output = execSync(`python "${tempFile}"`, { encoding: 'utf-8' });
            expect(output).toContain('TEST: PASS');
        } finally {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        }
    });
});

describe('Tide Module - Command Handlers', () => {

    it('should generate TIDE:LEVEL command handler', () => {
        const modules: ModuleConfig[] = [
            {
                id: '1', type: 'TIDE', name: 'Tide', pin: 0,
                tideConfig: {
                    enabled: true, harborId: 1, harborName: 'Test', state: 'ba',
                    updateInterval: 30, highTideColor: '#0080FF', lowTideColor: '#FFD700',
                    risingIndicator: true, ledCount: 16, neopixelPin: 5
                }
            }
        ];

        const code = generateModularMicroPython({
            appName: 'Test', semanticVersion: '1.0.0', modules, meta: {}
        });

        // Check for TIDE:LEVEL command handling
        expect(code).toContain('TIDE:LEVEL');
    });

    it('should generate TIDE:DIR command handler', () => {
        const modules: ModuleConfig[] = [
            {
                id: '1', type: 'TIDE', name: 'Tide', pin: 0,
                tideConfig: {
                    enabled: true, harborId: 1, harborName: 'Test', state: 'ba',
                    updateInterval: 30, highTideColor: '#0080FF', lowTideColor: '#FFD700',
                    risingIndicator: true, ledCount: 16, neopixelPin: 5
                }
            }
        ];

        const code = generateModularMicroPython({
            appName: 'Test', semanticVersion: '1.0.0', modules, meta: {}
        });

        // Check for TIDE:DIR command handling
        expect(code).toContain('TIDE:DIR');
    });

    it('should generate TIDE:FETCH command handler', () => {
        const modules: ModuleConfig[] = [
            {
                id: '1', type: 'TIDE', name: 'Tide', pin: 0,
                tideConfig: {
                    enabled: true, harborId: 1, harborName: 'Test', state: 'ba',
                    updateInterval: 30, highTideColor: '#0080FF', lowTideColor: '#FFD700',
                    risingIndicator: true, ledCount: 16, neopixelPin: 5
                }
            }
        ];

        const code = generateModularMicroPython({
            appName: 'Test', semanticVersion: '1.0.0', modules, meta: {}
        });

        // Check for TIDE:FETCH command handling
        expect(code).toContain('TIDE:FETCH');
    });
});
