
import { describe, it, expect } from '../mini-test-framework';
import { generateModularMicroPython } from '../../main/modular-firmware-generator';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { ModuleConfig } from '../../shared/types';

describe('Firmware Mock Verification', () => {
    const tempFile = path.join(__dirname, '../../test_temp_mock.py');

    it('should run generated firmware on Python 3 with Mocks', () => {
        const modules: ModuleConfig[] = [
            {
                id: '1', type: 'WIFI', name: 'WiFi', pin: 0,
                wifiConfig: { ssid: 'Test', password: 'Pass', mode: 'STA' }
            },
            {
                id: '2', type: 'NEOPIXEL', name: 'Neo', pin: 5,
                neoPixelConfig: {
                    pixelCount: 10,
                    brightness: 100,
                    colorOrder: 'GRB',
                    colorDepth: '24bit',
                    defaultAnimation: 'RAINBOW'
                }
            },
            {
                id: '4', type: 'TEMP_SENSOR', name: 'Temp', pin: 4,
                sensorConfig: { type: 'DHT22', interval: 5000 }
            },
            {
                id: '3', type: 'MQTT', name: 'MQTT', pin: 0,
                mqttConfig: {
                    broker: '1.2.3.4',
                    port: 1883,
                    topicPrefix: 'home',
                    homeAssistantDiscovery: false
                }
            }
        ];

        const code = generateModularMicroPython({
            appName: 'MockTest',
            semanticVersion: '1.0.0',
            modules: modules,
            meta: { generatedBy: 'TEST' }
        });

        fs.writeFileSync(tempFile, code);

        // Run the verify script
        const script = path.join(__dirname, '../helpers/run_unit_mock.py');
        try {
            const output = execSync(`python "${script}" "${tempFile}"`, { encoding: 'utf-8' });
            console.log(output);
            expect(output).toContain('TEST: PASS');
            expect(output).toContain('TEST: Created Pins:');
        } catch (e: any) {
            console.error('Mock Test Failed:', e.stdout?.toString() || e.message);
            throw new Error('Firmware failed mock verification');
        } finally {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        }
    });
});
