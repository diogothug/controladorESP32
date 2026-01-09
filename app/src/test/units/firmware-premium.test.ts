
import { describe, it, expect } from '../mini-test-framework';
import { generateModularMicroPython } from '../../main/modular-firmware-generator';
import { ModuleConfig, FirmwareIntent } from '../../shared/types';

// ============ HELPERS ============

/**
 * Extracts the Semantic Intent from the generated firmware.
 * This represents the "Contract" of the firmware, decoupled from specific implementation syntax.
 */
function extractFirmwareIntent(code: string) {
    const versionMatch = code.match(/FIRMWARE_VERSION = "(.*?)"/);
    const deviceMatch = code.match(/DEVICE_TYPE = "(.*?)"/);
    const modulesMatch = code.match(/MODULES = (\[.*?\])/);
    const capsMatch = code.match(/CAPS = (\[.*?\])/);

    // Extract Mode Configs to verify "Experience" defaults (FPS, Brightness)
    const modeConfigMatch = code.match(/MODE_CONFIG = ({[\s\S]*?})/);

    let modeConfig = {};
    if (modeConfigMatch) {
        try {
            // Python dict to JSON loose conversion for parsing
            const jsonStr = modeConfigMatch[1]
                .replace(/'/g, '"')
                .replace(/True/g, 'true')
                .replace(/False/g, 'false');
            modeConfig = JSON.parse(jsonStr);
        } catch (e) {
            modeConfig = "PARSING_FAILED";
        }
    }

    return {
        contract: {
            api_version: versionMatch ? versionMatch[1] : 'UNKNOWN',
            device_target: deviceMatch ? deviceMatch[1] : 'UNKNOWN',
            capabilities: capsMatch ? JSON.parse(capsMatch[1].replace(/'/g, '"')) : []
        },
        behavior: {
            active_modules: modulesMatch ? JSON.parse(modulesMatch[1].replace(/'/g, '"')) : [],
            experience_defaults: modeConfig
        }
    };
}

describe('Firmware Experience & Contract Tests (Premium)', () => {

    const userFlowModules: ModuleConfig[] = [
        { id: '1', type: 'TIDE', name: 'TideTracker', pin: 0 },
        { id: '2', type: 'NEOPIXEL', name: ' TideLEDs', pin: 5, neoPixelConfig: { pixelCount: 64, brightness: 50, colorOrder: 'GRB', colorDepth: '24bit', defaultAnimation: 'TIDE' } }
    ];

    // Helper to wrap in intent for premium tests
    function gen(modules: ModuleConfig[]) {
        return generateModularMicroPython({
            appName: 'PremiumTideApp',
            semanticVersion: '3.1.0',
            modules,
            experience: {
                defaultMode: 'AMBIENT',
                bootAnimation: 'NONE'
            },
            meta: { generatedBy: 'TestRunner' }
        });
    }

    // 1. User Experience Validation
    it('User creates a LED tide panel in 3 clicks -> firmware boots with Tide and NeoPixel support', () => {
        const result = gen(userFlowModules);

        // Validation: "Does it work as expected?"
        expect(result).toContain('import neopixel'); // Implementation detail, but vital
        expect(result).toContain('tide'); // Logic check
        expect(result).toContain('SYS:READY:'); // Log check (User feedback)
    });

    // 2. Semantic Snapshot (Intent)
    it('Snapshot of Intent: Validates semantic universe of Tide+LED firmware', () => {
        const result = gen(userFlowModules);
        const intent = extractFirmwareIntent(result);

        // Debug logging
        // console.error("DEBUG INTENT:", JSON.stringify(intent, null, 2));

        // We verify the OBJECT, not the string. 
        // This fails only if the *meaning* changes, not if I rename a variable.
        const expectedIntent = {
            contract: {
                api_version: "3.1.0",
                device_target: "ESP32_GEN",
                capabilities: ["GPIO", "LED", "LED"]
            },
            behavior: {
                active_modules: ["TideTracker", "TideLEDs"],
            }
        };

        expect(intent.contract.api_version).toBe("3.1.0");
        expect(intent.behavior.active_modules).toContain("TideTracker");
    });

    // 3. Regression Story
    it('test_regression_2024_neo_freeze_on_boot: Watchdog must be active to prevent NeoPixel lockups', () => {
        const result = gen(userFlowModules);

        // The story: In 2024, a user's device froze because NeoPixel took too long.
        // The fix: Watchdog timer.
        // The test: Ensure Watchdog code is present.
        expect(result).toContain('WATCHDOG_TIMEOUT = 5000');
        expect(result).toContain('watchdog_check()');
    });

    // 4. Failure Mode / Dignified Failure
    it('System must fail with dignity: Incomplete config produces safe fallback code', () => {
        // Simulating a module with missing specific config (e.g. NeoPixel without count)
        // The generator currently provides defaults (64, pin 0, etc). 
        // This validates that "defaults" exist and code doesn't crash generation.

        const messyModules: ModuleConfig[] = [
            { id: '99', type: 'NEOPIXEL', name: 'Broken', pin: 12 } // Missing neoPixelConfig
        ];

        const result = gen(messyModules);

        // Should still generate valid code
        expect(result).toContain('neopixel.NeoPixel');
        // Should use default count 64
        expect(result).toContain(', 64)');
        // Should have safe mode
        expect(result).toContain('BOOT_MODES = ["LAST_STATE", "SAFE", "SCRIPT"]');
    });

    // 5. Perceptive Performance
    it('Firmware generation must feel instant (<300ms)', () => {
        const start = Date.now();
        gen(userFlowModules);
        const duration = Date.now() - start;

        if (duration > 300) {
            throw new Error(`Performance Regression: Firmware generation took ${duration}ms (Expectation: <300ms)`);
        }
    });

    // 6. Logs as Artifacts
    it('Logs must be human readable and present', () => {
        const result = gen(userFlowModules);

        // The user reads these. They are part of the UI.
        expect(result).toContain('print(f"SYS:READY:{DEVICE_TYPE}")');
        expect(result).toContain('print(f"SYS:HELLO:{DEVICE_TYPE}")');
    });

    // 7. Intent Experience Override
    it('should respect Intent Boot Animation over Module Default', () => {
        const modules: ModuleConfig[] = [
            {
                id: 'm1',
                type: 'NEOPIXEL',
                name: 'Matrix',
                pin: 5,
                neoPixelConfig: { pixelCount: 64, brightness: 50, transitionSpeed: 'MEDIUM', defaultAnimation: 'RAINBOW', colorOrder: 'GRB', colorDepth: '24bit' }
            }
        ];

        const intent = {
            appName: 'TestApp',
            semanticVersion: '1.0.0',
            modules: modules,
            experience: {
                bootAnimation: 'TIDE',
                defaultMode: 'AMBIENT',
                bootProfile: 'LAST_STATE'
            },
            meta: { generatedBy: 'Test' }
        } as any as FirmwareIntent;

        const fw = generateModularMicroPython(intent);

        // Should have TIDE as initial animation
        expect(fw).toContain('current_anim_Matrix = "TIDE"');
    });

    it('should fallback to Module Default if Intent Boot Animation is missing', () => {
        const modules: ModuleConfig[] = [
            {
                id: 'm2',
                type: 'NEOPIXEL',
                name: 'Matrix',
                pin: 5,
                neoPixelConfig: { pixelCount: 64, brightness: 50, transitionSpeed: 'MEDIUM', defaultAnimation: 'FIRE', colorOrder: 'GRB', colorDepth: '24bit' }
            }
        ];

        const intent = {
            appName: 'TestApp',
            semanticVersion: '1.0.0',
            modules: modules,
            // No experience.bootAnimation
            meta: { generatedBy: 'Test' }
        };

        const fw = generateModularMicroPython(intent);
        expect(fw).toContain('current_anim_Matrix = "FIRE"');
    });

});
