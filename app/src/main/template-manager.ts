// Template Manager - Handles device templates for hardware presets
import * as path from 'path';
import * as fs from 'fs';
import { DeviceTemplate, GPIOConfig, ModuleConfig, GPIOFunction } from '../shared/types';

// Templates directory
const TEMPLATES_DIR = path.join(__dirname, '../../templates');

/**
 * TemplateManager - Manages device templates for hardware configuration
 */
export class TemplateManager {
    private builtInTemplates: DeviceTemplate[];
    private userTemplatesDir: string;

    constructor() {
        this.userTemplatesDir = TEMPLATES_DIR;
        this.builtInTemplates = this.initBuiltInTemplates();

        // Ensure templates directory exists
        if (!fs.existsSync(this.userTemplatesDir)) {
            fs.mkdirSync(this.userTemplatesDir, { recursive: true });
        }
    }

    /**
     * Initialize built-in templates for common hardware
     */
    private initBuiltInTemplates(): DeviceTemplate[] {
        return [
            // ESP32 DevKit V1
            {
                id: 'esp32_devkit_v1',
                name: 'ESP32 DevKit V1',
                description: 'ESP32 Development Board with 30/38 pins',
                platform: 'esp32',
                board: 'devkit_v1',
                author: 'System',
                version: '1.0.0',
                created: Date.now(),
                gpioConfig: [
                    { pin: 2, function: 'LED', name: 'Built-in LED' },
                    { pin: 4, function: 'NEOPIXEL', name: 'NeoPixel Data' },
                    { pin: 21, function: 'I2C_SDA', name: 'I2C SDA' },
                    { pin: 22, function: 'I2C_SCL', name: 'I2C SCL' },
                    { pin: 34, function: 'ADC', name: 'ADC Input' },
                    { pin: 25, function: 'DAC', name: 'DAC Output' },
                ],
                defaultModules: [
                    { type: 'LED', name: 'LED Onboard', pin: 2 },
                    { type: 'NEOPIXEL', name: 'NeoPixel Strip', pin: 4 },
                ],
                wifiDefaults: {
                    mode: 'STA',
                    hostname: 'esp32-device',
                },
                firmwareHints: {
                    flashSize: '4MB',
                    psramRequired: false,
                },
                tags: ['esp32', 'devkit', 'development', 'beginner'],
            },

            // ESP32 WROOM-32
            {
                id: 'esp32_wroom_32',
                name: 'ESP32 WROOM-32',
                description: 'ESP32 WROOM module (generic)',
                platform: 'esp32',
                board: 'wroom_32',
                author: 'System',
                version: '1.0.0',
                created: Date.now(),
                gpioConfig: [
                    { pin: 2, function: 'LED', name: 'Status LED' },
                    { pin: 5, function: 'RELAY', name: 'Relay Control' },
                    { pin: 18, function: 'NEOPIXEL', name: 'LED Strip' },
                ],
                defaultModules: [
                    { type: 'LED', name: 'Status LED', pin: 2 },
                ],
                tags: ['esp32', 'wroom', 'generic'],
            },

            // Arduino UNO
            {
                id: 'arduino_uno',
                name: 'Arduino UNO',
                description: 'Arduino UNO R3 (ATmega328P)',
                platform: 'arduino',
                board: 'uno',
                author: 'System',
                version: '1.0.0',
                created: Date.now(),
                gpioConfig: [
                    { pin: 13, function: 'LED', name: 'Built-in LED' },
                    { pin: 6, function: 'NEOPIXEL', name: 'NeoPixel Data' },
                    { pin: 2, function: 'BUTTON', name: 'Button', pullup: true },
                    { pin: 3, function: 'PWM', name: 'PWM Output' },
                    { pin: 0, function: 'ADC', name: 'A0 Input' }, // A0
                ],
                defaultModules: [
                    { type: 'LED', name: 'LED 13', pin: 13 },
                ],
                tags: ['arduino', 'uno', 'beginner', 'avr'],
            },

            // Arduino Nano
            {
                id: 'arduino_nano',
                name: 'Arduino Nano',
                description: 'Arduino Nano (ATmega328P)',
                platform: 'arduino',
                board: 'nano',
                author: 'System',
                version: '1.0.0',
                created: Date.now(),
                gpioConfig: [
                    { pin: 13, function: 'LED', name: 'Built-in LED' },
                    { pin: 6, function: 'NEOPIXEL', name: 'NeoPixel Data' },
                ],
                defaultModules: [
                    { type: 'LED', name: 'LED 13', pin: 13 },
                ],
                tags: ['arduino', 'nano', 'compact'],
            },

            // NodeMCU V3 (ESP8266)
            {
                id: 'nodemcu_v3',
                name: 'NodeMCU V3',
                description: 'NodeMCU V3 ESP8266 12-E',
                platform: 'esp8266',
                board: 'nodemcu',
                author: 'System',
                version: '1.0.0',
                created: Date.now(),
                gpioConfig: [
                    { pin: 2, function: 'LED', name: 'Built-in LED', inverted: true },
                    { pin: 16, function: 'RELAY', name: 'Relay' },
                    { pin: 5, function: 'NEOPIXEL', name: 'NeoPixel Data' },
                ],
                defaultModules: [
                    { type: 'LED', name: 'LED D4', pin: 2, inverted: true },
                ],
                wifiDefaults: {
                    mode: 'STA',
                    hostname: 'nodemcu-device',
                },
                tags: ['esp8266', 'nodemcu', 'wifi'],
            },

            // Wemos D1 Mini
            {
                id: 'wemos_d1_mini',
                name: 'Wemos D1 Mini',
                description: 'Wemos D1 Mini ESP8266',
                platform: 'esp8266',
                board: 'd1_mini',
                author: 'System',
                version: '1.0.0',
                created: Date.now(),
                gpioConfig: [
                    { pin: 2, function: 'LED', name: 'Built-in LED', inverted: true },
                    { pin: 5, function: 'I2C_SCL', name: 'D1 (SCL)' },
                    { pin: 4, function: 'I2C_SDA', name: 'D2 (SDA)' },
                    { pin: 14, function: 'NEOPIXEL', name: 'D5 (NeoPixel)' },
                ],
                defaultModules: [
                    { type: 'LED', name: 'LED D4', pin: 2, inverted: true },
                ],
                tags: ['esp8266', 'wemos', 'd1', 'mini', 'compact'],
            },

            // ESP32-CAM
            {
                id: 'esp32_cam',
                name: 'ESP32-CAM',
                description: 'ESP32-CAM with OV2640 Camera',
                platform: 'esp32',
                board: 'esp32cam',
                author: 'System',
                version: '1.0.0',
                created: Date.now(),
                gpioConfig: [
                    { pin: 4, function: 'LED', name: 'Flash LED' },
                    { pin: 33, function: 'LED', name: 'Red LED', inverted: true },
                ],
                defaultModules: [
                    { type: 'LED', name: 'Flash LED', pin: 4 },
                ],
                firmwareHints: {
                    flashSize: '4MB',
                    psramRequired: true,
                },
                tags: ['esp32', 'camera', 'cam', 'ov2640'],
            },

            // Sonoff Basic
            {
                id: 'sonoff_basic',
                name: 'Sonoff Basic',
                description: 'Sonoff Basic WiFi Smart Switch',
                platform: 'esp8266',
                board: 'sonoff',
                author: 'System',
                version: '1.0.0',
                created: Date.now(),
                gpioConfig: [
                    { pin: 12, function: 'RELAY', name: 'Main Relay' },
                    { pin: 13, function: 'LED', name: 'Status LED', inverted: true },
                    { pin: 0, function: 'BUTTON', name: 'Button', pullup: true },
                ],
                defaultModules: [
                    { type: 'RELAY', name: 'Relay', pin: 12 },
                    { type: 'LED', name: 'Status LED', pin: 13, inverted: true },
                    { type: 'BUTTON', name: 'Button', pin: 0 },
                ],
                wifiDefaults: {
                    mode: 'STA',
                    hostname: 'sonoff-switch',
                },
                tags: ['sonoff', 'relay', 'smart-home', 'switch'],
            },

            // ========== PRODUCT PRESETS ==========

            // Tide Display (Mostrador de Marés)
            {
                id: 'tide_display',
                name: '🌊 Mostrador de Marés',
                description: 'Painel LED que mostra nível e horário das marés',
                platform: 'esp32',
                board: 'devkit_v1',
                author: 'Diogo',
                version: '1.0.0',
                created: Date.now(),
                gpioConfig: [
                    { pin: 2, function: 'LED', name: 'Status LED' },
                    { pin: 4, function: 'NEOPIXEL', name: 'LED Matrix' },
                    { pin: 34, function: 'ADC', name: 'LDR Brightness' },
                ],
                defaultModules: [
                    { type: 'WIFI', name: 'WiFi', pin: 0 },
                    { type: 'NEOPIXEL', name: 'LED Matrix', pin: 4 },
                    { type: 'TIDE', name: 'Tide API', pin: 0 },
                    { type: 'LDR', name: 'Auto Brightness', pin: 34 },
                    { type: 'LED', name: 'Status LED', pin: 2 },
                    { type: 'TELEMETRY', name: 'Analytics', pin: 0 },
                ],
                wifiDefaults: {
                    mode: 'STA',
                    hostname: 'tide-display',
                },
                firmwareHints: {
                    flashSize: '4MB',
                },
                tags: ['tide', 'led', 'display', 'marine', 'product'],
            },

            // Bluetooth Audio Box (Caixa Bluetooth)
            {
                id: 'bluetooth_audio_box',
                name: '🔊 Caixa Bluetooth LED',
                description: 'Visualizador de áudio com LEDs reativos e Bluetooth',
                platform: 'esp32',
                board: 'devkit_v1',
                author: 'Diogo',
                version: '1.0.0',
                created: Date.now(),
                gpioConfig: [
                    { pin: 2, function: 'LED', name: 'Status LED' },
                    { pin: 4, function: 'NEOPIXEL', name: 'LED Strip' },
                    { pin: 34, function: 'ADC', name: 'Microphone' },
                    { pin: 0, function: 'BUTTON', name: 'Mode Button', pullup: true },
                ],
                defaultModules: [
                    { type: 'NEOPIXEL', name: 'LED Strip', pin: 4 },
                    { type: 'AUDIO', name: 'Audio Reactive', pin: 34 },
                    { type: 'BLE', name: 'Bluetooth', pin: 0 },
                    { type: 'MODE', name: 'Light Modes', pin: 0 },
                    { type: 'BUTTON', name: 'Mode Button', pin: 0 },
                    { type: 'LED', name: 'Status LED', pin: 2 },
                    { type: 'TELEMETRY', name: 'Analytics', pin: 0 },
                ],
                firmwareHints: {
                    flashSize: '4MB',
                },
                tags: ['bluetooth', 'audio', 'led', 'reactive', 'speaker', 'product'],
            },

            // Bitcoin Ticker (Mostrador de Bitcoin)
            {
                id: 'bitcoin_ticker',
                name: '₿ Bitcoin Ticker',
                description: 'Display de preço do Bitcoin com indicador LED',
                platform: 'esp32',
                board: 'devkit_v1',
                author: 'Diogo',
                version: '1.0.0',
                created: Date.now(),
                gpioConfig: [
                    { pin: 2, function: 'LED', name: 'Status LED' },
                    { pin: 4, function: 'NEOPIXEL', name: 'Price Indicator' },
                    { pin: 21, function: 'I2C_SDA', name: 'OLED SDA' },
                    { pin: 22, function: 'I2C_SCL', name: 'OLED SCL' },
                ],
                defaultModules: [
                    { type: 'WIFI', name: 'WiFi', pin: 0 },
                    { type: 'DISPLAY', name: 'OLED Screen', pin: 21 },
                    { type: 'NEOPIXEL', name: 'Price LED', pin: 4 },
                    { type: 'LED', name: 'Status LED', pin: 2 },
                    { type: 'TELEMETRY', name: 'Analytics', pin: 0 },
                ],
                wifiDefaults: {
                    mode: 'STA',
                    hostname: 'btc-ticker',
                },
                firmwareHints: {
                    flashSize: '4MB',
                },
                tags: ['bitcoin', 'crypto', 'ticker', 'oled', 'display', 'product'],
            },
        ];
    }

    /**
     * List all available templates (built-in + user)
     */
    async listTemplates(): Promise<DeviceTemplate[]> {
        const templates = [...this.builtInTemplates];

        // Load user templates from directory
        try {
            if (fs.existsSync(this.userTemplatesDir)) {
                const files = fs.readdirSync(this.userTemplatesDir);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        try {
                            const content = fs.readFileSync(
                                path.join(this.userTemplatesDir, file),
                                'utf8'
                            );
                            const template = JSON.parse(content) as DeviceTemplate;
                            // Avoid duplicates
                            if (!templates.find(t => t.id === template.id)) {
                                templates.push(template);
                            }
                        } catch (e) {
                            console.error(`[TemplateManager] Failed to load template ${file}:`, e);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[TemplateManager] Error reading templates directory:', e);
        }

        return templates;
    }

    /**
     * Get a specific template by ID
     */
    async getTemplate(id: string): Promise<DeviceTemplate | null> {
        // Check built-in first
        const builtIn = this.builtInTemplates.find(t => t.id === id);
        if (builtIn) return builtIn;

        // Check user templates
        const filePath = path.join(this.userTemplatesDir, `${id}.json`);
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(content) as DeviceTemplate;
            } catch (e) {
                console.error(`[TemplateManager] Failed to load template ${id}:`, e);
            }
        }

        return null;
    }

    /**
     * Save a user template
     */
    async saveTemplate(template: DeviceTemplate): Promise<boolean> {
        try {
            const filePath = path.join(this.userTemplatesDir, `${template.id}.json`);
            fs.writeFileSync(filePath, JSON.stringify(template, null, 2));
            console.log(`[TemplateManager] Saved template: ${template.id}`);
            return true;
        } catch (e) {
            console.error('[TemplateManager] Failed to save template:', e);
            return false;
        }
    }

    /**
     * Delete a user template
     */
    async deleteTemplate(id: string): Promise<boolean> {
        // Cannot delete built-in templates
        if (this.builtInTemplates.find(t => t.id === id)) {
            console.warn('[TemplateManager] Cannot delete built-in template');
            return false;
        }

        try {
            const filePath = path.join(this.userTemplatesDir, `${id}.json`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`[TemplateManager] Deleted template: ${id}`);
                return true;
            }
            return false;
        } catch (e) {
            console.error('[TemplateManager] Failed to delete template:', e);
            return false;
        }
    }

    /**
     * Export a template to a file path
     */
    async exportTemplate(id: string, exportPath: string): Promise<boolean> {
        const template = await this.getTemplate(id);
        if (!template) return false;

        try {
            fs.writeFileSync(exportPath, JSON.stringify(template, null, 2));
            console.log(`[TemplateManager] Exported template to: ${exportPath}`);
            return true;
        } catch (e) {
            console.error('[TemplateManager] Failed to export template:', e);
            return false;
        }
    }

    /**
     * Import a template from a file path
     */
    async importTemplate(importPath: string): Promise<DeviceTemplate | null> {
        try {
            const content = fs.readFileSync(importPath, 'utf8');
            const template = JSON.parse(content) as DeviceTemplate;

            // Validate required fields
            if (!template.id || !template.name || !template.platform) {
                console.error('[TemplateManager] Invalid template format');
                return null;
            }

            // Save to user templates
            await this.saveTemplate(template);
            return template;
        } catch (e) {
            console.error('[TemplateManager] Failed to import template:', e);
            return null;
        }
    }

    /**
     * Apply a template - convert GPIO config to ModuleConfig array
     */
    applyTemplate(template: DeviceTemplate): ModuleConfig[] {
        const modules: ModuleConfig[] = [];

        // Use defaultModules if available
        if (template.defaultModules && template.defaultModules.length > 0) {
            for (const dm of template.defaultModules) {
                if (dm.type && dm.name && dm.pin !== undefined) {
                    modules.push({
                        id: `${template.id}_${dm.pin}`,
                        type: dm.type as ModuleConfig['type'],
                        name: dm.name,
                        pin: dm.pin,
                        inverted: dm.inverted,
                    });
                }
            }
        } else {
            // Generate from GPIO config
            for (const gpio of template.gpioConfig) {
                const moduleType = this.gpioFunctionToModuleType(gpio.function);
                if (moduleType) {
                    modules.push({
                        id: `${template.id}_${gpio.pin}`,
                        type: moduleType,
                        name: gpio.name || `GPIO ${gpio.pin}`,
                        pin: gpio.pin,
                        inverted: gpio.inverted,
                    });
                }
            }
        }

        return modules;
    }

    /**
     * Convert GPIO function to module type
     */
    private gpioFunctionToModuleType(func: GPIOFunction): ModuleConfig['type'] | null {
        const mapping: Record<GPIOFunction, ModuleConfig['type'] | null> = {
            'NONE': null,
            'LED': 'LED',
            'RELAY': 'RELAY',
            'BUTTON': 'BUTTON',
            'PWM': 'PWM',
            'NEOPIXEL': 'NEOPIXEL',
            'DHT11': 'TEMP_SENSOR',
            'DHT22': 'TEMP_SENSOR',
            'DS18B20': 'TEMP_SENSOR',
            'I2C_SDA': null,
            'I2C_SCL': null,
            'SPI_MOSI': null,
            'SPI_MISO': null,
            'SPI_CLK': null,
            'UART_TX': null,
            'UART_RX': null,
            'ADC': 'ADC',
            'DAC': null,
        };
        return mapping[func];
    }

    /**
     * Generate GPIO map from template
     */
    generateGPIOMap(template: DeviceTemplate): Map<number, GPIOFunction> {
        const map = new Map<number, GPIOFunction>();
        for (const gpio of template.gpioConfig) {
            map.set(gpio.pin, gpio.function);
        }
        return map;
    }

    /**
     * Get available module presets (Recipes)
     */
    getModulePresets(): import('../shared/types').ModulePreset[] {
        return [
            {
                id: 'basic_iot',
                name: 'Basic IoT Device',
                description: 'Simple connectivity setup with status LED',
                icon: '🌐',
                modules: [
                    { type: 'WIFI', name: 'WiFi Connection', pin: 0 },
                    { type: 'LED', name: 'Status LED', pin: 2 },
                    { type: 'TELEMETRY', name: 'Telemetry (Optional)', pin: 0 }
                ]
            },
            {
                id: 'tide_tracker',
                name: 'Tide Tracker',
                description: 'Marine monitor with Tide API and LED display',
                icon: '🌊',
                modules: [
                    { type: 'WIFI', name: 'WiFi', pin: 0 },
                    { type: 'TIDE', name: 'Tide Engine', pin: 0 },
                    { type: 'NEOPIXEL', name: 'Tide Ring', pin: 4 },
                    { type: 'LDR', name: 'Auto Brightness', pin: 34 }
                ]
            },
            {
                id: 'smart_plug',
                name: 'Smart Plug',
                description: 'WiFi controlled relay with physical button',
                icon: '🔌',
                modules: [
                    { type: 'WIFI', name: 'WiFi', pin: 0 },
                    { type: 'RELAY', name: 'Main Power', pin: 12 },
                    { type: 'BUTTON', name: 'Toggle Button', pin: 0 },
                    { type: 'LED', name: 'Status Light', pin: 13 }
                ]
            },
            {
                id: 'temp_monitor',
                name: 'Temperature Monitor',
                description: 'Environment sensor with logs',
                icon: '🌡️',
                modules: [
                    { type: 'WIFI', name: 'WiFi', pin: 0 },
                    { type: 'TEMP_SENSOR', name: 'DHT Module', pin: 14 },
                    { type: 'MQTT', name: 'Home Assistant', pin: 0 },
                    { type: 'TELEMETRY', name: 'Analytics', pin: 0 }
                ]
            }
        ];
    }
}

// Singleton export
export const templateManager = new TemplateManager();
