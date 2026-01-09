
import { generateModularMicroPython } from './modular-firmware-generator';
import { ModuleConfig } from '../shared/types';
import * as fs from 'fs';
import * as path from 'path';

// Enable console logging for this test
console.log('--- CLI BACKEND DEBUG TOOL ---');
console.log('Starting validation flow...');

const mockModules: ModuleConfig[] = [
    {
        id: 'MOD_WIFI_01',
        type: 'WIFI',
        name: 'Home WiFi',
        wifiConfig: {
            ssid: 'TestSSID',
            password: 'TestPassword123',
            hostname: 'esp32-dev-cli',
            mode: 'STA'
        },
        pin: 0
    },
    {
        id: 'MOD_LED_01',
        type: 'NEOPIXEL',
        name: 'Living Room Matrix',
        pin: 5,
        neoPixelConfig: {
            pixelCount: 64,
            brightness: 128,
            colorOrder: 'GRB',
            colorDepth: '24bit',
            defaultAnimation: 'RAINBOW',
            matrixWidth: 8,
            matrixHeight: 8
        }
    },
    {
        id: 'MOD_MQTT_01',
        type: 'MQTT',
        name: 'Home Assistant MQTT',
        pin: 0,
        mqttConfig: {
            broker: '192.168.1.100',
            port: 1883,
            user: 'user',
            password: 'pass',
            topicPrefix: 'home/livingroom',
            homeAssistantDiscovery: true
        }
    },
    {
        id: 'MOD_OTA_01',
        type: 'OTA',
        name: 'OTA Updater',
        pin: 0,
        otaConfig: {
            enabled: true
        }
    },
    {
        id: 'MOD_WEB_01',
        type: 'WEB_SERVER',
        name: 'Web Interface',
        pin: 0,
        webServerConfig: {
            port: 80,
            title: 'Debug Panel',
            captivePortal: true
        }
    },
    {
        id: 'MOD_UDP_01',
        type: 'UDP',
        name: 'WLED Stream',
        pin: 0,
        udpConfig: {
            port: 21324,
            universe: 1
        }
    }
];

try {
    console.log('[CLI] Mock Project Modules:', mockModules.length);
    console.log('[CLI] Invoking Firmware Generator...');

    const firmware = generateModularMicroPython({
        appName: 'DebugCLI',
        semanticVersion: '0.0.0',
        modules: mockModules,
        meta: { generatedBy: 'CLI' }
    });

    console.log('[CLI] Firmware Generation Complete.');
    console.log(`[CLI] Output Size: ${firmware.length} bytes`);
    console.log(`[CLI] Line Count: ${firmware.split('\n').length}`);

    // Check for critical sections
    const checks = [
        { key: 'umqtt.simple', name: 'MQTT Library Import' },
        { key: 'network.WLAN', name: 'WiFi Setup' },
        { key: 'neopixel.NeoPixel', name: 'NeoPixel Setup' },
        { key: 'socket.SOCK_DGRAM', name: 'UDP Socket' },
        { key: 'do_ota_update', name: 'OTA Function' }
    ];

    console.log('[CLI] Verifying Output Content...');
    let passed = 0;
    checks.forEach(check => {
        if (firmware.includes(check.key)) {
            console.log(`[PASS] Found ${check.name}`);
            passed++;
        } else {
            console.error(`[FAIL] Missing ${check.name}`);
        }
    });

    if (passed === checks.length) {
        console.log('[CLI] ALL CHECKS PASSED ✅');
    } else {
        console.error(`[CLI] ${checks.length - passed} CHECKS FAILED ❌`);
    }

    const debugPath = path.join(__dirname, 'debug_firmware.py');
    fs.writeFileSync(debugPath, firmware);
    console.log(`[CLI] Debug output written to: ${debugPath}`);

} catch (error) {
    console.error('[CLI] CRITICAL ERROR:', error);
    process.exit(1);
}
