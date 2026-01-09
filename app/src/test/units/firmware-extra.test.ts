
import { describe, it, expect } from '../mini-test-framework';
import { generateModularMicroPython } from '../../main/modular-firmware-generator';
import { ModuleConfig } from '../../shared/types';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

describe('Firmware Advanced Tests', () => {

    const fullModules: ModuleConfig[] = [
        { id: '1', type: 'WIFI', name: 'HomeWifi', pin: 0, wifiConfig: { ssid: 'MyNet', mode: 'STA' } },
        { id: '2', type: 'MQTT', name: 'HASS', pin: 0, mqttConfig: { broker: '10.0.0.1', port: 1883, topicPrefix: 'home', homeAssistantDiscovery: true } },
        { id: '3', type: 'LED', name: 'Status', pin: 2 },
        { id: '4', type: 'OTA', name: 'Updater', pin: 0, otaConfig: { enabled: true } },
        { id: '5', type: 'WEB_SERVER', name: 'WebUI', pin: 0, webServerConfig: { port: 80, title: 'Control Panel', captivePortal: true } }
    ];

    // Helper
    function gen(modules: ModuleConfig[]) {
        return generateModularMicroPython({
            appName: 'ExtraTest',
            semanticVersion: '2.0.0',
            modules,
            meta: { generatedBy: 'Extra' }
        });
    }

    it('should match golden snapshot', () => {
        const result = gen(fullModules);
        expect(result).toMatchSnapshot('full_firmware_golden');
    });

    it('should pass advanced static analysis (Linting + AST)', () => {
        const result = gen(fullModules);
        const tempPath = path.resolve(__dirname, 'temp_syntax_check.py');
        const linterPath = path.resolve(__dirname, '../helpers/micropython_linter.py');

        fs.writeFileSync(tempPath, result);

        try {
            // Run custom linter
            const p = spawnSync('python', [linterPath, tempPath], { encoding: 'utf8' });

            if (p.status !== 0) {
                console.error("Linter Output:", p.stdout, p.stderr);
                throw new Error(`Static Analysis Failed:\n${p.stdout}\n${p.stderr}`);
            }
        } finally {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
    });

});
