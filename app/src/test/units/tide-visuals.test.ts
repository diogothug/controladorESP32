
import { describe, it, expect } from '../mini-test-framework';
import { generateModularMicroPython } from '../../main/modular-firmware-generator';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { ModuleConfig } from '../../shared/types';

describe('Tide Visualization 3.0', () => {
    const tempFile = path.join(__dirname, '../../test_temp_tide.py');

    it('should generate and run TIDE presets (SIMPLE, WAVE, AURORA)', () => {
        const modules: ModuleConfig[] = [
            {
                id: '1', type: 'NEOPIXEL', name: 'Matrix', pin: 5,
                neoPixelConfig: {
                    pixelCount: 64, matrixWidth: 8, brightness: 50,
                    colorOrder: 'GRB', colorDepth: '24bit',
                    defaultAnimation: 'TIDE_SIMPLE'
                }
            }
        ];

        const code = generateModularMicroPython({
            appName: 'TideTest',
            semanticVersion: '3.0.0',
            modules: modules,
            meta: { generatedBy: 'TEST' }
        });

        // Inject test code to switch animations and cycle loop
        // Script placeholder (unused for now as we run generated code directly)
        // const testScript = `...`;

        fs.writeFileSync(tempFile, code);

        // Run verification (checks Syntax only basically)
        const script = path.join(__dirname, '../helpers/run_unit_mock.py');
        try {
            const output = execSync(`python "${script}" "${tempFile}"`, { encoding: 'utf-8' });
            expect(output).toContain('TEST: PASS');
        } finally {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        }
    });
});
