/**
 * A still, out of focus, the way a cinema lens renders it: the picture melts into soft colour,
 * and its highlights bloom into tall oval discs (the cat's-eye bokeh of an anamorphic lens),
 * each in the colour of the light it came from.
 *
 * Drawn once per still at a small size and kept (as a data URL), so a focus pull is only ever
 * opacity and scale on stacked pictures: nothing is blurred while it moves. TMDB serves its
 * images with open CORS, so the canvas can be read back.
 */

const cache = new Map(); // src -> Promise<dataURL | null>
const done = new Map(); // src -> dataURL, once drawn

// TMDB sends its CORS header only to a request that asks for it, and the browser may answer a
// later request from a copy cached without it (an ordinary <img> of the same picture), which a
// canvas then can't read. So a picture the canvas reads is asked for at an address of its own.
export const readable = (src) => (src && /^https?:/.test(src) ? `${src}${src.includes('?') ? '&' : '?'}cors` : src);

export const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = readable(src);
});

export const makeCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
};

// draw an image to fill a canvas, cropped like object-fit: cover
const cover = (ctx, img, w, h) => {
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
};

// the same small variation for the same spot every time (no randomness: a still always melts alike)
const jitter = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000 / 1000;

const GRID_W = 36;
const GRID_H = 20;

export const defocus = (src, { width = 640, height = 360 } = {}) => {
    if (!src) return Promise.resolve(null);
    const key = `${src}|${width}x${height}`;
    if (cache.has(key)) return cache.get(key);
    const job = loadImage(src).then((img) => {
        // the melt: down to a few dozen pixels and back up, so only the light and colour are left
        const tiny = makeCanvas(GRID_W, GRID_H);
        const t = tiny.getContext('2d', { willReadFrequently: true });
        cover(t, img, GRID_W, GRID_H);
        const mid = makeCanvas(GRID_W * 4, GRID_H * 4);
        const m = mid.getContext('2d');
        m.imageSmoothingQuality = 'high';
        m.drawImage(tiny, 0, 0, mid.width, mid.height);
        const out = makeCanvas(width, height);
        const o = out.getContext('2d');
        o.imageSmoothingQuality = 'high';
        o.drawImage(mid, 0, 0, width, height);

        // the bokeh: the brightest points, spread out, bloom into discs of their own colour
        const px = t.getImageData(0, 0, GRID_W, GRID_H).data;
        const points = [];
        for (let y = 0; y < GRID_H; y++) {
            for (let x = 0; x < GRID_W; x++) {
                const i = (y * GRID_W + x) * 4;
                const lum = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
                points.push({ x, y, r: px[i], g: px[i + 1], b: px[i + 2], lum });
            }
        }
        points.sort((a, b) => b.lum - a.lum);
        const chosen = [];
        const floor = Math.max(70, points[0].lum * 0.55);
        for (const p of points) {
            if (p.lum < floor || chosen.length >= 22) break;
            if (chosen.some((q) => Math.abs(q.x - p.x) + Math.abs(q.y - p.y) < 3)) continue;
            chosen.push(p);
        }
        o.globalCompositeOperation = 'lighter';
        for (const p of chosen) {
            const cx = ((p.x + 0.5) / GRID_W) * width;
            const cy = ((p.y + 0.5) / GRID_H) * height;
            const rx = width * (0.028 + 0.03 * jitter(p.x, p.y));
            const strength = Math.min(1, (p.lum - floor) / 120 + 0.35);
            const g = o.createRadialGradient(0, 0, 0, 0, 0, rx);
            const c = `${p.r}, ${p.g}, ${p.b}`;
            g.addColorStop(0, `rgba(${c}, ${0.16 * strength})`);
            g.addColorStop(0.8, `rgba(${c}, ${0.24 * strength})`); // a brighter rim, as real bokeh has
            g.addColorStop(0.92, `rgba(${c}, ${0.1 * strength})`);
            g.addColorStop(1, `rgba(${c}, 0)`);
            o.save();
            o.translate(cx, cy);
            o.scale(1, 1.4); // tall ovals: the anamorphic lens
            o.fillStyle = g;
            o.beginPath();
            o.arc(0, 0, rx, 0, Math.PI * 2);
            o.fill();
            o.restore();
        }
        o.globalCompositeOperation = 'source-over';
        const url = out.toDataURL('image/jpeg', 0.84);
        done.set(key, url);
        return url;
    }).catch(() => {
        cache.delete(key);
        return null;
    });
    cache.set(key, job);
    return job;
};

// the soft picture right now, if it's been drawn already, so a new shot can open on it at once
export const defocusNow = (src, { width = 640, height = 360 } = {}) => (src ? done.get(`${src}|${width}x${height}`) : undefined);
