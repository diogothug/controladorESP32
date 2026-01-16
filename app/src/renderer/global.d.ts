// Global Ambient Types for Renderer
// NO IMPORTS/EXPORTS HERE

interface PortInfo {
    path: string;
    manufacturer?: string;
    vendorId?: string;
    productId?: string;
}

interface DeviceInfo {
    type: string;
    firmware: string;
    capabilities: string[];
}

type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

// Firmware Types
interface ToolStatus {
    arduinoCli: boolean;
    esptool: boolean;
    ampy: boolean;
}

interface CompileResult {
    success: boolean;
    output: string;
    binaryPath?: string;
}

interface UploadResult {
    success: boolean;
    output: string;
}

interface FirmwareTemplate {
    name: string;
    platform: 'arduino' | 'esp32';
    description: string;
    files: { name: string; content: string }[];
}

// API Interfaces
interface SerialAPI {
    listPorts: () => Promise<PortInfo[]>;
    connect: (portPath: string) => Promise<DeviceInfo | null>;
    disconnect: () => Promise<void>;
    send: (command: string) => Promise<string | null>;
    getState: () => Promise<ConnectionState>;
    getDeviceInfo: () => Promise<DeviceInfo | null>;
    setAutoReconnect: (enabled: boolean) => Promise<void>;
    getAutoReconnect: () => Promise<boolean>;
    onStateChanged: (callback: (state: ConnectionState) => void) => void;
    onData: (callback: (data: string) => void) => void;
    onError: (callback: (error: string) => void) => void;
}

interface FirmwareAPI {
    checkTools: () => Promise<ToolStatus>;
    listTemplates: () => Promise<FirmwareTemplate[]>;
    getTemplate: (name: string) => Promise<FirmwareTemplate | null>;
    compileArduino: (sketchPath: string, fqbn?: string) => Promise<CompileResult>;
    uploadArduino: (sketchPath: string, port: string, fqbn?: string) => Promise<UploadResult>;
    uploadArduinoContent: (code: string, port: string, fqbn?: string) => Promise<UploadResult>;
    uploadMicroPython: (filePath: string, port: string, destPath?: string) => Promise<UploadResult>;
    uploadMicroPythonContent: (code: string, port: string, destPath?: string) => Promise<UploadResult>;
    resetESP32: (port: string) => Promise<UploadResult>;
    generate: (type: 'arduino' | 'micropython', modules: ModuleConfig[]) => Promise<string>;
}

// Animation Types
type AnimationType = 'RAINBOW' | 'FIRE' | 'PARTICLE' | 'PLASMA' | 'SPARKLE' |
    'BOUNCE' | 'CHASE' | 'COMET' | 'GRADIENT' |
    'BREATHE' | 'AURORA' | 'WAVE' | 'FISH' | 'NONE';

interface NeoPixelConfig {
    pixelCount: number;
    matrixWidth?: number;
    matrixHeight?: number;
    brightness: number;
    colorOrder: 'GRB' | 'RGB' | 'GRBW' | 'RGBW';
    colorDepth: '24bit' | '32bit';
    serpentine?: boolean;
    defaultAnimation: AnimationType;
    transitionSpeed?: 'SLOW' | 'MEDIUM' | 'FAST' | 'INSTANT';
}

// Project Types
interface WifiConfig {
    ssid: string;
    password?: string;
    mode: 'STA' | 'AP';
    ip?: string;
    gateway?: string;
    subnet?: string;
    hostname?: string;
}

interface ClockConfig {
    enabled: boolean;
    format24h: boolean;
    showDate: boolean;
    ntpServer: string;
    tzOffset: number;
    color?: [number, number, number];
}

interface TideConfig {
    enabled: boolean;
    harborId: number;
    harborName: string;
    state: string;
    updateInterval: number;
    highTideColor: string;
    lowTideColor: string;
    risingIndicator: boolean;
    ledCount: number;
    neopixelPin: number;
    worldTides?: {
        enabled: boolean;
        lat: number;
        lon: number;
        key: string;
    };
}

interface ModuleConfig {
    id: string;
    tideConfig?: TideConfig;
    automationConfig?: AutomationConfig;
    [key: string]: any; // Allow other configs
}

interface AutomationRule {
    trigger: string;
    command: string;
}

interface AutomationConfig {
    rules: AutomationRule[];
    timers: { time: string, command: string }[];
}

interface ProjectData {
    id: string;
    name: string;
    created: number;
    lastModified: number;
    boardConfig: {
        port: string;
        type: string;
    };
    firmwareConfig: {
        template: string;
        lastUploaded: number;
    };
    modules: ModuleConfig[];
}

interface ProjectsAPI {
    save: (data: Partial<ProjectData>) => Promise<ProjectData>;
    load: (id: string) => Promise<ProjectData | null>;
    list: () => Promise<ProjectData[]>;
    delete: (id: string) => Promise<boolean>;
}


// Tide Visuals Logic Interface (defined in tide-visuals.ts)
interface TideLogicConfig {
    brightnessMax: number;
    smoothTau: number;
    trendDeadband: number;
    glowFeather: number;
    baseColor: { r: number, g: number, b: number };
    riseColor: { r: number, g: number, b: number };
    fallColor: { r: number, g: number, b: number };
}

interface TideLogicInput {
    level: number;
    trend: number;
    confidence: number;
    hasWifi: boolean;
}

// Class type definition
declare class TideVisuals {
    constructor(config?: Partial<TideLogicConfig>);
    update(dt: number, input: TideLogicInput): void;
    render(count: number, width: number, height: number): { r: number, g: number, b: number }[];
}

interface Window {
    serial: SerialAPI;
    firmware: FirmwareAPI;
    projects: ProjectsAPI;
    TideVisuals: typeof TideVisuals; // Constructor
}
