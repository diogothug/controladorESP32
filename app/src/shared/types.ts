// Shared Type Definitions

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

// Firmware Types
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

// ============ DEVICE TEMPLATES ============

// GPIO Function Types
export type GPIOFunction =
    'NONE' | 'LED' | 'RELAY' | 'BUTTON' | 'PWM' |
    'NEOPIXEL' | 'DHT11' | 'DHT22' | 'DS18B20' |
    'I2C_SDA' | 'I2C_SCL' | 'SPI_MOSI' | 'SPI_MISO' | 'SPI_CLK' |
    'UART_TX' | 'UART_RX' | 'ADC' | 'DAC';

// GPIO Pin Configuration
export interface GPIOConfig {
    pin: number;
    function: GPIOFunction;
    name?: string;           // User-friendly name
    inverted?: boolean;      // Inverted logic (active low)
    pullup?: boolean;        // Enable internal pullup
}

// Device Template
export interface DeviceTemplate {
    id: string;              // Unique identifier (slug)
    name: string;            // Display name
    description: string;     // Short description
    platform: 'arduino' | 'esp32' | 'esp8266';
    board: string;           // Board variant (e.g., 'devkit_v1', 'nodemcu')
    author?: string;         // Template creator
    version: string;         // Template version
    created: number;         // Timestamp

    // GPIO Configuration
    gpioConfig: GPIOConfig[];

    // Default Modules (auto-created from GPIO config)
    defaultModules: Partial<ModuleConfig>[];

    // Optional WiFi defaults
    wifiDefaults?: Partial<WifiConfig>;

    // Firmware generation hints
    firmwareHints?: {
        flashSize?: string;      // e.g., '4MB'
        psramRequired?: boolean;
        minFirmwareVersion?: string;
    };

    // Tags for search/filter
    tags?: string[];
}

// Template Repository (future community feature)
export interface TemplateRepository {
    name: string;
    url: string;
    templates: DeviceTemplate[];
    lastSync: number;
}

// Project Types

// Animation types for NeoPixel modules
export type AnimationType = 'RAINBOW' | 'FIRE' | 'PARTICLE' | 'PLASMA' | 'SPARKLE' |
    'BOUNCE' | 'CHASE' | 'COMET' | 'GRADIENT' |
    'BREATHE' | 'AURORA' | 'WAVE' | 'FISH' | 'NONE' | 'TIDE' | 'TIDE_SIMPLE' | 'TIDE_WAVE' | 'TIDE_AURORA' | 'CUSTOM';

export const ANIMATION_LIST: { id: AnimationType; name: string; emoji: string }[] = [
    { id: 'NONE', name: 'Nenhuma', emoji: '⏹️' },
    { id: 'RAINBOW', name: 'Rainbow', emoji: '🌈' },
    { id: 'FIRE', name: 'Fogo', emoji: '🔥' },
    { id: 'PARTICLE', name: 'Partículas', emoji: '⚡' },
    { id: 'PLASMA', name: 'Plasma', emoji: '🔮' },
    { id: 'SPARKLE', name: 'Sparkle', emoji: '✨' },
    { id: 'BOUNCE', name: 'Bounce', emoji: '🏀' },
    { id: 'CHASE', name: 'Chase', emoji: '🏃' },
    { id: 'COMET', name: 'Cometa', emoji: '☄️' },
    { id: 'GRADIENT', name: 'Gradient', emoji: '🎨' },
    { id: 'BREATHE', name: 'Respirar', emoji: '💨' },
    { id: 'AURORA', name: 'Aurora', emoji: '🌌' },
    { id: 'WAVE', name: 'Onda', emoji: '🌊' },
    { id: 'FISH', name: 'Peixe', emoji: '🐠' },
    { id: 'FISH', name: 'Peixe', emoji: '🐠' },
    { id: 'TIDE', name: 'Maré (V2)', emoji: '🌊' },
    { id: 'TIDE_SIMPLE', name: 'Maré (Simples)', emoji: '📊' },
    { id: 'TIDE_WAVE', name: 'Maré (Onda)', emoji: '🌊' },
    { id: 'TIDE_AURORA', name: 'Maré (Aurora)', emoji: '🌌' },
    { id: 'CUSTOM', name: 'Personalizada', emoji: '🎨' },
];

// Custom animation frame data (for Animation Creator export)
export interface CustomAnimationData {
    name: string;                           // Animation name
    frameCount: number;                     // Total number of frames
    pixelCount: number;                     // LEDs per frame
    frameDelayMs: number;                   // Delay between frames
    loop: boolean;                          // Loop animation
    frames: number[][];                     // Frame data: frames[frameIndex][pixelIndex] = RGB packed (0xRRGGBB)
}

export interface NeoPixelConfig {
    pixelCount: number;           // Total number of LEDs
    matrixWidth?: number;         // Width for matrix arrangements
    matrixHeight?: number;        // Height for matrix arrangements
    brightness: number;           // 0-100 (percentage)
    colorOrder: 'GRB' | 'RGB' | 'GRBW' | 'RGBW'; // LED color order
    colorDepth: '24bit' | '32bit'; // 24-bit RGB or 32-bit RGBW
    serpentine?: boolean;         // ZigZag wiring pattern for matrices
    defaultAnimation: AnimationType; // Animation to run on startup
    transitionSpeed?: 'SLOW' | 'MEDIUM' | 'FAST' | 'INSTANT'; // Transition speed
    customAnimation?: CustomAnimationData; // Custom animation frames (for CUSTOM type)
}

export interface SensorConfig {
    type: 'DHT11' | 'DHT22' | 'DS18B20';
    interval?: number;  // Reading interval in ms
}

export interface WifiConfig {
    ssid: string;
    password?: string;
    mode: 'STA' | 'AP';
    ip?: string;       // Optional static IP
    gateway?: string;  // Optional gateway
    subnet?: string;   // Optional subnet
    hostname?: string; // mDNS hostname
}

export interface ClockConfig {
    enabled: boolean;
    format24h: boolean;      // true = 24h, false = 12h
    showDate: boolean;       // Show date below time
    ntpServer: string;       // NTP server address
    tzOffset: number;        // Timezone offset in hours from UTC
    color?: [number, number, number]; // RGB color for clock display
}

export interface TideConfig {
    enabled: boolean;
    harborId: number;           // Port ID from API
    harborName: string;         // Display name
    state: string;              // State abbreviation (pb, rj, sp)
    updateInterval: number;     // Minutes between API calls (default: 30)
    highTideColor: string;      // Hex color for high tide (e.g., #0080FF)
    lowTideColor: string;       // Hex color for low tide (e.g., #FFD700)
    risingIndicator: boolean;   // Show rising animation
    ledCount: number;           // Number of LEDs for tide bar
    neopixelPin: number;        // Pin connected to LEDs
}

export interface WebServerConfig {
    port: number;
    title: string;
    technicianPin?: string;      // PIN for /tech access (default: 1234)
    captivePortal: boolean;      // Enable AP+DNS hijack on connection failure
}

export interface MqttConfig {
    broker: string;
    port: number;
    user?: string;
    password?: string;
    topicPrefix: string;
    homeAssistantDiscovery: boolean;
}

export interface OtaConfig {
    enabled: boolean; // Just a flag to enable the endpoint
}

export interface UdpConfig {
    port: number;
    universe: number; // For E1.31-ish or just grouping
}

// Phase 9: Advanced Modules
export interface EspNowConfig {
    pmk: string; // Primary Master Key (16 bytes)
    channel: number;
    roles: ('CONTROLLER' | 'SLAVE' | 'COMBO')[];
}

export interface BleConfig {
    name: string;
    mode: 'BEACON' | 'UART' | 'SENSOR';
    advertisementInterval: number;
}

export interface DisplayConfig {
    driver: 'SSD1306' | 'SH1106'; // I2C
    width: number;
    height: number;
    i2cAddress: number;
}

export interface NvsConfig {
    enabled: boolean;
    namespace: string;
    autoSave: string[]; // List of SHARED_DATA keys to auto-persist
}

export interface AutomationRule {
    trigger: string; // e.g. "BTN:*:PRESS" or "LDR:*:DARK"
    command: string; // e.g. "RELAY:0:ON"
}

export interface AutomationConfig {
    rules: AutomationRule[];
    timers: { time: string, command: string, days?: number[] }[]; // time="HH:MM"
}

export interface LdrConfig {
    enabled: boolean;
    interval: number;       // Reading interval in ms
    minReading: number;     // ADC value for dark (0-4095)
    maxReading: number;     // ADC value for bright (0-4095)
    minBrightness: number;  // 0-255
    maxBrightness: number;  // 0-255
}

// === DEVICE MODES (Phase 11) ===
export type DeviceMode = 'AMBIENT' | 'PARTY' | 'SIGNAGE' | 'POWER_SAVE' | 'CUSTOM';

export interface ModeProfile {
    animation: AnimationType;       // Animation for this mode
    brightness: number;             // Brightness 0-100
    speed?: 'SLOW' | 'MEDIUM' | 'FAST';
    autoBrightness?: boolean;       // Use LDR auto-brightness
}

export interface DeviceModeConfig {
    enabled: boolean;
    modes: DeviceMode[];                     // Available modes
    defaultMode: DeviceMode;                 // Mode on startup
    buttonPin?: number;                      // Button to cycle modes (optional)
    longPressDuration?: number;              // ms for long press to switch mode
    profiles: Record<DeviceMode, ModeProfile>; // Animation profiles per mode
}

// === TELEMETRY & ANALYTICS (Phase 12) ===
// Metric categories - bitfield for memory efficiency
export type TelemetryMetric =
    | 'LIFECYCLE'    // boot_count, uptime, reset_reason
    | 'FEATURES'     // animation_counts, mode_counts, api_calls
    | 'BEHAVIOR'     // session_length, peak_hour, brightness_avg
    | 'RELIABILITY'  // errors, watchdog, wifi_reconnects
    | 'ENVIRONMENT'; // temperature, light_level (if sensors)

export interface TelemetryConfig {
    enabled: boolean;

    // Privacy Controls (LGPD/GDPR compliant)
    anonymize: boolean;          // Hash device ID (default: true)
    consentGiven: boolean;       // Opt-in required

    // Data Collection
    metrics: TelemetryMetric[];  // Which categories to collect
    sampleRate: number;          // 0.0-1.0, for high-volume events

    // Storage & Reporting
    persistToNvs: boolean;       // Survive reboots
    reportInterval: number;      // Seconds between reports (0 = manual only)
    endpoint?: string;           // HTTP endpoint for remote reporting

    // Retention
    maxStorageKb: number;        // Limit local storage
    retentionDays: number;       // Auto-purge old data
}

// === AUDIO REACTIVE (Phase 13) ===
export type AudioBand = 'BASS' | 'LOW_MID' | 'MID' | 'HIGH_MID' | 'HIGH';

export interface AudioConfig {
    enabled: boolean;
    pin: number;                  // ADC pin for microphone

    // FFT Settings
    sampleRate: number;           // Hz (default: 10000)
    fftSize: 64 | 128 | 256;      // FFT bins (memory vs resolution)

    // Gain Control
    autoGain: boolean;            // Automatic gain adjustment
    gainMin: number;              // 0.1-2.0
    gainMax: number;              // 1.0-10.0
    noiseFloor: number;           // ADC value below = silence

    // Beat Detection
    beatDetection: boolean;       // Enable beat detection algorithm
    beatSensitivity: number;      // 0.5-2.0 (1.0 = normal)
    beatDecay: number;            // ms for beat to decay

    // Frequency Bands (for LED mapping)
    bands: AudioBand[];           // Which bands to track
    bandWeights: Record<AudioBand, number>; // 0.0-2.0 per band

    // Animation Integration
    targetNeoPixel?: string;      // NeoPixel module name to control
    mode: 'SPECTRUM' | 'VU_METER' | 'BEAT_PULSE' | 'ENERGY';
}

export type ModuleType =
    'LED' | 'NEOPIXEL' | 'TEMP_SENSOR' | 'RELAY' | 'BUTTON' | 'PWM' |
    'ADC' | 'WIFI' | 'CLOCK' | 'TIDE' | 'ENCODER' | 'PIR' | 'LDR' | 'MIC' |
    'WEB_SERVER' | 'MQTT' | 'OTA' | 'UDP' |
    'ESPNOW' | 'BLE' | 'DISPLAY' | 'NVS' | 'AUTOMATION' | 'MODE' | 'TELEMETRY' | 'AUDIO';

export interface ModuleConfig {
    id: string;
    type: ModuleType;
    name: string;
    pin: number;
    inverted?: boolean;
    neoPixelConfig?: NeoPixelConfig;
    sensorConfig?: SensorConfig;
    wifiConfig?: WifiConfig;
    clockConfig?: ClockConfig;
    tideConfig?: TideConfig;
    webServerConfig?: WebServerConfig;
    mqttConfig?: MqttConfig;
    otaConfig?: OtaConfig;
    udpConfig?: UdpConfig;
    espNowConfig?: EspNowConfig;
    bleConfig?: BleConfig;
    displayConfig?: DisplayConfig;
    nvsConfig?: NvsConfig;
    ldrConfig?: LdrConfig;
    automationConfig?: AutomationConfig;
    modeConfig?: DeviceModeConfig;
    telemetryConfig?: TelemetryConfig;
    audioConfig?: AudioConfig;
    // Generic options for input modules (BUTTON, ENCODER, PIR, LDR, MIC)
    options?: {
        // BUTTON options
        pullup?: boolean;       // Use internal pullup (default: true)
        debounce?: number;      // Debounce time in ms (default: 50)
        // ENCODER options
        pinB?: number;          // Second encoder pin
        pinBtn?: number;        // Optional button pin
        // PIR options
        cooldown?: number;      // Motion cooldown in ms (default: 2000)
        // LDR options
        thresholdLow?: number;  // Dark threshold (default: 500)
        thresholdHigh?: number; // Bright threshold (default: 3000)
        interval?: number;      // Read interval in ms (default: 1000)
        // MIC options
        threshold?: number;     // Loud threshold (default: 2500)
        samples?: number;       // Sample count for averaging (default: 32)
    };
}


export interface ProjectData {
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

// Declarative Firmware Intent (Premium Architecture)
export interface FirmwareIntent {
    appName: string;        // e.g. "TideTracker"
    semanticVersion: string; // e.g. "1.0.0"
    modules: ModuleConfig[];
    experience?: {
        bootAnimation?: AnimationType;
        defaultMode?: string;
    };
    meta?: {
        generatedBy?: string;
        timestamp?: number;
    };
}

// API Interfaces
export interface SerialAPI {
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

export interface FirmwareAPI {
    checkTools: () => Promise<ToolStatus>;
    listTemplates: () => Promise<FirmwareTemplate[]>;
    getTemplate: (name: string) => Promise<FirmwareTemplate | null>;
    compileArduino: (sketchPath: string, fqbn?: string) => Promise<CompileResult>;
    uploadArduino: (sketchPath: string, port: string, fqbn?: string) => Promise<UploadResult>;
    uploadArduinoContent: (code: string, port: string, fqbn?: string) => Promise<UploadResult>;
    uploadMicroPython: (filePath: string, port: string, destPath?: string) => Promise<UploadResult>;
    uploadMicroPythonContent: (code: string, port: string, destPath?: string) => Promise<UploadResult>;
    resetESP32: (port: string) => Promise<UploadResult>;
}
