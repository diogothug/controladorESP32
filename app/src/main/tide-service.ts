/**
 * Tide Service - API client for Tábua de Marés
 * Provides real-time tide data from Brazilian coastal ports
 * API Documentation: https://tabuamare.devtu.qzz.io/docs
 */

import https from 'https';
import http from 'http';

const BASE_URL = 'https://tabuamare.devtu.qzz.io/api/v1';

// Cache for API responses (30 min TTL)
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const cache: Map<string, CacheEntry<unknown>> = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export interface Harbor {
    id: number;
    name: string;
    state?: string;
    lat?: number;
    lng?: number;
}

export interface TideEntry {
    time: string;      // "HH:MM"
    height: number;    // meters
    type: 'high' | 'low';
}

export interface TideData {
    harbor: Harbor;
    date: string;
    entries: TideEntry[];
    currentLevel?: number;  // Interpolated current level (0-100%)
    direction?: 'rising' | 'falling';
    nextChange?: TideEntry;
}

function httpGet<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        protocol.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.success === false) {
                        reject(new Error(json.error || 'API error'));
                    } else {
                        resolve(json.data || json);
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${e}`));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
        return entry.data as T;
    }
    cache.delete(key);
    return null;
}

function setCache<T>(key: string, data: T): void {
    cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Get list of all coastal states
 */
export async function getStates(): Promise<string[]> {
    const cacheKey = 'states';
    const cached = getCached<string[]>(cacheKey);
    if (cached) return cached;

    const result = await httpGet<string[]>(`${BASE_URL}/states`);
    setCache(cacheKey, result);
    return result;
}

/**
 * Get list of harbors for a state
 */
export async function getHarbors(state: string): Promise<Harbor[]> {
    const cacheKey = `harbors_${state}`;
    const cached = getCached<Harbor[]>(cacheKey);
    if (cached) return cached;

    const url = `${BASE_URL}/harbor_names/${state.toLowerCase()}`;
    console.log('Fetching harbors from:', url);

    const rawResult = await httpGet<any>(url);
    console.log('Raw harbor result:', JSON.stringify(rawResult));

    // API returns array with harbor_name field, not name
    const harbors: Harbor[] = (Array.isArray(rawResult) ? rawResult : []).map((h: any) => ({
        id: h.id,
        name: h.harbor_name || h.name || `Porto ${h.id}`,
        state: state
    }));

    console.log('Parsed harbors:', harbors);
    setCache(cacheKey, harbors);
    return harbors;
}

/**
 * Get harbor details by ID
 */
export async function getHarborById(id: number): Promise<Harbor> {
    const cacheKey = `harbor_${id}`;
    const cached = getCached<Harbor>(cacheKey);
    if (cached) return cached;

    const result = await httpGet<Harbor[]>(`${BASE_URL}/harbor/${id}`);
    const harbor = Array.isArray(result) ? result[0] : result;
    setCache(cacheKey, harbor);
    return harbor;
}

/**
 * Get tide table data for a specific harbor and date range
 */
export async function getTideTable(
    harborId: number,
    month: number,
    days: number[]
): Promise<TideEntry[][]> {
    const daysStr = `[${days.join(',')}]`;
    const cacheKey = `tide_${harborId}_${month}_${daysStr}`;
    const cached = getCached<TideEntry[][]>(cacheKey);
    if (cached) return cached;

    const url = `${BASE_URL}/tabua-mare/${harborId}/${month}/${daysStr}`;
    const result = await httpGet<TideEntry[][]>(url);
    setCache(cacheKey, result);
    return result;
}

/**
 * Get current tide data with interpolated level
 */
export async function getCurrentTideData(harborId: number): Promise<TideData | null> {
    try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

        const harbor = await getHarborById(harborId);
        const tideTable = await getTideTable(harborId, month, [day]);

        if (!tideTable || tideTable.length === 0) {
            return null;
        }

        const entries: TideEntry[] = tideTable.flat().map((entry: any) => ({
            time: entry.hora || entry.time,
            height: parseFloat(entry.altura || entry.height),
            type: (entry.tipo === 'alta' || entry.type === 'high') ? 'high' : 'low'
        }));

        // Sort entries by time
        entries.sort((a, b) => {
            const [aH, aM] = a.time.split(':').map(Number);
            const [bH, bM] = b.time.split(':').map(Number);
            return (aH * 60 + aM) - (bH * 60 + bM);
        });

        // Find current level by interpolation
        let prevEntry: TideEntry | null = null;
        let nextEntry: TideEntry | null = null;

        for (const entry of entries) {
            const [h, m] = entry.time.split(':').map(Number);
            const entryTime = h * 60 + m;

            if (entryTime <= currentTime) {
                prevEntry = entry;
            } else if (!nextEntry) {
                nextEntry = entry;
            }
        }

        // Calculate interpolated level (0-100%)
        let currentLevel = 50;
        let direction: 'rising' | 'falling' = 'rising';

        if (prevEntry && nextEntry) {
            const [pH, pM] = prevEntry.time.split(':').map(Number);
            const [nH, nM] = nextEntry.time.split(':').map(Number);
            const prevTime = pH * 60 + pM;
            const nextTime = nH * 60 + nM;

            const progress = (currentTime - prevTime) / (nextTime - prevTime);
            const levelDiff = nextEntry.height - prevEntry.height;
            const currentHeight = prevEntry.height + levelDiff * progress;

            // Normalize to 0-100 based on typical tide range (0-2m)
            currentLevel = Math.min(100, Math.max(0, (currentHeight / 2) * 100));
            direction = levelDiff > 0 ? 'rising' : 'falling';
        }

        return {
            harbor,
            date: now.toISOString().split('T')[0],
            entries,
            currentLevel,
            direction,
            nextChange: nextEntry || undefined
        };
    } catch (error) {
        console.error('Failed to get tide data:', error);
        return null;
    }
}

export const tideService = {
    getStates,
    getHarbors,
    getHarborById,
    getTideTable,
    getCurrentTideData
};
