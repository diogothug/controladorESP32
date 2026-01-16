
export interface LedDimensions {
    w: number;
    h: number;
}

export function getPresetDimensions(preset: string): LedDimensions {
    switch (preset) {
        case '8x8': return { w: 8, h: 8 };
        case '16x16': return { w: 16, h: 16 };
        case '32x8': return { w: 8, h: 32 }; // Vertical: Height is dominant
        case '60led': return { w: 1, h: 60 }; // Vertical Strip
        case '12ring': return { w: 1, h: 12 }; // Linear/Vertical
        default: return { w: 8, h: 8 }; // Default/Custom fallout
    }
}
