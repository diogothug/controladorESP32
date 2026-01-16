const { contextBridge, ipcRenderer } = require('electron');

// Tipos exportados para o renderer
export interface PortInfo {
    path: string;
    manufacturer?: string;
    vendorId?: string;
    productId?: string;
}

export interface DeviceInfo {
    type: string;
    firmware: string;
    capabilities: string[];
}

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

// Tipos para Firmware
export interface ToolStatus {
    arduinoCli: boolean;
    esptool: boolean;
    ampy: boolean;
}

export interface CompileResult {
    success: boolean;
    output: string;
    binaryPath?: string;
}

export interface UploadResult {
    success: boolean;
    output: string;
}

export interface FirmwareTemplate {
    name: string;
    platform: 'arduino' | 'esp32';
    description: string;
    files: { name: string; content: string }[];
}

/**
 * API Serial exposta ao renderer via contextBridge
 */
const serialAPI = {
    listPorts: (): Promise<PortInfo[]> => ipcRenderer.invoke('serial:list-ports'),
    connect: (portPath: string): Promise<DeviceInfo | null> => ipcRenderer.invoke('serial:connect', portPath),
    disconnect: (): Promise<void> => ipcRenderer.invoke('serial:disconnect'),
    send: (command: string): Promise<string | null> => ipcRenderer.invoke('serial:send', command),
    getState: (): Promise<ConnectionState> => ipcRenderer.invoke('serial:get-state'),
    getDeviceInfo: (): Promise<DeviceInfo | null> => ipcRenderer.invoke('serial:get-device-info'),
    setAutoReconnect: (enabled: boolean): Promise<void> => ipcRenderer.invoke('serial:set-auto-reconnect', enabled),
    getAutoReconnect: (): Promise<boolean> => ipcRenderer.invoke('serial:get-auto-reconnect'),

    onStateChanged: (callback: (state: ConnectionState) => void) => {
        ipcRenderer.on('serial:state-changed', (_: any, state: ConnectionState) => callback(state));
    },
    onData: (callback: (data: string) => void) => {
        ipcRenderer.on('serial:data', (_: any, data: string) => callback(data));
    },
    onError: (callback: (error: string) => void) => {
        ipcRenderer.on('serial:error', (_: any, error: string) => callback(error));
    }
};

/**
 * API Firmware exposta ao renderer via contextBridge
 */
const firmwareAPI = {
    checkTools: (): Promise<ToolStatus> => ipcRenderer.invoke('firmware:check-tools'),
    listTemplates: (): Promise<FirmwareTemplate[]> => ipcRenderer.invoke('firmware:list-templates'),
    getTemplate: (name: string): Promise<FirmwareTemplate | null> => ipcRenderer.invoke('firmware:get-template', name),
    compileArduino: (sketchPath: string, fqbn?: string): Promise<CompileResult> =>
        ipcRenderer.invoke('firmware:compile-arduino', sketchPath, fqbn),
    uploadArduino: (sketchPath: string, port: string, fqbn?: string): Promise<UploadResult> =>
        ipcRenderer.invoke('firmware:upload-arduino', sketchPath, port, fqbn),
    uploadArduinoContent: (code: string, port: string, fqbn?: string): Promise<UploadResult> =>
        ipcRenderer.invoke('firmware:upload-arduino-content', code, port, fqbn),

    uploadMicroPython: (filePath: string, port: string, destPath?: string): Promise<UploadResult> =>
        ipcRenderer.invoke('firmware:upload-micropython', filePath, port, destPath),
    uploadMicroPythonContent: (code: string, port: string, destPath?: string): Promise<UploadResult> =>
        ipcRenderer.invoke('firmware:upload-micropython-content', code, port, destPath),

    resetESP32: (port: string): Promise<UploadResult> => ipcRenderer.invoke('firmware:reset-esp32', port),

    generate: (type: 'arduino' | 'micropython', modules: ModuleConfig[]): Promise<string> =>
        ipcRenderer.invoke('firmware:generate', type, modules),

    flashESP32: (buffer: ArrayBuffer, port: string): Promise<UploadResult> =>
        ipcRenderer.invoke('firmware:flash-esp32', buffer, port),

    flashESP32FromUrl: (url: string, port: string): Promise<UploadResult> =>
        ipcRenderer.invoke('firmware:flash-esp32-url', url, port)
};

// Types for Projects (Duplicated to avoid import issues in preload)
// Types for Projects (Synced with shared/types.ts)
export type ModuleType =
    'LED' | 'NEOPIXEL' | 'TEMP_SENSOR' | 'RELAY' | 'BUTTON' | 'PWM' |
    'ADC' | 'WIFI' | 'CLOCK' | 'TIDE' | 'ENCODER' | 'PIR' | 'LDR' |
    'WEB_SERVER' | 'MQTT' | 'OTA' | 'UDP' |
    'ESPNOW' | 'BLE' | 'DISPLAY' | 'NVS' | 'AUTOMATION' | 'MODE' | 'TELEMETRY' | 'AUDIO' | 'SERVO' | 'TOUCH';

export interface ModuleConfig {
    id: string;
    type: ModuleType;
    name: string;
    pin: number;
    inverted?: boolean;
    // Configs específicos (Type loose for preload to avoid huge copy-paste, can be refined)
    neoPixelConfig?: any;
    sensorConfig?: any;
    wifiConfig?: any;
    clockConfig?: any;
    tideConfig?: any;
    webServerConfig?: any;
    mqttConfig?: any;
    otaConfig?: any;
    udpConfig?: any;
    espNowConfig?: any;
    bleConfig?: any;
    displayConfig?: any;
    nvsConfig?: any;
    ldrConfig?: any;
    automationConfig?: any;
    modeConfig?: any;
    telemetryConfig?: any;
    audioConfig?: any;
    servoConfig?: any;
    touchConfig?: any;
    options?: any;
}

export interface ProjectData {
    id: string;
    name: string;
    created: number;
    lastModified: number;
    boardConfig: { port: string; type: string };
    firmwareConfig: { template: string; lastUploaded: number };
    modules: ModuleConfig[];
}

const projectsAPI = {
    save: (data: Partial<ProjectData>): Promise<ProjectData> => ipcRenderer.invoke('projects:save', data),
    load: (id: string): Promise<ProjectData | null> => ipcRenderer.invoke('projects:load', id),
    list: (): Promise<ProjectData[]> => ipcRenderer.invoke('projects:list'),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('projects:delete', id)
};

// Device Templates API
export interface DeviceTemplate {
    id: string;
    name: string;
    description: string;
    platform: 'arduino' | 'esp32' | 'esp8266';
    board: string;
    author?: string;
    version: string;
    created: number;
    gpioConfig: any[];
    defaultModules: any[];
    wifiDefaults?: any;
    firmwareHints?: any;
    tags?: string[];
}

const templatesAPI = {
    list: (): Promise<DeviceTemplate[]> => ipcRenderer.invoke('templates:list'),
    get: (id: string): Promise<DeviceTemplate | null> => ipcRenderer.invoke('templates:get', id),
    save: (template: DeviceTemplate): Promise<boolean> => ipcRenderer.invoke('templates:save', template),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('templates:delete', id),
    export: (id: string, exportPath: string): Promise<boolean> => ipcRenderer.invoke('templates:export', id, exportPath),
    import: (importPath: string): Promise<DeviceTemplate | null> => ipcRenderer.invoke('templates:import', importPath),
    apply: (id: string): Promise<ModuleConfig[]> => ipcRenderer.invoke('templates:apply', id),
};

// Tide API
const tideAPI = {
    getStates: (): Promise<string[]> => ipcRenderer.invoke('tide:get-states'),
    getHarbors: (state: string): Promise<any[]> => ipcRenderer.invoke('tide:get-harbors', state),
    getTideData: (harborId: number): Promise<any> => ipcRenderer.invoke('tide:get-data', harborId),
};

// External APIs (OpenMeteo, Tide simulation, Moon, etc.)
const externalAPI = {
    // Generic fetch for any URL
    fetch: (url: string): Promise<{ success: boolean; data?: any; error?: string }> =>
        ipcRenderer.invoke('api:fetch', url),

    // Open-Meteo Weather API
    getWeather: (lat: number, lon: number): Promise<{ success: boolean; data?: any; error?: string }> =>
        ipcRenderer.invoke('api:openmeteo', lat, lon),

    // Tide simulation
    getTide: (porto: string): Promise<{ success: boolean; data?: any; error?: string }> =>
        ipcRenderer.invoke('api:tide', porto),

    // Moon phase
    getMoon: (): Promise<{ success: boolean; data?: any; error?: string }> =>
        ipcRenderer.invoke('api:moon'),
};

contextBridge.exposeInMainWorld('serial', serialAPI);
contextBridge.exposeInMainWorld('firmware', firmwareAPI);
contextBridge.exposeInMainWorld('projects', projectsAPI);
contextBridge.exposeInMainWorld('templates', templatesAPI);
contextBridge.exposeInMainWorld('tide', tideAPI);
contextBridge.exposeInMainWorld('externalAPI', externalAPI);

// TypeScript declarations for renderer
interface Window {
    serial: typeof serialAPI;
    firmware: typeof firmwareAPI;
}
