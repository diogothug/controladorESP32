import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export interface Settings {
    telemetryEnabled: boolean;
    theme: 'dark' | 'light';
    lastPort: string;
    windowBounds?: { width: number; height: number; x: number; y: number };
}

const DEFAULT_SETTINGS: Settings = {
    telemetryEnabled: true, // Default to true (Opt-out model), or false for strict GDPR
    theme: 'dark',
    lastPort: ''
};

export class SettingsManager {
    private static instance: SettingsManager;
    private configPath: string;
    private settings: Settings;

    private constructor() {
        this.configPath = path.join(app.getPath('userData'), 'config.json');
        this.settings = this.load();
    }

    public static getInstance(): SettingsManager {
        if (!SettingsManager.instance) {
            SettingsManager.instance = new SettingsManager();
        }
        return SettingsManager.instance;
    }

    private load(): Settings {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf-8');
                return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
            }
        } catch (error) {
            console.error('[Settings] Failed to load config:', error);
        }
        return { ...DEFAULT_SETTINGS };
    }

    public save() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.settings, null, 2));
        } catch (error) {
            console.error('[Settings] Failed to save config:', error);
        }
    }

    public get<K extends keyof Settings>(key: K): Settings[K] {
        return this.settings[key];
    }

    public set<K extends keyof Settings>(key: K, value: Settings[K]) {
        this.settings[key] = value;
        this.save();
    }

    public getAll(): Settings {
        return { ...this.settings };
    }
}
