
import { describe, it, expect } from '../mini-test-framework';
import { generateModularMicroPython } from '../../main/modular-firmware-generator';
import { ModuleConfig } from '../../shared/types';

describe('TIDE Visual Language Spec', () => {

    function genTideFirmware(tideConfig: any = {}, mode: 'PROD' | 'DEBUG' = 'DEBUG') {
        const config: ModuleConfig[] = [{
            id: 'netide',
            type: 'NEOPIXEL',
            name: 'TideDisp',
            pin: 15,
            neoPixelConfig: {
                pixelCount: 256,
                brightness: 50,
                colorOrder: 'GRB',
                colorDepth: '24bit',
                defaultAnimation: 'TIDE',
                matrixWidth: 32,
                matrixHeight: 8,
                autoBrightness: false,
                ...tideConfig
            }
        }];

        // We can't easily switch PROD/DEBUG in the generator without changing the code or a flag, 
        // but currently it is hardcoded to DEBUG in the source. 
        // The tests will verify what IS generated.
        return generateModularMicroPython({
            appName: 'TideSpec',
            semanticVersion: '1.0.0',
            modules: config,
            meta: { generatedBy: 'Test' }
        });
    }

    it('should implement the correct Layered Architecture', () => {
        const fw = genTideFirmware();

        // 1. Base Layer (Depth Color)
        expect(fw).toContain('c = get_tide_depth_color(level, y, water_rows)');

        // 2. Trend Layer (Sine Wave Flow)
        expect(fw).toContain('theta = (y * 0.5) + flow_offset_TideDisp');
        expect(fw).toContain('flow_boost = 1.0 + (wave * 0.15)');

        // 3. Ambient Layer (Events)
        expect(fw).toContain('for evt in ambient_events_TideDisp:');

        // Validation: Order matters. Ambient comes AFTER Base and Trend.
        const baseIdx = fw.indexOf('get_tide_depth_color');
        const trendIdx = fw.indexOf('flow_offset_TideDisp');
        const ambientIdx = fw.indexOf('for evt in ambient_events_TideDisp:');

        expect(baseIdx).toBeLessThan(trendIdx);
        expect(trendIdx).toBeLessThan(ambientIdx);
    });

    it('should strictly comply with Fish Spec', () => {
        const fw = genTideFirmware();

        // Shape: 2 pixels
        expect(fw).toContain('is_head = (x == ex_int and y == ey)');
        expect(fw).toContain('is_tail = (x == (ex_int - evt["dir"]) and y == ey)');

        // Color: Derived from base (Visual Contract)
        expect(fw).toContain('r = min(255, int(c[0] * 1.12))'); // Base boost
        expect(fw).toContain('g = min(255, int(g + c[1] * 0.05))'); // Green tint

        // Movement: Constant speed
        expect(fw).toContain('speed": 0.025'); // 25 / 1000 = very slow ? No, 0.025 per frame.
        expect(fw).toContain('evt["dist"] += move'); // No easing

        // Constraints
        expect(fw).toContain('start_y = random.randint(2, water_rows - 3)');
        expect(fw).toContain('can_spawn_fish = (direction != "steady") and (water_rows >= 6)');
    });

    it('should enforce Ambient Event Rarity and Limits', () => {
        const fw = genTideFirmware();

        // Max 1 event (Hard Lock)
        expect(fw).toContain('if len(ambient_events_TideDisp) == 0:');

        // Timings (Check for the constants presence)
        // Since code is currently technically hardcoded to DEBUG for dev, we expect those values
        // ideally we'd regex both potential sets or check logic.
        expect(fw).toContain('INTERVAL_BUBBLE = (5000, 10000)');
        // Note: If we change to PROD, this test should be updated or checking the flag
    });

    it('should implement Bubble Pop protection at surface', () => {
        const fw = genTideFirmware();
        expect(fw).toContain('if evt["y"] >= (water_rows - 2):');
    });

    it('should freeze Trend Flow when Steady', () => {
        const fw = genTideFirmware();
        // Check separate if logic for updating offset
        expect(fw).toContain('if direction == "rising":');
        expect(fw).toContain('flow_offset_TideDisp -= 0.05');
        // Logic implies if not rising or falling (i.e. steady), nothing happens to offset.
    });

});
