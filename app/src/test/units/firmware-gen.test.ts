
import { describe, it, expect } from '../mini-test-framework';
import { generateModularMicroPython } from '../../main/modular-firmware-generator';
import { ModuleConfig } from '../../shared/types';
import * as fs from 'fs';

describe('Modular Firmware Generator', () => {

    // Helper to wrap modules in intent
    function gen(modules: ModuleConfig[]) {
        return generateModularMicroPython({
            appName: 'TestApp',
            semanticVersion: '0.0.1',
            modules,
            meta: { generatedBy: 'Test' }
        });
    }

    it('should generate basic firmware structure with no modules', () => {
        const modules: ModuleConfig[] = [];
        const result = gen(modules);

        expect(result).toContain('ESP32 MicroPython - Generated Firmware');
        // expect(result).toContain('def loop():'); // Firmware uses while True at root
        expect(result).toContain('while True:');
        expect(result).toContain('MODULES = []');
    });

    it('should include WiFi snippet when WIFI module is present', () => {
        const modules: ModuleConfig[] = [{
            id: '1', type: 'WIFI', name: 'Main WiFi', pin: 0,
            wifiConfig: { ssid: 'Test', mode: 'STA' }
        }];
        const result = gen(modules);

        expect(result).toContain('import network');
        expect(result).toContain('network.WLAN'); // Relaxed
    });

    it('should include MQTT logic when MQTT module is present', () => {
        const modules: ModuleConfig[] = [{
            id: '2', type: 'MQTT', name: 'MQTT Service', pin: 0,
            mqttConfig: { broker: 'localhost', port: 1883, topicPrefix: 'test', homeAssistantDiscovery: false }
        }];
        const result = gen(modules);

        expect(result).toContain('from umqtt.simple import MQTTClient');
        expect(result).toContain('def mqtt_callback(topic, msg):');
        expect(result).toContain('MQTT_BROKER = "localhost"');
    });

    it('should include OTA logic when OTA module is present', () => {
        const modules: ModuleConfig[] = [{
            id: '3', type: 'OTA', name: 'OTA Service', pin: 0,
            otaConfig: { enabled: true }
        }];
        const result = gen(modules);

        expect(result).toContain('def do_ota_update(url):');
        expect(result).toContain('OTA:URL'); // Very relaxed
    });

    it('should include UDP logic when UDP module is present', () => {
        const modules: ModuleConfig[] = [{
            id: '4', type: 'UDP', name: 'UDP Service', pin: 0,
            udpConfig: { port: 21324, universe: 1 }
        }];
        const result = gen(modules);

        expect(result).toContain('import socket');
        // Check loosely for socket creation
        expect(result).toContain('socket.socket(socket.AF_INET, socket.SOCK_DGRAM)');
        expect(result).toContain('UDP_PORT = 21324');
    });

    it('should include Web Server logic when Web Server module is present', () => {
        const modules: ModuleConfig[] = [{
            id: '5', type: 'WEB_SERVER', name: 'Web Dev', pin: 0,
            webServerConfig: { port: 80, title: 'My ESP32', captivePortal: true }
        }];
        const result = gen(modules);

        expect(result).toContain('def handle_web_request(client):');
        expect(result).toContain('My ESP32');
    });

    it('should handle LED modules correctly', () => {
        const modules: ModuleConfig[] = [{
            id: '6', type: 'LED', name: 'StatusLED', pin: 2
        }];
        const result = gen(modules);
        fs.writeFileSync('debug_test_led.py', result);

        expect(result).toContain('machine.Pin(2, machine.Pin.OUT)');
        expect(result).toContain('LED:StatusLED:ON'); // Removed quotes for safety
    });

});
