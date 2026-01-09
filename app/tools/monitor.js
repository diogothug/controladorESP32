const { SerialPort } = require('serialport');

const PORT = 'COM5';
const BAUD = 115200;

console.log(`Watching ${PORT}... Press RESET on the board now!`);

const port = new SerialPort({ path: PORT, baudRate: BAUD });

port.on('data', (data) => {
    process.stdout.write(data.toString());
});

port.on('error', (err) => {
    console.error('Error:', err.message);
});

// Run for 15 seconds then exit
setTimeout(() => {
    console.log('\n--- Monitor Timeout ---');
    process.exit(0);
}, 15000);
