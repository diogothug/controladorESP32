/**
 * LED Preview - Real-time LED visualization with Canvas2D
 * Supports: strip, matrix, ring layouts with realistic glow effects
 */

type LedLayout = 'strip' | 'matrix' | 'ring';

interface LedConfig {
    layout: LedLayout;
    count: number;
    width: number;   // For matrix
    height: number;  // For matrix
    ledSize: number;
    ledSpacing: number;
    glowEnabled: boolean;
    glowIntensity: number;
}

interface RGBColor {
    r: number;
    g: number;
    b: number;
}

class LedPreview {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private config: LedConfig;
    private pixels: RGBColor[];
    private animationId: number | null = null;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;

        // Default config
        this.config = {
            layout: 'matrix',
            count: 64,
            width: 8,
            height: 8,
            ledSize: 20,
            ledSpacing: 4,
            glowEnabled: true,
            glowIntensity: 0.6
        };

        // Initialize all pixels to off
        this.pixels = Array(this.config.count).fill(null).map(() => ({ r: 0, g: 0, b: 0 }));

        this.resizeCanvas();
    }

    /**
     * Resize canvas based on layout and configuration
     */
    resizeCanvas(): void {
        const { layout, width, height, count, ledSize, ledSpacing } = this.config;
        const totalSize = ledSize + ledSpacing;

        if (layout === 'matrix') {
            this.canvas.width = width * totalSize + ledSpacing;
            this.canvas.height = height * totalSize + ledSpacing;
        } else if (layout === 'strip') {
            this.canvas.width = count * totalSize + ledSpacing;
            this.canvas.height = totalSize + ledSpacing;
        } else if (layout === 'ring') {
            const radius = Math.max(80, count * 3);
            this.canvas.width = radius * 2 + ledSize * 2;
            this.canvas.height = radius * 2 + ledSize * 2;
        }
    }

    /**
     * Set layout type
     */
    setLayout(layout: LedLayout, width?: number, height?: number): void {
        this.config.layout = layout;
        if (layout === 'matrix' && width && height) {
            this.config.width = width;
            this.config.height = height;
            this.config.count = width * height;
        }
        this.pixels = Array(this.config.count).fill(null).map(() => ({ r: 0, g: 0, b: 0 }));
        this.resizeCanvas();
        this.render();
    }

    /**
     * Set LED count (for strips)
     */
    setCount(count: number): void {
        this.config.count = count;
        this.pixels = Array(count).fill(null).map(() => ({ r: 0, g: 0, b: 0 }));
        this.resizeCanvas();
        this.render();
    }

    /**
     * Set single pixel color
     */
    setPixel(index: number, r: number, g: number, b: number): void {
        if (index >= 0 && index < this.pixels.length) {
            this.pixels[index] = { r, g, b };
        }
    }

    /**
     * Set all pixels at once
     */
    setAllPixels(colors: RGBColor[]): void {
        for (let i = 0; i < Math.min(colors.length, this.pixels.length); i++) {
            this.pixels[i] = colors[i];
        }
    }

    /**
     * Fill all pixels with one color
     */
    fill(r: number, g: number, b: number): void {
        for (let i = 0; i < this.pixels.length; i++) {
            this.pixels[i] = { r, g, b };
        }
    }

    /**
     * Clear all pixels
     */
    clear(): void {
        this.fill(0, 0, 0);
    }

    /**
     * Draw glow effect around LED
     */
    private drawGlow(x: number, y: number, r: number, g: number, b: number, size: number): void {
        if (!this.config.glowEnabled || (r === 0 && g === 0 && b === 0)) return;

        const intensity = this.config.glowIntensity;
        const brightness = (r + g + b) / 765; // 0-1
        const glowRadius = size * (1.5 + brightness * 1.5);

        const gradient = this.ctx.createRadialGradient(x, y, size * 0.3, x, y, glowRadius);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${intensity * brightness})`);
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${intensity * brightness * 0.3})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x - glowRadius, y - glowRadius, glowRadius * 2, glowRadius * 2);
    }

    /**
     * Draw single LED
     */
    private drawLed(x: number, y: number, r: number, g: number, b: number): void {
        const size = this.config.ledSize;
        const halfSize = size / 2;

        // Draw glow first (behind LED)
        this.drawGlow(x + halfSize, y + halfSize, r, g, b, halfSize);

        // LED capsule/circle
        this.ctx.beginPath();
        this.ctx.arc(x + halfSize, y + halfSize, halfSize * 0.8, 0, Math.PI * 2);

        // LED fill with slight gradient for 3D effect
        const ledGradient = this.ctx.createRadialGradient(
            x + halfSize * 0.7, y + halfSize * 0.7, 0,
            x + halfSize, y + halfSize, halfSize
        );

        const brightness = Math.max(r, g, b) / 255;
        const baseR = Math.floor(r * 0.3);
        const baseG = Math.floor(g * 0.3);
        const baseB = Math.floor(b * 0.3);

        ledGradient.addColorStop(0, `rgb(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)})`);
        ledGradient.addColorStop(0.7, `rgb(${r}, ${g}, ${b})`);
        ledGradient.addColorStop(1, `rgb(${baseR}, ${baseG}, ${baseB})`);

        this.ctx.fillStyle = ledGradient;
        this.ctx.fill();

        // LED border
        this.ctx.strokeStyle = brightness > 0.1 ? `rgba(255, 255, 255, 0.3)` : 'rgba(60, 60, 60, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    /**
     * Get X,Y position for LED index based on layout
     */
    private getLedPosition(index: number): { x: number; y: number } {
        const { layout, width, ledSize, ledSpacing, count } = this.config;
        const totalSize = ledSize + ledSpacing;

        if (layout === 'matrix') {
            const row = Math.floor(index / width);
            const col = index % width;
            return {
                x: ledSpacing + col * totalSize,
                y: ledSpacing + row * totalSize
            };
        } else if (layout === 'strip') {
            return {
                x: ledSpacing + index * totalSize,
                y: ledSpacing
            };
        } else if (layout === 'ring') {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            const radius = Math.min(centerX, centerY) - ledSize;
            const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
            return {
                x: centerX + Math.cos(angle) * radius - ledSize / 2,
                y: centerY + Math.sin(angle) * radius - ledSize / 2
            };
        }

        return { x: 0, y: 0 };
    }

    /**
     * Render all LEDs
     */
    render(): void {
        // Clear canvas with dark background
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw all LEDs
        for (let i = 0; i < this.pixels.length; i++) {
            const pos = this.getLedPosition(i);
            const pixel = this.pixels[i];
            this.drawLed(pos.x, pos.y, pixel.r, pixel.g, pixel.b);
        }
    }

    /**
     * Start continuous rendering loop
     */
    startRendering(): void {
        const loop = () => {
            this.render();
            this.animationId = requestAnimationFrame(loop);
        };
        loop();
    }

    /**
     * Stop rendering loop
     */
    stopRendering(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Get config for UI
     */
    getConfig(): LedConfig {
        return { ...this.config };
    }

    /**
     * Toggle glow effect
     */
    setGlow(enabled: boolean, intensity?: number): void {
        this.config.glowEnabled = enabled;
        if (intensity !== undefined) {
            this.config.glowIntensity = Math.max(0, Math.min(1, intensity));
        }
        this.render();
    }

    /**
     * Set LED size
     */
    setLedSize(size: number): void {
        this.config.ledSize = Math.max(5, Math.min(50, size));
        this.resizeCanvas();
        this.render();
    }
}

// Singleton for global access
let previewInstance: LedPreview | null = null;

function initLedPreviewSingleton(canvasId: string): LedPreview {
    previewInstance = new LedPreview(canvasId);
    return previewInstance;
}

function getLedPreview(): LedPreview | null {
    return previewInstance;
}
