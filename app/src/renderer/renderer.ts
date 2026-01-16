/// <reference path="./global.d.ts" />

// LedPreview class is defined in led-preview.ts and loaded as separate script

// DOM Elements

// DOM Elements
// === DOM Elements === //

// Sidebar & Nav
const navItems = document.querySelectorAll('.nav-item');
const viewSections = document.querySelectorAll('.view-section');
const pageTitle = document.getElementById('page-title') as HTMLHeadingElement;
const statusBadgeLink = document.getElementById('status-badge') as HTMLDivElement;
const statusDot = statusBadgeLink.querySelector('.status-dot') as HTMLSpanElement;
const statusText = statusBadgeLink.querySelector('.status-text') as HTMLSpanElement;

// === Sidebar Navigation ===
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const viewName = (item as HTMLElement).dataset.view;
        if (!viewName) return;

        // Update active nav item
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Update active view section
        viewSections.forEach(section => {
            const el = section as HTMLElement;
            if (el.id === `view-${viewName}`) {
                el.classList.add('active');
                el.style.display = 'block';
            } else {
                el.classList.remove('active');
                el.style.display = 'none';
            }
        });
    });
});

// === Modal Logic Elements ===
const modalBackdrop = document.getElementById('modal-backdrop') as HTMLDivElement;
const modalTitle = document.getElementById('modal-title') as HTMLHeadingElement;
const modalMessage = document.getElementById('modal-message') as HTMLParagraphElement;
const modalInput = document.getElementById('modal-input') as HTMLInputElement;
const modalCancel = document.getElementById('modal-cancel') as HTMLButtonElement;
const modalConfirm = document.getElementById('modal-confirm') as HTMLButtonElement;
const modalClose = document.getElementById('modal-close') as HTMLButtonElement;

function showModal(title: string, message: string, defaultValue: string = ''): Promise<string | null> {
    return new Promise((resolve) => {
        if (!modalBackdrop) return resolve(null); // Safety check

        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalInput.value = defaultValue;
        modalBackdrop.classList.remove('hidden');
        modalBackdrop.style.display = 'flex'; // Ensure flex
        // Small delay to ensure visibility before focusing
        setTimeout(() => modalInput.focus(), 50);

        const close = () => {
            modalBackdrop.classList.add('hidden');
            modalBackdrop.style.display = '';
            cleanup();
            resolve(null);
        };

        const confirm = () => {
            const val = modalInput.value.trim();
            if (!val) {
                alert('Por favor, digite um valor.');
                return;
            }
            modalBackdrop.classList.add('hidden');
            modalBackdrop.style.display = '';
            cleanup();
            resolve(val);
        };

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter') confirm();
            if (e.key === 'Escape') close();
        };

        const cleanup = () => {
            modalCancel.removeEventListener('click', close);
            modalClose.removeEventListener('click', close);
            modalConfirm.removeEventListener('click', confirm);
            modalInput.removeEventListener('keydown', onKey);
        };

        modalCancel.addEventListener('click', close);
        modalClose.addEventListener('click', close);
        modalConfirm.addEventListener('click', confirm);
        modalInput.addEventListener('keydown', onKey);
    });
}


// Main Header
const deviceIconEl = document.getElementById('device-pill') as HTMLDivElement;
const deviceTypeHeader = document.getElementById('device-type-header') as HTMLSpanElement;

// Connection
const portSelect = document.getElementById('port-select') as HTMLSelectElement;
const refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
const autoReconnectCheckbox = document.getElementById('auto-reconnect') as HTMLInputElement;

// Console
const commandInput = document.getElementById('command-input') as HTMLInputElement;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
const logContainer = document.getElementById('log-output') as HTMLDivElement;
const clearLogBtn = document.getElementById('clear-log') as HTMLButtonElement;
const exportLogBtn = document.getElementById('export-log') as HTMLButtonElement;

// Quick Actions
const arduinoCommands = document.getElementById('arduino-commands') as HTMLDivElement;
const espCommands = document.getElementById('esp-commands') as HTMLDivElement;

// Specs
const specModel = document.getElementById('spec-model') as HTMLSpanElement;
const specPort = document.getElementById('spec-port') as HTMLSpanElement;
const specMfr = document.getElementById('spec-mfr') as HTMLSpanElement;
const specCpu = document.getElementById('spec-cpu') as HTMLSpanElement;
const specClock = document.getElementById('spec-clock') as HTMLSpanElement;
const specVoltage = document.getElementById('spec-voltage') as HTMLSpanElement;
const specArch = document.getElementById('spec-arch') as HTMLSpanElement;
const specFlash = document.getElementById('spec-flash') as HTMLSpanElement;
const specRam = document.getElementById('spec-ram') as HTMLSpanElement;
const specEeprom = document.getElementById('spec-eeprom') as HTMLSpanElement;
const specGpio = document.getElementById('spec-gpio') as HTMLSpanElement;
const specAdc = document.getElementById('spec-adc') as HTMLSpanElement;
const specPwm = document.getElementById('spec-pwm') as HTMLSpanElement;
const specDac = document.getElementById('spec-dac') as HTMLSpanElement;

// Firmware
const templateSelect = document.getElementById('template-select') as HTMLSelectElement;
const fwPlatformSelect = document.getElementById('fw-platform') as HTMLSelectElement;
const loadTemplateBtn = document.getElementById('load-template-btn') as HTMLButtonElement;
const codeEditor = document.getElementById('code-editor') as HTMLTextAreaElement;
const currentFileSpan = document.getElementById('current-file') as HTMLSpanElement;
const fileSelect = document.getElementById('file-select') as HTMLSelectElement;
const uploadFirmwareBtn = document.getElementById('upload-firmware-btn') as HTMLButtonElement;
const firmwareStatus = document.getElementById('firmware-status') as HTMLSpanElement;
const toolArduino = document.getElementById('tool-arduino') as HTMLSpanElement;
const toolAmpy = document.getElementById('tool-ampy') as HTMLSpanElement;

// Modules
const btnAddLed = document.getElementById('btn-add-led') as HTMLButtonElement;
const btnAddNeoPixel = document.getElementById('btn-add-neopixel') as HTMLButtonElement;
const modulesOutputList = document.getElementById('modules-output-list') as HTMLDivElement;
const btnGenerateFw = document.getElementById('btn-generate-fw') as HTMLButtonElement;

// Connectivity
const btnAddWifi = document.getElementById('btn-add-wifi') as HTMLButtonElement;
const modulesConnectivityList = document.getElementById('modules-connectivity-list') as HTMLDivElement;

// WiFi Modal Elements
const wifiModalBackdrop = document.getElementById('wifi-modal-backdrop') as HTMLDivElement;
const wifiModalClose = document.getElementById('wifi-modal-close') as HTMLButtonElement;
const wifiModalCancel = document.getElementById('wifi-modal-cancel') as HTMLButtonElement;
const wifiModalConfirm = document.getElementById('wifi-modal-confirm') as HTMLButtonElement;
const wifiMode = document.getElementById('wifi-mode') as HTMLSelectElement;
const wifiSsid = document.getElementById('wifi-ssid') as HTMLInputElement;
const wifiPassword = document.getElementById('wifi-password') as HTMLInputElement;
const wifiHostname = document.getElementById('wifi-hostname') as HTMLInputElement;

// Web Server Modal Elements
const btnAddWebServer = document.getElementById('btn-add-web-server') as HTMLButtonElement;
const webServerModalBackdrop = document.getElementById('web-server-modal-backdrop') as HTMLDivElement;
const webServerModalClose = document.getElementById('web-server-modal-close') as HTMLButtonElement;
const webServerModalCancel = document.getElementById('web-server-modal-cancel') as HTMLButtonElement;
const webServerModalConfirm = document.getElementById('web-server-modal-confirm') as HTMLButtonElement;
const webServerPort = document.getElementById('web-server-port') as HTMLInputElement;
const webServerTitle = document.getElementById('web-server-title') as HTMLInputElement;

// MQTT Modal Elements
const btnAddMqtt = document.getElementById('btn-add-mqtt') as HTMLButtonElement;
const mqttModalBackdrop = document.getElementById('mqtt-modal-backdrop') as HTMLDivElement;
const mqttModalClose = document.getElementById('mqtt-modal-close') as HTMLButtonElement;
const mqttModalCancel = document.getElementById('mqtt-modal-cancel') as HTMLButtonElement;
const mqttModalConfirm = document.getElementById('mqtt-modal-confirm') as HTMLButtonElement;
const mqttBroker = document.getElementById('mqtt-broker') as HTMLInputElement;
const mqttPort = document.getElementById('mqtt-port') as HTMLInputElement;
const mqttUser = document.getElementById('mqtt-user') as HTMLInputElement;
const mqttPass = document.getElementById('mqtt-pass') as HTMLInputElement;
const mqttPrefix = document.getElementById('mqtt-prefix') as HTMLInputElement;
const mqttHaDiscovery = document.getElementById('mqtt-ha-discovery') as HTMLInputElement;

// OTA Modal Elements
const btnAddOta = document.getElementById('btn-add-ota') as HTMLButtonElement;
const otaModalBackdrop = document.getElementById('ota-modal-backdrop') as HTMLDivElement;
const otaModalClose = document.getElementById('ota-modal-close') as HTMLButtonElement;
const otaModalCancel = document.getElementById('ota-modal-cancel') as HTMLButtonElement;
const otaModalConfirm = document.getElementById('ota-modal-confirm') as HTMLButtonElement;
const otaEnabled = document.getElementById('ota-enabled') as HTMLInputElement;

// Servo Modal Elements (Phase 15)
const btnAddServo = document.getElementById('btn-add-servo') as HTMLButtonElement;
const modalServoBackdrop = document.getElementById('servo-modal-backdrop') as HTMLDivElement;
const modalServoTitle = document.getElementById('servo-modal-title') as HTMLHeadingElement;
const modalServoClose = document.getElementById('servo-modal-close') as HTMLButtonElement;
const modalServoCancel = document.getElementById('servo-modal-cancel') as HTMLButtonElement;
const modalServoConfirm = document.getElementById('servo-modal-confirm') as HTMLButtonElement;
// Servo Inputs
const inpServoName = document.getElementById('servo-name') as HTMLInputElement;
const inpServoPin = document.getElementById('servo-pin') as HTMLInputElement;
const selServoType = document.getElementById('servo-type') as HTMLSelectElement;
const inpServoMinPulse = document.getElementById('servo-min-pulse') as HTMLInputElement;
const inpServoMaxPulse = document.getElementById('servo-max-pulse') as HTMLInputElement;
const selServoSource = document.getElementById('servo-source') as HTMLSelectElement;
const divServoMapping = document.getElementById('servo-mapping-container') as HTMLDivElement;
const inpServoMapInMin = document.getElementById('servo-map-in-min') as HTMLInputElement;
const inpServoMapInMax = document.getElementById('servo-map-in-max') as HTMLInputElement;
const inpServoMapOutMin = document.getElementById('servo-map-out-min') as HTMLInputElement;
const inpServoMapOutMax = document.getElementById('servo-map-out-max') as HTMLInputElement;

// UDP Modal Elements
const btnAddUdp = document.getElementById('btn-add-udp') as HTMLButtonElement;
const udpModalBackdrop = document.getElementById('udp-modal-backdrop') as HTMLDivElement;
const udpModalClose = document.getElementById('udp-modal-close') as HTMLButtonElement;
const udpModalCancel = document.getElementById('udp-modal-cancel') as HTMLButtonElement;
const udpModalConfirm = document.getElementById('udp-modal-confirm') as HTMLButtonElement;
const udpPort = document.getElementById('udp-port') as HTMLInputElement;

// Automation Modal Elements
const btnAddMapping = document.getElementById('btn-add-mapping') as HTMLButtonElement;
const btnAddTimer = document.getElementById('btn-add-timer') as HTMLButtonElement;
const mappingModalBackdrop = document.getElementById('mapping-modal-backdrop') as HTMLDivElement;
const mappingModalClose = document.getElementById('mapping-modal-close') as HTMLButtonElement;
const mappingModalCancel = document.getElementById('mapping-modal-cancel') as HTMLButtonElement;
const mappingModalConfirm = document.getElementById('mapping-modal-confirm') as HTMLButtonElement;
const mapTrigger = document.getElementById('map-trigger') as HTMLInputElement;
const mapCommand = document.getElementById('map-command') as HTMLInputElement;

const timerModalBackdrop = document.getElementById('timer-modal-backdrop') as HTMLDivElement;
const timerModalClose = document.getElementById('timer-modal-close') as HTMLButtonElement;
const timerModalCancel = document.getElementById('timer-modal-cancel') as HTMLButtonElement;
const timerModalConfirm = document.getElementById('timer-modal-confirm') as HTMLButtonElement;
const timerTime = document.getElementById('timer-time') as HTMLInputElement;
const timerCommand = document.getElementById('timer-command') as HTMLInputElement;

const mappingsList = document.getElementById('mappings-list') as HTMLDivElement;
const timersList = document.getElementById('timers-list') as HTMLDivElement;

// NeoPixel Modal Elements
const neoModalBackdrop = document.getElementById('neopixel-modal-backdrop') as HTMLDivElement;
const neoModalClose = document.getElementById('neopixel-modal-close') as HTMLButtonElement;
const neoModalCancel = document.getElementById('neopixel-modal-cancel') as HTMLButtonElement;
const neoModalConfirm = document.getElementById('neopixel-modal-confirm') as HTMLButtonElement;
const neoName = document.getElementById('neo-name') as HTMLInputElement;
const neoPin = document.getElementById('neo-pin') as HTMLInputElement;
const neoCount = document.getElementById('neo-count') as HTMLInputElement;
const neoMatrix = document.getElementById('neo-matrix') as HTMLSelectElement;
const neoBrightness = document.getElementById('neo-brightness') as HTMLInputElement;
const neoBrightnessValue = document.getElementById('neo-brightness-value') as HTMLSpanElement;
const neoColorOrder = document.getElementById('neo-color-order') as HTMLSelectElement;
const neoAnimation = document.getElementById('neo-animation') as HTMLSelectElement;

let currentState: ConnectionState = 'DISCONNECTED';
let connectedDeviceType: string | null = null;
let commandHistory: string[] = [];
let historyIndex = -1;
let currentTemplate: FirmwareTemplate | null = null;
let currentFileIndex = 0;
let currentProject: ProjectData | null = null; // Store full project data locally

// Tab Elements - REMOVED
// const tabBtns = document.querySelectorAll('.tab-btn');
// const tabContents = document.querySelectorAll('.tab-content');

// Spec Elements - REMOVED/REFACTORED
// const specsStatus = document.getElementById('specs-status') as HTMLDivElement;
// const specVidPid = document.getElementById('spec-vidpid') as HTMLSpanElement;
// const specGpio = document.getElementById('spec-gpio') as HTMLSpanElement;
// const specAdc = document.getElementById('spec-adc') as HTMLSpanElement;
// const specPwm = document.getElementById('spec-pwm') as HTMLSpanElement;
// const specDac = document.getElementById('spec-dac') as HTMLSpanElement;

// === Navigation Logic ===
// === Navigation Logic ===

// Main Sidebar Navigation
navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Active State
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        // View Switching
        const viewId = (item as HTMLButtonElement).dataset.view;
        viewSections.forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${viewId}`)?.classList.add('active');
    });
});

// Sub-Tabs Navigation (Boards)
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active from all tabs in this group
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // Add active to clicked
        btn.classList.add('active');
        const tabId = (btn as HTMLButtonElement).dataset.tab;

        // Show content
        const content = document.getElementById(`tab-${tabId}`);
        if (content) content.classList.add('active');
    });
});

// === UI Updates ===

function updateStatus(state: ConnectionState): void {
    currentState = state;

    // Reset Classes
    statusBadgeLink.className = 'status-indicator';
    const isConnected = state === 'CONNECTED';

    switch (state) {
        case 'DISCONNECTED':
            statusText.textContent = 'Disconnected';
            break;
        case 'CONNECTING':
            statusBadgeLink.classList.add('connecting');
            statusText.textContent = 'Connecting...';
            break;
        case 'CONNECTED':
            statusBadgeLink.classList.add('connected');
            statusText.textContent = 'Connected';
            break;
        case 'ERROR':
            statusBadgeLink.classList.add('error');
            statusText.textContent = 'Error';
            break;
    }

    // Enable/disable controls
    const isIdle = state === 'DISCONNECTED' || state === 'ERROR';

    portSelect.disabled = !isIdle;
    connectBtn.disabled = state === 'CONNECTING';
    connectBtn.textContent = isConnected ? 'Disconnect' : 'Connect';
    connectBtn.className = isConnected ? 'btn btn-secondary' : 'btn btn-primary';

    commandInput.disabled = !isConnected;
    sendBtn.disabled = !isConnected;

    // Quick Actions
    document.querySelectorAll('.btn-soft').forEach(btn => {
        (btn as HTMLButtonElement).disabled = !isConnected;
    });

    if (!isConnected) {
        deviceIconEl.classList.add('hidden');
        arduinoCommands.classList.add('hidden');
        espCommands.classList.add('hidden');
        connectedDeviceType = null;
    }
}

function showDeviceInfo(info: DeviceInfo): void {
    // Header Pill
    deviceIconEl.classList.remove('hidden');
    deviceTypeHeader.textContent = info.type;

    // Sidebar/Nav Context
    connectedDeviceType = info.type;

    if (info.type.includes('ARDUINO')) {
        arduinoCommands.classList.remove('hidden');
        espCommands.classList.add('hidden');
        if (fwPlatformSelect) fwPlatformSelect.value = 'arduino';
    } else if (info.type.includes('ESP')) {
        espCommands.classList.remove('hidden');
        arduinoCommands.classList.add('hidden');
        if (fwPlatformSelect) fwPlatformSelect.value = 'micropython';
    }

    // Populate Specs
    updateSpecsData(info);
}

// === Tab Logic === - REMOVED
// tabBtns.forEach(btn => {
//     btn.addEventListener('click', () => {
//         // Remove active class from all
//         tabBtns.forEach(b => b.classList.remove('active'));
//         tabContents.forEach(c => c.classList.remove('active'));

//         // Add to clicked
//         btn.classList.add('active');
//         const tabId = (btn as HTMLButtonElement).dataset.tab;
//         if (tabId) {
//             document.getElementById(`tab-${tabId}`)?.classList.add('active');
//         }
//     });
// });

// === Specs Data ===
const DEVICE_SPECS: Record<string, any> = {
    'ARDUINO_UNO': {
        cpu: 'ATmega328P', clock: '16 MHz', voltage: '5V', arch: 'AVR (8-bit)',
        flash: '32 KB', ram: '2 KB', eeprom: '1 KB',
        gpio: '14 (Total)', adc: '6 (10-bit)', pwm: '6', dac: '0'
    },
    'ESP32': {
        cpu: 'Xtensa LX6 Dual-Core', clock: '240 MHz', voltage: '3.3V', arch: 'Xtensa (32-bit)',
        flash: '4 MB (Typ)', ram: '520 KB', eeprom: 'Emulated (Flash)',
        gpio: '34 (Total)', adc: '18 (12-bit)', pwm: '16', dac: '2 (8-bit)'
    }
};

function updateSpecsData(info: DeviceInfo): void {
    specModel.textContent = info.type;
    specPort.textContent = portSelect.value || 'Unknown';
    specMfr.textContent = info.type.includes('ARDUINO') ? 'Arduino CC' : 'Espressif';

    let key = '';
    if (info.type.includes('ARDUINO_UNO')) key = 'ARDUINO_UNO';
    else if (info.type.includes('ESP32')) key = 'ESP32';

    const specs = DEVICE_SPECS[key];
    if (specs) {
        specCpu.textContent = specs.cpu;
        specClock.textContent = specs.clock;
        specVoltage.textContent = specs.voltage;
        specArch.textContent = specs.arch;

        specFlash.textContent = specs.flash;
        specRam.textContent = specs.ram;
        specEeprom.textContent = specs.eeprom;

        specGpio.textContent = specs.gpio;
        specAdc.textContent = specs.adc;
        specPwm.textContent = specs.pwm;
        specDac.textContent = specs.dac;
    }
}


// === TOAST SYSTEM ===
function showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', title?: string) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-type-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    const finalTitle = title || (type.charAt(0).toUpperCase() + type.slice(1));

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-title">${finalTitle}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove after 4s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

function addLog(message: string, type: 'sent' | 'received' | 'error' | 'info' = 'info'): void {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

function clearLog(): void {
    logContainer.innerHTML = '';
    addLog('Log limpo', 'info');
}

function exportLog(): void {
    const entries = logContainer.querySelectorAll('.log-entry');
    const lines: string[] = [];

    entries.forEach(entry => {
        lines.push(entry.textContent || '');
    });

    if (lines.length === 0) {
        addLog('Nenhum log para exportar', 'error');
        return;
    }

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `serial-log-${timestamp}.txt`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
    addLog(`Log exportado: ${filename}`, 'info');
}

// === Serial Operations ===

async function refreshPorts(): Promise<void> {
    try {
        const ports = await window.serial.listPorts();

        portSelect.innerHTML = '<option value="">Selecione uma porta...</option>';

        for (const port of ports) {
            const option = document.createElement('option');
            option.value = port.path;
            option.textContent = port.manufacturer
                ? `${port.path} (${port.manufacturer})`
                : port.path;
            portSelect.appendChild(option);
        }

        addLog(`${ports.length} porta(s) encontrada(s)`, 'info');
    } catch (error) {
        addLog(`Erro ao listar portas: ${error}`, 'error');
    }
}

async function toggleConnection(): Promise<void> {
    if (currentState === 'CONNECTED') {
        // Disconnect
        await window.serial.disconnect();
        addLog('Desconectado', 'info');
    } else {
        // Connect
        const port = portSelect.value;
        if (!port) {
            addLog('Selecione uma porta primeiro', 'error');
            return;
        }

        try {
            addLog(`Conectando a ${port}...`, 'info');
            const info = await window.serial.connect(port);

            if (info) {
                addLog(`Conectado: ${info.type} v${info.firmware}`, 'received');
                showDeviceInfo(info);

                // Habilita auto-reconnect se checkbox marcado
                if (autoReconnectCheckbox.checked) {
                    await window.serial.setAutoReconnect(true);
                    addLog('Auto-reconnect habilitado', 'info');
                }
            }
        } catch (error: any) {
            addLog(`Erro de conexão: ${error}`, 'error');

            if (error.toString().includes('Handshake failed')) {
                // Auto-Recovery Prompt
                const shouldRecover = confirm("O dispositivo não respondeu ao comando de inicialização (Handshake).\n\nO firmware pode estar ausente ou inválido.\nDeseja abrir o Instalador para recuperar o dispositivo?");

                if (shouldRecover) {
                    // Try to get VID/PID for auto-matching
                    let vid: number | undefined = undefined;
                    let pid: number | undefined = undefined;
                    try {
                        const portPath = portSelect.value;
                        window.serial.listPorts().then(ports => {
                            const pInfo = ports.find(p => p.path === portPath);
                            if (pInfo) {
                                if (pInfo.vendorId) vid = parseInt(pInfo.vendorId, 16);
                                if (pInfo.productId) pid = parseInt(pInfo.productId, 16);
                            }
                        }).finally(() => {
                            window.dispatchEvent(new CustomEvent('open-installer', {
                                detail: {
                                    auto: true,
                                    firmware: 'micropython',
                                    vid,
                                    pid
                                }
                            }));
                        });
                    } catch (e) {
                        window.dispatchEvent(new CustomEvent('open-installer', {
                            detail: {
                                auto: true,
                                firmware: 'micropython'
                            }
                        }));
                    }
                }
            }
        }
    }
}

async function sendCommand(command: string): Promise<void> {
    if (!command.trim()) return;

    addLog(command, 'sent');

    try {
        const response = await window.serial.send(command);
        if (response) {
            addLog(response, 'received');
        } else {
            addLog('Sem resposta (timeout)', 'error');
        }
    } catch (error) {
        addLog(`Erro: ${error}`, 'error');
    }
}

// === Event Listeners ===

refreshBtn.addEventListener('click', refreshPorts);
connectBtn.addEventListener('click', toggleConnection);
clearLogBtn.addEventListener('click', clearLog);
exportLogBtn.addEventListener('click', exportLog);

sendBtn.addEventListener('click', () => {
    const cmd = commandInput.value.trim();
    if (cmd) {
        commandHistory.unshift(cmd);
        if (commandHistory.length > 50) commandHistory.pop();
        historyIndex = -1;
        sendCommand(cmd);
        commandInput.value = '';
    }
});

commandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const cmd = commandInput.value.trim();
        if (cmd) {
            commandHistory.unshift(cmd);
            if (commandHistory.length > 50) commandHistory.pop();
            historyIndex = -1;
            sendCommand(cmd);
            commandInput.value = '';
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
            historyIndex++;
            commandInput.value = commandHistory[historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            commandInput.value = commandHistory[historyIndex];
        } else if (historyIndex === 0) {
            historyIndex = -1;
            commandInput.value = '';
        }
    }
});

document.querySelectorAll('.btn-soft').forEach(btn => {
    btn.addEventListener('click', () => {
        const cmd = (btn as HTMLButtonElement).dataset.cmd;
        if (cmd) sendCommand(cmd);
    });
});

// Command Reference List Click
document.querySelectorAll('.cmd-item').forEach(item => {
    item.addEventListener('click', () => {
        const cmd = (item as HTMLElement).dataset.cmd;
        if (cmd) {
            commandInput.value = cmd;
            commandInput.focus();
        }
    });
});

// === Dimmer Control ===
const brightnessSlider = document.getElementById('brightness-slider') as HTMLInputElement;
const brightnessValue = document.getElementById('brightness-value') as HTMLSpanElement;
const fadeDuration = document.getElementById('fade-duration') as HTMLSelectElement;

if (brightnessSlider && brightnessValue && fadeDuration) {
    brightnessSlider.addEventListener('input', () => {
        brightnessValue.textContent = `${brightnessSlider.value}%`;
    });

    brightnessSlider.addEventListener('change', () => {
        const level = brightnessSlider.value;
        const duration = fadeDuration.value;
        if (duration === '0') {
            sendCommand(`BRIGHT:2:${level}`);
        } else {
            sendCommand(`FADE:2:${level}:${duration}`);
        }
    });

    // Quick brightness buttons
    document.querySelectorAll('[data-brightness]').forEach(btn => {
        btn.addEventListener('click', () => {
            const level = (btn as HTMLButtonElement).dataset.brightness;
            if (level) {
                brightnessSlider.value = level;
                brightnessValue.textContent = `${level}%`;
                const duration = fadeDuration.value;
                if (duration === '0') {
                    sendCommand(`BRIGHT:2:${level}`);
                } else {
                    sendCommand(`FADE:2:${level}:${duration}`);
                }
            }
        });
    });
}

// === Event Handlers from Main Process ===

window.serial.onStateChanged((state) => {
    updateStatus(state);
});

window.serial.onData((data) => {
    addLog(data, 'received');
});

window.serial.onError((error) => {
    addLog(error, 'error');
});

// === Project Logic ===

// DOM Elements
const projectList = document.getElementById('project-list') as HTMLDivElement;
const btnNewProject = document.getElementById('btn-new-project') as HTMLButtonElement;
const viewProjects = document.getElementById('view-projects') as HTMLDivElement;
const viewBoards = document.getElementById('view-boards') as HTMLDivElement;
const navProjects = document.querySelector('.nav-item[data-view="projects"]') as HTMLButtonElement;
const navBoards = document.querySelector('.nav-item[data-view="boards"]') as HTMLButtonElement;

async function refreshProjects(): Promise<void> {
    try {
        const projects = await window.projects.list();
        projectList.innerHTML = '';

        if (projects.length === 0) {
            projectList.innerHTML = '<p style="text-align:center; color: var(--text-tertiary);">Nenhum projeto encontrado.</p>';
            return;
        }

        projects.forEach(p => {
            const card = document.createElement('div');
            card.className = 'project-card';

            const date = new Date(p.lastModified).toLocaleDateString();
            const time = new Date(p.lastModified).toLocaleTimeString();

            card.innerHTML = `
                <div class="project-info">
                    <h4>${p.name}</h4>
                    <span class="project-meta">Modificado: ${date} ${time}</span>
                    <span class="project-meta">${p.boardConfig.type || 'Sem placa'}</span>
                </div>
                <div class="project-actions">
                    <button class="btn btn-sm btn-open">Abrir</button>
                    <button class="btn btn-sm btn-danger btn-del">🗑️</button>
                </div>
            `;

            // Open Project
            card.querySelector('.btn-open')?.addEventListener('click', () => loadProject(p.id));

            // Delete Project
            card.querySelector('.btn-del')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`Deletar projeto "${p.name}"?`)) {
                    await window.projects.delete(p.id);
                    refreshProjects();
                }
            });

            projectList.appendChild(card);
        });
    } catch (e) {
        console.error('Error listing projects:', e);
    }
}

async function createNewProject(): Promise<void> {
    const name = await showModal('Novo Projeto', 'Nome do Projeto:', 'Novo Projeto');
    if (!name) return;

    try {
        const newProject = await window.projects.save({
            name: name,
            boardConfig: { port: '', type: '' }
        });

        await loadProject(newProject.id);
    } catch (e) {
        alert('Erro ao criar projeto: ' + e);
    }
}

async function loadProject(id: string): Promise<void> {
    try {
        const project = await window.projects.load(id);
        if (!project) return;

        currentProject = project; // Store globally

        // Restore State
        if (project.boardConfig.port) {
            portSelect.value = project.boardConfig.port;
        }

        // Switch to Board View
        navProjects.classList.remove('active');
        navBoards.classList.add('active');
        viewProjects.classList.remove('active');
        viewBoards.classList.add('active');

        // Update Title
        if (pageTitle) pageTitle.textContent = project.name;

        refreshModulesUI(); // Refresh modules
        addLog(`Projeto carregado: ${project.name}`, 'info');

    } catch (e) {
        console.error('Error loading project:', e);
    }
}

// Listeners
btnNewProject.addEventListener('click', createNewProject);

// Update init
(async function init() {
    updateStatus('DISCONNECTED');
    await refreshPorts();
    await initFirmwarePanel();
    await refreshProjects();
    initLedPreview();
})();

// === LED Preview ===
let ledPreview: LedPreview | null = null;

function initLedPreview() {
    const canvas = document.getElementById('led-preview-canvas');
    if (!canvas) return;

    ledPreview = new LedPreview('led-preview-canvas');
    ledPreview.startRendering();

    // Layout selector
    const layoutSelect = document.getElementById('preview-layout') as HTMLSelectElement;
    const widthInput = document.getElementById('preview-width') as HTMLInputElement;
    const heightInput = document.getElementById('preview-height') as HTMLInputElement;

    layoutSelect?.addEventListener('change', () => {
        const layout = layoutSelect.value as 'strip' | 'matrix' | 'ring';
        const w = parseInt(widthInput.value) || 8;
        const h = parseInt(heightInput.value) || 8;
        ledPreview?.setLayout(layout, w, h);
    });

    widthInput?.addEventListener('change', () => {
        const w = parseInt(widthInput.value) || 8;
        const h = parseInt(heightInput.value) || 8;
        ledPreview?.setLayout('matrix', w, h);
    });

    heightInput?.addEventListener('change', () => {
        const w = parseInt(widthInput.value) || 8;
        const h = parseInt(heightInput.value) || 8;
        ledPreview?.setLayout('matrix', w, h);
    });

    // Glow toggle
    const glowToggle = document.getElementById('preview-glow') as HTMLInputElement;
    glowToggle?.addEventListener('change', () => {
        ledPreview?.setGlow(glowToggle.checked);
    });

    // Test rainbow button
    const testBtn = document.getElementById('preview-test-rainbow');
    testBtn?.addEventListener('click', () => {
        if (!ledPreview) return;
        const config = ledPreview.getConfig();
        for (let i = 0; i < config.count; i++) {
            const hue = (i / config.count) * 360;
            const [r, g, b] = hsvToRgb(hue, 1, 1);
            ledPreview.setPixel(i, r, g, b);
        }
        ledPreview.render();
    });

    // Clear button
    const clearBtn = document.getElementById('preview-clear');
    clearBtn?.addEventListener('click', () => {
        ledPreview?.clear();
        ledPreview?.render();
    });
}

// HSV to RGB helper
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    h = h % 360;
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// === Animation Creator Handlers ===
let currentTool = 'pencil';
let currentColor = '#FF0000';
let animationFrames: Array<Array<{ r: number, g: number, b: number }>> = [];
let currentFrameIndex = 0;
let isPlaying = false;
let playInterval: number | null = null;

function initAnimationCreator() {
    // Tool selection
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTool = (btn as HTMLElement).dataset.tool || 'pencil';
        });
    });

    // Color swatches
    document.querySelectorAll('.swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            currentColor = (swatch as HTMLElement).dataset.color || '#FF0000';
            const colorInput = document.getElementById('draw-color') as HTMLInputElement;
            if (colorInput) colorInput.value = currentColor;
        });
    });

    // Color picker
    const colorPicker = document.getElementById('draw-color') as HTMLInputElement;
    colorPicker?.addEventListener('input', () => {
        currentColor = colorPicker.value;
    });

    // Hardware Apply button
    const hwApply = document.getElementById('hw-apply');
    hwApply?.addEventListener('click', () => {
        const layout = (document.getElementById('hw-layout') as HTMLSelectElement)?.value as 'strip' | 'matrix' | 'ring';
        const w = parseInt((document.getElementById('hw-width') as HTMLInputElement)?.value) || 8;
        const h = parseInt((document.getElementById('hw-height') as HTMLInputElement)?.value) || 8;
        if (ledPreview) {
            ledPreview.setLayout(layout, w, h);
            initFrames(w * h);
        }
        addLog(`Hardware configurado: ${layout} ${w}x${h}`, 'info');
    });

    // === CANVAS DRAWING HANDLERS ===
    const canvas = document.getElementById('led-preview-canvas') as HTMLCanvasElement;
    let isDrawing = false;

    function getPixelFromClick(e: MouseEvent): number | null {
        if (!canvas || !ledPreview) return null;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const config = ledPreview.getConfig();

        // Calculate which pixel was clicked based on layout
        if (config.layout === 'strip') {
            const ledSize = rect.width / config.count;
            return Math.floor(x / ledSize);
        } else if (config.layout === 'matrix') {
            const cellW = rect.width / config.width;
            const cellH = rect.height / config.height;
            const col = Math.floor(x / cellW);
            const row = Math.floor(y / cellH);
            if (col >= 0 && col < config.width && row >= 0 && row < config.height) {
                return row * config.width + col;
            }
        } else if (config.layout === 'ring') {
            // Simplified ring click - find nearest LED
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const angle = Math.atan2(y - centerY, x - centerX);
            const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
            return Math.floor(normalizedAngle * config.count) % config.count;
        }
        return null;
    }

    function drawAtPixel(pixelIndex: number) {
        if (!ledPreview || pixelIndex === null || pixelIndex < 0) return;
        const config = ledPreview.getConfig();
        if (pixelIndex >= config.count) return;

        const rgb = hexToRgb(currentColor);

        switch (currentTool) {
            case 'pencil':
                ledPreview.setPixel(pixelIndex, rgb.r, rgb.g, rgb.b);
                break;
            case 'eraser':
                ledPreview.setPixel(pixelIndex, 0, 0, 0);
                break;
            case 'fill':
                // Fill all with current color
                for (let i = 0; i < config.count; i++) {
                    ledPreview.setPixel(i, rgb.r, rgb.g, rgb.b);
                }
                break;
            case 'picker':
                // Get color from pixel - not implemented yet
                addLog(`Picker: pixel ${pixelIndex}`, 'info');
                break;
        }
        ledPreview.render();
    }

    canvas?.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const pixel = getPixelFromClick(e);
        if (pixel !== null) drawAtPixel(pixel);
    });

    canvas?.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        if (currentTool === 'fill') return; // Don't drag-fill
        const pixel = getPixelFromClick(e);
        if (pixel !== null) drawAtPixel(pixel);
    });

    canvas?.addEventListener('mouseup', () => {
        isDrawing = false;
    });

    canvas?.addEventListener('mouseleave', () => {
        isDrawing = false;
    });

    // Init first frame
    initFrames(64);

    // Timeline controls
    document.getElementById('add-frame')?.addEventListener('click', addFrame);
    document.getElementById('dup-frame')?.addEventListener('click', duplicateFrame);
    document.getElementById('del-frame')?.addEventListener('click', deleteFrame);
    document.getElementById('timeline-prev')?.addEventListener('click', () => navigateFrame(-1));
    document.getElementById('timeline-next')?.addEventListener('click', () => navigateFrame(1));
    document.getElementById('timeline-play')?.addEventListener('click', togglePlay);

    // Effects buttons
    document.querySelectorAll('.effect-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const effect = (btn as HTMLElement).dataset.effect;
            if (effect) applyEffect(effect);
        });
    });

    // Brightness slider
    const brightnessSlider = document.getElementById('brightness-slider') as HTMLInputElement;
    const brightnessValue = document.getElementById('brightness-value') as HTMLSpanElement;
    brightnessSlider?.addEventListener('input', () => {
        if (brightnessValue) brightnessValue.textContent = `${brightnessSlider.value}%`;
    });

    // Export buttons
    document.getElementById('export-micropython')?.addEventListener('click', () => exportAnimation('micropython'));
    document.getElementById('export-arduino')?.addEventListener('click', () => exportAnimation('arduino'));
    document.getElementById('export-json')?.addEventListener('click', () => exportAnimation('json'));
    document.getElementById('send-to-device')?.addEventListener('click', sendToDevice);

    // Tide apply button
    document.getElementById('apply-tide')?.addEventListener('click', applyTideAnimation);

    // Hardware Presets
    const hwPreset = document.getElementById('hw-preset') as HTMLSelectElement;
    const hwWidth = document.getElementById('hw-width') as HTMLInputElement;
    const hwHeight = document.getElementById('hw-height') as HTMLInputElement;

    hwPreset?.addEventListener('change', () => {
        const val = hwPreset.value;
        switch (val) {
            case '8x8': hwWidth.value = '8'; hwHeight.value = '8'; break;
            case '16x16': hwWidth.value = '16'; hwHeight.value = '16'; break;
            case '32x8': hwWidth.value = '8'; hwHeight.value = '32'; break; // Vertical: H > W
            case '60led': hwWidth.value = '1'; hwHeight.value = '60'; break; // Vertical Strip
            case '12ring': hwWidth.value = '1'; hwHeight.value = '12'; break; // Vertical/Linear representation
        }
    });

    // System Animations Handlers
    document.querySelectorAll('[data-anim]').forEach(btn => {
        btn.addEventListener('click', () => {
            const anim = (btn as HTMLElement).dataset.anim;
            if (anim) applyEffect(anim);
        })
    });

    // Export .h Button
    document.getElementById('btn-export-anim-h')?.addEventListener('click', exportToCppHeader);
}

// === C++ Header Export Function ===
function exportToCppHeader() {
    // 1. Get info
    const animNameRaw = (document.getElementById('frame-tag') as HTMLInputElement)?.value || 'MyAnim';
    const animName = animNameRaw.replace(/[^a-zA-Z0-9]/g, '_');

    // Check if frames exist
    if (!animationFrames || animationFrames.length === 0) {
        showToast('Nenhuma animação criada!', 'error');
        return;
    }

    const frameCount = animationFrames.length;
    const ledCount = animationFrames[0].length;
    const fps = parseInt((document.getElementById('anim-fps') as HTMLInputElement)?.value || '10');
    const delayMs = Math.floor(1000 / fps);

    // 2. Build C++ Content
    let cpp = `// Animation: ${animName}\n`;
    cpp += `// Generated by LED Animation Creator v1.2\n`;
    cpp += `#include <Arduino.h>\n\n`;

    cpp += `const uint16_t ${animName}_frames = ${frameCount};\n`;
    cpp += `const uint16_t ${animName}_leds = ${ledCount};\n`;
    cpp += `const uint16_t ${animName}_delay = ${delayMs};\n\n`;

    // 3. Encode frames (simple array of uint32_t for now - RGB)
    // Optimization: could be PROGMEM
    cpp += `const uint32_t ${animName}_data[${frameCount}][${ledCount}] PROGMEM = {\n`;

    for (let f = 0; f < frameCount; f++) {
        cpp += `  { `;
        const frame = animationFrames[f];
        for (let i = 0; i < ledCount; i++) {
            // 0x00RRGGBB
            const hex = `0x${((frame[i].r << 16) | (frame[i].g << 8) | frame[i].b).toString(16).padStart(6, '0').toUpperCase()}`;
            cpp += `${hex}${i < ledCount - 1 ? ',' : ''}`;
        }
        cpp += ` }${f < frameCount - 1 ? ',' : ''}\n`;
    }
    cpp += `};\n`;

    // 4. Download
    const blob = new Blob([cpp], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${animName}.h`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Arquivo ${animName}.h gerado!`, 'success');
}

function initFrames(pixelCount: number) {
    animationFrames = [Array(pixelCount).fill(null).map(() => ({ r: 0, g: 0, b: 0 }))];
    currentFrameIndex = 0;
    updateTimelineUI();
}

function addFrame() {
    const config = ledPreview?.getConfig();
    const count = config?.count || 64;
    animationFrames.push(Array(count).fill(null).map(() => ({ r: 0, g: 0, b: 0 })));
    currentFrameIndex = animationFrames.length - 1;
    updateTimelineUI();
    loadFrame(currentFrameIndex);
}

function duplicateFrame() {
    if (animationFrames.length === 0) return;
    const copy = animationFrames[currentFrameIndex].map(p => ({ ...p }));
    animationFrames.splice(currentFrameIndex + 1, 0, copy);
    currentFrameIndex++;
    updateTimelineUI();
}

function deleteFrame() {
    if (animationFrames.length <= 1) return;
    animationFrames.splice(currentFrameIndex, 1);
    if (currentFrameIndex >= animationFrames.length) currentFrameIndex = animationFrames.length - 1;
    updateTimelineUI();
    loadFrame(currentFrameIndex);
}

function navigateFrame(delta: number) {
    saveCurrentFrame();
    currentFrameIndex = Math.max(0, Math.min(animationFrames.length - 1, currentFrameIndex + delta));
    loadFrame(currentFrameIndex);
    updateTimelineUI();
}

function togglePlay() {
    isPlaying = !isPlaying;
    const btn = document.getElementById('timeline-play');
    if (btn) btn.textContent = isPlaying ? '⏸️' : '▶️';

    if (isPlaying) {
        const duration = parseInt((document.getElementById('frame-duration') as HTMLInputElement)?.value) || 100;
        playInterval = window.setInterval(() => {
            currentFrameIndex = (currentFrameIndex + 1) % animationFrames.length;
            loadFrame(currentFrameIndex);
            updateTimelineUI();
        }, duration);
    } else if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
    }
}

function saveCurrentFrame() {
    if (!ledPreview || !animationFrames[currentFrameIndex]) return;
    // Save would copy from preview to frame data - simplified for now
}

function loadFrame(index: number) {
    if (!ledPreview || !animationFrames[index]) return;
    const frame = animationFrames[index];
    for (let i = 0; i < frame.length; i++) {
        ledPreview.setPixel(i, frame[i].r, frame[i].g, frame[i].b);
    }
    ledPreview.render();
}

function updateTimelineUI() {
    const container = document.getElementById('timeline-frames');
    const currentSpan = document.getElementById('current-frame');
    const totalSpan = document.getElementById('total-frames');

    if (currentSpan) currentSpan.textContent = String(currentFrameIndex + 1);
    if (totalSpan) totalSpan.textContent = String(animationFrames.length);

    if (container) {
        container.innerHTML = animationFrames.map((_, i) =>
            `<div class="frame-thumb ${i === currentFrameIndex ? 'active' : ''}" data-frame="${i + 1}">${i + 1}</div>`
        ).join('');

        container.querySelectorAll('.frame-thumb').forEach(thumb => {
            thumb.addEventListener('click', () => {
                saveCurrentFrame();
                currentFrameIndex = parseInt((thumb as HTMLElement).dataset.frame || '1') - 1;
                loadFrame(currentFrameIndex);
                updateTimelineUI();
            });
        });
    }
}

// ========================================
// === FastLED-style Math & Helpers ===
// ========================================

/**
 * Fast 8-bit sine approximation
 * Input: 0-255, Output: 0-255
 */
function sin8(theta: number): number {
    const b = (theta & 0xFF);
    const s = Math.sin(b * Math.PI * 2 / 255);
    return Math.floor((s + 1) * 127.5);
}

/**
 * Fast 8-bit cosine approximation
 * Input: 0-255, Output: 0-255
 */
function cos8(theta: number): number {
    return sin8(theta + 64);
}

/**
 * Scale one byte by another (val * scalar / 256)
 * Useful for dimming
 */
function scale8(i: number, scale: number): number {
    return ((i * scale) >> 8);
}

/**
 * Saturating addition (clamped at 255)
 */
function qadd8(i: number, j: number): number {
    let t = i + j;
    if (t > 255) t = 255;
    return t;
}

/**
 * Saturating subtraction (clamped at 0)
 */
function qsub8(i: number, j: number): number {
    let t = i - j;
    if (t < 0) t = 0;
    return t;
}

/**
 * Linear map (8-bit)
 */
function map8(x: number, in_min: number, in_max: number, out_min: number, out_max: number): number {
    return Math.floor((x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min);
}

/**
 * Get color from palette (Linear interpolation)
 * index: 0-255 (position in palette)
 * palette: Array of [r, g, b]
 */
function ColorFromPalette(palette: number[][], index: number, brightness: number = 255): [number, number, number] {
    // 16-entry palette standard
    const entryCount = palette.length;
    const regionSize = 256 / entryCount;

    const entryIndex = Math.floor(index / regionSize);
    const offset = Math.floor(index % regionSize);
    const ratio = offset / regionSize; // 0.0 to 1.0

    const color1 = palette[entryIndex % entryCount];
    const color2 = palette[(entryIndex + 1) % entryCount];

    let r = color1[0] + (color2[0] - color1[0]) * ratio;
    let g = color1[1] + (color2[1] - color1[1]) * ratio;
    let b = color1[2] + (color2[2] - color1[2]) * ratio;

    if (brightness !== 255) {
        r = scale8(r, brightness);
        g = scale8(g, brightness);
        b = scale8(b, brightness);
    }

    return [Math.floor(r), Math.floor(g), Math.floor(b)];
}

// Standard Palettes (FastLED)
const Palette_Rainbow = [
    [255, 0, 0], [171, 85, 0], [171, 171, 0], [0, 255, 0],
    [0, 171, 85], [0, 0, 255], [85, 0, 171], [255, 0, 255]
];

const Palette_Ocean = [
    [0, 0, 50], [0, 20, 100], [0, 100, 200], [0, 200, 255],
    [50, 255, 200], [0, 200, 255], [0, 100, 200], [0, 20, 100]
];

const Palette_Fire = [
    [0, 0, 0], [30, 0, 0], [100, 0, 0], [180, 20, 0],
    [255, 50, 0], [255, 120, 0], [255, 200, 0], [255, 255, 100]
];

const Palette_Cloud = [
    [50, 50, 80], [100, 100, 120], [150, 150, 180], [200, 200, 220],
    [220, 220, 220], [200, 200, 220], [150, 150, 180], [100, 100, 120]
];

function applyEffect(effect: string) {
    if (!ledPreview) return;
    const config = ledPreview.getConfig();
    const count = config.count;
    const time = Date.now() / 1000;

    switch (effect) {
        case 'rainbow':
            // FastLED Style Rainbow
            const hue = Math.floor(time * 20) % 255;
            for (let i = 0; i < count; i++) {
                const pixelHue = (hue + Math.floor((i * 256) / count)) % 255;
                const [r, g, b] = ColorFromPalette(Palette_Rainbow, pixelHue);
                ledPreview.setPixel(i, r, g, b);
            }
            break;

        case 'fire':
            // FastLED Fire2012 simulation (Simplified for JS preview)
            // 1. Cool down every cell a little
            for (let i = 0; i < count; i++) {
                // Approximate cooling
                // In a real simulation we'd keep state between frames, 
                // but for preview specific frame calc is stateless for now or uses simple random
                // We'll simulate a snapshot of fire
                const noise = Math.random() * 255;
                const heat = qsub8(noise, Math.random() * 80);
                const [r, g, b] = ColorFromPalette(Palette_Fire, heat);
                ledPreview.setPixel(i, r, g, b);
            }
            // Better visual: Use perlin-like noise or sin waves for "moving" fire if stateless
            const tFire = time * 0.5;
            for (let i = 0; i < count; i++) {
                // Dynamic Fire using sin8 combination for height/intensity
                const h1 = sin8(i * 30 + tFire * 100);
                const h2 = sin8(i * 10 - tFire * 50);
                const heatIndex = qadd8(h1, h2);
                const [r, g, b] = ColorFromPalette(Palette_Fire, heatIndex);
                ledPreview.setPixel(i, r, g, b);
            }
            break;

        case 'plasma':
            // FastLED Plasma using sin8/cos8 and Palette Ocean
            // k: index, t: time
            const phase1 = Math.floor(time * 30);
            const phase2 = Math.floor(time * 22);

            for (let i = 0; i < count; i++) {
                const index = Math.floor(i * 255 / count); // map to 0-255
                // Calculate "color index" using combined sine waves
                const w1 = sin8(index + phase1);
                const w2 = cos8(index + phase2);
                const w3 = sin8(index + phase1 + phase2);

                const colorIndex = Math.floor((w1 + w2 + w3) / 3);
                const [r, g, b] = ColorFromPalette(Palette_Ocean, colorIndex);
                ledPreview.setPixel(i, r, g, b);
            }
            break;

        case 'sparkle':
            // Black background with random sparkles
            for (let i = 0; i < count; i++) {
                if (Math.random() < 0.1) {
                    ledPreview.setPixel(i, 255, 255, 255);
                } else {
                    ledPreview.setPixel(i, 0, 0, 20);
                }
            }
            break;

        case 'aurora':
            for (let i = 0; i < count; i++) {
                const t = i / count;
                const wave = Math.sin(t * Math.PI * 4 + time) * 0.5 + 0.5;
                const r = Math.floor(wave * 20);
                const g = Math.floor(100 + wave * 100);
                const b = Math.floor(150 + wave * 105);
                ledPreview.setPixel(i, r, g, b);
            }
            break;

        case 'wave':
            for (let i = 0; i < count; i++) {
                const t = i / count;
                const wave = Math.sin(t * Math.PI * 2 + time * 2) * 0.5 + 0.5;
                const [r, g, b] = hsvToRgb(200, 1, wave);
                ledPreview.setPixel(i, r, g, b);
            }
            break;

        case 'gradient':
            for (let i = 0; i < count; i++) {
                const t = i / count;
                ledPreview.setPixel(i, Math.floor(255 * t), 0, Math.floor(255 * (1 - t)));
            }
            break;

        // === SYSTEM ANIMATIONS ===
        case 'sys-boot':
            // Spinning white loading circle or progress bar
            // For now, simple chase
            const bootPos = Math.floor((time * 10) % count);
            for (let i = 0; i < count; i++) {
                if (i === bootPos) ledPreview.setPixel(i, 255, 255, 255);
                else {
                    const dist = (i - bootPos + count) % count;
                    const dim = Math.max(0, 255 - dist * 50);
                    ledPreview.setPixel(i, dim, dim, dim);
                }
            }
            break;

        case 'sys-wifi':
            // Pulse Blue/Cyan
            const wifiPhase = (Math.sin(time * 5) + 1) / 2; // 0 to 1
            const wifiR = 0;
            const wifiG = Math.floor(100 * wifiPhase);
            const wifiB = Math.floor(255 * wifiPhase); // Cyan pulsing
            for (let i = 0; i < count; i++) {
                ledPreview.setPixel(i, wifiR, wifiG, wifiB);
                // Maybe some random packets
                if (Math.random() < 0.05) ledPreview.setPixel(i, 255, 255, 255);
            }
            break;

        case 'sys-error':
            // Blinking Red
            const errState = Math.floor(time * 4) % 2 === 0;
            for (let i = 0; i < count; i++) {
                if (errState) ledPreview.setPixel(i, 255, 0, 0);
                else ledPreview.setPixel(i, 20, 0, 0); // Dim red
            }
            break;

        case 'sys-success':
            // Green sweep
            const succPos = (time * 1.5) % 1; // 0 to 1
            const succIndex = Math.floor(succPos * count);
            for (let i = 0; i < count; i++) {
                if (i <= succIndex) ledPreview.setPixel(i, 0, 255, 0);
                else ledPreview.setPixel(i, 0, 20, 0);
            }
            break;

        case 'tide':
            // Show tide config panel
            const tideConfig = document.getElementById('tide-config');
            const trendConfig = document.getElementById('trend-config');
            if (tideConfig) tideConfig.style.display = 'block';
            if (trendConfig) trendConfig.style.display = 'none';
            // Apply current tide level preview
            applyTideAnimation();
            return; // Don't show generic message

        // === WEATHER PRESETS (Inspired by user's MicroPython dashboard) ===
        case 'weather':
        case 'weather-temp':
            // Thermometer visualization - temperature determines color and fill level
            const temp = 25; // Simulated, would come from API
            let tempColor: [number, number, number];
            if (temp < 15) tempColor = [0, 100, 255];      // Cold blue
            else if (temp < 25) tempColor = [0, 255, 100]; // Green
            else if (temp < 30) tempColor = [255, 150, 0]; // Orange
            else tempColor = [255, 0, 0];                   // Hot red

            const height = Math.floor((temp / 40) * count);
            for (let i = 0; i < count; i++) {
                if (i < height) {
                    // Gradient from blue (cold) to red (hot)
                    const t = i / count;
                    ledPreview.setPixel(i,
                        Math.floor(t * tempColor[0]),
                        Math.floor((1 - t) * tempColor[1] + t * tempColor[1] * 0.5),
                        Math.floor((1 - t) * 255)
                    );
                } else {
                    ledPreview.setPixel(i, 5, 5, 10);
                }
            }
            break;

        case 'weather-wind':
            // Wind particle animation
            for (let i = 0; i < count; i++) {
                const isParticle = Math.random() < 0.15;
                if (isParticle) {
                    // Cyan wind particles
                    ledPreview.setPixel(i, 100, 255, 255);
                } else if (Math.random() < 0.1) {
                    // Faint trail
                    ledPreview.setPixel(i, 20, 50, 50);
                } else {
                    ledPreview.setPixel(i, 0, 0, 15);
                }
            }
            break;

        case 'weather-condition':
        case 'weather-moon':
            // Moon phase visualization for 8x8 matrix
            const moonPhase = Math.floor(Math.random() * 3); // 0=new, 1=crescent, 2=full
            const moonColor = [200, 200, 180]; // Warm white
            const darkColor = [0, 0, 0];
            const grayColor = [20, 20, 20];

            // Moon bitmaps for 8x8
            const moonFull = [
                0, 0, 1, 1, 1, 1, 0, 0,
                0, 1, 1, 1, 1, 1, 1, 0,
                1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1,
                0, 1, 1, 1, 1, 1, 1, 0,
                0, 0, 1, 1, 1, 1, 0, 0
            ];
            const moonCrescent = [
                0, 0, 0, 1, 1, 0, 0, 0,
                0, 0, 1, 1, 0, 0, 0, 0,
                0, 1, 1, 0, 0, 0, 0, 0,
                0, 1, 1, 0, 0, 0, 0, 0,
                0, 1, 1, 0, 0, 0, 0, 0,
                0, 1, 1, 0, 0, 0, 0, 0,
                0, 0, 1, 1, 0, 0, 0, 0,
                0, 0, 0, 1, 1, 0, 0, 0
            ];
            const moonNew = [
                0, 0, 2, 2, 2, 2, 0, 0,
                0, 2, 0, 0, 0, 0, 2, 0,
                2, 0, 0, 0, 0, 0, 0, 2,
                2, 0, 0, 0, 0, 0, 0, 2,
                2, 0, 0, 0, 0, 0, 0, 2,
                2, 0, 0, 0, 0, 0, 0, 2,
                0, 2, 0, 0, 0, 0, 2, 0,
                0, 0, 2, 2, 2, 2, 0, 0
            ];

            const moonBitmap = moonPhase === 2 ? moonFull : (moonPhase === 1 ? moonCrescent : moonNew);
            for (let i = 0; i < Math.min(count, 64); i++) {
                const val = moonBitmap[i];
                if (val === 1) ledPreview.setPixel(i, moonColor[0], moonColor[1], moonColor[2]);
                else if (val === 2) ledPreview.setPixel(i, grayColor[0], grayColor[1], grayColor[2]);
                else ledPreview.setPixel(i, darkColor[0], darkColor[1], darkColor[2]);
            }
            addLog(`🌙 Fase da Lua: ${['Nova', 'Crescente', 'Cheia'][moonPhase]}`, 'info');
            break;

        // === CRYPTO PRESETS ===
        case 'crypto':
        case 'crypto-ticker':
            // Simulated crypto ticker - green/red based on trend
            const isUp = Math.random() > 0.5;
            const tickerColor = isUp ? [0, 255, 80] : [255, 40, 40];
            for (let i = 0; i < count; i++) {
                const noise = Math.random() * 0.3 + 0.7;
                const pos = i / count;
                const waveHeight = Math.sin(pos * Math.PI * 2 + time * 3) * 0.5 + 0.5;
                if (Math.random() < waveHeight * 0.5) {
                    ledPreview.setPixel(i,
                        Math.floor(tickerColor[0] * noise),
                        Math.floor(tickerColor[1] * noise),
                        Math.floor(tickerColor[2] * noise)
                    );
                } else {
                    ledPreview.setPixel(i, 5, 10, 5);
                }
            }
            addLog(`📈 Crypto: ${isUp ? '↗ Subindo' : '↘ Caindo'}`, 'info');
            break;

        case 'crypto-trend':
            // Red/Green split based on 24h change
            const changePercent = (Math.random() - 0.5) * 20; // -10 to +10%
            const midPoint = Math.floor(count / 2);
            const trend = changePercent > 0;
            for (let i = 0; i < count; i++) {
                if (trend) {
                    // Green upward gradient
                    const intensity = i / count;
                    ledPreview.setPixel(i, 0, Math.floor(100 + 155 * intensity), 50);
                } else {
                    // Red downward gradient
                    const intensity = 1 - (i / count);
                    ledPreview.setPixel(i, Math.floor(100 + 155 * intensity), 30, 30);
                }
            }
            addLog(`📊 Crypto 24h: ${changePercent.toFixed(1)}%`, 'info');
            break;

        case 'custom-api':
            alert('API Custom - Configure na aba APIs');
            return;

        default:
            for (let i = 0; i < count; i++) {
                const [r, g, b] = hsvToRgb((i / count) * 360, 1, 1);
                ledPreview.setPixel(i, r, g, b);
            }
    }
    ledPreview.render();
    addLog(`Efeito aplicado: ${effect}`, 'info');
}

// Current simulated tide level (0-100%)
let currentTideLevel = 50;
let tideAnimationInterval: number | null = null;

function applyTideAnimation() {
    const highColor = (document.getElementById('tide-high-color') as HTMLInputElement)?.value || '#0080FF';
    const lowColor = (document.getElementById('tide-low-color') as HTMLInputElement)?.value || '#FFD700';
    const porto = (document.getElementById('tide-porto') as HTMLSelectElement)?.value || '8';
    const displayMode = (document.getElementById('tide-display-mode') as HTMLSelectElement)?.value || 'bar';
    const waveSpeed = parseInt((document.getElementById('tide-wave-speed') as HTMLInputElement)?.value) || 5;

    addLog(`Maré configurada: Porto ${porto}, Modo: ${displayMode}`, 'info');

    // Clear any existing animation
    if (tideAnimationInterval) {
        clearInterval(tideAnimationInterval);
        tideAnimationInterval = null;
    }

    if (!ledPreview) return;

    const config = ledPreview.getConfig();
    const hc = hexToRgb(highColor);
    const lc = hexToRgb(lowColor);
    const count = config.count;

    // Animation phase
    let phase = 0;
    const speedMultiplier = waveSpeed / 5;


    // Instantiate Premium Visuals Engine
    let tideEngine: any = null;
    if (typeof window.TideVisuals !== 'undefined') {
        tideEngine = new window.TideVisuals({
            baseColor: lc,
            riseColor: hc,
            fallColor: { r: 255, g: 150, b: 150 }, // Fallback fall color if not defined inputs
            // Map UI inputs to config if possible
        });
    }

    function renderTide() {
        if (!ledPreview) return;

        // Simulate Data Inputs (12h cycle)
        phase += 0.02 * speedMultiplier;
        const simulatedLevel = (Math.sin(phase) + 1) / 2; // 0 to 1
        const simulatedTrend = Math.cos(phase); // Derivative of sin is cos
        currentTideLevel = Math.round(simulatedLevel * 100);

        // Update Engine inputs
        if (tideEngine && displayMode === 'bar') {
            tideEngine.update(0.05, {
                level: simulatedLevel,
                trend: simulatedTrend,
                confidence: 1.0,
                hasWifi: true
            });

            // Get Rendered Pixels from Engine
            const pixels = tideEngine.render(count, (config as any).matrixWidth || 1, (config as any).matrixHeight || count);

            // Apply to Preview
            for (let i = 0; i < count; i++) {
                const p = pixels[i];
                ledPreview.setPixel(i, p.r, p.g, p.b);
            }

            ledPreview.render();
            return;
        }

        // --- Legacy / Easter Egg Modes ---
        const tideLevel = simulatedLevel;
        switch (displayMode) {
            case 'wave':
                // ... (Existing Wave Logic preserved roughly or just minimalist placeholder)
                for (let i = 0; i < count; i++) {
                    const pos = i / count;
                    const mainWave = Math.sin(pos * Math.PI * 4 - phase * 2) * 0.5 + 0.5;
                    const intensity = mainWave * tideLevel;
                    const r = Math.floor(lc.r + (hc.r - lc.r) * intensity);
                    const g = Math.floor(lc.g + (hc.g - lc.g) * intensity);
                    const b = Math.floor(lc.b + (hc.b - lc.b) * intensity);
                    ledPreview.setPixel(i, r, g, b);
                }
                break;
            default:
                // Fallback to simple fill if engine missing or other mode
                const filledLEDs = Math.floor(tideLevel * count);
                for (let i = 0; i < count; i++) {
                    if (i < filledLEDs) ledPreview.setPixel(i, hc.r, hc.g, hc.b);
                    else ledPreview.setPixel(i, 5, 5, 10);
                }
        }
        ledPreview.render();
    }

    // Initial render
    renderTide();

    // Start animation
    tideAnimationInterval = window.setInterval(renderTide, 50);

    addLog(`🌊 Maré ${displayMode}: Nível ${currentTideLevel}%`, 'info');
}

function hexToRgb(hex: string): { r: number, g: number, b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function exportAnimation(format: string) {
    if (!currentProject) {
        addLog('❌ Abra um projeto primeiro', 'error');
        return;
    }

    if (animationFrames.length === 0 || animationFrames[0].length === 0) {
        addLog('❌ Nenhuma animação para exportar', 'error');
        return;
    }

    // Get animation name from user
    const animName = prompt('Nome da animação:', 'MinhaAnimacao') || 'CustomAnim';
    const frameDelay = parseInt((document.getElementById('frame-duration') as HTMLInputElement)?.value) || 100;

    // Convert frames to packed RGB format (0xRRGGBB)
    const packedFrames = animationFrames.map(frame =>
        frame.map(pixel => (pixel.r << 16) | (pixel.g << 8) | pixel.b)
    );

    // Create CustomAnimationData object
    const customAnimData = {
        name: animName,
        frameCount: packedFrames.length,
        pixelCount: packedFrames[0].length,
        frameDelayMs: frameDelay,
        loop: true,
        frames: packedFrames
    };

    if (format === 'json') {
        // Export as JSON file
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customAnimData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `${animName}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        addLog(`✅ Animação exportada: ${animName}.json`, 'info');
        return;
    }

    // For micropython/arduino: Save to NeoPixel module in project
    let neoModule = currentProject.modules.find(m => m.type === 'NEOPIXEL');

    if (!neoModule) {
        // Create a new NeoPixel module with the animation
        neoModule = {
            id: crypto.randomUUID(),
            type: 'NEOPIXEL',
            name: 'NeoPixel LED',
            pin: 2,
            neoPixelConfig: {
                pixelCount: customAnimData.pixelCount,
                brightness: 30,
                colorOrder: 'GRB',
                colorDepth: '24bit',
                defaultAnimation: 'CUSTOM',
                customAnimation: customAnimData
            }
        };
        currentProject.modules.push(neoModule);
        addLog(`🌈 Módulo NeoPixel criado com animação "${animName}"`, 'info');
    } else {
        // Update existing NeoPixel module
        if (!neoModule.neoPixelConfig) {
            neoModule.neoPixelConfig = {
                pixelCount: customAnimData.pixelCount,
                brightness: 30,
                colorOrder: 'GRB',
                colorDepth: '24bit',
                defaultAnimation: 'CUSTOM'
            };
        }
        neoModule.neoPixelConfig.defaultAnimation = 'CUSTOM';
        neoModule.neoPixelConfig.customAnimation = customAnimData;
        addLog(`🌈 Animação "${animName}" salva no módulo NeoPixel`, 'info');
    }

    // Save project
    window.projects.save(currentProject).then(() => {
        addLog(`💾 Projeto salvo com animação personalizada`, 'info');
        renderModulesList();
    });
}

function sendToDevice() {
    addLog('Enviando animação ao ESP32...', 'sent');
    // TODO: Implement serial send
    alert('Enviar ao ESP32 - funcionalidade em desenvolvimento');
}

// Initialize Animation Creator when DOM ready
setTimeout(() => initAnimationCreator(), 100);



// === Module Logic ===
// DOM Elements moved to top

function openWifiModal() {
    if (!wifiModalBackdrop) return;
    wifiSsid.value = '';
    wifiPassword.value = '';
    wifiHostname.value = 'led-device';
    wifiMode.value = 'STA';
    wifiModalBackdrop.classList.remove('hidden');
    wifiModalBackdrop.style.display = 'flex';
    setTimeout(() => wifiSsid.focus(), 50);
}

function closeWifiModal() {
    if (wifiModalBackdrop) {
        wifiModalBackdrop.classList.add('hidden');
        wifiModalBackdrop.style.display = '';
    }
}

// Web Server Modal Logic
function openWebServerModal() {
    if (!webServerModalBackdrop) return;
    webServerPort.value = '80';
    webServerTitle.value = 'ESP32 Control';
    webServerModalBackdrop.classList.remove('hidden');
    webServerModalBackdrop.style.display = 'flex';
}

function closeWebServerModal() {
    if (webServerModalBackdrop) {
        webServerModalBackdrop.classList.add('hidden');
        webServerModalBackdrop.style.display = '';
    }
}

if (btnAddWebServer) btnAddWebServer.addEventListener('click', openWebServerModal);
if (webServerModalClose) webServerModalClose.addEventListener('click', closeWebServerModal);
if (webServerModalCancel) webServerModalCancel.addEventListener('click', closeWebServerModal);

if (webServerModalConfirm) {
    webServerModalConfirm.addEventListener('click', () => {
        if (!currentProject) {
            alert('Nenhum projeto aberto.');
            return;
        }

        const port = parseInt(webServerPort.value) || 80;
        const title = webServerTitle.value || 'ESP32 Control';

        const newModule: any = {
            id: `WEB-${Date.now().toString().slice(-4)}`,
            type: 'WEB_SERVER',
            name: 'Web Server',
            pin: 0, // Virtual
            webServerConfig: {
                port,
                title,
                captivePortal: true
            }
        };

        currentProject?.modules.push(newModule);
        renderModulesList();
        closeWebServerModal();
        addLog(`🌐 Web Server adicionado na porta ${port}`, 'info');
    });
}
// === MQTT Logic ===
function openMqttModal() {
    if (mqttModalBackdrop) {
        mqttModalBackdrop.classList.remove('hidden');
        mqttModalBackdrop.style.display = 'flex';
    }
}
function closeMqttModal() {
    if (mqttModalBackdrop) {
        mqttModalBackdrop.classList.add('hidden');
        mqttModalBackdrop.style.display = '';
    }
}
if (btnAddMqtt) btnAddMqtt.addEventListener('click', openMqttModal);
if (mqttModalClose) mqttModalClose.addEventListener('click', closeMqttModal);
if (mqttModalCancel) mqttModalCancel.addEventListener('click', closeMqttModal);
if (mqttModalConfirm) {
    mqttModalConfirm.addEventListener('click', () => {
        if (!currentProject) { alert('Abra um projeto primeiro'); return; }
        const newModule: any = {
            id: `MQTT-${Date.now().toString().slice(-4)}`,
            type: 'MQTT',
            name: 'MQTT Client',
            pin: 0,
            mqttConfig: {
                broker: mqttBroker.value,
                port: parseInt(mqttPort.value) || 1883,
                user: mqttUser.value,
                password: mqttPass.value,
                topicPrefix: mqttPrefix.value,
                homeAssistantDiscovery: mqttHaDiscovery.checked
            }
        };
        currentProject.modules.push(newModule);
        renderModulesList();
        closeMqttModal();
        addLog(`🏠 MQTT adicionado: ${mqttBroker.value}`, 'info');
    });
}

// === OTA Logic ===
function openOtaModal() {
    if (otaModalBackdrop) {
        otaModalBackdrop.classList.remove('hidden');
        otaModalBackdrop.style.display = 'flex';
    }
}
function closeOtaModal() {
    if (otaModalBackdrop) {
        otaModalBackdrop.classList.add('hidden');
        otaModalBackdrop.style.display = '';
    }
}
if (btnAddOta) btnAddOta.addEventListener('click', openOtaModal);
if (otaModalClose) otaModalClose.addEventListener('click', closeOtaModal);
if (otaModalCancel) otaModalCancel.addEventListener('click', closeOtaModal);
if (otaModalConfirm) {
    otaModalConfirm.addEventListener('click', () => {
        if (!currentProject) { alert('Abra um projeto primeiro'); return; }
        const newModule: any = {
            id: `OTA-${Date.now().toString().slice(-4)}`,
            type: 'OTA',
            name: 'WiFi OTA',
            pin: 0,
            otaConfig: { enabled: otaEnabled.checked }
        };
        currentProject.modules.push(newModule);
        renderModulesList();
        closeOtaModal();
        addLog(`☁️ OTA habilitado`, 'info');
    });
}

// === UDP Logic ===
function openUdpModal() {
    if (udpModalBackdrop) {
        udpModalBackdrop.classList.remove('hidden');
        udpModalBackdrop.style.display = 'flex';
    }
}
function closeUdpModal() {
    if (udpModalBackdrop) {
        udpModalBackdrop.classList.add('hidden');
        udpModalBackdrop.style.display = '';
    }
}
if (btnAddUdp) btnAddUdp.addEventListener('click', openUdpModal);
if (udpModalClose) udpModalClose.addEventListener('click', closeUdpModal);
if (udpModalCancel) udpModalCancel.addEventListener('click', closeUdpModal);
if (udpModalConfirm) {
    udpModalConfirm.addEventListener('click', () => {
        if (!currentProject) { alert('Abra um projeto primeiro'); return; }
        const newModule: any = {
            id: `UDP-${Date.now().toString().slice(-4)}`,
            type: 'UDP',
            name: 'UDP Stream',
            pin: 0,
            udpConfig: { port: parseInt(udpPort.value) || 21324, universe: 1 }
        };
        currentProject.modules.push(newModule);
        renderModulesList();
        closeUdpModal();
        addLog(`⚡ UDP Stream na porta ${udpPort.value}`, 'info');
    });
}

async function saveWifiModule() {
    if (!currentProject) {
        alert('Nenhum projeto aberto.');
        return;
    }

    const ssid = wifiSsid.value.trim();
    if (!ssid) {
        alert('SSID é obrigatório');
        return;
    }

    // Remove existing WiFi modules (Singleton)
    currentProject.modules = currentProject.modules.filter(m => m.type !== 'WIFI');

    const newModule: ModuleConfig = {
        id: crypto.randomUUID(),
        type: 'WIFI',
        name: 'WiFi Config',
        pin: 0, // Virtual
        wifiConfig: {
            ssid: ssid,
            password: wifiPassword.value.trim(),
            mode: wifiMode.value as 'STA' | 'AP',
            hostname: wifiHostname.value.trim() || 'led-device'
        }
    };

    currentProject.modules.push(newModule);
    await window.projects.save(currentProject);
    refreshModulesUI();
    closeWifiModal();
    addLog('WiFi Configurado', 'info');
}

// === CLOCK MODULE ===

const clockModalBackdrop = document.getElementById('clock-modal-backdrop');
const clockModalClose = document.getElementById('clock-modal-close');
const clockModalCancel = document.getElementById('clock-modal-cancel');
const clockModalConfirm = document.getElementById('clock-modal-confirm');
const btnAddClock = document.getElementById('btn-add-clock');
const clockTzInput = document.getElementById('clock-tz') as HTMLSelectElement;
const clockFormatInput = document.getElementById('clock-format') as HTMLSelectElement;
const clockShowDateInput = document.getElementById('clock-show-date') as HTMLInputElement;
const clockNtpServerInput = document.getElementById('clock-ntp-server') as HTMLInputElement;
const clockColorInput = document.getElementById('clock-color') as HTMLInputElement;

function openClockModal() {
    if (clockModalBackdrop) {
        clockModalBackdrop.classList.remove('hidden');
    }
}

function closeClockModal() {
    if (clockModalBackdrop) {
        clockModalBackdrop.classList.add('hidden');
    }
}

async function saveClockModule() {
    if (!currentProject) {
        alert('Nenhum projeto aberto.');
        return;
    }

    // Remove existing Clock modules (Singleton)
    currentProject.modules = currentProject.modules.filter(m => m.type !== 'CLOCK');

    // Parse color from hex
    const colorHex = clockColorInput?.value || '#ffffff';
    const r = parseInt(colorHex.slice(1, 3), 16);
    const g = parseInt(colorHex.slice(3, 5), 16);
    const b = parseInt(colorHex.slice(5, 7), 16);

    const newModule: ModuleConfig = {
        id: crypto.randomUUID(),
        type: 'CLOCK',
        name: 'NTP Clock',
        pin: 0, // Virtual module
        clockConfig: {
            enabled: true,
            format24h: clockFormatInput?.value === '24',
            showDate: clockShowDateInput?.checked || false,
            ntpServer: clockNtpServerInput?.value || 'pool.ntp.org',
            tzOffset: parseFloat(clockTzInput?.value || '-3'),
            color: [r, g, b]
        }
    };

    currentProject.modules.push(newModule);
    await window.projects.save(currentProject);
    refreshModulesUI();
    closeClockModal();
    addLog('Relógio NTP configurado', 'info');
}

// Clock Event Listeners
if (btnAddClock) btnAddClock.addEventListener('click', openClockModal);
if (clockModalClose) clockModalClose.addEventListener('click', closeClockModal);
if (clockModalCancel) clockModalCancel.addEventListener('click', closeClockModal);
if (clockModalConfirm) clockModalConfirm.addEventListener('click', saveClockModule);

if (clockModalBackdrop) {
    clockModalBackdrop.addEventListener('click', (e) => {
        if (e.target === clockModalBackdrop) closeClockModal();
    });
}

// === TIDE MODULE ===

const tideModalBackdrop = document.getElementById('tide-modal-backdrop');
const tideModalClose = document.getElementById('tide-modal-close');
const tideModalCancel = document.getElementById('tide-modal-cancel');
const tideModalConfirm = document.getElementById('tide-modal-confirm');
const btnAddTide = document.getElementById('btn-add-tide');
const tideStateSelect = document.getElementById('tide-state') as HTMLSelectElement;
const tideHarborSelect = document.getElementById('tide-harbor') as HTMLSelectElement;
const tideLedCountInput = document.getElementById('tide-led-count') as HTMLInputElement;
const tideNeopixelPinInput = document.getElementById('tide-neopixel-pin') as HTMLInputElement;
const tideHighColorInput = document.getElementById('tide-high-color') as HTMLInputElement;
const tideLowColorInput = document.getElementById('tide-low-color') as HTMLInputElement;
const tideUpdateIntervalSelect = document.getElementById('tide-update-interval') as HTMLSelectElement;
const tideRisingIndicatorInput = document.getElementById('tide-rising-indicator') as HTMLInputElement;

// WorldTides Advanced Config
const tideWtEnabled = document.getElementById('tide-wt-enabled') as HTMLInputElement;
const tideWtLat = document.getElementById('tide-wt-lat') as HTMLInputElement;
const tideWtLon = document.getElementById('tide-wt-lon') as HTMLInputElement;
const tideWtKey = document.getElementById('tide-wt-key') as HTMLInputElement;

// Store harbors data for reference
let tideHarborsCache: Array<{ id: number, name: string }> = [];

async function openTideModal() {
    if (tideModalBackdrop) {
        tideModalBackdrop.classList.remove('hidden');
    }
    await loadTideStates();
}

function closeTideModal() {
    if (tideModalBackdrop) {
        tideModalBackdrop.classList.add('hidden');
    }
}

async function loadTideStates() {
    if (!tideStateSelect) return;

    const CACHE_KEY = 'tide_states_cache';
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

    // Try to load from cache first (instant)
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;

            // Use cache if valid
            if (age < CACHE_TTL && Array.isArray(data)) {
                renderStatesSelect(data);

                // Refresh in background if older than 1 hour
                if (age > 60 * 60 * 1000) {
                    fetchAndCacheStates(CACHE_KEY).catch(() => { });
                }
                return;
            }
        }
    } catch (e) {
        console.warn('Cache read error:', e);
    }

    // No valid cache - fetch from API
    tideStateSelect.innerHTML = '<option value="" disabled selected>Carregando...</option>';
    await fetchAndCacheStates(CACHE_KEY);
}

function renderStatesSelect(states: string[]) {
    if (!tideStateSelect) return;
    tideStateSelect.innerHTML = '<option value="" disabled selected>Selecione um estado</option>';
    states.forEach((state: string) => {
        const option = document.createElement('option');
        option.value = state.toLowerCase();
        option.textContent = state.toUpperCase();
        tideStateSelect.appendChild(option);
    });
}

async function fetchAndCacheStates(cacheKey: string) {
    try {
        const states = await (window as any).tide.getStates();
        if (Array.isArray(states)) {
            localStorage.setItem(cacheKey, JSON.stringify({
                data: states,
                timestamp: Date.now()
            }));
            renderStatesSelect(states);
        }
    } catch (error) {
        console.error('Failed to load states:', error);
        if (tideStateSelect) {
            tideStateSelect.innerHTML = '<option value="" disabled selected>Erro ao carregar</option>';
        }
    }
}

async function loadTideHarbors(state: string) {
    if (!tideHarborSelect) return;

    const CACHE_KEY = `tide_harbors_${state}`;
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

    // Try cache first (instant)
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;

            if (age < CACHE_TTL && Array.isArray(data)) {
                tideHarborsCache = data;
                renderHarborsSelect(data);

                // Refresh in background if older than 1 hour
                if (age > 60 * 60 * 1000) {
                    fetchAndCacheHarbors(state, CACHE_KEY).catch(() => { });
                }
                return;
            }
        }
    } catch (e) {
        console.warn('Cache read error:', e);
    }

    // No valid cache - fetch from API
    tideHarborSelect.disabled = true;
    tideHarborSelect.innerHTML = '<option value="" disabled selected>Carregando portos...</option>';
    await fetchAndCacheHarbors(state, CACHE_KEY);
}

function renderHarborsSelect(harbors: Array<{ id: number, name: string }>) {
    if (!tideHarborSelect) return;
    tideHarborSelect.innerHTML = '<option value="" disabled selected>Selecione um porto</option>';
    harbors.forEach((harbor) => {
        const option = document.createElement('option');
        option.value = String(harbor.id);
        option.textContent = harbor.name;
        tideHarborSelect.appendChild(option);
    });
    tideHarborSelect.disabled = false;
}

async function fetchAndCacheHarbors(state: string, cacheKey: string) {
    try {
        const harbors = await (window as any).tide.getHarbors(state);
        tideHarborsCache = harbors || [];

        if (Array.isArray(harbors)) {
            localStorage.setItem(cacheKey, JSON.stringify({
                data: harbors,
                timestamp: Date.now()
            }));
            renderHarborsSelect(harbors);
        }
    } catch (error) {
        console.error('Failed to load harbors:', error);
        if (tideHarborSelect) {
            tideHarborSelect.innerHTML = '<option value="" disabled selected>Erro ao carregar</option>';
        }
    }
}

async function saveTideModule() {
    if (!currentProject) {
        alert('Nenhum projeto aberto.');
        return;
    }

    const harborId = parseInt(tideHarborSelect?.value || '0');
    const selectedHarbor = tideHarborsCache.find(h => h.id === harborId);

    if (!harborId || !selectedHarbor) {
        alert('Selecione um porto válido.');
        return;
    }

    // Remove existing Tide modules (Singleton)
    currentProject.modules = currentProject.modules.filter(m => m.type !== 'TIDE');

    // Build WorldTides config if enabled
    const worldTidesConfig = tideWtEnabled?.checked ? {
        enabled: true,
        lat: parseFloat(tideWtLat?.value || '-14.78'),
        lon: parseFloat(tideWtLon?.value || '-39.03'),
        key: tideWtKey?.value || ''
    } : undefined;

    const newModule: ModuleConfig = {
        id: crypto.randomUUID(),
        type: 'TIDE',
        name: `Maré - ${selectedHarbor.name}`,
        pin: parseInt(tideNeopixelPinInput?.value || '2'),
        tideConfig: {
            enabled: true,
            harborId: harborId,
            harborName: selectedHarbor.name,
            state: tideStateSelect?.value || '',
            updateInterval: parseInt(tideUpdateIntervalSelect?.value || '30'),
            highTideColor: tideHighColorInput?.value || '#0080FF',
            lowTideColor: tideLowColorInput?.value || '#FFD700',
            risingIndicator: tideRisingIndicatorInput?.checked ?? true,
            ledCount: parseInt(tideLedCountInput?.value || '8'),
            neopixelPin: parseInt(tideNeopixelPinInput?.value || '2'),
            worldTides: worldTidesConfig
        }
    };

    currentProject.modules.push(newModule);
    await window.projects.save(currentProject);
    refreshModulesUI();
    closeTideModal();
    addLog(`Módulo de Marés configurado: ${selectedHarbor.name}`, 'info');
}

// Tide Event Listeners
if (btnAddTide) btnAddTide.addEventListener('click', openTideModal);
if (tideModalClose) tideModalClose.addEventListener('click', closeTideModal);
if (tideModalCancel) tideModalCancel.addEventListener('click', closeTideModal);
if (tideModalConfirm) tideModalConfirm.addEventListener('click', saveTideModule);

if (tideStateSelect) {
    tideStateSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        loadTideHarbors(target.value);
    });
}

if (tideModalBackdrop) {
    tideModalBackdrop.addEventListener('click', (e) => {
        if (e.target === tideModalBackdrop) closeTideModal();
    });
}


async function refreshModulesUI() {
    if (!currentProject) return;

    modulesOutputList.innerHTML = '';
    if (modulesConnectivityList) modulesConnectivityList.innerHTML = '';

    const modules = currentProject.modules || [];

    if (modules.length === 0) {
        modulesOutputList.innerHTML = '<div class="empty-module-state">Nenhum módulo configurado.</div>';
        return;
    }

    modules.forEach((mod: ModuleConfig) => {
        const item = document.createElement('div');
        item.className = 'module-item';

        let icon = '💡';
        let detail = `GPIO ${mod.pin}`;

        if (mod.type === 'NEOPIXEL') {
            icon = '🌈';
            detail = `GPIO ${mod.pin} (${mod.neoPixelConfig?.pixelCount} LEDs)`;
        } else if (mod.type === 'WIFI') {
            icon = '📶';
            detail = `${mod.wifiConfig?.mode} - ${mod.wifiConfig?.ssid}`;
        }

        item.innerHTML = `
            <div class="module-icon">${icon}</div>
            <div class="module-info">
                <span class="module-name">${mod.name}</span>
                <span class="module-pin">${detail}</span>
            </div>
            <button class="btn-icon btn-del-mod">✕</button>
        `;

        item.querySelector('.btn-del-mod')?.addEventListener('click', () => removeModule(mod.id));

        if (mod.type === 'WIFI' && modulesConnectivityList) {
            modulesConnectivityList.appendChild(item);
        } else {
            modulesOutputList.appendChild(item);
        }
    });

    // Check for empty output list again if we filtered
    if (modulesOutputList.children.length === 0) {
        modulesOutputList.innerHTML = '<div class="empty-module-state">Nenhum módulo de saída.</div>';
    }
    refreshAutomationUI();
}

async function addLedModule() {
    if (!currentProject) {
        alert('Nenhum projeto aberto.');
        return;
    }

    const name = await showModal('Adicionar LED', 'Nome do LED (ex: Luz Quarto):');
    if (!name) return;

    const pinStr = await showModal('Adicionar LED', 'Número do GPIO/Pino (ex: 13):', '13');
    if (!pinStr) return;

    const pin = parseInt(pinStr);
    if (isNaN(pin)) {
        alert('Pino inválido');
        return;
    }

    const newModule: ModuleConfig = {
        id: crypto.randomUUID(),
        type: 'LED',
        name,
        pin,
        inverted: false
    };

    // Update Local State
    currentProject.modules.push(newModule);

    // Save to Backend
    await window.projects.save(currentProject);

    // Refresh UI
    refreshModulesUI();
    addLog(`Módulo adicionado: ${name} (GPIO ${pin})`, 'info');
}

async function removeModule(id: string) {
    if (!currentProject) return;

    currentProject.modules = currentProject.modules.filter((m: ModuleConfig) => m.id !== id);
    await window.projects.save(currentProject);
    refreshModulesUI();
}

async function generateFirmware() {
    console.log('Generate Firmware Clicked');
    alert('Debug: Botão Clicado!'); // Debug

    if (!currentProject) {
        alert('Crie ou abra um projeto primeiro!');
        return;
    }

    if (currentProject.modules.length === 0) {
        if (!confirm('O projeto não tem módulos. Gerar firmware vazio?')) return;
    }


    const platform = (fwPlatformSelect ? fwPlatformSelect.value : 'arduino') as 'arduino' | 'micropython';

    try {
        const code = await window.firmware.generate(platform, currentProject.modules);

        codeEditor.value = code;
        currentTemplate = {
            name: 'GENERATED',
            description: 'Firmware Gerado Automaticamente',
            platform: platform === 'arduino' ? 'arduino' : 'esp32', // Map to correct type
            files: [{ name: platform === 'arduino' ? 'main.ino' : 'main.py', content: code }]
        };
        currentFileIndex = 0;

        if (currentTemplate.files[0]) {
            currentFileSpan.textContent = currentTemplate.files[0].name;
        }
        uploadFirmwareBtn.disabled = false;
        fileSelect.classList.add('hidden');

        addLog(`Firmware gerado para ${platform}!`, 'info');

    } catch (e) {
        addLog(`Erro ao gerar firmware: ${e}`, 'error');
    }
}

// Module Listeners
if (btnAddLed) {
    btnAddLed.addEventListener('click', addLedModule);
} else {
    console.error('btn-add-led not found');
}

if (btnGenerateFw) {
    btnGenerateFw.addEventListener('click', generateFirmware);
    console.log('Generate Firmware listener attached');
} else {
    console.error('btn-generate-fw not found');
}

// === NeoPixel Modal Functions ===

// === TOUCH MODULE ===
const touchModalBackdrop = document.getElementById('touch-modal-backdrop');
const touchModalClose = document.getElementById('touch-modal-close');
const touchModalCancel = document.getElementById('touch-modal-cancel');
const touchModalConfirm = document.getElementById('touch-modal-confirm');
const btnAddTouch = document.getElementById('btn-add-touch');

const touchName = document.getElementById('touch-name') as HTMLInputElement;
const touchPin = document.getElementById('touch-pin') as HTMLInputElement;
const touchMode = document.getElementById('touch-mode') as HTMLSelectElement;
const touchThreshold = document.getElementById('touch-threshold') as HTMLInputElement;
const touchThresholdVal = document.getElementById('touch-threshold-val') as HTMLSpanElement;
const touchRawVal = document.getElementById('touch-raw-val') as HTMLSpanElement;
const btnTouchCalStart = document.getElementById('btn-touch-cal-start') as HTMLButtonElement;
const btnTouchCalStop = document.getElementById('btn-touch-cal-stop') as HTMLButtonElement;

let isTouchCalibrating = false;

function openTouchModal() {
    if (touchModalBackdrop) {
        touchModalBackdrop.classList.remove('hidden');
        touchModalBackdrop.style.display = 'flex';
    }
    // Set defaults
    touchName.value = 'Touch Sensor';
    touchPin.value = '4';
    touchMode.value = 'NATIVE';
    touchThreshold.value = '40';
    touchThresholdVal.textContent = '40';
    touchRawVal.textContent = '--';
    toggleCalibrationUI(false);
}

function closeTouchModal() {
    if (touchModalBackdrop) {
        touchModalBackdrop.classList.add('hidden');
        touchModalBackdrop.style.display = '';
    }
    if (isTouchCalibrating) {
        stopTouchCalibration();
    }
}

function toggleCalibrationUI(calibrating: boolean) {
    isTouchCalibrating = calibrating;
    if (calibrating) {
        btnTouchCalStart.classList.add('hidden');
        btnTouchCalStop.classList.remove('hidden');
    } else {
        btnTouchCalStart.classList.remove('hidden');
        btnTouchCalStop.classList.add('hidden');
    }
}

function startTouchCalibration() {
    toggleCalibrationUI(true);
    sendCommand('TOUCH:CALIBRATE:START');
}

function stopTouchCalibration() {
    toggleCalibrationUI(false);
    sendCommand('TOUCH:CALIBRATE:STOP');
}

async function saveTouchModule() {
    if (!currentProject) { alert('Abra um projeto primeiro'); return; }

    const name = touchName.value.trim() || 'Touch Sensor';
    const pin = parseInt(touchPin.value) || 4;
    const mode = touchMode.value as 'NATIVE' | 'DIGITAL';
    const thresh = parseInt(touchThreshold.value) || 40;

    const newModule: ModuleConfig = {
        id: crypto.randomUUID(),
        type: 'TOUCH',
        name,
        pin,
        touchConfig: {
            pin,
            mode,
            threshold: thresh
        }
    };

    currentProject.modules.push(newModule);
    await window.projects.save(currentProject);
    refreshModulesUI();
    closeTouchModal();
    addLog(`Módulo Touch "${name}" adicionado!`, 'info');
}

// Calibration Data Listener
window.serial.onData((data: string) => {
    if (isTouchCalibrating && data.startsWith('TOUCH:RAW:')) {
        const val = data.split(':')[2];
        if (touchRawVal) touchRawVal.textContent = val.trim();
    }
});

if (btnAddTouch) btnAddTouch.addEventListener('click', openTouchModal);
if (touchModalClose) touchModalClose.addEventListener('click', closeTouchModal);
if (touchModalCancel) touchModalCancel.addEventListener('click', closeTouchModal);
if (touchModalConfirm) touchModalConfirm.addEventListener('click', saveTouchModule);

if (touchThreshold) {
    touchThreshold.addEventListener('input', () => {
        touchThresholdVal.textContent = touchThreshold.value;
        // Optionally preview threshold on device if connected?
    });
}
if (btnTouchCalStart) btnTouchCalStart.addEventListener('click', startTouchCalibration);
if (btnTouchCalStop) btnTouchCalStop.addEventListener('click', stopTouchCalibration);


// === NeoPixel Modal Functions ===

// Get New Elements
const neoMatrixWidth = document.getElementById('neo-width') as HTMLInputElement;
const neoMatrixHeight = document.getElementById('neo-height') as HTMLInputElement;
const neoStartCorner = document.getElementById('neo-start-corner') as HTMLSelectElement;
const neoOrientation = document.getElementById('neo-orientation') as HTMLSelectElement;
const neoSerpentine = document.getElementById('neo-serpentine') as HTMLInputElement;
// const neoMirrorX = document.getElementById('neo-mirror-x') as HTMLInputElement; // Not yet in ModuleConfig
// const neoMirrorY = document.getElementById('neo-mirror-y') as HTMLInputElement; // Not yet in ModuleConfig

const neoChipType = document.getElementById('neo-chip-type') as HTMLSelectElement;
const neoVoltage = document.getElementById('neo-voltage') as HTMLSelectElement;
const neoMaxCurrent = document.getElementById('neo-max-current') as HTMLInputElement;
const neoGamma = document.getElementById('neo-gamma') as HTMLInputElement;
const neoGammaValue = document.getElementById('neo-gamma-value') as HTMLSpanElement;
const neoAutoBright = document.getElementById('neo-auto-brightness') as HTMLInputElement;
const neoTimeBased = document.getElementById('neo-time-based') as HTMLInputElement;

const neoAnimColor = document.getElementById('neo-anim-color') as HTMLInputElement;
const neoAnimSpeed = document.getElementById('neo-anim-speed') as HTMLInputElement;
const neoAnimSpeedValue = document.getElementById('neo-anim-speed-value') as HTMLSpanElement;
const neoTransition = document.getElementById('neo-transition') as HTMLSelectElement;
// const neoAnimPalette = document.getElementById('neo-anim-palette') as HTMLSelectElement; // Not yet in ModuleConfig

const neoPanelsX = document.getElementById('neo-panels-x') as HTMLInputElement;
const neoPanelsY = document.getElementById('neo-panels-y') as HTMLInputElement;
const neoPanelOrder = document.getElementById('neo-panel-order') as HTMLSelectElement;


function openNeoPixelModal(): void {
    if (!neoModalBackdrop) return;

    // Default Values
    neoName.value = '';
    neoPin.value = '2';
    neoCount.value = '64';
    neoBrightness.value = '15';
    neoBrightnessValue.textContent = '15%';

    if (neoMatrixWidth) neoMatrixWidth.value = '8';
    if (neoMatrixHeight) neoMatrixHeight.value = '8';

    // Reset collapsible sections
    document.querySelectorAll('.collapsible').forEach(el => el.classList.remove('open'));

    neoModalBackdrop.classList.remove('hidden');
    // Important: Use flex to center
    neoModalBackdrop.style.display = 'flex';
    setTimeout(() => neoName.focus(), 50);
}

function closeNeoPixelModal(): void {
    if (neoModalBackdrop) {
        neoModalBackdrop.classList.add('hidden');
        neoModalBackdrop.style.display = '';
    }
}

function saveNeoPixelModule(): void {
    const name = neoName.value.trim();
    if (!name) {
        alert('Digite um nome para o módulo');
        return;
    }

    const pin = parseInt(neoPin.value, 10);
    const pixelCount = parseInt(neoCount.value, 10);
    const brightness = parseInt(neoBrightness.value, 10);
    const colorOrder = neoColorOrder ? (neoColorOrder.value as any) : 'GRB';
    const animation = neoAnimation ? (neoAnimation.value as any) : 'NONE';
    const transitionSpeed = neoTransition ? (neoTransition.value as any) : 'MEDIUM';

    // Matrix dimensions
    const width = neoMatrixWidth ? parseInt(neoMatrixWidth.value, 10) : 0;
    const height = neoMatrixHeight ? parseInt(neoMatrixHeight.value, 10) : 0;
    const serpentine = neoSerpentine ? neoSerpentine.checked : false;

    const newModule: ModuleConfig = {
        id: `neo_${Date.now()}`,
        type: 'NEOPIXEL',
        name: name,
        pin: pin,
        neoPixelConfig: {
            pixelCount: pixelCount,
            matrixWidth: width,
            matrixHeight: height,
            brightness: brightness,
            colorOrder: colorOrder,
            colorDepth: colorOrder.includes('W') ? '32bit' : '24bit',
            serpentine: serpentine,
            defaultAnimation: animation,
            transitionSpeed: transitionSpeed,
            autoBrightness: neoAutoBright?.checked ?? false,
            timeBasedBrightness: neoTimeBased?.checked ?? false
        }
    };

    if (currentProject) {
        currentProject.modules.push(newModule);
        renderModulesList();
        window.projects.save(currentProject);
        addLog(`Módulo NeoPixel "${name}" adicionado!`, 'info');
    } else {
        addLog('Nenhum projeto aberto. Crie um projeto primeiro.', 'error');
    }

    closeNeoPixelModal();
}

function renderModulesList() {
    if (!currentProject) return;

    // Clear lists
    if (modulesConnectivityList) modulesConnectivityList.innerHTML = `
        <div class="card glass-card">
            <div class="card-header">
              <h3>🌐 Conectividade</h3>
            </div>
            <div class="card-body">
              <div class="btn-row">
                <button id="btn-add-wifi-2" class="btn btn-soft">📶 WiFi & NTP</button>
                <button id="btn-add-web-2" class="btn btn-soft">🌐 Web Server</button>
                <button id="btn-add-mqtt-2" class="btn btn-soft">🏠 MQTT</button>
                <button id="btn-add-ota-2" class="btn btn-soft">☁️ OTA</button>
                <button id="btn-add-udp-2" class="btn btn-soft">⚡ UDP Stream</button>
              </div>
            </div>
        </div>
    `;

    // Clear Input List
    const modulesInputList = document.getElementById('modules-input-list');
    if (modulesInputList) modulesInputList.innerHTML = '';

    // Re-attach listeners for the cleared buttons since innerHTML wipes them
    document.getElementById('btn-add-wifi-2')?.addEventListener('click', () => { if (wifiModalBackdrop) { wifiModalBackdrop.classList.remove('hidden'); wifiModalBackdrop.style.display = 'flex'; } });
    document.getElementById('btn-add-web-2')?.addEventListener('click', openWebServerModal);
    document.getElementById('btn-add-mqtt-2')?.addEventListener('click', openMqttModal);
    document.getElementById('btn-add-ota-2')?.addEventListener('click', openOtaModal);
    document.getElementById('btn-add-udp-2')?.addEventListener('click', openUdpModal);

    if (modulesOutputList) modulesOutputList.innerHTML = '';

    currentProject.modules.forEach((mod, index) => {
        const card = document.createElement('div');
        card.className = 'module-card';
        const typeStr = mod.type as string;
        // Simple icon mapping
        let icon = '📦';
        if (typeStr === 'WIFI') icon = '📶';
        else if (typeStr === 'LED' || typeStr === 'NEOPIXEL') icon = '💡';
        else if (typeStr === 'WEB_SERVER') icon = '🌐';
        else if (typeStr === 'MQTT') icon = '🏠';
        else if (typeStr === 'TOUCH') icon = '👆';

        let detail = `GPIO ${mod.pin}`;
        if (typeStr === 'TOUCH') {
            detail = `${mod.touchConfig?.mode} (Thresh: ${mod.touchConfig?.threshold})`;
        } else if (typeStr === 'NEOPIXEL') {
            detail = `GPIO ${mod.pin} (${mod.neoPixelConfig?.pixelCount} LEDs)`;
        }

        card.innerHTML = `
            <div class="module-icon">${icon}</div>
            <div class="module-info">
                <h4>${mod.name}</h4>
                <p>${typeStr} ${mod.pin ? `(Pin ${mod.pin})` : ''}</p>
                <small>${detail}</small>
            </div>
            <button class="btn-icon btn-del-mod">✕</button>
        `;

        card.querySelector('.btn-del-mod')?.addEventListener('click', () => {
            if (confirm(`Remover módulo ${mod.name}?`)) {
                currentProject?.modules.splice(index, 1);
                renderModulesList();
            }
        });

        // Determine where to append
        if (['WIFI', 'WEB_SERVER', 'MQTT', 'OTA', 'UDP', 'CLOCK', 'TIDE'].includes(typeStr)) {
            modulesConnectivityList?.appendChild(card);
        } else if (['TOUCH', 'BUTTON', 'PIR', 'ENCODER'].includes(typeStr)) {
            modulesInputList?.appendChild(card);
        } else {
            modulesOutputList?.appendChild(card);
        }
    });

    if (modulesInputList && modulesInputList.children.length === 0) {
        modulesInputList.innerHTML = '<div class="empty-module-state">Nenhum sensor configurado.</div>';
    }
    refreshAutomationUI();
}


// NeoPixel Modal Event Listeners
if (btnAddNeoPixel) {
    btnAddNeoPixel.addEventListener('click', openNeoPixelModal);
}
if (neoModalClose) {
    neoModalClose.addEventListener('click', closeNeoPixelModal);
}
if (neoModalCancel) {
    neoModalCancel.addEventListener('click', closeNeoPixelModal);
}
if (neoModalConfirm) {
    neoModalConfirm.addEventListener('click', saveNeoPixelModule);
}

// Range Value Updates
if (neoBrightness) {
    neoBrightness.addEventListener('input', () => {
        if (neoBrightnessValue) neoBrightnessValue.textContent = `${neoBrightness.value}%`;
    });
}
if (neoGamma) {
    neoGamma.addEventListener('input', () => {
        if (neoGammaValue) neoGammaValue.textContent = neoGamma.value;
    });
}
if (neoAnimSpeed) {
    neoAnimSpeed.addEventListener('input', () => {
        if (neoAnimSpeedValue) neoAnimSpeedValue.textContent = `${neoAnimSpeed.value}ms`;
    });
}

if (neoModalBackdrop) {
    neoModalBackdrop.addEventListener('click', (e) => {
        if (e.target === neoModalBackdrop) {
            closeNeoPixelModal();
        }
    });
}

// Collapsible Logic
document.querySelectorAll('.toggle-section').forEach(header => {
    header.addEventListener('click', () => {
        header.parentElement?.classList.toggle('open');
    });
});


// === Firmware Functions ===

async function initFirmwarePanel(): Promise<void> {
    // Check tools
    try {
        const tools = await window.firmware.checkTools();
        updateToolStatus(tools);
    } catch (e) {
        console.error('Error checking tools:', e);
    }

    // Load templates
    try {
        const templates = await window.firmware.listTemplates();
        templateSelect.innerHTML = '<option value="">Selecione um template...</option>';
        for (const t of templates) {
            const opt = document.createElement('option');
            opt.value = t.name;
            opt.textContent = `${t.platform === 'arduino' ? '🔵' : '🟣'} ${t.description}`;
            templateSelect.appendChild(opt);
        }
    } catch (e) {
        console.error('Error loading templates:', e);
    }
}

function updateToolStatus(tools: ToolStatus): void {
    toolArduino.textContent = tools.arduinoCli ? 'Arduino CLI ✅' : 'Arduino CLI ❌';
    toolArduino.className = 'pill ' + (tools.arduinoCli ? 'available' : 'unavailable');

    toolAmpy.textContent = tools.ampy ? 'ampy ✅' : 'ampy ❌';
    toolAmpy.className = 'pill ' + (tools.ampy ? 'available' : 'unavailable');
}

// === Project Export/Import ===

const btnExportProject = document.getElementById('btn-export-project');
const btnImportProject = document.getElementById('btn-import-project');
const projectImportInput = document.getElementById('project-import-input') as HTMLInputElement;

if (btnExportProject) {
    btnExportProject.addEventListener('click', () => {
        if (!currentProject) {
            addLog('Nenhum projeto para exportar', 'error');
            return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentProject, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `project-${currentProject.name || 'untitled'}-${Date.now()}.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        addLog('Projeto exportado com sucesso!', 'info');
    });
}

if (btnImportProject) {
    btnImportProject.addEventListener('click', () => {
        projectImportInput.click();
    });
}

if (projectImportInput) {
    projectImportInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (json.id && json.modules) {
                    currentProject = json;
                    // Re-render UI
                    renderModulesList();
                    (document.getElementById('project-name-input') as HTMLInputElement).value = currentProject?.name || 'Novo Projeto';
                    addLog(`Projeto importado: ${currentProject?.name}`, 'info');
                } else {
                    addLog('Arquivo de projeto inválido', 'error');
                }
            } catch (err) {
                addLog('Erro ao ler arquivo JSON', 'error');
            }
        };
        reader.readAsText(file);
        // Reset input
        projectImportInput.value = '';
    });
}

async function loadSelectedTemplate(): Promise<void> {
    const name = templateSelect.value;
    if (!name) {
        addLog('Selecione um template primeiro', 'error');
        return;
    }

    try {
        const template = await window.firmware.getTemplate(name);
        if (template) {
            currentTemplate = template;
            currentFileIndex = 0;

            // Update file selector if multiple files
            if (template.files.length > 1) {
                fileSelect.innerHTML = '';
                template.files.forEach((f, i) => {
                    const opt = document.createElement('option');
                    opt.value = i.toString();
                    opt.textContent = f.name;
                    fileSelect.appendChild(opt);
                });
                fileSelect.classList.remove('hidden');
            } else {
                fileSelect.classList.add('hidden');
            }

            showCurrentFile();
            uploadFirmwareBtn.disabled = false;
            addLog(`Template carregado: ${template.description}`, 'info');
        }
    } catch (e) {
        addLog(`Erro ao carregar template: ${e}`, 'error');
    }
}

function showCurrentFile(): void {
    if (!currentTemplate) return;

    const file = currentTemplate.files[currentFileIndex];
    currentFileSpan.textContent = file.name;
    codeEditor.value = file.content;
}

async function uploadFirmware(): Promise<void> {
    if (!currentTemplate) {
        addLog('Nenhum template carregado', 'error');
        return;
    }

    const port = portSelect.value;
    if (!port) {
        addLog('Selecione uma porta primeiro', 'error');
        return;
    }

    // Disconnect if connected
    if (currentState === 'CONNECTED') {
        await window.serial.disconnect();
        await new Promise(r => setTimeout(r, 500));
    }

    firmwareStatus.textContent = 'Fazendo upload...';
    firmwareStatus.className = 'firmware-status loading';
    uploadFirmwareBtn.disabled = true;
    console.log('[Renderer] Starting upload...', {
        template: currentTemplate?.name,
        port: port,
        fileIndex: currentFileIndex
    });

    try {
        let result: UploadResult;

        if (currentTemplate.platform === 'arduino') {
            addLog('Iniciando compilação e upload Arduino...', 'info');
            // Assuming Uno for now
            result = await window.firmware.uploadArduinoContent(codeEditor.value, port, 'arduino:avr:uno');
        } else {
            addLog('Iniciando upload MicroPython...', 'info');
            // Upload main.py or whatever the file is named
            // We need to map the template file to the destination path
            // For now, let's assume if it's main.py it goes to /main.py
            const destPath = '/' + currentFileSpan.textContent;
            result = await window.firmware.uploadMicroPythonContent(codeEditor.value, port, destPath);

            // Soft reset after upload for ESP32
            if (result.success) {
                await window.firmware.resetESP32(port);
            }
        }

        if (result.success) {
            firmwareStatus.textContent = 'Upload com sucesso!';
            firmwareStatus.className = 'firmware-status success'; // Use existing or add class
            addLog('Upload concluído com sucesso!', 'received');
            console.log('[Renderer] Upload success:', result);
        } else {
            console.error('[Renderer] Upload failed:', result.output);
            throw new Error(result.output);
        }

    } catch (e: any) {
        firmwareStatus.textContent = 'Falha no upload';
        firmwareStatus.className = 'pill unavailable';
        addLog(`Erro no upload: ${e.message || e}`, 'error');
        console.error(e);
    } finally {
        uploadFirmwareBtn.disabled = false;
        // Reconnect serial if it was connected before? 
        // Typically serial needs to be disconnected for upload.
        // User can manually reconnect.
    }
}

// Firmware Event Listeners
loadTemplateBtn.addEventListener('click', loadSelectedTemplate);
uploadFirmwareBtn.addEventListener('click', uploadFirmware);

fileSelect.addEventListener('change', () => {
    currentFileIndex = parseInt(fileSelect.value);
    showCurrentFile();
});

codeEditor.addEventListener('input', () => {
    // Update current file content when edited
    if (currentTemplate && currentTemplate.files[currentFileIndex]) {
        currentTemplate.files[currentFileIndex].content = codeEditor.value;
    }
});

// WiFi Listeners
if (btnAddWifi) btnAddWifi.addEventListener('click', openWifiModal);
if (wifiModalClose) wifiModalClose.addEventListener('click', closeWifiModal);
if (wifiModalCancel) wifiModalCancel.addEventListener('click', closeWifiModal);
if (wifiModalConfirm) wifiModalConfirm.addEventListener('click', saveWifiModule);

if (wifiModalBackdrop) {
    wifiModalBackdrop.addEventListener('click', (e) => {
        if (e.target === wifiModalBackdrop) closeWifiModal();
    });
}

// === DEVICE TEMPLATES SYSTEM ===

const templatesModalBackdrop = document.getElementById('templates-modal-backdrop');
const templatesModalClose = document.getElementById('templates-modal-close');
const templateGrid = document.getElementById('template-grid');
const btnBrowseTemplates = document.getElementById('btn-browse-templates');
const btnImportTemplate = document.getElementById('btn-import-template');
const btnCreateTemplate = document.getElementById('btn-create-template');

// Platform icon mapping
const platformIcons: Record<string, string> = {
    'esp32': '⚡',
    'esp8266': '📶',
    'arduino': '🔌',
};

async function openTemplatesModal() {
    if (!templatesModalBackdrop) return;
    templatesModalBackdrop.classList.remove('hidden');
    await loadTemplates();
}

function closeTemplatesModal() {
    if (templatesModalBackdrop) {
        templatesModalBackdrop.classList.add('hidden');
    }
}

async function loadTemplates() {
    if (!templateGrid) return;
    templateGrid.innerHTML = '<p style="color: var(--muted);">Carregando templates...</p>';

    try {
        const templates = await (window as any).templates.list();
        templateGrid.innerHTML = '';

        if (templates.length === 0) {
            templateGrid.innerHTML = '<p style="color: var(--muted);">Nenhum template disponível.</p>';
            return;
        }

        for (const template of templates) {
            const card = renderTemplateCard(template);
            templateGrid.appendChild(card);
        }
    } catch (e: any) {
        console.error('[Templates] Failed to load templates:', e);
        templateGrid.innerHTML = '<p style="color: var(--error);">Erro ao carregar templates.</p>';
    }
}

function renderTemplateCard(template: any): HTMLElement {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.style.cssText = `
        background: var(--glass);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 15px;
        cursor: pointer;
        transition: all 0.2s ease;
    `;

    const icon = platformIcons[template.platform] || '📦';
    const tagsHtml = template.tags?.slice(0, 3).map((t: string) =>
        `<span style="background: var(--primary-color); opacity: 0.7; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${t}</span>`
    ).join(' ') || '';

    card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <span style="font-size: 24px;">${icon}</span>
            <div>
                <h4 style="margin: 0; font-size: 14px;">${template.name}</h4>
                <span style="font-size: 11px; color: var(--muted);">${template.platform.toUpperCase()}</span>
            </div>
        </div>
        <p style="font-size: 12px; color: var(--muted); margin: 0 0 10px 0;">${template.description}</p>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">${tagsHtml}</div>
        <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="btn btn-xs btn-primary apply-template" data-id="${template.id}">Aplicar</button>
            <button class="btn btn-xs btn-secondary export-template" data-id="${template.id}">📤</button>
        </div>
    `;

    // Hover effect
    card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'var(--primary-color)';
        card.style.transform = 'translateY(-2px)';
    });
    card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'var(--border)';
        card.style.transform = 'translateY(0)';
    });

    // Apply button
    const applyBtn = card.querySelector('.apply-template') as HTMLButtonElement;
    applyBtn?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await applyTemplate(template.id);
    });

    // Export button
    const exportBtn = card.querySelector('.export-template') as HTMLButtonElement;
    exportBtn?.addEventListener('click', async (e) => {
        e.stopPropagation();
        // For now, just log - full file dialog would need extra IPC
        addLog(`Template "${template.name}" pronto para exportar (ID: ${template.id})`, 'info');
    });

    return card;
}

// === API SYNC ===
async function syncAPIDataToDevice() {
    if (currentState !== 'CONNECTED') return;

    addLog('Syncing API data to device...', 'info');
    let synced = false;

    if (currentWeatherData) {
        await sendCommand(`VAR:SET:TEMP:${currentWeatherData.temperature}`);
        synced = true;
    }

    if (currentTideData) {
        await sendCommand(`VAR:SET:TIDE:${currentTideData.level.toFixed(2)}`);
        synced = true;
    }

    if (synced) {
        // addLog('API data synced.', 'success');
    }
}

async function applyTemplate(templateId: string) {
    try {
        addLog(`Aplicando template: ${templateId}...`, 'info');

        const modules = await (window as any).templates.apply(templateId);

        if (modules && modules.length > 0 && currentProject) {
            // Add modules to current project
            for (const mod of modules) {
                currentProject.modules.push({
                    id: mod.id || `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)} `,
                    type: mod.type,
                    name: mod.name,
                    pin: mod.pin,
                    inverted: mod.inverted,
                });
            }

            refreshModulesUI();
            closeTemplatesModal();

            addLog(`Template aplicado! ${modules.length} módulo(s) adicionado(s).`, 'info');

            // Switch to Modules view
            navItems.forEach(item => item.classList.remove('active'));
            viewSections.forEach(section => section.classList.remove('active'));
            const modulesNav = document.querySelector('.nav-item[data-view="modules"]') as HTMLElement;
            const modulesView = document.getElementById('view-modules');
            if (modulesNav && modulesView) {
                modulesNav.classList.add('active');
                modulesView.classList.add('active');
            }
        } else {
            addLog('Template vazio ou inválido.', 'error');
        }
    } catch (e: any) {
        addLog(`Erro ao aplicar template: ${e.message} `, 'error');
        console.error('[Templates] Apply failed:', e);
    }
}

// Template Event Listeners
if (btnBrowseTemplates) {
    btnBrowseTemplates.addEventListener('click', openTemplatesModal);
}
if (templatesModalClose) {
    templatesModalClose.addEventListener('click', closeTemplatesModal);
}
if (templatesModalBackdrop) {
    templatesModalBackdrop.addEventListener('click', (e) => {
        if (e.target === templatesModalBackdrop) closeTemplatesModal();
    });
}
if (btnImportTemplate) {
    btnImportTemplate.addEventListener('click', () => {
        addLog('Importação de templates será implementada em breve!', 'info');
    });
}
if (btnCreateTemplate) {
    btnCreateTemplate.addEventListener('click', () => {
        addLog('Criação de templates a partir do projeto atual será implementada em breve!', 'info');
    });
}

// ========================================
// === EXTERNAL APIs HANDLERS ===
// ========================================

declare var externalAPI: {
    fetch: (url: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    getWeather: (lat: number, lon: number) => Promise<{ success: boolean; data?: any; error?: string }>;
    getTide: (porto: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    getMoon: () => Promise<{ success: boolean; data?: any; error?: string }>;
};

// Weather code to description/icon mapping
const weatherCodeMap: { [key: number]: { desc: string; icon: string } } = {
    0: { desc: 'Céu limpo', icon: '☀️' },
    1: { desc: 'Parcialmente nublado', icon: '🌤️' },
    2: { desc: 'Nublado', icon: '⛅' },
    3: { desc: 'Encoberto', icon: '☁️' },
    45: { desc: 'Neblina', icon: '🌫️' },
    48: { desc: 'Neblina gelada', icon: '🌫️' },
    51: { desc: 'Garoa leve', icon: '🌧️' },
    53: { desc: 'Garoa moderada', icon: '🌧️' },
    55: { desc: 'Garoa intensa', icon: '🌧️' },
    61: { desc: 'Chuva leve', icon: '🌧️' },
    63: { desc: 'Chuva moderada', icon: '🌧️' },
    65: { desc: 'Chuva forte', icon: '🌧️' },
    80: { desc: 'Pancadas leves', icon: '🌦️' },
    81: { desc: 'Pancadas moderadas', icon: '🌦️' },
    82: { desc: 'Pancadas fortes', icon: '⛈️' },
    95: { desc: 'Tempestade', icon: '⛈️' },
    96: { desc: 'Tempestade com granizo leve', icon: '⛈️' },
    99: { desc: 'Tempestade com granizo forte', icon: '⛈️' },
};

// Current API data storage for firmware generation
let currentWeatherData: any = null;
let currentTideData: any = null;
let currentMoonData: any = null;

async function testOpenMeteoAPI() {
    const lat = parseFloat((document.getElementById('openmeteo-lat') as HTMLInputElement)?.value) || -14.79;
    const lon = parseFloat((document.getElementById('openmeteo-lon') as HTMLInputElement)?.value) || -39.03;

    showToast(`Testando Open-Meteo... Lat: ${lat}, Lon: ${lon}`, 'info');
    addLog(`🌤️ Testando Open-Meteo API: ${lat}, ${lon}...`, 'sent');

    try {
        const result = await externalAPI.getWeather(lat, lon);

        if (result.success && result.data) {
            currentWeatherData = result.data;

            // Update UI
            const tempEl = document.getElementById('openmeteo-temp');
            const windEl = document.getElementById('openmeteo-wind');
            const condEl = document.getElementById('openmeteo-condition');

            if (tempEl) tempEl.textContent = `${result.data.temperature}°C`;
            if (windEl) windEl.textContent = `${result.data.windSpeed} km/h`;

            const weather = weatherCodeMap[result.data.weatherCode] || { desc: 'Desconhecido', icon: '❓' };
            if (condEl) condEl.textContent = `${weather.icon} ${weather.desc}`;

            // Update status
            updateAPIStatus('openmeteo', 'ok', 'agora');

            const msg = `Temp: ${result.data.temperature}°C, ${weather.desc}`;
            showToast(msg, 'success', 'Open-Meteo Sucesso');
            addLog(`✅ Open-Meteo: ${msg}`, 'received');

            // Sync to device
            await syncAPIDataToDevice();
        } else {
            updateAPIStatus('openmeteo', 'error', result.error || 'Erro');
            showToast(`Erro: ${result.error}`, 'error', 'Open-Meteo Falhou');
            addLog(`❌ Open-Meteo erro: ${result.error}`, 'error');
        }
    } catch (e: any) {
        showToast(`Falha: ${e.message}`, 'error', 'Open-Meteo Falhou');
        addLog(`❌ Open-Meteo falha: ${e.message}`, 'error');
    }
}

async function testTideAPI() {
    const porto = (document.getElementById('tide-api-porto') as HTMLSelectElement)?.value || '8';

    showToast(`Testando API de Marés (Porto ${porto})...`, 'info');
    addLog(`🌊 Testando API de Marés: Porto ${porto}...`, 'sent');

    try {
        const result = await externalAPI.getTide(porto);

        if (result.success && result.data) {
            currentTideData = result.data;

            // Update UI
            const levelEl = document.getElementById('tide-level');
            const nextHighEl = document.getElementById('tide-next-high');
            const nextLowEl = document.getElementById('tide-next-low');

            if (levelEl) levelEl.textContent = `${result.data.level}%`;
            if (nextHighEl) nextHighEl.textContent = result.data.nextHigh;
            if (nextLowEl) nextLowEl.textContent = result.data.nextLow;

            // Update status
            updateAPIStatus('tide', 'ok', 'agora');

            const trendIcon = result.data.isRising ? '↗' : '↘';
            const msg = `Nível: ${result.data.level}% ${trendIcon}, Próx Alta: ${result.data.nextHigh}`;
            showToast(msg, 'success', 'Maré Sucesso');
            addLog(`✅ Maré: ${msg}`, 'received');

            // Sync to device
            await syncAPIDataToDevice();
        } else {
            updateAPIStatus('tide', 'error', result.error || 'Erro');
            showToast(`Erro: ${result.error}`, 'error', 'Maré Falhou');
            addLog(`❌ Maré erro: ${result.error}`, 'error');
        }
    } catch (e: any) {
        showToast(`Falha: ${e.message}`, 'error', 'Maré Falhou');
        addLog(`❌ Maré falha: ${e.message}`, 'error');
    }
}

async function testMoonAPI() {
    showToast(`Obtendo fase da Lua...`, 'info');
    addLog(`🌙 Obtendo fase da Lua...`, 'sent');

    try {
        const result = await externalAPI.getMoon();

        if (result.success && result.data) {
            currentMoonData = result.data;
            const msg = `${result.data.phaseIcon} ${result.data.phaseName} (${result.data.illumination}%)`;
            showToast(msg, 'success', 'Lua Sucesso');
            addLog(`✅ Lua: ${msg}`, 'received');
        } else {
            showToast(`Erro: ${result.error}`, 'error', 'Lua Falhou');
            addLog(`❌ Lua erro: ${result.error}`, 'error');
        }
    } catch (e: any) {
        showToast(`Falha: ${e.message}`, 'error', 'Lua Falhou');
        addLog(`❌ Lua falha: ${e.message}`, 'error');
    }
}

function updateAPIStatus(apiName: string, status: 'ok' | 'error' | 'offline', time: string) {
    const statusList = document.getElementById('api-status-list');
    if (!statusList) return;

    const items = statusList.querySelectorAll('.status-item');
    items.forEach(item => {
        const nameEl = item.querySelector('span:nth-child(2)');
        if (nameEl) {
            const name = nameEl.textContent?.toLowerCase() || '';
            if ((apiName === 'openmeteo' && name.includes('open-meteo')) ||
                (apiName === 'tide' && name.includes('marés')) ||
                (apiName === 'crypto' && name.includes('crypto'))) {
                item.className = `status - item ${status} `;
                const timeEl = item.querySelector('.status-time');
                if (timeEl) timeEl.textContent = time;
            }
        }
    });
}

function initAPIHandlers() {
    // Open-Meteo test button
    document.getElementById('btn-openmeteo-test')?.addEventListener('click', testOpenMeteoAPI);

    // Tide test button
    document.getElementById('btn-tide-test')?.addEventListener('click', testTideAPI);

    // Crypto test button (placeholder)
    document.getElementById('btn-crypto-test')?.addEventListener('click', () => {
        addLog('📈 Crypto API: Em desenvolvimento', 'info');
        updateAPIStatus('crypto', 'offline', 'desativado');
    });

    // Custom API test button
    document.getElementById('btn-custom-test')?.addEventListener('click', async () => {
        const url = (document.getElementById('custom-api-url') as HTMLInputElement)?.value;
        if (!url) {
            addLog('❌ URL da API não configurada', 'error');
            return;
        }
        addLog(`🔌 Testando API: ${url}...`, 'sent');
        try {
            const result = await externalAPI.fetch(url);
            if (result.success) {
                const valueEl = document.getElementById('custom-value');
                if (valueEl) valueEl.textContent = JSON.stringify(result.data).substring(0, 50) + '...';
                addLog(`✅ API Custom: Resposta recebida`, 'received');
            } else {
                addLog(`❌ API Custom erro: ${result.error} `, 'error');
            }
        } catch (e: any) {
            addLog(`❌ API Custom falha: ${e.message} `, 'error');
        }
    });

    // Test all APIs button
    document.getElementById('btn-test-apis')?.addEventListener('click', async () => {
        addLog('🔄 Testando todas as APIs...', 'info');
        await testOpenMeteoAPI();
        await testTideAPI();
        await testMoonAPI();
        addLog('✅ Testes de API concluídos', 'info');
    });

    // Refresh APIs button
    document.getElementById('btn-refresh-apis')?.addEventListener('click', async () => {
        await testOpenMeteoAPI();
        await testTideAPI();
    });

    // Preset buttons - connect to Animation Creator
    document.querySelectorAll('.preset-buttons .btn-xs').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = (btn as HTMLElement).dataset.preset;
            if (preset) {
                // Navigate to Animation Creator and apply preset
                const animNav = document.querySelector('[data-view="neopixel"]') as HTMLElement;
                if (animNav) animNav.click();

                setTimeout(() => {
                    applyEffect(preset);
                    addLog(`🎨 Preset aplicado: ${preset} `, 'info');
                }, 100);
            }
        });
    });

    console.log('[APIs] Handlers initialized');
}

// Initialize API handlers when DOM ready
setTimeout(initAPIHandlers, 200);

// Export API data for firmware generation
function getAPIDataForFirmware(): any {
    return {
        weather: currentWeatherData,
        tide: currentTideData,
        moon: currentMoonData
    };
}

// === AUTOMATION UI LOGIC ===
function refreshAutomationUI() {
    if (!mappingsList || !timersList) return;

    // Clear lists
    mappingsList.innerHTML = '';
    timersList.innerHTML = '';

    if (!currentProject) return;

    // Find automation module
    const autoMod = currentProject.modules.find((m: ModuleConfig) => m.type === 'AUTOMATION');
    if (!autoMod) {
        mappingsList.innerHTML = '<div class="empty-state">Nenhuma regra definida</div>';
        timersList.innerHTML = '<div class="empty-state">Nenhum agendamento</div>';
        return;
    }

    const rules = autoMod.automationConfig?.rules || [];
    const timers = autoMod.automationConfig?.timers || [];

    // Render Rules
    if (rules.length === 0) {
        mappingsList.innerHTML = '<div class="empty-state">Nenhuma regra definida</div>';
    } else {
        rules.forEach((rule, idx) => {
            const item = document.createElement('div');
            item.className = 'mapping-item';
            item.innerHTML = `
                <div class="mapping-info">
                    <span class="badge badge-trigger" style="background:#444; color:#fff; padding:2px 6px; border-radius:4px;">${rule.trigger}</span>
                    <span class="arrow" style="margin:0 5px;">➔</span>
                    <span class="badge badge-command" style="background:#0066cc; color:#fff; padding:2px 6px; border-radius:4px;">${rule.command}</span>
                </div>
                <button class="btn-icon btn-del-rule" data-idx="${idx}" style="color:red;">✕</button>
            `;
            item.querySelector('.btn-del-rule')?.addEventListener('click', () => removeRule(idx));
            mappingsList.appendChild(item);
        });
    }

    // Render Timers
    if (timers.length === 0) {
        timersList.innerHTML = '<div class="empty-state">Nenhum agendamento</div>';
    } else {
        timers.forEach((timer, idx) => {
            const item = document.createElement('div');
            item.className = 'mapping-item';
            item.innerHTML = `
                <div class="mapping-info">
                    <span class="badge badge-time" style="background:#666; color:#fff; padding:2px 6px; border-radius:4px;">⏰ ${timer.time}</span>
                    <span class="arrow" style="margin:0 5px;">➔</span>
                    <span class="badge badge-command" style="background:#0066cc; color:#fff; padding:2px 6px; border-radius:4px;">${timer.command}</span>
                </div>
                <button class="btn-icon btn-del-timer" data-idx="${idx}" style="color:red;">✕</button>
            `;
            item.querySelector('.btn-del-timer')?.addEventListener('click', () => removeTimer(idx));
            timersList.appendChild(item);
        });
    }
}

async function getOrCreateAutomationModule(): Promise<ModuleConfig> {
    if (!currentProject) throw new Error('No project');
    let autoMod = currentProject.modules.find((m: ModuleConfig) => m.type === 'AUTOMATION');

    if (!autoMod) {
        autoMod = {
            id: 'AUTO-MAIN',
            type: 'AUTOMATION',
            name: 'Automation & Timers',
            pin: 0,
            automationConfig: {
                rules: [],
                timers: []
            }
        };
        currentProject.modules.push(autoMod);
    }

    if (!autoMod.automationConfig) {
        autoMod.automationConfig = { rules: [], timers: [] };
    }

    return autoMod;
}

async function saveAutomation() {
    if (!currentProject) return;
    await window.projects.save(currentProject);
    refreshAutomationUI();
}

async function removeRule(index: number) {
    if (!confirm('Remover regra?')) return;
    const autoMod = await getOrCreateAutomationModule();
    autoMod.automationConfig?.rules.splice(index, 1);
    await saveAutomation();
}

async function removeTimer(index: number) {
    if (!confirm('Remover agendamento?')) return;
    const autoMod = await getOrCreateAutomationModule();
    autoMod.automationConfig?.timers.splice(index, 1);
    await saveAutomation();
}

// Event Listeners for Automation
if (btnAddMapping) {
    btnAddMapping.addEventListener('click', () => {
        if (mappingModalBackdrop) {
            mappingModalBackdrop.classList.remove('hidden');
            mappingModalBackdrop.style.display = 'flex';
        }
    });
}

if (mappingModalClose) mappingModalClose.addEventListener('click', () => mappingModalBackdrop?.classList.add('hidden'));
if (mappingModalCancel) mappingModalCancel.addEventListener('click', () => mappingModalBackdrop?.classList.add('hidden'));

if (mappingModalConfirm) {
    mappingModalConfirm.addEventListener('click', async () => {
        const trigger = mapTrigger.value.trim();
        const command = mapCommand.value.trim();

        if (!trigger || !command) {
            alert('Preencha todos os campos');
            return;
        }

        const autoMod = await getOrCreateAutomationModule();
        // Check if rule already exists? No, duplicate allowed for different effects maybe.
        // Actually, trigger can trigger only one command in simple check?
        // Python code: check_rules iterates ALL rules. So multiple commands for one trigger works!

        if (!autoMod.automationConfig?.rules) autoMod.automationConfig!.rules = [];
        autoMod.automationConfig!.rules.push({ trigger, command });

        await saveAutomation();
        mappingModalBackdrop?.classList.add('hidden');
        mapTrigger.value = '';
        mapCommand.value = '';
    });
}

if (btnAddTimer) {
    btnAddTimer.addEventListener('click', () => {
        if (timerModalBackdrop) {
            timerModalBackdrop.classList.remove('hidden');
            timerModalBackdrop.style.display = 'flex';
        }
    });
}

if (timerModalClose) timerModalClose.addEventListener('click', () => timerModalBackdrop?.classList.add('hidden'));
if (timerModalCancel) timerModalCancel.addEventListener('click', () => timerModalBackdrop?.classList.add('hidden'));

if (timerModalConfirm) {
    timerModalConfirm.addEventListener('click', async () => {
        const time = (document.getElementById('timer-time') as HTMLInputElement).value; // HH:MM
        const command = (document.getElementById('timer-command') as HTMLInputElement).value.trim();

        if (!time || !command) {
            alert('Preencha horário e comando');
            return;
        }

        const autoMod = await getOrCreateAutomationModule();
        if (!autoMod.automationConfig?.timers) autoMod.automationConfig!.timers = [];
        autoMod.automationConfig!.timers.push({ time, command });

        await saveAutomation();
        timerModalBackdrop?.classList.add('hidden');
    });
}

// === SERVO FUNCTIONS (Phase 15) ===

function openServoModal() {
    if (!modalServoBackdrop) return;

    // Default or Reset Values
    modalServoTitle.textContent = '🦾 Configurar Servo';
    inpServoName.value = `Servo ${currentProject ? currentProject.modules.filter(m => m.type === 'SERVO').length + 1 : 1}`;
    inpServoPin.value = '13';
    selServoType.value = '180';
    inpServoMinPulse.value = '500';
    inpServoMaxPulse.value = '2500';

    // Auto Control
    selServoSource.value = 'NONE';
    divServoMapping.classList.add('hidden');

    // Auto Mapping Defaults
    inpServoMapInMin.value = '0';
    inpServoMapInMax.value = '100';
    inpServoMapOutMin.value = '0';
    inpServoMapOutMax.value = '180';

    modalServoBackdrop.classList.remove('hidden');
    modalServoBackdrop.style.display = 'flex';
}

function closeServoModal() {
    if (modalServoBackdrop) {
        modalServoBackdrop.classList.add('hidden');
        modalServoBackdrop.style.display = 'none';
    }
}

async function saveServoModule() {
    if (!currentProject) return;

    const name = inpServoName.value.trim();
    if (!name) return alert('Nome é obrigatório');

    const pin = parseInt(inpServoPin.value);
    const minPulse = parseInt(inpServoMinPulse.value);
    const maxPulse = parseInt(inpServoMaxPulse.value);

    if (isNaN(pin) || isNaN(minPulse) || isNaN(maxPulse)) {
        return alert('Valores numéricos inválidos');
    }

    // Auto Control
    const autoControl = selServoSource.value as any;
    let mapInMin = 0, mapInMax = 100, mapOutMin = 0, mapOutMax = 180;

    if (autoControl !== 'NONE') {
        mapInMin = parseFloat(inpServoMapInMin.value);
        mapInMax = parseFloat(inpServoMapInMax.value);
        mapOutMin = parseFloat(inpServoMapOutMin.value);
        mapOutMax = parseFloat(inpServoMapOutMax.value);

        if (isNaN(mapInMin) || isNaN(mapInMax) || isNaN(mapOutMin) || isNaN(mapOutMax)) {
            return alert('Valores de mapeamento inválidos');
        }
    }

    const config: any = {
        pin,
        type: selServoType.value as '180' | '360',
        minPulse,
        maxPulse,
        startAngle: 0,
        autoControl,
        minInput: mapInMin,
        maxInput: mapInMax,
        minOutputAngle: mapOutMin,
        maxOutputAngle: mapOutMax
    };

    const newModule: ModuleConfig = {
        id: crypto.randomUUID(),
        type: 'SERVO',
        name,
        pin,
        servoConfig: config
    };

    currentProject.modules.push(newModule);
    await window.projects.save(currentProject);
    renderModulesList();
    closeServoModal();
    showToast('Servo adicionado com sucesso', 'success');
}

// === EVENT LISTENERS SETUP FOR SERVO ===
// Called manually here since we are at end of script
if (btnAddServo) btnAddServo.addEventListener('click', openServoModal);
if (modalServoClose) modalServoClose.addEventListener('click', closeServoModal);
if (modalServoCancel) modalServoCancel.addEventListener('click', closeServoModal);
if (modalServoConfirm) modalServoConfirm.addEventListener('click', saveServoModule);

// Auto-Control Logic
if (selServoSource) {
    selServoSource.addEventListener('change', () => {
        const source = selServoSource.value;
        if (source === 'NONE') {
            divServoMapping.classList.add('hidden');
        } else {
            divServoMapping.classList.remove('hidden');
            // Auto presets
            if (source === 'TIDE_LEVEL') {
                if (document.getElementById('servo-hint-in-min')) document.getElementById('servo-hint-in-min')!.textContent = 'ex: 0%';
                if (document.getElementById('servo-hint-in-max')) document.getElementById('servo-hint-in-max')!.textContent = 'ex: 100%';
                inpServoMapInMin.value = '0';
                inpServoMapInMax.value = '100';
            } else if (source === 'TIDE_TREND') {
                if (document.getElementById('servo-hint-in-min')) document.getElementById('servo-hint-in-min')!.textContent = 'ex: -1.0';
                if (document.getElementById('servo-hint-in-max')) document.getElementById('servo-hint-in-max')!.textContent = 'ex: 1.0';
                inpServoMapInMin.value = '-1';
                inpServoMapInMax.value = '1';
                // Center servo
                const type = selServoType.value;
                const mid = type === '180' ? 90 : 0;
                inpServoMapOutMin.value = '0';
                inpServoMapOutMax.value = '180';
            }
        }
    });
}


