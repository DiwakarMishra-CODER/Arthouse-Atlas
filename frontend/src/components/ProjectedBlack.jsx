import { useEffect, useRef } from 'react';

/**
 * The site's background: the dark of a cinema with the projector running. Not a flat
 * colour. The projector's light falls faintly on the middle of the screen and dies away
 * at the edges, and the black itself is film: grain that changes 12 times a second (every
 * other frame of film: calm enough to read over), felt more than seen.
 *
 * The grain is noise drawn once, at half the screen's resolution, on one canvas a little
 * bigger than the screen; a stepped animation jumps it to a new place every other frame of film.
 * Only a transform changes, so nothing repaints. Still for reduced motion, and put away
 * while a page's own full-screen scene covers the sky (the home wall).
 */

const SCALE = 2; // a grain is two CSS pixels, softened: film grain, not a screen's static
const PAD = 64; // room around the screen for the jumps (CSS px, each side)

const ProjectedBlack = () => {
    const canvas = useRef(null);

    useEffect(() => {
        const c = canvas.current;
        let t = 0;
        const draw = () => {
            const w = Math.ceil((window.innerWidth + PAD * 2) / SCALE);
            const h = Math.ceil((window.innerHeight + PAD * 2) / SCALE);
            if (c.width === w && c.height === h) return;
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d');
            const img = ctx.createImageData(w, h);
            const px = img.data;
            for (let i = 0; i < px.length; i += 4) {
                const r = Math.random();
                px[i] = 241;
                px[i + 1] = 236;
                px[i + 2] = 226;
                px[i + 3] = r * r * r * 15; // mostly nothing; now and then a faint fleck of light
            }
            ctx.putImageData(img, 0, 0);
        };
        draw();
        const onResize = () => { clearTimeout(t); t = setTimeout(draw, 200); };
        window.addEventListener('resize', onResize);
        return () => { clearTimeout(t); window.removeEventListener('resize', onResize); };
    }, []);

    return (
        <div aria-hidden="true" className="projected-black fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <canvas
                ref={canvas}
                className="projected-grain absolute max-w-none"
                style={{ left: -PAD, top: -PAD, width: `calc(100% + ${PAD * 2}px)`, height: `calc(100% + ${PAD * 2}px)` }}
            />
        </div>
    );
};

export default ProjectedBlack;
