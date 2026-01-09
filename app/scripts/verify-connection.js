const { SerialPort } = require('serialport');

const TARGET_PORT = 'COM5';
const BAUD_RATE = 115200;

async function runVerification() {
    console.log('--- Serial Diagnostic Tool (ESP32 Retry) ---');
    console.log(`Target: ${TARGET_PORT} @ ${BAUD_RATE}`);

    const port = new SerialPort({
        path: TARGET_PORT,
        baudRate: BAUD_RATE,
        autoOpen: false
    });

    port.on('data', (data) => {
        const s = data.toString();
        console.log(`[RX] ${JSON.stringify(s)}`);
        if (s.includes('OK:DEVICE=ESP32')) {
            console.log('\n[SUCCESS] Handshake verified!');
            process.exit(0);
        }
    });

    port.on('error', (err) => {
        console.error(`[ERROR] ${err.message}`);
        process.exit(1);
    });

    try {
        await new Promise((resolve, reject) => {
            port.open((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log('[PASS] Connected');

        // Toggle DTR/RTS to force reset/wakeup
        port.set({ dtr: false, rts: true });
        await new Promise(r => setTimeout(r, 100));
        port.set({ dtr: false, rts: false });

        console.log('Waiting for boot...');
        await new Promise(r => setTimeout(r, 2000));

        for (let i = 0; i < 3; i++) {
            console.log(`[TX] SYS:HELLO (${i + 1}/3)`);
            port.write('SYS:HELLO\n');
            await new Promise(r => setTimeout(r, 2000));
        }

        console.log('[FINISH] No handshake received after retries.');
        process.exit(1);

    } catch (err) {
        console.error('[FATAL]', err);
        process.exit(1);
    }
}

runVerification();
