
import { describe, it, expect } from '../mini-test-framework';
import { generateModularMicroPython } from '../../main/modular-firmware-generator';
import { FirmwareIntent, ModuleConfig } from '../../shared/types';

describe('Firmware Advanced Modules (Phase 9)', () => {

    function gen(modules: ModuleConfig[]): string {
        const intent: FirmwareIntent = {
            appName: 'AdvancedTest',
            semanticVersion: '4.0.0',
            modules: modules,
            meta: { generatedBy: 'Test' }
        };
        return generateModularMicroPython(intent);
    }

    it('should generate NVS logic', () => {
        const fw = gen([{
            id: 'nvs1', type: 'NVS', name: 'Storage', pin: 0,
            nvsConfig: { enabled: true, namespace: 'test_ns', autoSave: ['KEY1'] }
        }]);
        expect(fw).toContain('import esp32');
        expect(fw).toContain('NVS_NS = "test_ns"');
        expect(fw).toContain('NVS_AUTOSAVE_KEYS = ["KEY1"]');
    });

    it('should generate ESP-NOW logic', () => {
        const fw = gen([{
            id: 'enow1', type: 'ESPNOW', name: 'Mesh', pin: 0,
            espNowConfig: { pmk: '1234567890123456', channel: 1, roles: ['COMBO'] }
        }]);
        expect(fw).toContain('import espnow');
        expect(fw).toContain('ESPNOW_PMK = "1234567890123456"');
    });

    it('should generate BLE logic', () => {
        const fw = gen([{
            id: 'ble1', type: 'BLE', name: 'Beacon', pin: 0,
            bleConfig: { name: 'MyBeacon', mode: 'BEACON', advertisementInterval: 100 }
        }]);
        expect(fw).toContain('import ubluetooth');
        expect(fw).toContain("gap_name='MyBeacon'");
    });

    it('should generate Display logic', () => {
        const fw = gen([{
            id: 'disp1', type: 'DISPLAY', name: 'OLED', pin: 0,
            displayConfig: { driver: 'SSD1306', width: 128, height: 64, i2cAddress: 60 }
        }]);
        expect(fw).toContain('import ssd1306');
        expect(fw).toContain('ssd1306.SSD1306_I2C(128, 64');
    });
});
