const { app } = require('electron');
const { SerialPort } = require('serialport');

app.whenReady().then(async () => {
    console.log('--- Electron Serial Detection Test (Verbose) ---');
    console.log(`Electron Version: ${process.versions.electron}`);
    console.log(`Node Version: ${process.versions.node}`);
    console.log(`Arch: ${process.arch}`);

    try {
        console.log('SerialPort object:', typeof SerialPort);
        if (SerialPort) {
            console.log('SerialPort path:', SerialPort.path);
        }

        console.log('Listing ports...');
        const ports = await SerialPort.list();
        console.log(`Found ${ports.length} ports:`);
        ports.forEach(p => {
            console.log(`- ${p.path} (${p.manufacturer})`);
        });
    } catch (err) {
        console.error('FATAL ERROR listing ports in Electron:');
        console.error(err);
    }
    app.quit();
});
