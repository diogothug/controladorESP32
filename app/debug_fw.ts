
import { generateModularMicroPython } from './src/main/modular-firmware-generator';
import { ModuleConfig } from './src/shared/types';

// Mimic the config likely used in 'should run generated firmware on Python 3 with Mocks'
// Usually involves multiple modules.
const modules: ModuleConfig[] = [
    { id: 'm1', type: 'WIFI', name: 'wifi', pin: 0, wifiConfig: { ssid: 'test', password: 'test', mode: 'STA' } as any },
    { id: 'm2', type: 'MQTT', name: 'mqtt', pin: 0, mqttConfig: { broker: 'test', port: 1883, topic: 't', user: '', pass: '' } as any },
    { id: 'm3', type: 'OTA', name: 'ota', pin: 0, otaConfig: { url: 'http://test' } as any },
    { id: 'm4', type: 'NEOPIXEL', name: 'neo', pin: 15, neoPixelConfig: { pixelCount: 16 } as any },
    { id: 'm5', type: 'TEMP_SENSOR', name: 'dht', pin: 4, sensorConfig: { type: 'DHT11' } as any },
    { id: 'm6', type: 'LDR', name: 'ldr', pin: 34, ldrConfig: { enabled: true } as any }
];

const fw = generateModularMicroPython({
    appName: 'DebugFw',
    semanticVersion: '1.0.0',
    modules: modules,
    meta: { generatedBy: 'Debug' }
});

const lines = fw.split('\n');
console.log(`Total Lines: ${lines.length}`);
for (let i = 340; i < 360; i++) {
    if (i < lines.length) {
        console.log(`${i + 1}: ${lines[i]}`);
    }
}
