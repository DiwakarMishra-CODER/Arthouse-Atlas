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
 *     until it covers the screen exactly, the target sliding to the centre in a
 *     straight line while the zoom grows. At 1 it stops drawing: the page lays
 *     an ordinary <img> over the exact rectangle the tile ended on
 *     (getFinalRect), which the browser composites for free — a canvas redrawing
 *     a full-screen still every frame is what made the arrival lag.
 *
 * Sharpness: the wall starts on a small sheet and takes a sharp one when it
 * arrives (setSprite), where the screen draws tiles big enough to show the
 * difference (sharpSheetWanted); and any tile the lens or the dive enlarges past
 * the sheet's resolution is drawn from that film's own still, fetched on demand.
 *
 * The sheets come as ImageBitmaps (sheetOf), decoded off the main thread: a canvas
 * decodes an <img> on the main thread the first time it draws it, whatever
 * img.decode() promised, and the sharp sheet's decode alone froze the page for a
 * third of a second on a first visit.
 *
 * Usage: const wall = createMosaicRenderer(canvas, { sprite, index, getDive, reducedMotion })
 *        (sprite: an ImageBitmap, from sheetOf(url))
 *        wall.setSprite(sharperBitmap) · wall.setPointer(x, y) / wall.setPointer(null) · wall.setTarget(filmId)
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
const ARRIVED = 0.999;       // dive progress at which the page's image takes over

const mod = (n, m) => ((n % m) + m) % m;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const STILL = 'https://image.tmdb.org/t/p/';

// a sprite sheet, fetched and decoded off the main thread
export const sheetOf = (url) => fetch(url).then((r) => r.blob()).then((b) => createImageBitmap(b));

// a tile's width on this screen, in CSS px
const tileWidth = (W) => Math.max(56, Math.min(104, W / 17));
// whether this screen draws tiles big enough for the sharp sheet to show (a retina desktop does;
// a phone, or a screen at 1x, would fetch and decode 4 MB to look the same)
export const sharpSheetWanted = (sheet, cols) => tileWidth(window.innerWidth) * Math.min(2, window.devicePixelRatio || 1) > (sheet.width / cols) * 1.25;

// a grey copy of the sprite, made once, on the GPU (a canvas made for reading pixels back is drawn
// in software, where this took hundreds of ms): a grayscale filter where the browser has one;
// otherwise (Safari) each pixel keeps its lightness and takes a grey's colour, none
const greyOf = (img) => {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    // ask the prototype, not the context: assigning an unknown property would seem to work
    if ('filter' in CanvasRenderingContext2D.prototype) {
        ctx.filter = 'grayscale(1)';
        ctx.drawImage(img, 0, 0);
        return c;
    }
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, c.width, c.height);
    return c;
};

// draw an image into a box the way object-fit: cover does — cropped, never stretched
const drawCover = (ctx, img, x, y, w, h) => {
    const ir = img.naturalWidth / img.naturalHeight;
    const br = w / h;
    let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
    if (ir > br) { sw = sh * br; sx = (img.naturalWidth - sw) / 2; } else { sh = sw / br; sy = (img.naturalHeight - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
};

export const createMosaicRenderer = (canvas, { sprite: firstSprite, index, getDive = () => 0, reducedMotion = false }) => {
    const ctx = canvas.getContext('2d');
    const { cols, rows, tiles } = index;
    let sprite = firstSprite;
    let grey = greyOf(sprite);
    let SW = sprite.width / cols;   // a tile's size in whichever sheet is loaded
    let SH = sprite.height / rows;

    // films' own stills, fetched when a tile is shown bigger than the sheet holds it
    const stills = new Map(); // `${slot}@${size}` → Image (drawn once complete)
    const stillFor = (slot, size) => {
        const path = tiles[slot]?.s;
        if (!path) return null;
        const key = `${slot}@${size}`;
        let img = stills.get(key);
        if (!img) {
            img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = path.startsWith('/stills/') ? path : `${STILL}${size}${path}`; // or one the atlas hosts itself
            // decoded off the main thread before it's ever drawn: a big still decoded mid-dive stutters
            img.decode().then(() => { img.ready = true; }).catch(() => {});
            stills.set(key, img);
        }
        return img.ready ? img : null;
    };

    let W = 0, H = 0, dpr = 1, tw = 80, th = 45;
    let restingArrived = false;   // the arrival frame is drawn and the page's image has it
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
    const flick = [];             // { c, r, start, dur } — cells on screen briefly in colour

    // The resting wall, painted once into an off-screen canvas and laid down each frame as a
    // repeating pattern: one fill instead of hundreds of tiles. Repainted on resize or a new sheet.
    let wall = null;              // { pattern, key }
    const wallKey = () => `${tw}|${dpr}|${sprite.width}`;
    const paintWall = () => {
        const off = document.createElement('canvas');
        off.width = Math.round(cols * tw * dpr);
        off.height = Math.round(rows * th * dpr);
        const o = off.getContext('2d');
        o.scale(dpr, dpr);
        o.fillStyle = '#050505';
        o.fillRect(0, 0, cols * tw, rows * th);
        o.globalAlpha = REST_LIGHT;
        for (let slot = 0; slot < cols * rows; slot++) {
            const c = slot % cols;
            const r = Math.floor(slot / cols);
            o.drawImage(grey, c * SW, r * SH, SW, SH, c * tw + GAP / 2, r * th + GAP / 2, tw - GAP, th - GAP);
        }
        wall = { pattern: ctx.createPattern(off, 'repeat'), key: wallKey() };
    };

    const resize = () => {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = canvas.clientWidth;
        H = canvas.clientHeight;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        tw = tileWidth(W);
        th = (tw * 9) / 16;
        restingArrived = false; // resizing clears the canvas: draw the arrival frame again
    };
    resize();

    const slotAt = (c, r) => mod(r, rows) * cols + mod(c, cols);
    const zFinal = () => Math.max(W / (tw - GAP), H / (th - GAP));
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
        // arrived: the page's image has taken over; once the final frame has been drawn from the
        // film's own still (not the sheet's tile), rest
        if (d >= ARRIVED && restingArrived) { lastT = now; return; }
        if (d < ARRIVED) restingArrived = false;

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
            // just enough to cover the screen with the tile's picture
            Z = Math.exp(Math.log(zFinal()) * e);
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
        const toScreen = (c, r) => ({ cx: (c * tw + tw / 2 - cam.x) * Z + W / 2, cy: (r * th + th / 2 - cam.y) * Z + H / 2 });
        const w = (tw - GAP) * Z;
        const h = (th - GAP) * Z;
        const developing = !reducedMotion && age < RIPPLE + DEVELOP;
        const wallLight = d > 0 ? 1 - 0.5 * clamp01(d * 1.5) : 1; // the wall falls away into the dark as the camera dives

        if (developing) {
            // the first moments: every tile on its own, coming up in a ripple from the centre
            const maxDist = Math.hypot(W / 2, H / 2);
            for (let r = r0; r <= r1; r++) {
                for (let c = c0; c <= c1; c++) {
                    const { cx, cy } = toScreen(c, r);
                    const delay = (Math.hypot(cx - W / 2, cy - H / 2) / maxDist) * RIPPLE;
                    drawTile(grey, slotAt(c, r), cx - w / 2, cy - h / 2, w, h, REST_LIGHT * clamp01((age - delay) / DEVELOP) * wallLight);
                }
            }
        } else {
            // afterwards: the whole wall in one fill
            if (!wall || wall.key !== wallKey()) paintWall();
            wall.pattern.setTransform(new DOMMatrix([Z / dpr, 0, 0, Z / dpr, W / 2 - cam.x * Z, H / 2 - cam.y * Z]));
            ctx.globalAlpha = wallLight;
            ctx.fillStyle = wall.pattern;
            ctx.fillRect(0, 0, W, H);
        }

        // a few cells at a time flicker into colour
        if (!reducedMotion && !developing && d === 0) {
            for (let i = flick.length - 1; i >= 0; i--) if (age - flick[i].start > flick[i].dur) flick.splice(i, 1);
            while (flick.length < FLICKERS) {
                flick.push({ c: c0 + Math.floor(Math.random() * (c1 - c0)), r: r0 + Math.floor(Math.random() * (r1 - r0)), start: age + Math.random() * 1.5, dur: 1.4 + Math.random() * 1.6 });
            }
            for (const f of flick) {
                const k = clamp01((age - f.start) / f.dur);
                const { cx, cy } = toScreen(f.c, f.r);
                drawTile(sprite, slotAt(f.c, f.r), cx - w / 2, cy - h / 2, w, h, Math.sin(k * Math.PI) * 0.85);
            }
        }

        // the lens: only the cells within its reach are touched
        const lifted = [];
        hovered = null;
        let best = Infinity;
        if (lens && d === 0 && !developing) {
            const lx = cam.x + (lens.x - W / 2) / Z;
            const ly = cam.y + (lens.y - H / 2) / Z;
            const reachC = Math.ceil(LENS_R / (tw * Z)) + 1;
            const reachR = Math.ceil(LENS_R / (th * Z)) + 1;
            const lc = Math.floor(lx / tw);
            const lr = Math.floor(ly / th);
            for (let r = lr - reachR; r <= lr + reachR; r++) {
                for (let c = lc - reachC; c <= lc + reachC; c++) {
                    const { cx, cy } = toScreen(c, r);
                    const dist = Math.hypot(cx - lens.x, cy - lens.y);
                    const k = Math.max(0, 1 - dist / LENS_R) ** 2;
                    if (k <= 0) continue;
                    const s = 1 + LENS_GROW * k;
                    const slot = slotAt(c, r);
                    lifted.push({ slot, cx, cy, w: w * s, h: h * s, light: Math.min(1, REST_LIGHT + k), colour: Math.min(1, k * 1.4), s });
                    if (pointer && dist < best) { best = dist; hovered = { slot, cx, cy, w: w * s, h: h * s, s }; }
                }
            }
        }

        // tonight's film, coming up in colour as the camera arrives — from its own still once bigger than the sheet
        if (target) {
            const { cx, cy } = toScreen(target.c, target.r);
            const slot = slotAt(target.c, target.r);
            const light = REST_LIGHT + (1 - REST_LIGHT) * clamp01(d * 2.2);
            const colour = clamp01((d - 0.15) * 2);
            drawTile(grey, slot, cx - w / 2, cy - h / 2, w, h, light);
            // never the original here: a huge still redrawn every frame is the costliest thing a
            // canvas can do; the page's image carries the full resolution once the camera arrives
            const own = w * dpr > SW * 1.1
                ? (w * dpr > 320 ? stillFor(slot, 'w1280') || stillFor(slot, 'w300') : stillFor(slot, 'w300'))
                : null;
            if (own) {
                ctx.globalAlpha = Math.max(colour, light);
                drawCover(ctx, own, cx - w / 2, cy - h / 2, w, h);
                if (d >= ARRIVED && own.naturalWidth >= 1000) restingArrived = true;
            } else {
                drawTile(sprite, slot, cx - w / 2, cy - h / 2, w, h, colour);
            }
        }

        // the lens's tiles last, biggest on top
        lifted.sort((a, b) => a.s - b.s).forEach((t) => {
            ctx.globalAlpha = 0.55 * (t.s - 1);
            ctx.fillStyle = '#000';
            ctx.fillRect(t.cx - t.w / 2 + 4, t.cy - t.h / 2 + 8, t.w, t.h); // its shadow
            drawTile(grey, t.slot, t.cx - t.w / 2, t.cy - t.h / 2, t.w, t.h, t.light);
            const own = t.w * dpr > SW * 1.1 ? stillFor(t.slot, 'w300') : null;
            if (own) {
                ctx.globalAlpha = Math.min(1, t.colour);
                drawCover(ctx, own, t.cx - t.w / 2, t.cy - t.h / 2, t.w, t.h);
            } else {
                drawTile(sprite, t.slot, t.cx - t.w / 2, t.cy - t.h / 2, t.w, t.h, Math.min(1, t.colour));
            }
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
        // the sharp sheet (already decoded): its grey copy and the resting wall made when the
        // browser is idle, so the swap never costs a frame
        setSprite: (img) => {
            const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
            idle(() => {
                const g = greyOf(img);
                sprite = img;
                grey = g;
                SW = img.width / cols;
                SH = img.height / rows;
                paintWall();
            });
        },
        setTarget: (id) => {
            const slot = tiles.findIndex((t) => t.id === id);
            targetSlot = slot >= 0 ? slot : 0;
            dive = null; // the next dive aims afresh
            // fetch tonight's still ahead of the dive, at the sizes the canvas draws it at
            stillFor(targetSlot, 'w300');
            stillFor(targetSlot, 'w1280');
            restingArrived = false;
        },
        tileAtPointer: () => (hovered ? tiles[hovered.slot] : null),
        // where tonight's tile sits on screen when the dive completes (centred, covering it), in CSS px
        getFinalRect: () => {
            const Zf = zFinal();
            const w = (tw - GAP) * Zf;
            const h = (th - GAP) * Zf;
            return { left: (W - w) / 2, top: (H - h) / 2, width: w, height: h };
        },
        destroy: () => { cancelAnimationFrame(raf); io.disconnect(); }
    };
};
