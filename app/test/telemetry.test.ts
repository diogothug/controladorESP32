import { describe, expect, test, beforeEach, jest, afterEach } from '@jest/globals';
import { TelemetryService } from '../src/main/telemetry-service';
import { SettingsManager } from '../src/main/settings-manager';

// Mock dependencies
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn(() => '/tmp/mock-user-data'),
        getVersion: jest.fn(() => '1.0.0-test')
    },
    net: {
        online: true,
        request: jest.fn()
    }
}));

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn()
}));

jest.mock('../src/main/settings-manager');

describe('TelemetryService (Volvo Engineering Standards)', () => {
    let telemetry: TelemetryService;
    let mockNetRequest: any;

    beforeEach(() => {
        // Reset singleton
        (TelemetryService as any).instance = null;

        // Mock Settings to enable telemetry by default
        (SettingsManager.getInstance as jest.Mock).mockReturnValue({
            get: jest.fn((key) => key === 'telemetryEnabled' ? true : null)
        });

        // Mock Net Request
        mockNetRequest = {
            on: jest.fn(),
            write: jest.fn(),
            end: jest.fn()
        };
        const { net } = require('electron');
        net.online = true; // Reset global mock state
        (net.request as jest.Mock).mockReturnValue(mockNetRequest);

        telemetry = TelemetryService.getInstance();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Safety: Should truncate extremely large payloads (Crash Protection)', () => {
        const largeString = 'A'.repeat(5000);
        const hugePayload = {
            data: largeString,
            nested: {
                list: [largeString, largeString]
            }
        };

        telemetry.trackEvent('STRESS_TEST', hugePayload);

        // Access private queue for inspection
        const queue = (telemetry as any).queue;
        expect(queue.length).toBe(1);

        const event = queue[0];
        expect(event.payload.data.length).toBeLessThan(2100);
        expect(event.payload.data).toContain('[TRUNCATED]');
        expect(event.payload.nested.list[0]).toContain('[TRUNCATED]');
    });

    test('Privacy: Should silently drop events when disabled', () => {
        // Toggle settings to false
        (SettingsManager.getInstance as jest.Mock).mockReturnValue({
            get: jest.fn(() => false) // Disabled
        });

        telemetry.trackEvent('PRIVACY_TEST', { sensitivity: 'high' });

        const queue = (telemetry as any).queue;
        expect(queue.length).toBe(0);
    });

    test('Resilience: Should survive filesystem errors (Disk Failure Sim)', () => {
        const fs = require('fs');
        fs.writeFileSync.mockImplementation(() => {
            throw new Error('Disk Full / Write Protected');
        });

        // Should NOT throw exception to caller
        expect(() => {
            telemetry.trackEvent('DISK_FAIL_TEST', { important: true });
        }).not.toThrow();

        // Queue should still simplify in-memory even if disk fails
        const queue = (telemetry as any).queue;
        expect(queue.length).toBe(1);
    });

    test('Reliability: Should retry when network fails (Offline/Timeout)', () => {
        const { net } = require('electron');
        net.online = false; // Simulate offline

        telemetry.trackEvent('OFFLINE_TEST', {});

        // Force flush attempt
        (telemetry as any).flush();

        // Should not have called net.request
        expect(net.request).not.toHaveBeenCalled();

        // Queue should remain
        const queue = (telemetry as any).queue;
        expect(queue.length).toBe(1);
    });

    test('Boundary: Should auto-flush when buffer limit reached (10 events)', () => {
        for (let i = 0; i < 9; i++) {
            telemetry.trackEvent('FILL', { i });
        }

        // Queue is 9, no flush yet (mocking timer not firing)
        expect((require('electron').net.request)).not.toHaveBeenCalled();

        // 10th event triggers flush
        telemetry.trackEvent('TRIGGER', {});
        expect((require('electron').net.request)).toHaveBeenCalled();
    });
});
