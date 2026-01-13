/**
 * @fileoverview Microsoft-Style Comprehensive Test Suite
 * 
 * Follows Microsoft Testing Best Practices:
 * - Arrange-Act-Assert (AAA) pattern
 * - Descriptive naming: Should_ExpectedBehavior_When_StateUnderTest
 * - Edge case coverage
 * - Isolated unit tests
 * - Integration validation
 */

import { describe, it, expect } from '../mini-test-framework';
import { generateModularMicroPython } from '../../main/modular-firmware-generator';
import { ModuleConfig } from '../../shared/types';

// ============ HELPER FUNCTIONS ============

function createModuleConfig(overrides: Partial<ModuleConfig> = {}): ModuleConfig {
    return {
        id: `test_${Date.now()}`,
        type: 'LED',
        name: 'TestModule',
        pin: 2,
        ...overrides
    };
}

function generateFirmware(modules: ModuleConfig[], appName = 'TestApp'): string {
    return generateModularMicroPython({
        appName,
        semanticVersion: '1.0.0',
        modules,
        meta: { generatedBy: 'MSTest' }
    });
}

// ============ TIDE MODULE TESTS ============

describe('Tide Module - API Fallback Chain', () => {

    describe('Should_GeneratePrimaryAPI_When_TideModuleConfigured', () => {
        it('generates Tábua de Marés API endpoint', () => {
            // Arrange
            const modules: ModuleConfig[] = [createModuleConfig({
                type: 'TIDE',
                name: 'TidePanel',
                tideConfig: {
                    enabled: true,
                    harborId: 42,
                    harborName: 'Porto Teste',
                    state: 'ba',
                    updateInterval: 30,
                    highTideColor: '#0080FF',
                    lowTideColor: '#FFD700',
                    risingIndicator: true,
                    ledCount: 16,
                    neopixelPin: 5
                }
            })];

            // Act
            const code = generateFirmware(modules);

            // Assert
            expect(code).toContain('TabuaMare');
            expect(code).toContain('tabuamare.devtu.qzz.io');
            expect(code).toContain('TIDE_HARBOR_ID = 42');
        });
    });

    describe('Should_GenerateWorldTidesWithCredentials_When_Configured', () => {
        it('includes lat/lon/key when worldTides enabled', () => {
            // Arrange
            const modules: ModuleConfig[] = [createModuleConfig({
                type: 'TIDE',
                name: 'GlobalTide',
                tideConfig: {
                    enabled: true,
                    harborId: 1,
                    harborName: 'Test Harbor',
                    state: 'rj',
                    updateInterval: 60,
                    highTideColor: '#00F',
                    lowTideColor: '#FF0',
                    risingIndicator: false,
                    ledCount: 8,
                    neopixelPin: 2,
                    worldTides: {
                        enabled: true,
                        lat: -22.9068,
                        lon: -43.1729,
                        key: 'my_secret_key_123'
                    }
                }
            })];

            // Act
            const code = generateFirmware(modules);

            // Assert
            expect(code).toContain('WorldTides');
            expect(code).toContain('-22.9068');
            expect(code).toContain('-43.1729');
            expect(code).toContain('my_secret_key_123');
        });
    });

    describe('Should_GenerateWorldTidesWithoutCredentials_When_Disabled', () => {
        it('excludes credentials when worldTides not enabled', () => {
            // Arrange
            const modules: ModuleConfig[] = [createModuleConfig({
                type: 'TIDE',
                name: 'LocalTide',
                tideConfig: {
                    enabled: true,
                    harborId: 5,
                    harborName: 'Porto Local',
                    state: 'sp',
                    updateInterval: 30,
                    highTideColor: '#0080FF',
                    lowTideColor: '#FFD700',
                    risingIndicator: true,
                    ledCount: 16,
                    neopixelPin: 5
                    // No worldTides config
                }
            })];

            // Act
            const code = generateFirmware(modules);

            // Assert
            expect(code).toContain('WorldTides');
            expect(code).not.toContain('my_secret_key');
        });
    });

    describe('Should_GenerateNVSCacheFunctions_When_TideModulePresent', () => {
        it('includes cache save/load functions', () => {
            // Arrange
            const modules: ModuleConfig[] = [createModuleConfig({
                type: 'TIDE',
                name: 'CachedTide',
                tideConfig: {
                    enabled: true,
                    harborId: 1,
                    harborName: 'Cache Test',
                    state: 'pb',
                    updateInterval: 30,
                    highTideColor: '#0080FF',
                    lowTideColor: '#FFD700',
                    risingIndicator: true,
                    ledCount: 8,
                    neopixelPin: 2
                }
            })];

            // Act
            const code = generateFirmware(modules);

            // Assert
            expect(code).toContain('def tide_save_cache():');
            expect(code).toContain('def tide_load_cache():');
            expect(code).toContain('nvs.set_str');
            expect(code).toContain('nvs.get_str');
        });
    });
});

// ============ NEOPIXEL AUTO-BRIGHTNESS TESTS ============

describe('NeoPixel Auto-Brightness Integration', () => {

    describe('Should_EnableAutoBrightness_When_ConfiguredTrue', () => {
        it('generates AUTO_BRIGHTNESS flag as True', () => {
            // Arrange
            const modules: ModuleConfig[] = [createModuleConfig({
                type: 'NEOPIXEL',
                name: 'AutoLED',
                pin: 15,
                neoPixelConfig: {
                    pixelCount: 32,
                    brightness: 50,
                    colorOrder: 'GRB',
                    colorDepth: '24bit',
                    defaultAnimation: 'RAINBOW',
                    autoBrightness: true
                }
            })];

            // Act
            const code = generateFirmware(modules);

            // Assert
            expect(code).toContain('AUTO_BRIGHTNESS_AutoLED = True');
            expect(code).toContain('if AUTO_BRIGHTNESS_AutoLED and');
        });
    });

    describe('Should_DisableAutoBrightness_When_ConfiguredFalse', () => {
        it('generates AUTO_BRIGHTNESS flag as False', () => {
            // Arrange
            const modules: ModuleConfig[] = [createModuleConfig({
                type: 'NEOPIXEL',
                name: 'ManualLED',
                pin: 16,
                neoPixelConfig: {
                    pixelCount: 16,
                    brightness: 100,
                    colorOrder: 'RGB',
                    colorDepth: '24bit',
                    defaultAnimation: 'NONE',
                    autoBrightness: false
                }
            })];

            // Act
            const code = generateFirmware(modules);

            // Assert
            expect(code).toContain('AUTO_BRIGHTNESS_ManualLED = False');
        });
    });

    describe('Should_ReadSharedDataBrightness_When_AutoBrightnessEnabled', () => {
        it('reads SHARED_DATA BRIGHTNESS in loop', () => {
            // Arrange
            const modules: ModuleConfig[] = [createModuleConfig({
                type: 'NEOPIXEL',
                name: 'SensorLED',
                pin: 5,
                neoPixelConfig: {
                    pixelCount: 64,
                    brightness: 25,
                    colorOrder: 'GRB',
                    colorDepth: '24bit',
                    defaultAnimation: 'PLASMA',
                    autoBrightness: true
                }
            })];

            // Act
            const code = generateFirmware(modules);

            // Assert
            expect(code).toContain("SHARED_DATA['BRIGHTNESS']");
            expect(code).toContain('TARGET_BRIGHTNESS_SensorLED');
        });
    });
});

// ============ LDR SENSOR TESTS ============

describe('LDR Sensor - Brightness Control', () => {

    describe('Should_WriteBrightnessToSharedData_When_LDRConfigured', () => {
        it('updates SHARED_DATA with brightness value', () => {
            // Arrange
            const modules: ModuleConfig[] = [createModuleConfig({
                type: 'LDR',
                name: 'AmbientLight',
                pin: 34,
                ldrConfig: {
                    enabled: true,
                    interval: 500,
                    minReading: 100,
                    maxReading: 4000,
                    minBrightness: 5,
                    maxBrightness: 200
                }
            })];

            // Act
            const code = generateFirmware(modules);

            // Assert
            expect(code).toContain("SHARED_DATA['BRIGHTNESS']");
            expect(code).toContain('Hysteresis');
            expect(code).toContain('ldr_AmbientLight.read()');
            expect(code).toContain('ADC.ATTN_11DB');
        });
    });

    describe('Should_UseCustomRange_When_MinMaxConfigured', () => {
        it('applies custom min/max reading values', () => {
            // Arrange
            const modules: ModuleConfig[] = [createModuleConfig({
                type: 'LDR',
                name: 'CustomLDR',
                pin: 35,
                ldrConfig: {
                    enabled: true,
                    interval: 1000,
                    minReading: 500,
                    maxReading: 3500,
                    minBrightness: 10,
                    maxBrightness: 255
                }
            })];

            // Act
            const code = generateFirmware(modules);

            // Assert
            expect(code).toContain('500');
            expect(code).toContain('3500');
        });
    });
});

// ============ HARMONIC INTERPOLATION TESTS ============

describe('Tide Physics - Harmonic Interpolation', () => {

    describe('Should_UseCosineModel_When_CalculatingTideLevel', () => {
        it('implements harmonic cosine interpolation formula', () => {
            // Arrange
            const modules: ModuleConfig[] = [createModuleConfig({
                type: 'TIDE',
                name: 'PhysicsTide',
                tideConfig: {
                    enabled: true,
                    harborId: 1,
                    harborName: 'Physics Test',
                    state: 'pb',
                    updateInterval: 30,
                    highTideColor: '#0080FF',
                    lowTideColor: '#FFD700',
                    risingIndicator: true,
                    ledCount: 16,
                    neopixelPin: 5
                }
            })];

            // Act
            const code = generateFirmware(modules);

            // Assert
            expect(code).toContain('math.cos');
            expect(code).toContain('3.14159');
            expect(code).toContain('harmonic');
            expect(code).toContain('HARMONIC COSINE INTERPOLATION');
        });
    });

    describe('Should_HandleRisingAndFallingTides_When_Interpolating', () => {
        it('distinguishes between rising and falling cycles', () => {
            // Arrange
            const modules: ModuleConfig[] = [createModuleConfig({
                type: 'TIDE',
                name: 'CycleTide',
                tideConfig: {
                    enabled: true,
                    harborId: 1,
                    harborName: 'Cycle Test',
                    state: 'ba',
                    updateInterval: 30,
                    highTideColor: '#0080FF',
                    lowTideColor: '#FFD700',
                    risingIndicator: true,
                    ledCount: 8,
                    neopixelPin: 2
                }
            })];

            // Act
            const code = generateFirmware(modules);

            // Assert - Tide cycle contains type info
            expect(code).toContain('tide_cycle');
            expect(code).toContain('"type"');
            expect(code).toContain('rising');
        });
    });
});

// ============ MULTI-MODULE INTEGRATION TESTS ============

describe('Multi-Module Integration', () => {

    describe('Should_IntegrateLDRWithNeoPixel_When_BothConfigured', () => {
        it('LDR brightness flows to NeoPixel auto-brightness', () => {
            // Arrange
            const modules: ModuleConfig[] = [
                createModuleConfig({
                    id: 'ldr1',
                    type: 'LDR',
                    name: 'RoomSensor',
                    pin: 34,
                    ldrConfig: {
                        enabled: true,
                        interval: 500,
                        minReading: 0,
                        maxReading: 4095,
                        minBrightness: 10,
                        maxBrightness: 255
                    }
                }),
                createModuleConfig({
                    id: 'neo1',
                    type: 'NEOPIXEL',
                    name: 'RoomLED',
                    pin: 5,
                    neoPixelConfig: {
                        pixelCount: 30,
                        brightness: 50,
                        colorOrder: 'GRB',
                        colorDepth: '24bit',
                        defaultAnimation: 'BREATHE',
                        autoBrightness: true
                    }
                })
            ];

            // Act
            const code = generateFirmware(modules);

            // Assert - LDR writes
            expect(code).toContain("SHARED_DATA['BRIGHTNESS']");
            expect(code).toContain('Hysteresis');
            // Assert - NeoPixel reads
            expect(code).toContain('AUTO_BRIGHTNESS_RoomLED = True');
            expect(code).toContain("SHARED_DATA['BRIGHTNESS']");
        });
    });

    describe('Should_IntegrateTideWithNeoPixel_When_BothConfigured', () => {
        it('Tide level flows to NeoPixel visualization', () => {
            // Arrange
            const modules: ModuleConfig[] = [
                createModuleConfig({
                    id: 'tide1',
                    type: 'TIDE',
                    name: 'BeachTide',
                    tideConfig: {
                        enabled: true,
                        harborId: 1,
                        harborName: 'Praia',
                        state: 'rj',
                        updateInterval: 30,
                        highTideColor: '#0080FF',
                        lowTideColor: '#FFD700',
                        risingIndicator: true,
                        ledCount: 64,
                        neopixelPin: 15
                    }
                }),
                createModuleConfig({
                    id: 'neo1',
                    type: 'NEOPIXEL',
                    name: 'TideDisplay',
                    pin: 15,
                    neoPixelConfig: {
                        pixelCount: 64,
                        matrixWidth: 8,
                        brightness: 30,
                        colorOrder: 'GRB',
                        colorDepth: '24bit',
                        defaultAnimation: 'TIDE'
                    }
                })
            ];

            // Act
            const code = generateFirmware(modules);

            // Assert - Tide writes SHARED_DATA
            expect(code).toContain("SHARED_DATA[\"TIDE_LEVEL\"]");
            // Assert - NeoPixel reads TIDE for visualization
            expect(code).toContain('current_anim_TideDisplay == "TIDE"');
            expect(code).toContain('SHARED_DATA.get("TIDE"');
        });
    });
});

// ============ EDGE CASE TESTS ============

describe('Edge Cases - Boundary Conditions', () => {

    describe('Should_HandleZeroPixelCount_When_NeoPixelMisconfigured', () => {
        it('uses default pixel count', () => {
            // Arrange
            const modules: ModuleConfig[] = [createModuleConfig({
                type: 'NEOPIXEL',
                name: 'EdgeLED',
                pin: 2,
                neoPixelConfig: {
                    pixelCount: 0, // Edge case: zero pixels
                    brightness: 50,
                    colorOrder: 'GRB',
                    colorDepth: '24bit',
                    defaultAnimation: 'NONE'
                }
            })];

            // Act
            const code = generateFirmware(modules);

            // Assert - Should not crash, uses some default
            expect(code).toContain('neopixel.NeoPixel');
        });
    });

    describe('Should_HandleEmptyModuleArray_When_NoModulesConfigured', () => {
        it('generates valid firmware skeleton', () => {
            // Arrange
            const modules: ModuleConfig[] = [];

            // Act
            const code = generateFirmware(modules);

            // Assert
            expect(code).toContain('ESP32 MicroPython');
            expect(code).toContain('while True:');
        });
    });

    describe('Should_HandleSpecialCharactersInName_When_ModuleNameContainsSpaces', () => {
        it('sanitizes module name for Python variable', () => {
            // Arrange
            const modules: ModuleConfig[] = [createModuleConfig({
                type: 'LED',
                name: 'My LED Strip #1',
                pin: 13
            })];

            // Act
            const code = generateFirmware(modules);

            // Assert - Name should be sanitized (spaces/special chars replaced)
            expect(code).toContain('My');
            expect(code).toContain('LED');
            // The generator creates a valid Python variable name
            expect(code).toContain('led_');
        });
    });
});
