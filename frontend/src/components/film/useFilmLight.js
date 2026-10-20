import { useEffect, useState } from 'react';

/**
 * The colour a film throws off its screen.
 *
 * Reads a tiny copy of the still (TMDB serves images with open CORS) and
 * returns its most characterful colour: pixels are weighted by saturation, so
 * a red coat in a grey street wins over the street. The result is pushed into
 * a range that reads as an accent on near-black — never muddy, never neon.
 */

const FALLBACK = '#d9ad62'; // the site's gold, for black-and-white films and failed loads

const toHex = (r, g, b) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
};

const hslToHex = (h, s, l) => {
    const f = (n) => {
        const k = (n + h * 12) % 12;
        const a = s * Math.min(l, 1 - l);
        return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
    };
    return toHex(f(0), f(8), f(4));
};

export const readLight = (data) => {
    let r = 0, g = 0, b = 0, w = 0;
    for (let i = 0; i < data.length; i += 4) {
        const [, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
        if (l < 0.08 || l > 0.94) continue; // ignore crushed blacks and blown highlights
        const weight = s * s + 0.01;
        r += data[i] * weight; g += data[i + 1] * weight; b += data[i + 2] * weight; w += weight;
    }
    if (!w) return FALLBACK;
    const [h, s] = rgbToHsl(r / w, g / w, b / w);
    if (s < 0.12) return FALLBACK; // a black-and-white film keeps the house gold
    return hslToHex(h, Math.min(0.75, Math.max(0.45, s * 1.25)), 0.6);
};

const useFilmLight = (url) => {
    const [light, setLight] = useState(FALLBACK);

    useEffect(() => {
        if (!url) return undefined;
        let cancelled = false;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                c.width = 48; c.height = 27;
                const ctx = c.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, c.width, c.height);
                if (!cancelled) setLight(readLight(ctx.getImageData(0, 0, c.width, c.height).data));
            } catch {
                if (!cancelled) setLight(FALLBACK);
            }
        };
        img.src = url.replace(/\/t\/p\/(original|w\d+)\//, '/t/p/w92/');
        return () => { cancelled = true; };
    }, [url]);

    return light;
};

export default useFilmLight;
