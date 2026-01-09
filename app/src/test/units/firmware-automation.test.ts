
import { describe, it, expect } from '../mini-test-framework';
import { generateModularMicroPython } from '../../main/modular-firmware-generator';
import { ModuleConfig } from '../../shared/types';

describe('Phase 6: Automation', () => {

    function gen(modules: ModuleConfig[]) {
        return generateModularMicroPython({
            appName: 'AutoTest',
            semanticVersion: '1.0.0',
            modules,
            meta: { generatedBy: 'Test' }
        });
    }

    it('should generate Automation module structure', () => {
        const fw = gen([{
            id: 'auto1', type: 'AUTOMATION', name: 'Rules', pin: 0,
            automationConfig: {
                rules: [
                    { trigger: 'BTN:*:PRESS', command: 'RELAY:0:ON' }
                ],
                timers: [
                    { time: '08:00', command: 'RELAY:0:OFF' }
                ]
            }
        }]);

        expect(fw).toContain('import re');
        expect(fw).toContain('RULES = [("BTN:*:PRESS", "RELAY:0:ON")]');
        expect(fw).toContain('TIMERS = [{ "time": "08:00", "cmd": "RELAY:0:OFF" }]');
        expect(fw).toContain('def check_rules(evt):');
    });

    it('should inject dispatch_event into Input Modules', () => {
        const fw = gen([
            { id: 'btn1', type: 'BUTTON', name: 'B1', pin: 0 },
            { id: 'pir1', type: 'PIR', name: 'Motion', pin: 16 },
            { id: 'ldr1', type: 'LDR', name: 'Light', pin: 36, ldrConfig: { interval: 1000 } as any },
            { id: 'mic1', type: 'MIC', name: 'Sound', pin: 35 },
            { id: 'temp1', type: 'TEMP_SENSOR', name: 'Env', pin: 4 }
        ]);

        // Button
        expect(fw).toContain('dispatch_event(f"BTN:B1:PRESS:{btn_B1_count}")');
        expect(fw).toContain('dispatch_event(f"BTN:B1:RELEASE")');

        // PIR
        expect(fw).toContain('dispatch_event(f"PIR:Motion:MOTION:{pir_Motion_motion_count}")');

        // LDR
        expect(fw).toContain('dispatch_event(f"LDR:Light:CHANGE:{bright}")');

        // MIC
        expect(fw).toContain('dispatch_event(f"MIC:Sound:LOUD:{mic_val}")');

        // TEMP
        expect(fw).toContain('dispatch_event(f"TEMP:Env:UPDATE:{last_temp_Env}:{last_humid_Env}")');
    });

    it('should inject dispatch_event into Base Template', () => {
        const fw = gen([]); // No modules
        expect(fw).toContain('def dispatch_event(evt):');
        expect(fw).toContain('print(f"EVT:{evt}")');
        expect(fw).toContain('if \'check_rules\' in globals():');
    });

});
