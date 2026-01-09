
// Pre-defined 8x8 Icons (RRGGBB hex repeated)
// Layout: 8x8, row-major. 1 = white, 0 = black for simplicity base, 
// but we will store them as full color hex maps or masks.
// For simplicity, let's use Masks (0/1) and apply current color or default color.

const ICONS_MASKS: Record<string, number[]> = {
    HEART: [
        0, 1, 1, 0, 0, 1, 1, 0,
        1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1,
        0, 1, 1, 1, 1, 1, 1, 0,
        0, 0, 1, 1, 1, 1, 0, 0,
        0, 0, 0, 1, 1, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0
    ],
    SMILE: [
        0, 0, 1, 1, 1, 1, 0, 0,
        0, 1, 0, 0, 0, 0, 1, 0,
        1, 0, 1, 0, 0, 1, 0, 1,
        1, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 1, 0, 0, 1, 0, 1,
        1, 0, 0, 1, 1, 0, 0, 1,
        0, 1, 0, 0, 0, 0, 1, 0,
        0, 0, 1, 1, 1, 1, 0, 0
    ],
    SAD: [
        0, 0, 1, 1, 1, 1, 0, 0,
        0, 1, 0, 0, 0, 0, 1, 0,
        1, 0, 1, 0, 0, 1, 0, 1,
        1, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 0, 1, 1, 0, 0, 1,
        1, 0, 1, 0, 0, 1, 0, 1,
        0, 1, 0, 0, 0, 0, 1, 0,
        0, 0, 1, 1, 1, 1, 0, 0
    ],
    ARROW_UP: [
        0, 0, 0, 1, 1, 0, 0, 0,
        0, 0, 1, 1, 1, 1, 0, 0,
        0, 1, 1, 1, 1, 1, 1, 0,
        1, 1, 0, 1, 1, 0, 1, 1,
        0, 0, 0, 1, 1, 0, 0, 0,
        0, 0, 0, 1, 1, 0, 0, 0,
        0, 0, 0, 1, 1, 0, 0, 0,
        0, 0, 0, 1, 1, 0, 0, 0
    ],
    ARROW_DOWN: [
        0, 0, 0, 1, 1, 0, 0, 0,
        0, 0, 0, 1, 1, 0, 0, 0,
        0, 0, 0, 1, 1, 0, 0, 0,
        0, 0, 0, 1, 1, 0, 0, 0,
        1, 1, 0, 1, 1, 0, 1, 1,
        0, 1, 1, 1, 1, 1, 1, 0,
        0, 0, 1, 1, 1, 1, 0, 0,
        0, 0, 0, 1, 1, 0, 0, 0
    ],
    CHECK: [
        0, 0, 0, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 0, 0, 1, 1,
        0, 0, 0, 0, 0, 1, 1, 0,
        0, 0, 0, 0, 1, 1, 0, 0,
        1, 1, 0, 1, 1, 0, 0, 0,
        0, 1, 1, 1, 0, 0, 0, 0,
        0, 0, 1, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0
    ],
    CROSS: [
        1, 1, 0, 0, 0, 0, 1, 1,
        0, 1, 1, 0, 0, 1, 1, 0,
        0, 0, 1, 1, 1, 1, 0, 0,
        0, 0, 0, 1, 1, 0, 0, 0,
        0, 0, 0, 1, 1, 0, 0, 0,
        0, 0, 1, 1, 1, 1, 0, 0,
        0, 1, 1, 0, 0, 1, 1, 0,
        1, 1, 0, 0, 0, 0, 1, 1
    ],
    GHOST: [
        0, 0, 1, 1, 1, 1, 0, 0,
        0, 1, 1, 1, 1, 1, 1, 0,
        1, 1, 1, 1, 1, 1, 1, 1,
        1, 0, 1, 1, 1, 1, 0, 1,
        1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 0, 1, 1, 0, 1, 1,
        1, 0, 1, 0, 1, 0, 1, 0
    ]
};

// Colors for icons
const ICON_COLORS: Record<string, [number, number, number]> = {
    HEART: [255, 0, 0],
    SMILE: [255, 200, 0],
    SAD: [0, 0, 255],
    ARROW_UP: [0, 255, 0],
    ARROW_DOWN: [255, 0, 0],
    CHECK: [0, 255, 0],
    CROSS: [255, 0, 0],
    GHOST: [255, 255, 255]
};

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    const galleryView = document.getElementById('matrix-gallery');
    const uploadView = document.getElementById('matrix-upload');
    const galleryBtns = document.querySelectorAll('.icon-btn');

    // Upload Elements
    const dropZone = document.getElementById('bmp-drop-zone');
    const fileInput = document.getElementById('bmp-file-input') as HTMLInputElement;
    const previewContainer = document.getElementById('bmp-preview-container');
    const canvas = document.getElementById('bmp-canvas') as HTMLCanvasElement;
    const ctx = canvas?.getContext('2d');
    const widthInput = document.getElementById('bmp-width') as HTMLInputElement;
    const heightInput = document.getElementById('bmp-height') as HTMLInputElement;
    const sendBmpBtn = document.getElementById('btn-send-bmp');

    // 1. Toggle Views
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const target = btn.getAttribute('data-target');
            if (target === 'gallery') {
                galleryView?.classList.remove('hidden');
                uploadView?.classList.add('hidden');
            } else {
                galleryView?.classList.add('hidden');
                uploadView?.classList.remove('hidden');
            }
        });
    });

    // 2. Handle Gallery Clicks
    galleryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const iconName = btn.getAttribute('data-icon');
            if (iconName && ICONS_MASKS[iconName]) {
                sendIcon(iconName);
            }
        });
    });

    function sendIcon(name: string) {
        const mask = ICONS_MASKS[name];
        const color = ICON_COLORS[name] || [255, 255, 255];
        const hexData = maskToHex(mask, 8, 8, color);
        // Assuming Pin 2 is matrix for now, or find first NEO module
        // We need a way to get the selected module or default to first found
        // For MVP, broadcast to Pin 2
        sendBitmapCommand(2, 8, 8, hexData);
    }

    function maskToHex(mask: number[], w: number, h: number, rgb: [number, number, number]): string {
        let hex = '';
        for (let i = 0; i < mask.length; i++) {
            if (mask[i]) {
                hex += toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]);
            } else {
                hex += '000000';
            }
        }
        return hex;
    }

    function toHex(n: number): string {
        return n.toString(16).padStart(2, '0').toUpperCase();
    }

    function sendBitmapCommand(pin: number, w: number, h: number, data: string) {
        // Command: NEO:PIN:BMP:W:H:DATA
        const cmd = `NEO:${pin}:BMP:${w}:${h}:${data}`;
        if ((window as any).serial) {
            (window as any).serial.send(cmd);
            console.log(`Sent BMP to Pin ${pin} (${w}x${h})`);
        } else {
            console.warn("Serial object not available on window");
        }
    }

    // 3. Handle File Upload
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('active');
        });

        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('active'));

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('active');
            if (e.dataTransfer?.files?.length) {
                handleFile(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files?.length) {
                handleFile(fileInput.files[0]);
            }
        });
    }

    function handleFile(file: File) {
        if (!file.type.startsWith('image/')) return;

        const img = new Image();
        img.onload = () => {
            previewContainer?.classList.remove('hidden');
            updateCanvas(img);
        };
        img.src = URL.createObjectURL(file);

        // Listen for dimension changes to resize
        widthInput?.addEventListener('change', () => updateCanvas(img));
        heightInput?.addEventListener('change', () => updateCanvas(img));

        // Send Button
        sendBmpBtn?.addEventListener('click', () => {
            const w = parseInt(widthInput?.value || '8');
            const h = parseInt(heightInput?.value || '8');
            if (ctx) {
                const imageData = ctx.getImageData(0, 0, w, h);
                const hex = imageDataToHex(imageData);
                sendBitmapCommand(2, w, h, hex); // defaulting pin 2
            }
        }, { once: true }); // Prevent multiple listeners stacking
    }

    function updateCanvas(img: HTMLImageElement) {
        if (!canvas || !ctx) return;
        const w = parseInt(widthInput?.value || '8');
        const h = parseInt(heightInput?.value || '8');
        canvas.width = w;
        canvas.height = h;

        // Draw resized
        ctx.drawImage(img, 0, 0, w, h);
    }

    function imageDataToHex(imgData: ImageData): string {
        let hex = '';
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // msg += a > 128 ? ... needed?
            hex += toHex(r) + toHex(g) + toHex(b);
        }
        return hex;
    }

});
