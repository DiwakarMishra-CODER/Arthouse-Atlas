/**
 * The wall of every film, drawn on a canvas.
 *
 * Plain JavaScript, outside React, so it can run every frame without
 * re-rendering anything. The wall is one sprite sheet (built by
 * backend/scripts/buildMosaic.js) cut into 16:9 tiles and repeated in every
 * direction, so it can drift forever without an edge. It:
 *
 *   - develops out of the dark when it first appears, in a ripple from the centre
 *   - drifts slowly, in grey, with a few tiles flickering into colour at a time
 *   - swells and colours the tiles under the pointer, like a lens; the tile
 *     under the pointer is named in a caption, and can be clicked
 *   - dives: given a progress 0 → 1, the camera pushes into one target tile
 *     until it fills the screen, the target sliding to the centre in a straight
 *     line while the zoom grows
 *
 * Usage: const wall = createMosaicRenderer(canvas, { sprite, index, getDive, reducedMotion })
 *        wall.setPointer(x, y) / wall.setPointer(null) · wall.setTarget(filmId)
 *        wall.tileAtPointer() → tile · wall.resize() · wall.destroy()
 */

const GAP = 2;               // black line between tiles, so it reads as a mosaic
const DEVELOP = 0.7;         // seconds each tile takes to come up
const RIPPLE = 1.1;          // seconds for the ripple to cross the screen
const DRIFT = [11, 5];       // px per second the wall slides by itself
const LENS_R = 170;          // px reach of the lens
const LENS_GROW = 1.25;      // how much the tile under the lens swells
const FLICKERS = 7;          // tiles flickering into colour at once
const REST_LIGHT = 0.42;     // how lit the grey wall is at rest

const mod = (n, m) => ((n % m) + m) % m;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// a grey copy of the sprite, made once (canvas filters aren't everywhere yet)
const greyOf = (img) => {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height);
    const p = data.data;
    for (let i = 0; i < p.length; i += 4) {
        const y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
        p[i] = p[i + 1] = p[i + 2] = y;
    }
    ctx.putImageData(data, 0, 0);
    return c;
};

export const createMosaicRenderer = (canvas, { sprite, index, getDive = () => 0, reducedMotion = false }) => {
    const ctx = canvas.getContext('2d');
    const grey = greyOf(sprite);
    const { cols, rows, tileW: SW, tileH: SH, tiles } = index;

    let W = 0, H = 0, dpr = 1, tw = 80, th = 45;
    let pointer = null;           // {x, y} in CSS px, or null
    let lastPointer = 0;          // when the pointer last moved, for the wandering lens on touch screens
    let hovered = null;           // { slot, sx, sy, s }
    let raf = 0;
    let visible = true;
    const born = performance.now();
    let clock = 0;                // seconds of drift elapsed (paused while diving)
    let lastT = born;
    let cam = { x: 0, y: 0 };     // world point at the centre of the screen
    let targetSlot = null;
    let dive = null;              // { to: target tile centre, s0: its screen position } captured when a dive begins
    const flick = [];             // { slot, start, dur }

    const resize = () => {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = canvas.clientWidth;
        H = canvas.clientHeight;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        tw = Math.max(56, Math.min(104, W / 17));
        th = (tw * 9) / 16;
    };
    resize();

    const slotAt = (c, r) => mod(r, rows) * cols + mod(c, cols);
    const drawTile = (src, slot, x, y, w, h, alpha) => {
        if (alpha <= 0.002) return;
        ctx.globalAlpha = alpha;
        ctx.drawImage(src, (slot % cols) * SW, Math.floor(slot / cols) * SH, SW, SH, x, y, w, h);
    };

    // the nearest repeat of a slot to a world point, as the centre of that tile
    const nearestInstance = (slot, near) => {
        const c0 = slot % cols;
        const r0 = Math.floor(slot / cols);
        const c = c0 + Math.round((near.x / tw - c0 - 0.5) / cols) * cols;
        const r = r0 + Math.round((near.y / th - r0 - 0.5) / rows) * rows;
        return { x: c * tw + tw / 2, y: r * th + th / 2, c, r };
    };

    const frame = (now) => {
        raf = requestAnimationFrame(frame);
        if (!visible) { lastT = now; return; }
        const dt = Math.min(0.05, (now - lastT) / 1000);
        lastT = now;
        const age = (now - born) / 1000;
        const d = reducedMotion ? 0 : clamp01(getDive());

        // drift, only while resting
        if (d === 0) {
            if (!reducedMotion) clock += dt;
            dive = null;
            cam = { x: clock * DRIFT[0] + cols * tw * 0.5, y: clock * DRIFT[1] + rows * th * 0.5 };
        }

        // the dive: zoom grows exponentially; the target slides to the centre in a straight line
        let Z = 1;
        let target = null;
        if (d > 0 && targetSlot != null) {
            if (!dive) {
                const t = nearestInstance(targetSlot, cam);
                dive = { to: t, s0: { x: (t.x - cam.x) + W / 2, y: (t.y - cam.y) + H / 2 } };
            }
            const e = easeInOut(d);
            const Zmax = Math.max(W / tw, H / th) * 1.04;
            Z = Math.exp(Math.log(Zmax) * e);
            const sx = dive.s0.x + (W / 2 - dive.s0.x) * e;
            const sy = dive.s0.y + (H / 2 - dive.s0.y) * e;
            cam = { x: dive.to.x - (sx - W / 2) / Z, y: dive.to.y - (sy - H / 2) / Z };
            target = dive.to;
        }

        // a wandering lens when nobody is pointing (touch screens, or a still mouse)
        let lens = pointer;
        if (!lens && !reducedMotion && d === 0 && now - lastPointer > 2500) {
            lens = { x: W * (0.5 + 0.34 * Math.sin(age * 0.23)), y: H * (0.5 + 0.3 * Math.sin(age * 0.31 + 1.4)) };
        }

        // keep a few tiles flickering into colour
        if (!reducedMotion && d === 0) {
            for (let i = flick.length - 1; i >= 0; i--) if (age - flick[i].start > flick[i].dur) flick.splice(i, 1);
            while (flick.length < FLICKERS) flick.push({ slot: Math.floor(Math.random() * tiles.length), start: age + Math.random() * 1.5, dur: 1.4 + Math.random() * 1.6 });
        }
        const flickAlpha = new Map(flick.map((f) => {
            const k = clamp01((age - f.start) / f.dur);
            return [f.slot, Math.sin(k * Math.PI) * 0.85];
        }));

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, W, H);

        const halfW = W / 2 / Z;
        const halfH = H / 2 / Z;
        const c0 = Math.floor((cam.x - halfW) / tw) - 1;
        const c1 = Math.ceil((cam.x + halfW) / tw) + 1;
        const r0 = Math.floor((cam.y - halfH) / th) - 1;
        const r1 = Math.ceil((cam.y + halfH) / th) + 1;
        const maxDist = Math.hypot(W / 2, H / 2);
        const lifted = [];
        hovered = null;
        let best = Infinity;

        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                const slot = slotAt(c, r);
                const cx = (c * tw + tw / 2 - cam.x) * Z + W / 2;
                const cy = (r * th + th / 2 - cam.y) * Z + H / 2;
                let w = (tw - GAP) * Z;
                let h = (th - GAP) * Z;

                // developing out of the dark, in a ripple from the centre
                const delay = (Math.hypot(cx - W / 2, cy - H / 2) / maxDist) * RIPPLE;
                const dev = reducedMotion ? 1 : clamp01((age - delay) / DEVELOP);
                let light = REST_LIGHT * dev;
                let colour = (flickAlpha.get(slot) || 0) * dev;

                if (lens && d === 0) {
                    const dist = Math.hypot(cx - lens.x, cy - lens.y);
                    const k = Math.max(0, 1 - dist / LENS_R) ** 2;
                    if (k > 0) {
                        const s = 1 + LENS_GROW * k;
                        lifted.push({ slot, cx, cy, w: w * s, h: h * s, light: Math.min(1, REST_LIGHT + k), colour: Math.max(colour, k * 1.4) * dev, s });
                        if (pointer && dist < best) { best = dist; hovered = { slot, cx, cy, w: w * s, h: h * s, s }; }
                        continue;
                    }
                }
                if (target && c === target.c && r === target.r) {
                    // tonight's film comes up in colour as the camera arrives
                    light = REST_LIGHT + (1 - REST_LIGHT) * clamp01(d * 2.2);
                    colour = clamp01((d - 0.15) * 2);
                } else if (d > 0) {
                    light *= 1 - 0.5 * clamp01(d * 1.5); // the rest of the wall falls away into the dark
                }
                if (cx + w / 2 < 0 || cx - w / 2 > W || cy + h / 2 < 0 || cy - h / 2 > H) continue;
                drawTile(grey, slot, cx - w / 2, cy - h / 2, w, h, light);
                drawTile(sprite, slot, cx - w / 2, cy - h / 2, w, h, colour);
            }
        }

        // the lens's tiles last, biggest on top
        lifted.sort((a, b) => a.s - b.s).forEach((t) => {
            ctx.globalAlpha = 0.55 * (t.s - 1);
            ctx.fillStyle = '#000';
            ctx.fillRect(t.cx - t.w / 2 + 4, t.cy - t.h / 2 + 8, t.w, t.h); // its shadow
            drawTile(grey, t.slot, t.cx - t.w / 2, t.cy - t.h / 2, t.w, t.h, t.light);
            drawTile(sprite, t.slot, t.cx - t.w / 2, t.cy - t.h / 2, t.w, t.h, Math.min(1, t.colour));
        });

        // the caption under the tile you're pointing at
        if (hovered && best < LENS_R * 0.5) {
            const tile = tiles[hovered.slot];
            const text = `${tile.t}  ·  ${tile.y}`;
            ctx.globalAlpha = 1;
            ctx.font = '500 13px Inter, system-ui, sans-serif';
            const tw2 = ctx.measureText(text).width + 20;
            const x = Math.min(W - tw2 - 8, Math.max(8, hovered.cx - tw2 / 2));
            const y = hovered.cy + hovered.h / 2 + 8;
            ctx.fillStyle = 'rgba(5,5,5,0.85)';
            ctx.fillRect(x, y, tw2, 26);
            ctx.fillStyle = '#f5f0e6';
            ctx.fillText(text, x + 10, y + 17);
            canvas.style.cursor = 'pointer';
        } else {
            if (hovered) hovered = null;
            canvas.style.cursor = d > 0 ? 'default' : 'crosshair';
        }
        ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(frame);

    // only spend frames while the wall is on screen
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);

    return {
        resize,
        setPointer: (x, y) => { pointer = x == null ? null : { x, y }; lastPointer = performance.now(); },
        setTarget: (id) => {
            const slot = tiles.findIndex((t) => t.id === id);
            targetSlot = slot >= 0 ? slot : 0;
            dive = null; // the next dive aims afresh
        },
        tileAtPointer: () => (hovered ? tiles[hovered.slot] : null),
        destroy: () => { cancelAnimationFrame(raf); io.disconnect(); }
    };
};
