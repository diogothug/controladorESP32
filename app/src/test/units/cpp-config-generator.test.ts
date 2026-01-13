import { CppConfigGenerator, ManufacturerConfig } from '../../main/generators/cpp-config-generator';
import * as assert from 'assert';

function runTest() {
    console.log('Running CppConfigGenerator Test...');

    const config: ManufacturerConfig = {
        productName: 'TideDisplay_Custom',
        firmwareVersion: '4.1.0-custom',
        led: {
            pin: 15,
            count: 128,
            type: 'MATRIX',
            maxBrightness: 150
        },
        hasLdr: true,
        tide: {
            defaultPortId: 104 // Aratu
        },
        wifi: {
            defaultSsid: 'MyGuestWiFi',
            defaultPass: 'secret123'
        },
        security: {
            btPin: '9999',
            webPass: 'admin123'
        }
    };

    const output = CppConfigGenerator.generate(config);

    try {
        assert.ok(output.includes('#define PRODUCT_NAME "TideDisplay_Custom"'), 'Product Name missing');
        assert.ok(output.includes('#define LED_PIN 15'), 'LED Pin wrong');
        assert.ok(output.includes('#define NUM_LEDS 128'), 'LED Count wrong');
        assert.ok(output.includes('#define LED_TYPE_MATRIX 1'), 'LED Type wrong');
        assert.ok(output.includes('#define HAS_LDR 1'), 'LDR Flag wrong');
        assert.ok(output.includes('#define DEFAULT_TIDE_PORT_ID 104'), 'Default Port wrong');
        assert.ok(output.includes('#define WIFI_DEFAULT_SSID "MyGuestWiFi"'), 'WiFi SSID wrong');
        assert.ok(output.includes('#define WIFI_DEFAULT_PASS "secret123"'), 'WiFi Pass wrong');
        assert.ok(output.includes('#define BT_PAIRING_PIN "9999"'), 'BT Pin wrong');

        console.log('✅ TEST PASSED: CppConfigGenerator produced valid output.');
    } catch (e: any) {
        console.error('❌ TEST FAILED:', e.message);
        process.exit(1);
    }
}

runTest();
