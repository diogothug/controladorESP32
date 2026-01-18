const { ipcMain } = require('electron');
import { serialManager, ConnectionState, DeviceInfo, PortInfo } from './serial-manager';
import { firmwareManager, ToolStatus, CompileResult, UploadResult, FirmwareTemplate } from './firmware-manager';
import { projectManager } from './project-manager';
import { templateManager } from './template-manager';
import { ProjectData, DeviceTemplate } from '../shared/types';
import { TelemetryService } from './telemetry-service';

/**
 * Registra handlers IPC para comunicação com o renderer
 * O renderer nunca acessa serial diretamente - tudo passa por aqui
 */
export function registerIpcHandlers(mainWindow: any): void {

    // === Serial Handlers ===

    // Lista portas disponíveis
    ipcMain.handle('serial:list-ports', async (): Promise<PortInfo[]> => {
        console.log('[IPC] serial:list-ports called');
        try {
            const ports = await serialManager.listPorts();
            console.log(`[IPC] Returning ${ports.length} ports to renderer`);
            return ports;
        } catch (e) {
            console.error('[IPC] Failed to list ports:', e);
            throw e;
        }
    });

    // Conecta a uma porta
    ipcMain.handle('serial:connect', async (_: any, portPath: string): Promise<DeviceInfo | null> => {
        try {
            return await serialManager.connect(portPath);
        } catch (error) {
            throw error;
        }
    });

    // Desconecta
    ipcMain.handle('serial:disconnect', async (): Promise<void> => {
        await serialManager.disconnect();
    });

    // Envia comando
    ipcMain.handle('serial:send', async (_: any, command: string): Promise<string | null> => {
        return serialManager.sendCommand(command);
    });

    // Retorna estado atual
    ipcMain.handle('serial:get-state', (): ConnectionState => {
        return serialManager.getState();
    });

    // === Settings API ===

    // Lazy load SettingsManager to avoid circular deps if any (though unlikely here)
    const { SettingsManager } = require('./settings-manager');

    ipcMain.handle('settings:get', async (_: any, key: string) => {
        return SettingsManager.getInstance().get(key);
    });

    ipcMain.handle('settings:set', async (_: any, key: string, value: any) => {
        SettingsManager.getInstance().set(key, value);
        return true;
    });

    ipcMain.handle('serial:list', async () => {
        return serialManager.listPorts();
    });

    // Retorna info do dispositivo
    ipcMain.handle('serial:get-device-info', (): DeviceInfo | null => {
        return serialManager.getDeviceInfo();
    });

    // Controle de auto-reconnect
    ipcMain.handle('serial:set-auto-reconnect', (_: any, enabled: boolean): void => {
        serialManager.setAutoReconnect(enabled);
    });

    ipcMain.handle('serial:get-auto-reconnect', (): boolean => {
        return serialManager.isAutoReconnectEnabled();
    });

    // === Firmware Handlers ===

    // Verifica ferramentas disponíveis
    ipcMain.handle('firmware:check-tools', async (): Promise<ToolStatus> => {
        return firmwareManager.checkTools();
    });

    // Lista templates
    ipcMain.handle('firmware:list-templates', (): FirmwareTemplate[] => {
        return firmwareManager.listTemplates();
    });

    // Obtém template por nome
    ipcMain.handle('firmware:get-template', (_: any, name: string): FirmwareTemplate | null => {
        return firmwareManager.getTemplate(name);
    });

    // Compila Arduino
    ipcMain.handle('firmware:compile-arduino', async (_: any, sketchPath: string, fqbn?: string): Promise<CompileResult> => {
        return firmwareManager.compileArduino(sketchPath, fqbn);
    });

    // Upload Arduino
    ipcMain.handle('firmware:upload-arduino', async (_: any, sketchPath: string, port: string, fqbn?: string): Promise<UploadResult> => {
        return firmwareManager.compileAndUploadArduino(sketchPath, port, fqbn);
    });

    // Upload MicroPython
    ipcMain.handle('firmware:upload-micropython', async (_: any, filePath: string, port: string, destPath?: string): Promise<UploadResult> => {
        return firmwareManager.uploadMicroPython(filePath, port, destPath);
    });

    // Upload Arduino (Content)
    ipcMain.handle('firmware:upload-arduino-content', async (_: any, code: string, port: string, fqbn?: string): Promise<UploadResult> => {
        return firmwareManager.uploadArduinoFromContent(code, port, fqbn);
    });

    // Upload MicroPython (Content)
    ipcMain.handle('firmware:upload-micropython-content', async (_: any, code: string, port: string, destPath?: string): Promise<UploadResult> => {
        return firmwareManager.uploadMicroPythonFromContent(code, port, destPath);
    });

    // Reset ESP32
    ipcMain.handle('firmware:reset-esp32', async (_: any, port: string): Promise<UploadResult> => {
        return firmwareManager.resetESP32(port);
    });

    // Flash ESP32 (Backend esptool)
    ipcMain.handle('firmware:flash-esp32', async (_: any, buffer: Buffer, port: string): Promise<UploadResult> => {
        console.log(`[IPC] firmware:flash-esp32 on port ${port} (${buffer.length} bytes)`);
        await serialManager.disconnect();
        return firmwareManager.flashESP32(buffer, port);
    });

    // Flash ESP32 from URL
    ipcMain.handle('firmware:flash-esp32-url', async (_: any, url: string, port: string): Promise<UploadResult> => {
        console.log(`[IPC] firmware:flash-esp32-url on port ${port} (${url})`);
        await serialManager.disconnect();
        return firmwareManager.flashESP32FromUrl(url, port);
    });

    // === Project Handlers ===

    ipcMain.handle('projects:save', async (_: any, data: Partial<ProjectData>): Promise<ProjectData> => {
        return projectManager.saveProject(data);
    });

    ipcMain.handle('projects:load', async (_: any, id: string): Promise<ProjectData | null> => {
        return projectManager.loadProject(id);
    });

    ipcMain.handle('projects:list', async (): Promise<ProjectData[]> => {
        return projectManager.listProjects();
    });

    ipcMain.handle('projects:delete', async (_: any, id: string): Promise<boolean> => {
        return projectManager.deleteProject(id);
    });

    // === Template Handlers ===

    ipcMain.handle('templates:list', async (): Promise<DeviceTemplate[]> => {
        return templateManager.listTemplates();
    });

    ipcMain.handle('templates:get', async (_: any, id: string): Promise<DeviceTemplate | null> => {
        return templateManager.getTemplate(id);
    });

    ipcMain.handle('templates:save', async (_: any, template: DeviceTemplate): Promise<boolean> => {
        return templateManager.saveTemplate(template);
    });

    ipcMain.handle('templates:delete', async (_: any, id: string): Promise<boolean> => {
        return templateManager.deleteTemplate(id);
    });

    ipcMain.handle('templates:export', async (_: any, id: string, exportPath: string): Promise<boolean> => {
        return templateManager.exportTemplate(id, exportPath);
    });

    ipcMain.handle('templates:import', async (_: any, importPath: string): Promise<DeviceTemplate | null> => {
        return templateManager.importTemplate(importPath);
    });

    ipcMain.handle('templates:apply', async (_: any, id: string): Promise<any[]> => {
        const template = await templateManager.getTemplate(id);
        if (!template) return [];
        return templateManager.applyTemplate(template);
    });

    // === Tide API Handlers ===

    const { tideService } = require('./tide-service');

    ipcMain.handle('tide:get-states', async (): Promise<string[]> => {
        return tideService.getStates();
    });

    ipcMain.handle('tide:get-harbors', async (_: any, state: string): Promise<any[]> => {
        return tideService.getHarbors(state);
    });

    ipcMain.handle('tide:get-data', async (_: any, harborId: number): Promise<any> => {
        return tideService.getCurrentTideData(harborId);
    });

    // === Generator Handlers ===

    const { modularFirmwareGenerator } = require('./modular-firmware-generator');

    ipcMain.handle('firmware:generate', async (_: any, type: 'arduino' | 'micropython', modules: any[]): Promise<string> => {
        if (type === 'arduino') {
            // Arduino legacy for now or modular if available
            const { firmwareGenerator } = require('./firmware-generator');
            return firmwareGenerator.generateArduino(modules);
        } else {
            // New Modular Generator for ESP32

            // Construct Intent from modules and assumed context
            const intent = {
                appName: 'SerialControlApp', // TODO: Get from project?
                semanticVersion: '1.0.0',    // TODO: Get from project?
                modules: modules,
                experience: {
                    defaultMode: 'AMBIENT',
                    bootAnimation: 'NONE'
                },
                meta: {
                    generatedBy: 'SerialControlApp v1.0.0',
                    timestamp: Date.now()
                }
            };

            return modularFirmwareGenerator.generateMicroPython(intent);
        }
    });

    // === External API Handlers ===

    // Generic HTTP fetch for any URL
    ipcMain.handle('api:fetch', async (_: any, url: string): Promise<{ success: boolean; data?: any; error?: string }> => {
        console.log('[IPC] api:fetch called:', url);

        // Security Whitelist
        const ALLOWED_DOMAINS = [
            'api.open-meteo.com',
            'raw.githubusercontent.com',
            'github.com',
            'google.com' // Example, remove if not needed
        ];

        try {
            const urlObj = new URL(url);
            if (!ALLOWED_DOMAINS.some(domain => urlObj.hostname.endsWith(domain))) {
                console.warn('[IPC] Blocked fetch to unauthorized domain:', urlObj.hostname);
                return { success: false, error: 'Domain not allowed' };
            }

            const https = require('https');
            const http = require('http');
            const protocol = url.startsWith('https') ? https : http;

            return new Promise((resolve) => {
                const request = protocol.get(url, (response: any) => {
                    let data = '';
                    response.on('data', (chunk: string) => data += chunk);
                    response.on('end', () => {
                        try {
                            const json = JSON.parse(data);
                            resolve({ success: true, data: json });
                        } catch {
                            resolve({ success: true, data: data });
                        }
                    });
                });
                request.on('error', (error: Error) => {
                    console.error('[API] Fetch error:', error);
                    resolve({ success: false, error: error.message });
                });
                request.setTimeout(10000, () => {
                    request.destroy();
                    resolve({ success: false, error: 'Timeout' });
                });
            });
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Open-Meteo Weather API
    ipcMain.handle('api:openmeteo', async (_: any, lat: number, lon: number): Promise<{ success: boolean; data?: any; error?: string }> => {
        console.log(`[IPC] api:openmeteo called: lat=${lat}, lon=${lon}`);
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=sunrise,sunset&timezone=auto`;

        try {
            const https = require('https');
            return new Promise((resolve) => {
                https.get(url, (response: any) => {
                    let data = '';
                    response.on('data', (chunk: string) => data += chunk);
                    response.on('end', () => {
                        try {
                            const json = JSON.parse(data);
                            const result = {
                                temperature: json.current?.temperature_2m,
                                humidity: json.current?.relative_humidity_2m,
                                windSpeed: json.current?.wind_speed_10m,
                                weatherCode: json.current?.weather_code,
                                sunrise: json.daily?.sunrise?.[0],
                                sunset: json.daily?.sunset?.[0],
                                raw: json
                            };
                            console.log('[API] OpenMeteo result:', result);
                            resolve({ success: true, data: result });
                        } catch (e: any) {
                            resolve({ success: false, error: 'Parse error: ' + e.message });
                        }
                    });
                }).on('error', (error: Error) => {
                    resolve({ success: false, error: error.message });
                });
            });
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Tide data (simulated based on moon phase for now)
    ipcMain.handle('api:tide', async (_: any, porto: string): Promise<{ success: boolean; data?: any; error?: string }> => {
        console.log(`[IPC] api:tide called: porto=${porto}`);
        try {
            // Simulate tide based on current time and moon phase
            const now = new Date();
            const hour = now.getHours() + now.getMinutes() / 60;

            // Simplified tide model: 2 high tides per day (~12.4 hour cycle)
            const tideCycle = (hour / 12.4) * Math.PI * 2;
            const tideLevel = (Math.sin(tideCycle) + 1) / 2; // 0 to 1

            // Next high/low calculations
            const nextHighHour = Math.ceil((hour + 6.2) % 24);
            const nextLowHour = Math.ceil((hour + 12.4) % 24);

            const isRising = Math.cos(tideCycle) > 0;

            const result = {
                level: Math.round(tideLevel * 100),
                isRising: isRising,
                trend: isRising ? 'rising' : 'falling',
                nextHigh: `${String(nextHighHour).padStart(2, '0')}:00`,
                nextLow: `${String(nextLowHour).padStart(2, '0')}:00`,
                porto: porto,
                timestamp: now.toISOString()
            };

            console.log('[API] Tide result:', result);
            return { success: true, data: result };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Moon phase calculation
    ipcMain.handle('api:moon', async (): Promise<{ success: boolean; data?: any; error?: string }> => {
        console.log('[IPC] api:moon called');
        try {
            const now = new Date();
            // Simplified moon phase calculation
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const day = now.getDate();

            // Julian date calculation (simplified)
            const jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day - 1524.5;
            const daysSinceNew = (jd - 2451550.1) % 29.530588853;
            const phase = daysSinceNew / 29.530588853; // 0 to 1

            let phaseName: string;
            let phaseIcon: string;
            if (phase < 0.03 || phase > 0.97) { phaseName = 'Nova'; phaseIcon = '🌑'; }
            else if (phase < 0.22) { phaseName = 'Crescente'; phaseIcon = '🌒'; }
            else if (phase < 0.28) { phaseName = 'Quarto Crescente'; phaseIcon = '🌓'; }
            else if (phase < 0.47) { phaseName = 'Gibosa Crescente'; phaseIcon = '🌔'; }
            else if (phase < 0.53) { phaseName = 'Cheia'; phaseIcon = '🌕'; }
            else if (phase < 0.72) { phaseName = 'Gibosa Minguante'; phaseIcon = '🌖'; }
            else if (phase < 0.78) { phaseName = 'Quarto Minguante'; phaseIcon = '🌗'; }
            else { phaseName = 'Minguante'; phaseIcon = '🌘'; }

            const result = {
                phase: phase,
                phaseName: phaseName,
                phaseIcon: phaseIcon,
                illumination: Math.round((1 - Math.abs(phase - 0.5) * 2) * 100)
            };

            console.log('[API] Moon result:', result);
            return { success: true, data: result };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // === Telemetry Handlers ===
    ipcMain.handle('telemetry:track-event', async (_: any, eventName: string, props?: any): Promise<void> => {
        // Map generic events to usage for now, could be more granular
        TelemetryService.getInstance().trackUsage(eventName, props);
    });

    // === Event Callbacks ===

    // Registra callbacks para enviar eventos ao renderer
    serialManager.on('stateChange', (state: ConnectionState) => {
        mainWindow.webContents.send('serial:state-changed', state);
    });

    serialManager.on('data', (data: string) => {
        // Telemetry Intercept
        if (data.startsWith('FEEDBACK:')) {
            const parts = data.split(':');
            if (parts.length >= 3) {
                const name = parts[1];
                const msg = parts.slice(2).join(':'); // Rejoin rest of message
                TelemetryService.getInstance().trackFeedback(name, msg);
            }
        }

        mainWindow.webContents.send('serial:data', data);
    });

    serialManager.on('error', (error: string) => {
        mainWindow.webContents.send('serial:error', error);
    });
}
