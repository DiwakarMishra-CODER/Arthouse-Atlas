import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Pictures for the About room's screens (the commentary, the lists).
 *
 * sizeFor(): a frame's size for this screen: the original on a wide or retina screen, where a 1280
 * copy would be stretched soft; w1280 otherwise.
 * useDecoded(): [ready, want]. want(urls) fetches and decodes pictures ahead (each once, kept so
 * the browser can't drop them first); ready holds the ones that can be shown without being half drawn
 * (one that can't be decoded ahead is shown anyway rather than never).
 */

export const sizeFor = () => (window.innerWidth * (window.devicePixelRatio || 1) > 1300 ? 'original' : 'w1280');

export const useDecoded = () => {
    const [ready, setReady] = useState(() => new Set());
    const held = useRef(new Map());
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => { alive.current = false; };
    }, []);
    const want = useCallback((urls) => {
        urls.filter((u) => u && !held.current.has(u)).forEach((u) => {
            const img = new Image();
            img.src = u;
            held.current.set(u, img);
            const show = () => { if (alive.current) setReady((had) => new Set(had).add(u)); };
            img.decode().then(show, show);
        });
    }, []);
    return [ready, want];
};
