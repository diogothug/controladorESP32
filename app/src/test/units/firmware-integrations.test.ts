
import { describe, it, expect } from '../mini-test-framework';
import { generateModularMicroPython } from '../../main/modular-firmware-generator';
import { FirmwareIntent, ModuleConfig } from '../../shared/types';

describe('Firmware Integrations (Phase 4)', () => {

    function gen(modules: ModuleConfig[]): string {
        const intent: FirmwareIntent = {
            appName: 'IntegTest',
            semanticVersion: '4.1.0',
            modules: modules,
            meta: { generatedBy: 'Test' }
        };
        return generateModularMicroPython(intent);
    }

    it('should generate MQTT logic with Discovery', () => {
        const fw = gen([{
            id: 'mqtt1', type: 'MQTT', name: 'HomeAssistant', pin: 0,
            mqttConfig: { broker: '192.168.1.5', port: 1883, topicPrefix: 'device', homeAssistantDiscovery: true, user: 'admin', password: 'pw' }
        }]);

        expect(fw).toContain('from umqtt.simple import MQTTClient');
        expect(fw).toContain('MQTT_BROKER = "192.168.1.5"');
        expect(fw).toContain('homeassistant/light/'); // Discovery topic
        expect(fw).toContain('"name": "HomeAssistant"'); // Discovery payload
    });

    it('should generate OTA logic', () => {
        const fw = gen([{
            id: 'ota1', type: 'OTA', name: 'OverTheAir', pin: 0,
            otaConfig: { enabled: true }
        }]);

        expect(fw).toContain('def do_ota_update(url):');
        expect(fw).toContain('urequests.get(url)');
        expect(fw).toContain('machine.reset()');
    });

    it('should generate UDP Sync logic', () => {
        const fw = gen([{
            id: 'udp1', type: 'UDP', name: 'RealTime', pin: 0,
            udpConfig: { port: 21324, universe: 1 }
        }]);

        expect(fw).toContain('socket.SOCK_DGRAM');
        expect(fw).toContain('UDP_PORT = 21324');
        expect(fw).toContain('udp_poll.register');
    });

    it('should generate Web API /api/screen logic', () => {
        const fw = gen([{
            id: 'web1', type: 'WEB_SERVER', name: 'API Server', pin: 0,
            webServerConfig: { port: 80, title: 'API', captivePortal: true }
        }]);

        expect(fw).toContain('path == "/api/screen"');
        expect(fw).toContain('body = json.loads(body_str)');
        expect(fw).toContain('handle_command(f"DISP:TEXT:{x}:{y}:{msg}")');
    });

});
