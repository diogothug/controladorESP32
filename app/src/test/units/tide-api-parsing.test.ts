import { describe, it, expect } from '../mini-test-framework';
import { generateModularMicroPython } from '../../main/modular-firmware-generator';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { ModuleConfig } from '../../shared/types';

// ============ API RESPONSE PARSING TESTS ============
// Validates that the generated firmware correctly parses API responses

describe('Tide API - Response Parsing Tests', () => {

    const tempFile = path.join(__dirname, '../../test_temp_api_parsing.py');
    const mockRunner = path.join(__dirname, '../helpers/run_unit_mock.py');

    function generateTideFirmware(): string {
        const modules: ModuleConfig[] = [
            {
                id: '1', type: 'TIDE', name: 'Tide', pin: 0,
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
                id: '2', type: 'NEOPIXEL', name: 'LEDs', pin: 5,
                neoPixelConfig: {
                    pixelCount: 64,
                    matrixWidth: 8,
                    brightness: 50,
                    colorOrder: 'GRB',
                    colorDepth: '24bit',
                    defaultAnimation: 'TIDE_SIMPLE'
                }
            }
        ];

        return generateModularMicroPython({
            appName: 'APITest',
            semanticVersion: '1.0.0',
            modules
        });
    }

    it('should parse Tábua de Marés API response correctly', () => {
        const code = generateTideFirmware();

        // Verify the parsing logic exists
        expect(code).toContain('harbor.get("months"');
        expect(code).toContain('months_data');
        expect(code).toContain('days_data');
        expect(code).toContain('entry["hour"]');
        expect(code).toContain('entry["level"]');

        // Verify extrema classification
        expect(code).toContain('"type": "low"');
        expect(code).toContain('"type": "high"');
    });

    it('should parse WorldTides API response correctly', () => {
        const code = generateTideFirmware();

        // Verify WorldTides parsing
        expect(code).toContain('extremes');
        expect(code).toContain('e.get("dt"');
        expect(code).toContain('e.get("height"');
        expect(code).toContain('e.get("type")');
        expect(code).toContain('"High"');
    });

    it('should execute and parse mock Tábua de Marés response', () => {
        const code = generateTideFirmware();

        // Add test code to verify parsing
        const testCode = code + `
# ============ API PARSING TEST ============
# This test validates that fetch_tide_data correctly parses the mock API response

import urequests

# Reset and fetch
urequests.reset_history()
fetch_tide_data()

# Validate request was made
history = urequests.get_history()
assert len(history) >= 1, "No API request was made"
assert "tabua-mare" in history[0]["url"], "Wrong API endpoint"

# Validate extremas were parsed
assert len(tide_physics["extremas"]) == 4, f"Expected 4 extremas, got {len(tide_physics['extremas'])}"

# Validate levels match mock data (0.3, 1.8, 0.4, 1.9)
levels = [e["level"] for e in tide_physics["extremas"]]
assert 0.3 in levels, "Missing level 0.3"
assert 1.8 in levels, "Missing level 1.8"
assert 1.9 in levels, "Missing level 1.9"

# Validate high/low classification
types = [e["type"] for e in tide_physics["extremas"]]
assert "high" in types, "No high tide found"
assert "low" in types, "No low tide found"

print("API_TEST: Tábua de Marés parsing OK")
print("API_TEST: Extremas:", tide_physics["extremas"])
`;

        fs.writeFileSync(tempFile, testCode);

        try {
            const output = execSync(`python "${mockRunner}" "${tempFile}"`, { encoding: 'utf-8' });
            expect(output).toContain('TEST: PASS');
            expect(output).toContain('API_TEST: Tábua de Marés parsing OK');
        } finally {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        }
    });

    it('should handle harmonic interpolation correctly', () => {
        const code = generateTideFirmware();

        // Verify harmonic cosine model
        expect(code).toContain('HARMONIC COSINE INTERPOLATION');
        expect(code).toContain('math.cos');
        expect(code).toContain('3.14159');
        expect(code).toContain('harmonic');
    });

    it('should save and load NVS cache correctly', () => {
        const code = generateTideFirmware();

        // Verify cache functions
        expect(code).toContain('def tide_save_cache():');
        expect(code).toContain('def tide_load_cache():');
        expect(code).toContain('nvs.set_str("tide_cache"');
        expect(code).toContain('nvs.get_str("tide_cache"');
        expect(code).toContain('json.dumps(cache)');
        expect(code).toContain('json.loads(data)');
    });

    it('should fallback gracefully when API fails', () => {
        const code = generateTideFirmware();

        // Verify fallback chain
        expect(code).toContain('FALLBACK 1: Primary API');
        expect(code).toContain('FALLBACK 2: Secondary API');
        expect(code).toContain('FALLBACK 3: NVS Cache');
        expect(code).toContain('FALLBACK 4: Safe Defaults');

        // Verify confidence levels
        expect(code).toContain('"confidence": 100');
        expect(code).toContain('"confidence": 95');
        expect(code).toContain('"confidence": 70');
        expect(code).toContain('"confidence": 20');
    });
});
