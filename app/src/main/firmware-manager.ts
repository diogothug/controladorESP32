import { exec, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Paths para ferramentas
const TOOLS_DIR = path.join(__dirname, '../../tools');
const IS_WINDOWS = process.platform === 'win32';
const EXE_EXT = IS_WINDOWS ? '.exe' : '';

const ARDUINO_CLI = path.join(TOOLS_DIR, 'arduino-cli', `arduino-cli${EXE_EXT}`);

// Em dev, usa o ampy do venv. Em prod, esperaria estar no path ou empacotado.
// Melhorando robustez: tentar path relativo primeiro, fallback para global se necessário
const AMPY_CMD = path.resolve(__dirname, `../../../.venv/${IS_WINDOWS ? 'Scripts' : 'bin'}/ampy${EXE_EXT}`);

// Templates dir
const TEMPLATES_DIR = path.join(__dirname, '../../templates');

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
 * FirmwareManager - Gerencia compilação e upload de firmware
 */
export class FirmwareManager {
    private arduinoCliPath: string = ARDUINO_CLI;
    private ampyCmd: string = AMPY_CMD;

    /**
     * Verifica quais ferramentas estão disponíveis
     */
    async checkTools(): Promise<ToolStatus> {
        return {
            arduinoCli: await this.checkArduinoCli(),
            esptool: false, // Não usado por enquanto
            ampy: await this.checkAmpy()
        };
    }

    /**
     * Verifica se arduino-cli existe
     */
    private async checkArduinoCli(): Promise<boolean> {
        return new Promise((resolve) => {
            if (!fs.existsSync(this.arduinoCliPath)) {
                resolve(false);
                return;
            }

            exec(`"${this.arduinoCliPath}" version`, { timeout: 5000 }, (error) => {
                if (error) console.error('[FirmwareManager] Arduino CLI check failed:', error);
                resolve(!error);
            });
        });
    }

    /**
     * Verifica se ampy está disponível via Python
     */
    private async checkAmpy(): Promise<boolean> {
        console.log('[FirmwareManager] Checking ampy at:', this.ampyCmd);
        return new Promise((resolve) => {
            exec(`"${this.ampyCmd}" --help`, { timeout: 5000 }, (error, stdout, stderr) => {
                if (error) {
                    console.error('[FirmwareManager] ampy check failed:', error);
                    console.error('[FirmwareManager] ampy check stderr:', stderr);
                } else {
                    console.log('[FirmwareManager] ampy check success');
                }
                resolve(!error);
            });
        });
    }

    /**
     * Verifica se um executável existe e é válido
     */
    private async checkExecutable(exePath: string): Promise<boolean> {
        return new Promise((resolve) => {
            if (!fs.existsSync(exePath)) {
                resolve(false);
                return;
            }

            exec(`"${exePath}" version`, { timeout: 5000 }, (error) => {
                resolve(!error);
            });
        });
    }

    /**
     * Compila um sketch Arduino
     */
    async compileArduino(sketchPath: string, fqbn: string = 'arduino:avr:uno'): Promise<CompileResult> {
        return new Promise((resolve) => {
            const outputDir = path.join(path.dirname(sketchPath), 'build');

            const cmd = `"${this.arduinoCliPath}" compile --fqbn ${fqbn} --output-dir "${outputDir}" "${sketchPath}"`;

            exec(cmd, { timeout: 120000 }, (error, stdout, stderr) => {
                if (error) {
                    console.error('[FirmwareManager] Compile Error:', stderr || error.message);
                    resolve({
                        success: false,
                        output: stderr || error.message
                    });
                } else {
                    const hexFile = fs.readdirSync(outputDir).find(f => f.endsWith('.hex'));
                    resolve({
                        success: true,
                        output: stdout,
                        binaryPath: hexFile ? path.join(outputDir, hexFile) : undefined
                    });
                }
            });
        });
    }

    /**
     * Faz upload para Arduino
     */
    async uploadArduino(sketchPath: string, port: string, fqbn: string = 'arduino:avr:uno'): Promise<UploadResult> {
        return new Promise((resolve) => {
            const cmd = `"${this.arduinoCliPath}" upload --fqbn ${fqbn} --port ${port} "${sketchPath}"`;

            exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
                resolve({
                    success: !error,
                    output: error ? (stderr || error.message) : stdout
                });
            });
        });
    }

    /**
     * Compila e faz upload para Arduino em uma operação
     */
    async compileAndUploadArduino(sketchPath: string, port: string, fqbn: string = 'arduino:avr:uno'): Promise<UploadResult> {
        return new Promise((resolve) => {
            const cmd = `"${this.arduinoCliPath}" compile --upload --fqbn ${fqbn} --port ${port} "${sketchPath}"`;

            exec(cmd, { timeout: 180000 }, (error, stdout, stderr) => {
                resolve({
                    success: !error,
                    output: error ? (stderr || error.message) : stdout
                });
            });
        });
    }

    /**
     * Faz upload de arquivo .py para ESP32 via ampy
     */
    async uploadMicroPython(filePath: string, port: string, destPath: string = '/main.py'): Promise<UploadResult> {
        return new Promise((resolve) => {
            const cmd = `"${this.ampyCmd}" --port ${port} put "${filePath}" ${destPath}`;
            console.log('[FirmwareManager] Executing MicroPython Upload:', cmd);

            exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
                if (error) {
                    console.error('[FirmwareManager] Upload Failed:', error);
                    console.error('[FirmwareManager] Stderr:', stderr);
                } else {
                    console.log('[FirmwareManager] Upload Success:', stdout);
                }

                resolve({
                    success: !error,
                    output: error ? (stderr || error.message) : stdout || 'Upload concluído'
                });
            });
        });
    }

    /**
     * Prepara um sketch Arduino temporário e faz upload
     */
    async uploadArduinoFromContent(code: string, port: string, fqbn: string = 'arduino:avr:uno'): Promise<UploadResult> {
        return new Promise(async (resolve) => {
            const sketchName = 'arduino_sketch_' + Date.now();
            const tempDir = path.join(require('os').tmpdir(), sketchName);
            const sketchPath = path.join(tempDir, sketchName + '.ino');

            try {
                // Cria diretório e arquivo
                fs.mkdirSync(tempDir);
                fs.writeFileSync(sketchPath, code);

                // Compila e Upload
                const result = await this.compileAndUploadArduino(sketchPath, port, fqbn);

                // Limpeza (opcional, pode manter para debug se quiser)
                // fs.rmSync(tempDir, { recursive: true, force: true });

                resolve(result);
            } catch (e: any) {
                resolve({
                    success: false,
                    output: `Erro ao preparar sketch: ${e.message}`
                });
            }
        });
    }

    /**
     * Salva arquivo temporário e faz upload MicroPython
     */
    async uploadMicroPythonFromContent(code: string, port: string, destPath: string = '/main.py'): Promise<UploadResult> {
        return new Promise(async (resolve) => {
            const tempFile = path.join(require('os').tmpdir(), 'esp32_script_' + Date.now() + '.py');

            try {
                fs.writeFileSync(tempFile, code);

                const result = await this.uploadMicroPython(tempFile, port, destPath);

                // Limpeza
                try { fs.unlinkSync(tempFile); } catch { }

                resolve(result);
            } catch (e: any) {
                resolve({
                    success: false,
                    output: `Erro ao preparar arquivo: ${e.message}`
                });
            }
        });
    }

    /**
     * Reseta ESP32 via os.tmpdir
     */
    async resetESP32(port: string): Promise<UploadResult> {
        return new Promise((resolve) => {
            const cmd = `${this.ampyCmd} --port ${port} reset`;

            exec(cmd, { timeout: 10000 }, (error, stdout, stderr) => {
                resolve({
                    success: !error,
                    output: error ? (stderr || error.message) : 'Reset enviado'
                });
            });
        });
    }

    /**
     * Lista templates disponíveis
     */
    listTemplates(): FirmwareTemplate[] {
        const templates: FirmwareTemplate[] = [];

        // Arduino - Blink básico
        templates.push({
            name: 'arduino_blink',
            platform: 'arduino',
            description: 'LED Blink simples com controle serial',
            files: [{
                name: 'blink.ino',
                content: this.getArduinoBlinkTemplate()
            }]
        });

        // Arduino - Serial Control
        templates.push({
            name: 'arduino_serial_control',
            platform: 'arduino',
            description: 'Controle completo via serial (firmware padrão)',
            files: [{
                name: 'serial_control.ino',
                content: this.getArduinoSerialTemplate()
            }]
        });

        // ESP32 - MicroPython básico
        templates.push({
            name: 'esp32_basic',
            platform: 'esp32',
            description: 'ESP32 MicroPython com controle serial',
            files: [
                { name: 'main.py', content: this.getESP32MainTemplate() },
                { name: 'commands.py', content: this.getESP32CommandsTemplate() }
            ]
        });

        return templates;
    }

    /**
     * Retorna template por nome
     */
    getTemplate(name: string): FirmwareTemplate | null {
        return this.listTemplates().find(t => t.name === name) || null;
    }

    // === Template Contents ===

    private getArduinoBlinkTemplate(): string {
        return `// Blink com controle serial
const int LED_PIN = 13;
int blinkDelay = 500;

void setup() {
    Serial.begin(115200);
    pinMode(LED_PIN, OUTPUT);
    Serial.println("OK:DEVICE=ARDUINO_UNO;FW=1.0.0;CAPS=GPIO");
}

void loop() {
    if (Serial.available()) {
        String cmd = Serial.readStringUntil('\\n');
        cmd.trim();
        
        if (cmd == "SYS:HELLO") {
            Serial.println("OK:DEVICE=ARDUINO_UNO;FW=1.0.0;CAPS=GPIO");
        }
        else if (cmd.startsWith("DELAY:")) {
            blinkDelay = cmd.substring(6).toInt();
            Serial.print("OK:DELAY=");
            Serial.println(blinkDelay);
        }
    }
    
    digitalWrite(LED_PIN, HIGH);
    delay(blinkDelay);
    digitalWrite(LED_PIN, LOW);
    delay(blinkDelay);
}
`;
    }

    private getArduinoSerialTemplate(): string {
        return `// Serial Control - Firmware padrão
void setup() {
    Serial.begin(115200);
    while (!Serial);
}

void loop() {
    if (Serial.available()) {
        String line = Serial.readStringUntil('\\n');
        line.trim();
        if (line.length() == 0) return;
        
        int colonPos = line.indexOf(':');
        String cmd = colonPos > 0 ? line.substring(0, colonPos) : line;
        String params = colonPos > 0 ? line.substring(colonPos + 1) : "";
        
        executeCommand(cmd, params);
    }
}

void executeCommand(String cmd, String params) {
    if (cmd == "SYS") {
        if (params == "HELLO") {
            Serial.println("OK:DEVICE=ARDUINO_UNO;FW=1.0.0;CAPS=GPIO,ADC,PWM");
        }
        return;
    }
    
    if (cmd == "PIN") {
        int comma = params.indexOf(',');
        if (comma > 0) {
            int pin = params.substring(0, comma).toInt();
            String val = params.substring(comma + 1);
            pinMode(pin, OUTPUT);
            digitalWrite(pin, val == "HIGH" ? HIGH : LOW);
            Serial.print("OK:PIN:");
            Serial.print(pin);
            Serial.print("=");
            Serial.println(val);
        }
        return;
    }
    
    if (cmd == "READ") {
        if (params.startsWith("A")) {
            int ch = params.substring(1).toInt();
            int val = analogRead(A0 + ch);
            Serial.print("OK:READ:A");
            Serial.print(ch);
            Serial.print("=");
            Serial.println(val);
        } else {
            int pin = params.toInt();
            pinMode(pin, INPUT);
            int val = digitalRead(pin);
            Serial.print("OK:READ:");
            Serial.print(pin);
            Serial.print("=");
            Serial.println(val);
        }
        return;
    }
    
    Serial.print("ERR:UNKNOWN:");
    Serial.println(cmd);
}
`;
    }

    private getESP32MainTemplate(): string {
        return `import time
from commands import handle_command
import sys
import uselect

def check_serial():
    poll = uselect.poll()
    poll.register(sys.stdin, uselect.POLLIN)
    
    events = poll.poll(0)
    for obj, event in events:
        if event & uselect.POLLIN:
            try:
                line = sys.stdin.readline()
                if line:
                    line = line.strip()
                    if not line:
                        return
                    if ':' in line:
                        cmd, params = line.split(':', 1)
                    else:
                        cmd = line
                        params = ""
                    handle_command(cmd, params)
            except:
                pass

def main():
    print("ESP32 Ready")
    
    # Boot Blink
    try:
        from machine import Pin
        led = Pin(2, Pin.OUT)
        for _ in range(3):
            led.value(1)
            time.sleep(0.1)
            led.value(0)
            time.sleep(0.1)
    except:
        pass

    while True:
        check_serial()
        time.sleep(0.01)

if __name__ == '__main__':
    main()
`;
    }

    private getESP32CommandsTemplate(): string {
        return `from machine import Pin

def handle_command(cmd, params):
    if cmd == "SYS":
        if params == "HELLO":
            print("OK:DEVICE=ESP32;FW=1.0.0;CAPS=GPIO,WIFI,LED")
        return
    
    if cmd == "LED":
        pin = Pin(2, Pin.OUT)
        if params == "ON":
            pin.value(1)
        elif params == "OFF":
            pin.value(0)
        print(f"OK:LED:{params}")
        return
    
    if cmd == "PIN":
        parts = params.split(',')
        if len(parts) == 2:
            gpio = int(parts[0])
            val = parts[1].strip().upper()
            pin = Pin(gpio, Pin.OUT)
            pin.value(1 if val == "HIGH" else 0)
            print(f"OK:PIN:{gpio}={val}")
        return
    
    print(f"ERR:UNKNOWN:{cmd}")
`;
    }
    /**
     * Flashes ESP32 firmware binary using esptool.exe
     */
    async flashESP32(firmwareBuffer: Buffer, port: string): Promise<UploadResult> {
        return new Promise(async (resolve) => {
            const esptoolPath = path.join(__dirname, '../../../.venv/Scripts/esptool.exe');
            if (!fs.existsSync(esptoolPath)) {
                return resolve({ success: false, output: 'esptool.exe not found in .venv/Scripts' });
            }

            const tempFile = path.join(require('os').tmpdir(), 'esp32_fw_' + Date.now() + '.bin');

            try {
                fs.writeFileSync(tempFile, firmwareBuffer);

                // esptool.exe --port COMx write_flash -z 0x1000 firmware.bin
                const cmd = `"${esptoolPath}" --port ${port} --baud 460800 write_flash -z 0x1000 "${tempFile}"`;
                console.log('[FirmwareManager] Executing Flash:', cmd);

                exec(cmd, { timeout: 120000 }, (error, stdout, stderr) => {
                    // Cleanup
                    try { fs.unlinkSync(tempFile); } catch { }

                    if (error) {
                        console.error('[FirmwareManager] Flash Failed:', error);
                        console.error('[FirmwareManager] Stderr:', stderr);
                    } else {
                        console.log('[FirmwareManager] Flash Success');
                    }

                    resolve({
                        success: !error,
                        output: error ? (stderr + "\n" + stdout) : stdout
                    });
                });
            } catch (e: any) {
                try { fs.unlinkSync(tempFile); } catch { }
                resolve({
                    success: false,
                    output: `Error preparing flash: ${e.message}`
                });
            }
        });
    }
    /**
     * Downloads and flashes firmware from a URL
     */
    async flashESP32FromUrl(url: string, port: string): Promise<UploadResult> {
        return new Promise(async (resolve) => {
            console.log(`[FirmwareManager] Downloading firmware from: ${url}`);
            const tempFile = path.join(require('os').tmpdir(), 'esp32_dl_' + Date.now() + '.bin');

            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Download failed: ${response.statusText}`);
                }

                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                fs.writeFileSync(tempFile, buffer);
                console.log(`[FirmwareManager] Downloaded ${buffer.length} bytes`);

                // Reuse existing flash logic via manual call or just re-implement command
                // Re-implementing command to refer to the file on disk directly
                const esptoolPath = path.join(__dirname, '../../../.venv/Scripts/esptool.exe');
                if (!fs.existsSync(esptoolPath)) {
                    try { fs.unlinkSync(tempFile); } catch { }
                    return resolve({ success: false, output: 'esptool.exe not found' });
                }

                const cmd = `"${esptoolPath}" --port ${port} --baud 460800 write_flash -z 0x1000 "${tempFile}"`;
                console.log('[FirmwareManager] Executing Flash:', cmd);

                exec(cmd, { timeout: 120000 }, (error, stdout, stderr) => {
                    try { fs.unlinkSync(tempFile); } catch { }

                    if (error) {
                        console.error('[FirmwareManager] Flash Failed:', error);
                        resolve({ success: false, output: stderr || error.message });
                    } else {
                        console.log('[FirmwareManager] Flash Success');
                        resolve({ success: true, output: stdout });
                    }
                });

            } catch (e: any) {
                try { fs.unlinkSync(tempFile); } catch { }
                console.error('[FirmwareManager] Download/Flash Error:', e);
                resolve({
                    success: false,
                    output: `Error: ${e.message}`
                });
            }
        });
    }
}

// Singleton
export const firmwareManager = new FirmwareManager();
