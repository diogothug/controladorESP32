
import { net, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { SettingsManager } from './settings-manager';

export interface TelemetryEvent {
    type: 'ERROR' | 'USAGE' | 'FEEDBACK' | string;
    payload: any;
    timestamp: number;
    meta?: {
        appVersion: string;
        os: string;
    };
}

export class TelemetryService {
    private static instance: TelemetryService;
    private queue: TelemetryEvent[] = [];
    private queuePath: string;
    private API_URL = 'https://api.diogo-project.internal/v1/telemetry'; // Placeholder
    private FLUSH_INTERVAL = 60000; // 1 min (base)
    private flushTimer: NodeJS.Timeout | null = null;

    // Backoff state
    private retryCount = 0;
    private isFlushing = false;

    private constructor() {
        this.queuePath = path.join(app.getPath('userData'), 'telemetry-queue.json');
        this.loadQueue();
        this.startFlushLoop();
    }

    public static getInstance(): TelemetryService {
        if (!TelemetryService.instance) {
            TelemetryService.instance = new TelemetryService();
        }
        return TelemetryService.instance;
    }

    private loadQueue() {
        try {
            if (fs.existsSync(this.queuePath)) {
                const data = fs.readFileSync(this.queuePath, 'utf-8');
                this.queue = JSON.parse(data);
                if (this.queue.length > 0) {
                    console.log(`[Telemetry] Restored ${this.queue.length} events from disk.`);
                }
            }
        } catch (e) {
            console.error('[Telemetry] Failed to load queue:', e);
            this.queue = [];
        }
    }

    private saveQueue() {
        try {
            fs.writeFileSync(this.queuePath, JSON.stringify(this.queue));
        } catch (e) {
            console.error('[Telemetry] Failed to save queue:', e);
        }
    }

    public trackError(error: Error | string, context: string = 'General') {
        const msg = error instanceof Error ? error.message : error;
        const stack = error instanceof Error ? error.stack : '';
        console.error(`[Telemetry] Captured Error: ${msg}`);
        this.enqueue({ type: 'ERROR', payload: { message: msg, stack, context }, timestamp: Date.now() });
    }

    public trackUsage(action: string, details?: any) {
        this.enqueue({ type: 'USAGE', payload: { action, details }, timestamp: Date.now() });
    }

    public trackFeedback(name: string, message: string) {
        console.log(`[Telemetry] Feedback Received from ${name}`);
        this.enqueue({ type: 'FEEDBACK', payload: { name, message }, timestamp: Date.now() });
    }

    public trackEvent(type: string, payload: any) {
        // Map string type to specific enum-like types or allow usage of generic types if updated
        // For now, casting type to any to satisfy the strict union if needed, or update interface
        this.enqueue({ type: type as any, payload, timestamp: Date.now() });
    }

    private enqueue(event: Omit<TelemetryEvent, 'meta'>) {
        // Privacy Check
        if (!SettingsManager.getInstance().get('telemetryEnabled')) {
            return; // Drop event if telemetry is disabled
        }

        // Truncate large payloads (Protection against huge log dumps)
        const safePayload = this.truncatePayload(event.payload);

        const fullEvent: TelemetryEvent = {
            ...event,
            payload: safePayload,
            meta: {
                appVersion: app.getVersion(),
                os: process.platform
            }
        };

        this.queue.push(fullEvent);
        this.saveQueue(); // Persist immediately for robustness

        if (this.queue.length >= 10) {
            this.flush(); // Force flush if buffer gets full
        }
    }

    private truncatePayload(obj: any): any {
        const MAX_STR_LEN = 2048;
        if (typeof obj === 'string') {
            if (obj.length > MAX_STR_LEN) {
                return obj.substring(0, MAX_STR_LEN) + '... [TRUNCATED]';
            }
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.truncatePayload(item));
        }
        if (typeof obj === 'object' && obj !== null) {
            const res: any = {};
            for (const key in obj) {
                res[key] = this.truncatePayload(obj[key]);
            }
            return res;
        }
        return obj;
    }

    private startFlushLoop() {
        if (this.flushTimer) clearInterval(this.flushTimer);
        this.flushTimer = setInterval(() => this.flush(), this.FLUSH_INTERVAL);
    }

    private async flush() {
        if (this.queue.length === 0 || this.isFlushing) return;

        // Privacy Check (Double check before send)
        if (!SettingsManager.getInstance().get('telemetryEnabled')) {
            this.queue = []; // Clear queue if disabled
            this.saveQueue();
            return;
        }

        if (!net.online) {
            return; // Silent fail, wait for next loop
        }

        this.isFlushing = true;
        const batch = [...this.queue];

        console.log(`[Telemetry] Flushing ${batch.length} events used retry=${this.retryCount}...`);

        const request = net.request({
            method: 'POST',
            url: this.API_URL,
            headers: { 'Content-Type': 'application/json' }
        });

        request.on('response', (response) => {
            this.isFlushing = false;
            if (response.statusCode >= 200 && response.statusCode < 300) {
                // Success
                this.queue = this.queue.filter(x => !batch.includes(x)); // Remove sent items
                this.saveQueue();
                this.retryCount = 0; // Reset backoff
                console.log('[Telemetry] Batch sent successfully.');
            } else {
                // Server Error
                console.warn(`[Telemetry] Server Error: ${response.statusCode}`);
                this.handleSendError();
            }
        });

        request.on('error', (err) => {
            this.isFlushing = false;
            console.warn('[Telemetry] Network Error:', err.message);
            this.handleSendError();
        });

        request.write(JSON.stringify({ events: batch }));
        request.end();
    }

    private handleSendError() {
        // Exponential Backoff
        this.retryCount++;
        const backoffMs = Math.min(this.FLUSH_INTERVAL * Math.pow(2, this.retryCount), 3600000); // UDP to 1h
        console.log(`[Telemetry] Backing off. Next retry in ${backoffMs / 1000}s`);

        if (this.flushTimer) clearInterval(this.flushTimer);
        this.flushTimer = setInterval(() => this.flush(), backoffMs);
    }
}
