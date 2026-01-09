const { SerialPort } = require('serialport');

async function listPorts() {
    try {
        const ports = await SerialPort.list();
        console.log('Available Serial Ports:');
        ports.forEach(port => {
            console.log(`- ${port.path} (Manufacturer: ${port.manufacturer}, Vendor: ${port.vendorId}, Product: ${port.productId})`);
        });
    } catch (err) {
        console.error('Error listing ports:', err);
    }
}

listPorts();
