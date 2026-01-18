import { ModuleConfig, ValidationResult } from '../shared/types';

// ============ VALIDATION LOGIC ============

export function validateConfiguration(modules: ModuleConfig[]): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };
    const usedPins = new Map<number, string>();
    const moduleTypes = new Set<string>(modules.map(m => m.type));

    // 1. GPIO Conflict Check
    modules.forEach(mod => {
        // Skip modules without specific pins (like virtual modules, though most have pins)
        // Some modules might share pins if they are on same bus (I2C), logic can be refined
        if (mod.pin !== undefined && mod.pin !== -1) {
            // I2C Exception: Multiple modules can use same SDA/SCL
            // We'll rely on correct configuration for now, but strictly checking identical pin + different ID
            if (usedPins.has(mod.pin)) {
                // Check if they are compatible (e.g. valid sharing)
                // For now, assume simple 1-to-1 mapping is enforced for safety, unless it's implicit
                // But wait, I2C devices usually don't declare the pin in the module config 'pin' property directly 
                // in the same way simple LEDs do. 
                // Let's assume strict check for now.
                const conflict = usedPins.get(mod.pin);
                result.errors.push(`GPIO Conflict: Pin ${mod.pin} is used by '${mod.name}' and '${conflict}'`);
            } else {
                usedPins.set(mod.pin, mod.name);
            }
        }
    });

    // 2. Dependency Check
    const hasWifi = moduleTypes.has('WIFI');

    modules.forEach(mod => {
        switch (mod.type) {
            case 'TIDE':
                if (!hasWifi) result.errors.push(`Module '${mod.name}' requires a WIFI module.`);
                break;
            case 'MQTT':
                if (!hasWifi) result.errors.push(`Module '${mod.name}' (MQTT) requires a WIFI module.`);
                break;
            case 'OTA':
                if (!hasWifi) result.errors.push(`Module '${mod.name}' (OTA) requires a WIFI module.`);
                break;
            case 'TELEMETRY':
                if (!hasWifi) result.errors.push(`Module '${mod.name}' (Telemetry) requires a WIFI module.`);
                break;
            case 'CLOCK':
                // Warning if NTP enabled but no WiFi
                if (mod.clockConfig?.enabled && !hasWifi) {
                    result.warnings.push(`Module '${mod.name}' (Clock) needs WiFi for NTP synchronization.`);
                }
                break;
            case 'MODE':
                // Check if any output module exists
                const hasOutput = modules.some(m => ['LED', 'NEOPIXEL', 'PWM', 'RELAY'].includes(m.type));
                if (!hasOutput) result.warnings.push(`Module '${mod.name}' (Modes) has no output modules to control.`);
                break;
        }
    });

    if (result.errors.length > 0) result.valid = false;
    return result;
}
