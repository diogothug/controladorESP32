
/**
 * Premium Tide Animation Engine
 * "Instrument, not Toy"
 */


// -- interfaces are just type hints, no runtime code --
interface TideVisualConfig {
    brightnessMax: number;
    smoothTau: number;
    trendDeadband: number;
    glowFeather: number;
    baseColor: { r: number, g: number, b: number };
    riseColor: { r: number, g: number, b: number };
    fallColor: { r: number, g: number, b: number };
}

interface TideInput {
    level: number;
    trend: number;
    confidence: number;
    hasWifi: boolean;
}

interface Pixel {
    r: number; g: number; b: number;
}

class TideVisuals {
    private config: TideVisualConfig;

    // Physics State
    private currentLevel: number = 0.5;
    private currentTrend: number = 0;

    // Animation State
    private time: number = 0;
    private breathPhase: number = 0;
    private ambientPhase: number = 0;

    constructor(config?: Partial<TideVisualConfig>) {
        this.config = {
            brightnessMax: 255, // 0.35 * 255 ~ 90 usually, but let's allow full dynamic range logic to scale it
            smoothTau: 0.1,
            trendDeadband: 0.05,
            glowFeather: 1.5,
            baseColor: { r: 200, g: 220, b: 255 }, // Cold White/Blueish
            riseColor: { r: 180, g: 210, b: 255 }, // More Blue
            fallColor: { r: 220, g: 220, b: 210 }, // Warm/Neutral
            ...config
        };
    }

    public update(dt: number, input: TideInput) {
        this.time += dt;

        // 1. Physics: Level Smoothing (Low Pass)
        // Simple distinct exponential smoothing
        const alpha = 1.0 - Math.exp(-dt / this.config.smoothTau);
        this.currentLevel += (input.level - this.currentLevel) * alpha;

        // 2. Physics: Trend Hysteresis & Smoothing
        let targetTrend = input.trend;
        if (Math.abs(targetTrend) < this.config.trendDeadband) targetTrend = 0;
        this.currentTrend += (targetTrend - this.currentTrend) * alpha;

        // 3. Animation Phases
        // Breathing: 4-8s period -> ~0.15 Hz
        this.breathPhase += dt * 0.15 * Math.PI * 2;

        // Ambient Drift: Very slow
        this.ambientPhase += dt * 0.05;
    }

    public render(count: number, width: number, height: number): Pixel[] {
        const pixels: Pixel[] = new Array(count).fill({ r: 0, g: 0, b: 0 });

        // Determine Palette based on Trend
        // Crossfade colors
        let mainColor = this.config.baseColor;
        if (this.currentTrend > 0.1) mainColor = this.config.riseColor;
        if (this.currentTrend < -0.1) mainColor = this.config.fallColor;

        // Render Column (Vertical Strips assumption)
        // x_norm = x / (W-1), y_norm = y / (H-1)

        for (let i = 0; i < count; i++) {
            // Map index to x,y
            let x = 0, y = 0;
            if (width > 1) {
                // Matrix
                const col = i % width;
                const row = Math.floor(i / width);
                // Assume standar zigzag or linear? User said "Vertical Strips".
                // Usually matrices are laid out index 0 bottom-left or top-left.
                // User said "Orientation: Top = H-1". Let's assume index structure matches WxH linear for simplicity first.
                // We will rely on mapped x/y.
                x = col;
                y = row; // 0 at bottom? User said "top = H-1" implies standard cartesian 0 at bottom?
                // Actually usually LED matrices update 0 at top-left.
                // Let's assume standard row-major (y=0 top).
                // User: "Topo = linha H-1". This means y increases upwards? Or index increases upwards?
                // Let's assume we want to draw from "Bottom" to "Top".
                // If y=0 is bottom, then standard cartesian. 
                // Let's implement generic x,y assuming linear strip mapping for now:
                // If 1D strip (W=1):
                if (width === 1) {
                    x = 0; y = i;
                }
            } else {
                x = 0; y = i;
            }

            // Normalization
            const y_norm = y / (height - 1 || 1);
            // If "Top = H-1", then y=0 is bottom.

            // --- Layer A: Level Column ---
            // Bar height in normalized space [0..1]
            const barHeight = this.currentLevel;

            // Anti-aliasing logic
            // brightness = 1.0 if y < barHeight (full)
            // brightness = fraction if y == boundary
            // Feather above

            let brightness = 0;
            const dist = y_norm - barHeight;

            // Basic AA for top edge
            // We need to map y_norm back to "pixel units" relative to bar height for precise feather
            // Distance in pixels = dist * (H-1)
            const distPx = dist * (height - 1);

            if (distPx < 0) {
                // Below top
                brightness = 1.0;
                // Add soft roll-off near bottom? No, solid.
            } else if (distPx < this.config.glowFeather) {
                // Feather zone
                // Smoothstep or linear falloff
                brightness = 1.0 - (distPx / this.config.glowFeather);
                brightness = Math.max(0, brightness * brightness); // Quadratic falloff (softer)
            } else {
                brightness = 0;
            }

            // --- Layer B: Trend Indicator ---
            // Adds a "breath" near the top
            const breath = (Math.sin(this.breathPhase) * 0.5 + 0.5); // 0..1

            // Only visible near the top of the bar?
            // "Filete 1px ou grão que respira perto do topo"
            // If we are close to the top edge (within +/- 2px)
            const isNearTop = Math.abs(distPx) < 2.0;

            let trendBright = 0;
            if (isNearTop) {
                // Enhance brightness based on trend and breath
                const trendMag = Math.abs(this.currentTrend);
                trendBright = breath * 0.2 + (trendMag * 0.3);
            }

            // --- Layer C: Ambient (Noise) ---
            // Very low intensity noise
            const noise = (Math.sin(this.ambientPhase + x * 0.5) * 0.5 + 0.5) * 0.05;

            // Composition
            let totalBright = brightness + trendBright + noise;
            totalBright = Math.min(1.0, totalBright); // Clamp

            // Apply Master Brightness
            totalBright *= (this.config.brightnessMax / 255);

            // Output Color
            pixels[i] = {
                r: Math.floor(mainColor.r * totalBright),
                g: Math.floor(mainColor.g * totalBright),
                b: Math.floor(mainColor.b * totalBright)
            };
        }

        return pixels;
    }
}

// Expose to Window (Browser)
if (typeof window !== 'undefined') {
    (window as any).TideVisuals = TideVisuals;
}

// Expose to Module (Node/Test)
if (typeof module !== 'undefined') {
    module.exports = { TideVisuals };
}
