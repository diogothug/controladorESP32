import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

// Connection states
export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

// Device info from handshake
export interface DeviceInfo {
    type: string;      // ARDUINO_UNO | ESP32
    firmware: string;  // e.g. "1.0.0"
    capabilities: string[];
}

// Port info for UI
export interface PortInfo {
    path: string;
    manufacturer?: string;
    vendorId?: string;
    productId?: string;
}

// Timeouts (ms)
const HANDSHAKE_TIMEOUT = 3000;
const COMMAND_TIMEOUT = 500;
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * SerialManager - Único ponto de acesso serial
 * Responsabilidades:
 * - Abre/fecha portas
 * - Mantém estado da conexão
 * - Faz handshake SYS:HELLO
 * - Gerencia timeout
 * - Faz parsing de resposta
 */
export class SerialManager {
    private port: SerialPort | null = null;
    private parser: ReadlineParser | null = null;
    private state: ConnectionState = 'DISCONNECTED';
    private deviceInfo: DeviceInfo | null = null;
    private responseCallback: ((line: string) => void) | null = null;
    private lastPortPath: string | null = null;
    private lastBaudRate: number = 115200;
    private autoReconnectEnabled: boolean = false;
    private reconnectAttempts: number = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;

    // Event callbacks
    private onStateChange: ((state: ConnectionState) => void) | null = null;
    private onData: ((data: string) => void) | null = null;
    private onError: ((error: string) => void) | null = null;

    /**
     * Lista portas COM disponíveis
     */
    async listPorts(): Promise<PortInfo[]> {
        console.log('[SerialManager] Listing ports requested...');
        try {
            const ports = await SerialPort.list();
            console.log(`[SerialManager] Found ${ports.length} ports via SerialPort.list()`);
            ports.forEach(p => console.log(` - ${p.path} (${p.manufacturer})`));

            return ports.map(p => ({
                path: p.path,
                manufacturer: p.manufacturer,
                vendorId: p.vendorId,
                productId: p.productId
            }));
        } catch (error) {
            console.error('[SerialManager] Error listing ports:', error);
            throw error;
        }
    }

    /**
     * Conecta a uma porta e faz handshake
     */
    async connect(portPath: string, baudRate: number = 115200): Promise<DeviceInfo | null> {
        if (this.state !== 'DISCONNECTED') {
            await this.disconnect();
        }

        // Salva para possível reconnect
        this.lastPortPath = portPath;
        this.lastBaudRate = baudRate;
        this.reconnectAttempts = 0;

        this.setState('CONNECTING');

        try {
            // Abre a porta
            this.port = new SerialPort({
                path: portPath,
                baudRate,
                autoOpen: false
            });

            await new Promise<void>((resolve, reject) => {
                this.port!.open((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        // Pulse DTR/RTS to reset connection state and ensure Run Mode
                        this.port!.set({ dtr: true, rts: true }, (err) => {
                            if (err) console.error('[SerialManager] Failed to assert DTR/RTS:', err);

                            setTimeout(() => {
                                this.port!.set({ dtr: false, rts: false }, (err) => {
                                    if (err) console.error('[SerialManager] Failed to clear DTR/RTS:', err);
                                });
                            }, 100);
                        });
                        resolve();
                    }
                });
            });

            // Listener para desconexão inesperada
            this.port.on('close', () => {
                if (this.state === 'CONNECTED' && this.autoReconnectEnabled) {
                    this.handleUnexpectedDisconnect();
                }
            });

            this.port.on('error', (err) => {
                this.onError?.(err.message);
                if (this.state === 'CONNECTED' && this.autoReconnectEnabled) {
                    this.handleUnexpectedDisconnect();
                }
            });

            // Configura parser de linhas
            this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
            this.parser.on('data', (line: string) => this.handleData(line));

            // Aguarda estabilização (ESP32 boot)
            await this.sleep(1500);

            // Faz handshake
            const response = await this.sendCommandWithTimeout('SYS:HELLO', HANDSHAKE_TIMEOUT);

            if (response) {
                if (response.startsWith('OK:')) {
                    this.deviceInfo = this.parseDeviceInfo(response);
                } else if (response.startsWith('SYS:HELLO:')) {
                    const type = response.split(':')[2] || 'GEN_DEVICE';
                    this.deviceInfo = { type, firmware: '1.0.0', capabilities: ['GPIO', 'NEO'] };
                } else {
                    // Non-standard response
                    console.warn('[SerialManager] Non-standard handshake response:', response);
                    this.deviceInfo = { type: 'GENERIC_SERIAL', firmware: 'unknown', capabilities: [] };
                }

                this.reconnectAttempts = 0;
                this.setState('CONNECTED');
                return this.deviceInfo;

            } else {
                // No response (Timeout) - Fallback to Connected anyway
                console.warn('[SerialManager] Handshake timeout. Assuming generic serial device.');
                this.deviceInfo = { type: 'GENERIC_SERIAL', firmware: 'unknown', capabilities: [] };
                this.setState('CONNECTED');
                return this.deviceInfo;
            }

            // throw new Error('Handshake failed: ' + (response || 'No response'));

        } catch (error) {
            this.setState('ERROR');
            await this.disconnect();
            throw error;
        }
    }

    /**
     * Desconecta da porta atual
     */
    async disconnect(): Promise<void> {
        // Cancela reconnect pendente
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.autoReconnectEnabled = false;

        if (this.port && this.port.isOpen) {
            await new Promise<void>((resolve) => {
                this.port!.close(() => resolve());
            });
        }
        this.port = null;
        this.parser = null;
        this.deviceInfo = null;
        this.setState('DISCONNECTED');
    }

    /**
     * Envia comando e aguarda resposta
     */
    async sendCommand(command: string): Promise<string | null> {
        return this.sendCommandWithTimeout(command, COMMAND_TIMEOUT);
    }

    /**
     * Retorna estado atual da conexão
     */
    getState(): ConnectionState {
        return this.state;
    }

    /**
     * Retorna info do dispositivo conectado
     */
    getDeviceInfo(): DeviceInfo | null {
        return this.deviceInfo;
    }

    /**
     * Habilita/desabilita auto-reconnect
     */
    setAutoReconnect(enabled: boolean): void {
        this.autoReconnectEnabled = enabled;
    }

    /**
     * Retorna status do auto-reconnect
     */
    isAutoReconnectEnabled(): boolean {
        return this.autoReconnectEnabled;
    }

    /**
     * Registra callbacks de eventos
     */
    on(event: 'stateChange', callback: (state: ConnectionState) => void): void;
    on(event: 'data', callback: (data: string) => void): void;
    on(event: 'error', callback: (error: string) => void): void;
    on(event: string, callback: (...args: any[]) => void): void {
        switch (event) {
            case 'stateChange': this.onStateChange = callback; break;
            case 'data': this.onData = callback; break;
            case 'error': this.onError = callback; break;
        }
    }

    // === Private Methods ===

    private setState(state: ConnectionState): void {
        this.state = state;
        this.onStateChange?.(state);
    }

    private handleData(line: string): void {
        line = line.trim();
        if (!line) return;

        // Se esperando resposta de comando
        if (this.responseCallback) {
            this.responseCallback(line);
            return;
        }

        // Dados não solicitados (logs, eventos)
        this.onData?.(line);
    }

    private async sendCommandWithTimeout(command: string, timeout: number): Promise<string | null> {
        if (!this.port || !this.port.isOpen) {
            throw new Error('Port not open');
        }

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.responseCallback = null;
                resolve(null); // Timeout = null response
            }, timeout);

            this.responseCallback = (line: string) => {
                clearTimeout(timer);
                this.responseCallback = null;
                resolve(line);
            };

            this.port!.write(command + '\n', (err) => {
                if (err) {
                    clearTimeout(timer);
                    this.responseCallback = null;
                    reject(err);
                }
            });
        });
    }

    private parseDeviceInfo(response: string): DeviceInfo {
        // Format: OK:DEVICE=ARDUINO_UNO;FW=1.0.0;CAPS=GPIO,ADC,PWM
        const info: DeviceInfo = { type: 'UNKNOWN', firmware: '0.0.0', capabilities: [] };

        const data = response.substring(3); // Remove "OK:"
        const parts = data.split(';');

        for (const part of parts) {
            const [key, value] = part.split('=');
            switch (key) {
                case 'DEVICE': info.type = value; break;
                case 'FW': info.firmware = value; break;
                case 'CAPS': info.capabilities = value.split(','); break;
            }
        }

        return info;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Trata desconexão inesperada tentando reconectar
     */
    private handleUnexpectedDisconnect(): void {
        if (!this.autoReconnectEnabled || !this.lastPortPath) {
            this.setState('DISCONNECTED');
            return;
        }

        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            this.onError?.(`Auto-reconnect falhou após ${MAX_RECONNECT_ATTEMPTS} tentativas`);
            this.autoReconnectEnabled = false;
            this.setState('ERROR');
            return;
        }

        this.reconnectAttempts++;
        this.onData?.(`Tentando reconectar (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        this.setState('CONNECTING');

        this.reconnectTimer = setTimeout(async () => {
            try {
                // Limpa porta anterior
                this.port = null;
                this.parser = null;

                await this.connect(this.lastPortPath!, this.lastBaudRate);
                this.onData?.('Reconectado com sucesso!');
            } catch (error) {
                // Vai tentar novamente via listener de erro/close
                this.handleUnexpectedDisconnect();
            }
        }, RECONNECT_DELAY);
    }
}

// Singleton instance
export const serialManager = new SerialManager();
