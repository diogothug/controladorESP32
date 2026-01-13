
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
            { id: 'temp1', type: 'TEMP_SENSOR', name: 'Env', pin: 4 }
        ]);

        // Button
        expect(fw).toContain('dispatch_event(f"BTN:B1:PRESS:{btn_B1_count}")');
        expect(fw).toContain('dispatch_event(f"BTN:B1:RELEASE")');

        // PIR
        expect(fw).toContain('dispatch_event(f"PIR:Motion:MOTION:{pir_Motion_motion_count}")');

        // LDR
        expect(fw).toContain('dispatch_event(f"LDR:Light:CHANGE:{ldr_Light_current_bright}")');

        // TEMP
        expect(fw).toContain('dispatch_event(f"TEMP:Env:UPDATE:{last_temp_Env}:{last_humid_Env}")');
    });

    it('should inject dispatch_event into Base Template', () => {
        const fw = gen([]); // No modules
        expect(fw).toContain('def dispatch_event(evt):');
        expect(fw).toContain('print(f"EVT:{evt}")');
        expect(fw).toContain('if \'check_rules\' in globals():');
    });

    it('should handle Empty Rules gracefully (Edge Case)', () => {
        const fw = gen([{
            id: 'auto2', type: 'AUTOMATION', name: 'EmptyRules', pin: 0,
            automationConfig: { rules: [], timers: [] }
        }]);
        // Should still generate the framework but with empty lists
        expect(fw).toContain('RULES = []');
        expect(fw).toContain('TIMERS = []');
    });

    it('should handle Complex Wildcards and Invalid Commands (Edge Case)', () => {
        const fw = gen([{
            id: 'auto3', type: 'AUTOMATION', name: 'ComplexRules', pin: 0,
            automationConfig: {
                rules: [
                    { trigger: 'BTN:*:PRESS', command: 'GARBAGE_CMD' }, // Valid trigger, unknown cmd
                    { trigger: 'INVALID_TRIG', command: 'RELAY:0:ON' }  // Invalid trigger format
                ],
                timers: []
            }
        }]);
        // The generator treats strings as opaque, so it should just pass them through.
        // The robustness is runtime (in C++ or Python firmware), but here we check correct generation.
        expect(fw).toContain('("BTN:*:PRESS", "GARBAGE_CMD")');
        expect(fw).toContain('("INVALID_TRIG", "RELAY:0:ON")');
    });

});
