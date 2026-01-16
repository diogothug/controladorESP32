const { app, BrowserWindow } = require('electron');
const path = require('path');
import { registerIpcHandlers } from './ipc-handlers';
import { TelemetryService } from './telemetry-service';

// Global Error Handlers (Telemetry)
process.on('uncaughtException', (error) => {
    TelemetryService.getInstance().trackError(error, 'MainProcess_Uncaught');
});
process.on('unhandledRejection', (reason) => {
    TelemetryService.getInstance().trackError(String(reason), 'MainProcess_UnhandledRejection');
});

// Enable hot reload in development
if (!app.isPackaged) {
    try {
        require('electron-reload')(__dirname, {
            electron: path.join(__dirname, '..', '..', 'node_modules', '.bin', 'electron'),
            awaitWriteFinish: true,
        });
    } catch (_) { }
}

let mainWindow: typeof BrowserWindow.prototype | null = null;

function createWindow(): void {
    console.log('[Backend-Main] Creating main window...');
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        minWidth: 600,
        minHeight: 500,
        backgroundColor: '#1a1a2e',
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Carrega a UI (arquivos estáticos ficam em src/)
    mainWindow.loadFile(path.join(__dirname, '../../src/renderer/index.html'));

    // Registra handlers IPC
    registerIpcHandlers(mainWindow);

    // === Web Serial API Permissions ===
    mainWindow.webContents.session.setPermissionCheckHandler((webContents: any, permission: string, requestingOrigin: string, details: any) => {
        if (permission === 'serial') {
            return true;
        }
        return false;
    });

    mainWindow.webContents.session.setDevicePermissionHandler((details: any) => {
        if (details.deviceType === 'serial') {
            return true;
        }
        return false;
    });

    mainWindow.webContents.session.on('select-serial-port', (event: any, portList: any[], webContents: any, callback: (portId: string) => void) => {
        event.preventDefault();
        // Auto-select the first available port for now.
        // In a production app, we would send this list to the renderer to show a custom picker UI.
        const selectedPort = portList.find((device: any) => {
            // Optional: Filter by specific Vendor IDs (Espressif: 0x303A, 0x10C4, 0x1A86, etc)
            return true;
        });

        if (selectedPort) {
            callback(selectedPort.portId);
        } else {
            callback(''); // Cancel
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    console.log('--- APPLICATION STARTING ---');
    console.log('Node:', process.versions.node);
    console.log('Electron:', process.versions.electron);
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
