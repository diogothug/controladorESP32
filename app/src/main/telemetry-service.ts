
import { net } from 'electron';

export interface TelemetryEvent {
    type: 'ERROR' | 'USAGE' | 'FEEDBACK';
    payload: any;
    timestamp: number;
}

export class TelemetryService {
    private static instance: TelemetryService;
    private queue: TelemetryEvent[] = [];
    private API_URL = 'https://api.diogo-project.internal/v1/telemetry'; // Placeholder
    private FLUSH_INTERVAL = 60000; // 1 min

    private constructor() {
        this.startFlushLoop();
    }

    public static getInstance(): TelemetryService {
        if (!TelemetryService.instance) {
            TelemetryService.instance = new TelemetryService();
        }
        return TelemetryService.instance;
    }

    public trackError(error: Error | string, context: string = 'General') {
        const msg = error instanceof Error ? error.message : error;
        const stack = error instanceof Error ? error.stack : '';

        console.error(`[Telemetry] Captured Error: ${msg}`);
        this.enqueue({
            type: 'ERROR',
            timestamp: Date.now(),
            payload: { message: msg, stack, context }
        });
    }

    public trackUsage(action: string, details?: any) {
        this.enqueue({
            type: 'USAGE',
            timestamp: Date.now(),
            payload: { action, details }
        });
    }

    public trackFeedback(name: string, message: string) {
        console.log(`[Telemetry] Feedback Received from ${name}`);
        this.enqueue({
            type: 'FEEDBACK',
            timestamp: Date.now(),
            payload: { name, message }
        });
    }

    private enqueue(event: TelemetryEvent) {
        this.queue.push(event);
        if (this.queue.length >= 10) {
            this.flush(); // Force flush if buffer gets full
        }
    }

    private startFlushLoop() {
        setInterval(() => this.flush(), this.FLUSH_INTERVAL);
    }

    private async flush() {
        if (this.queue.length === 0) return;
        if (!net.online) {
            console.log('[Telemetry] Offline. Skipping flush.');
            return;
        }

        const batch = [...this.queue];
        // Optimistic clear to avoid blocking, normally would wait for success
        // But for "silent" simple telemetry, simpler is better.
        // We will clear ONLY if send succeeds? Or retry?
        // Let's try sending.

        console.log(`[Telemetry] Flushing ${batch.length} events to ${this.API_URL}...`);

        const request = net.request({
            method: 'POST',
            url: this.API_URL,
            headers: { 'Content-Type': 'application/json' }
        });

        request.on('response', (response) => {
            if (response.statusCode >= 200 && response.statusCode < 300) {
                // Success: Remove sent items
                // This naive approach removes everything pending up to the batch point
                // Assuming standard FIFO
                this.queue = this.queue.filter(x => !batch.includes(x));
                console.log('[Telemetry] Batch sent successfully.');
            } else {
                console.warn(`[Telemetry] Failed to send. Status: ${response.statusCode}`);
            }
        });

        request.on('error', (err) => {
            console.warn('[Telemetry] Network error:', err.message);
            // Keep in queue for next try
        });

        request.write(JSON.stringify({ events: batch }));
        request.end();
    }
}
