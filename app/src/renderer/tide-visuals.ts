
/**
 * Premium Tide Animation Engine V2
 * "Instrument, not Toy"
 * 
 * Implements:
 * - Global Breathing (90s period)
 * - Micro-Flicker / Refraction (12s period)
 * - Thermal Color Shift (Trend based)
 * - Waterline Gradient with Softness
 */

interface TideVisualConfig {
    // Limits
    brightnessMin: number; // 0.12 (12%)
    brightnessMax: number; // 0.28 (28%)

    // Breathing
    breathPeriod: number; // 90s

    // Wave/Flicker
    microWavePeriod: number; // 12s base
    microWaveAmp: number; // 0.02 (2%)

    // Physics
    levelHalfLife: number; // 25s
    waterlineSoftness: number; // 2.0 px

    // Colors
    highTideColor: { r: number, g: number, b: number }; // #0A3D62 -> #3CBEF0 (Target Gradient?) Let's use the brighter one as base target
    lowTideColor: { r: number, g: number, b: number }; // #A08F5A -> #E6D7A3 (Target Gradient?)

    // Trend
    trendTintStrength: number;
}

interface TideInput {
    level: number; // 0..1
    trend: number; // -1..1 (approx)
    confidence: number;
    hasWifi: boolean;
}

interface Pixel {
    r: number; g: number; b: number;
}

// Helpers
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function clamp(x: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, x));
}

function smoothstep(x: number): number {
    const t = clamp(x, 0, 1);
    return t * t * (3 - 2 * t);
}

function colorLerp(c1: { r: number, g: number, b: number }, c2: { r: number, g: number, b: number }, t: number) {
    return {
        r: lerp(c1.r, c2.r, t),
        g: lerp(c1.g, c2.g, t),
        b: lerp(c1.b, c2.b, t)
    };
}

class TideVisuals {
    private config: TideVisualConfig;

    // State
    private currentLevel: number = 0.5;
    private currentTrend: number = 0;

    private time: number = 0; // seconds

    // Micro-wave state per segment (simplified as global visual jitter for now, or per-pixel procedural)
    // We will use procedural noise based on time + y position for "refraction"

    constructor(config?: Partial<TideVisualConfig>) {
        this.config = {
            brightnessMin: 0.12,
            brightnessMax: 0.28,
            breathPeriod: 90.0,
            microWavePeriod: 12.0,
            microWaveAmp: 0.02,
            levelHalfLife: 25.0,
            waterlineSoftness: 2.0,
            // Deep Blue / Cyan range. Let's pick a midpoint or the "High" target
            highTideColor: { r: 60, g: 190, b: 240 }, // #3CBEF0 approx
            lowTideColor: { r: 230, g: 215, b: 163 }, // #E6D7A3 approx
            trendTintStrength: 0.05,
            ...config
        };
    }

    public update(dt: number, input: TideInput) {
        this.time += dt;

        // 1. Physics: Level Smoothing (Half-life 25s)
        // decay_rate lambda = ln(2) / half_life
        // alpha = 1 - exp(-lambda * dt)
        const lambda = Math.log(2) / this.config.levelHalfLife;
        const alpha = 1.0 - Math.exp(-lambda * dt);

        this.currentLevel += (input.level - this.currentLevel) * alpha;

        // Trend smoothing (faster than level, say 5s half-life)
        const trendAlpha = 1.0 - Math.exp(-(Math.log(2) / 5.0) * dt);
        this.currentTrend += (input.trend - this.currentTrend) * trendAlpha;
    }

    public render(count: number, width: number, height: number): Pixel[] {
        const pixels: Pixel[] = new Array(count);

        // 1. Global Breathing
        // Formula: breath = 0.5 + 0.5 * sin(2pi * t / 90s)
        // Easing: smoothstep(breath)
        const tBreath = (Math.PI * 2 * this.time) / this.config.breathPeriod;
        let breathRaw = 0.5 + 0.5 * Math.sin(tBreath);
        const breathFactor = smoothstep(breathRaw);

        // Base Global Brightness
        const globalBrightness = lerp(this.config.brightnessMin, this.config.brightnessMax, breathFactor);

        // 2. Micro-Wave (Global Jitter/Refraction)
        // Base 12s, we can add some randomness or just sin wave for now
        // To simulate jitter, we can combine two waves
        const tWave = this.time / this.config.microWavePeriod;
        const wave = Math.sin(tWave * Math.PI * 2) + 0.5 * Math.sin(tWave * 3.0);
        const microMultiplier = 1.0 + (wave * this.config.microWaveAmp); // 1.0 +/- Amp

        // 3. Waterline Calculation
        // waterline (px) = level * (H - 1)
        const waterlinePx = this.currentLevel * (height - 1 || 1);

        // 4. Trend Color Shift
        // Base Color Gradient: Low -> High based on Level? 
        // Or LowTideColor IS the color when tide is low?
        // User says: "Base colors: Alta... Baixa..." implies the fluid changes color based on its state?
        // Or vertical gradient? "Distribuição do gradiente... color = lerp(low, high, 1-t)"
        // This suggests vertical gradient: Bottom is LowColor, Top is HighColor.
        // Let's stick to the user formula for vertical gradient.

        // Trend Tint
        // Rising (+trend) -> Cyan/Blue shift
        // Falling (-trend) -> Amber/Gold shift
        let trendTint = { r: 0, g: 0, b: 0 };
        if (this.currentTrend > 0) {
            trendTint = { r: 0, g: 50, b: 100 }; // Cyan/Blue hint
        } else {
            trendTint = { r: 100, g: 70, b: 0 }; // Amber hint
        }
        const trendStrength = Math.min(1.0, Math.abs(this.currentTrend) * 5.0) * this.config.trendTintStrength; // Scale trend effect

        for (let i = 0; i < count; i++) {
            // Coordinate Mapping (Assumption: Vertical Matrix or Strip)
            let y = 0;
            if (width > 1) {
                // Matrix (assuming linear row-major or similar, simplificaton: map index to y)
                // If "Top = H-1", and assuming standard index order 0..count-1
                const row = Math.floor(i / width);
                y = row;
            } else {
                // Strip
                y = i;
            }

            // 5. Vertical Gradient & Waterline
            // t = clamp((y - waterline) / softness, 0..1)
            // if y is far below waterline, y-waterline is negative -> t=0
            // if y is far above waterline, y-waterline is positive large -> t=1
            // User formula: color = lerp(low, high, 1-t)
            // So t=0 (deep below) -> color = high? Wait.
            // If y << waterline (submerged), t=0. 1-t=1. Color = High.
            // If y >> waterline (air), t=1. 1-t=0. Color = Low.
            // Usually "High Tide Color" implies the color of the WATER.
            // "Low Tide Color" implies the color of the SAND/BOTTOM?
            // User: "Alta: #0A3D62... Baixa: #A08F5A". Yes, Blue vs Sand.
            // So Submerged (t=0) should be predominantly Blue (High Color)??
            // Wait, if tide is low, we see sand. If tide is high, we see water.
            // But this is a single column representing the CURRENT level.
            // Maybe the gradient represents the depth?
            // "Para cada pixel y ... color = lerp(low, high, 1-t)"
            // let's follow the formula blindly first.
            const tRaw = clamp((y - waterlinePx) / this.config.waterlineSoftness, 0, 1);
            const t = smoothstep(tRaw);

            // Wait, we need to mask the "Air" pixels (above waterline).
            // Usually a VU meter style.
            // The user formula seems to describe the COLOR of the lit pixels, 
            // OR it describes the opacity mask?
            // User: "Para cada pixel y... color = lerp...". This defines color.
            // But we also need Opacity/Brightness of the bar itself.
            // Usually: 
            //   Below waterline: Lit
            //   Above waterline: Dark (or very dim)

            // Masking (Soft Edge)
            // We can use the same logic:
            // if y > waterline + softness, brightness = 0.
            // We can use (1-t) as opacity?
            // if y >> waterline => t=1 => 1-t=0 (Transparent/Dark).
            // if y << waterline => t=0 => 1-t=1 (Opaque/Lit).
            // Yes, (1-t) works as the Fill Mask.

            const fillMask = 1.0 - t;

            // Color Blending
            // The user wants a gradient INSIDE the water?
            // "color = lerp(low, high, 1-t)"
            // If t varies from 0 (bottom) to 1 (top of water surface), 1-t goes 1 to 0.
            // So matches: Bottom (Deep) = HighColor?? Top (Surface) = LowColor?
            // A bit counter-intuitive, usually Depth = Dark Blue, Surface = Lighter.
            // Let's assume HighColor = Deep Water, LowColor = Shallow/Sand.
            // Let's implement exactly as requested.

            let baseC = colorLerp(this.config.lowTideColor, this.config.highTideColor, fillMask);

            // Apply Trend Tint
            baseC = colorLerp(baseC, trendTint, trendStrength);

            // Final Brightness
            // Global Breathing * MicroFlicker * FillMask
            // Also, we might want a minimum brightness for "Air" (0.0 pixel value) or fully off?
            // Usually fully off or very dim glow. Let's assume fully off above waterline for clear reading.

            let pixelBright = globalBrightness * microMultiplier * fillMask;

            // Apply to RGB
            pixels[i] = {
                r: Math.floor(clamp(baseC.r * pixelBright, 0, 255)),
                g: Math.floor(clamp(baseC.g * pixelBright, 0, 255)),
                b: Math.floor(clamp(baseC.b * pixelBright, 0, 255))
            };
        }

        return pixels;
    }
}

// Expose
if (typeof window !== 'undefined') (window as any).TideVisuals = TideVisuals;
if (typeof module !== 'undefined') module.exports = { TideVisuals };
