/**
 * Draws the Lot (see lotLayout.js) on a canvas: the backlot at night from a crane. From the air,
 * every house is a lit roof showing its signature film, its name across the foot of it; come close
 * (or come down onto one) and the roof opens into all its films. Pictures come from the home page's
 * mosaic sheet (one image for every film, usually cached already); drawn bigger than the sheet holds
 * them, a film's own still is fetched and drawn instead. The camera moves by itself or under a hand,
 * and the canvas is redrawn only while something moves.
 *
 * createLotRenderer(canvas, { plan, index, sheet }) -> { resize, setSheet, pick, hover, arrive, focus,
 *   release, panBy, zoomAt, destroy }
 */

const STILL = 'https://image.tmdb.org/t/p/';
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const OPEN_FROM = 420; // px wide on screen at which a roof starts to open into its films
const OPEN_BY = 640; // …and has opened

export const createLotRenderer = (canvas, { plan, index, sheet: firstSheet }) => {
    const ctx = canvas.getContext('2d');
    const slotOf = new Map();
    index.tiles.forEach((t, i) => { if (!slotOf.has(t.id)) slotOf.set(t.id, i); });
    let sheet = firstSheet;
    let SW = sheet.naturalWidth / index.cols;
    let SH = sheet.naturalHeight / index.rows;
    let W = 1;
    let H = 1;
    let dpr = 1;
    const cam = { x: plan.width / 2, y: plan.height / 2, s: 1 };
    let flight = null;
    let breathing = false;
    let arriving = false; // the arrival's crane: the roofs stay shut, one picture each
    let breath0 = 0;
    let hovered = null;
    let focused = null;
    let dirty = true;
    let raf = 0;
    let gone = false;
    const fit = new Map(); // a roof's name, sized to fit it (world units)

    // a film's own still, for when it's drawn bigger than the sheet holds it
    const stills = new Map();
    const stillFor = (id, size) => {
        const path = index.tiles[slotOf.get(id)]?.s;
        if (!path) return null;
        const key = `${id}@${size}`;
        let img = stills.get(key);
        if (!img) {
            img = new Image();
            img.src = path.startsWith('/stills/') ? path : `${STILL}${size}${path}`;
            img.decode().then(() => { img.ready = true; dirty = true; wake(); }).catch(() => {});
            stills.set(key, img);
        }
        return img.ready ? img : null;
    };

    // a film's picture, cropped to fill a rectangle (the sheet's tile, or its own still when bigger)
    const picture = (id, x, y, w, h, px) => {
        const size = px > SW * 1.15 ? (px > 330 ? 'w780' : 'w300') : null;
        const own = size ? stillFor(id, size) : null;
        let sx;
        let sy;
        let sw;
        let sh;
        let img;
        if (own) { img = own; sx = 0; sy = 0; sw = own.naturalWidth; sh = own.naturalHeight; }
        else {
            const slot = slotOf.get(id);
            if (slot == null) { ctx.fillStyle = '#1a1814'; ctx.fillRect(x, y, w, h); return; }
            img = sheet; sx = (slot % index.cols) * SW; sy = Math.floor(slot / index.cols) * SH; sw = SW; sh = SH;
        }
        // cover: the middle of the picture, at the rectangle's shape
        const want = w / h;
        if (sw / sh > want) { const cw = sh * want; sx += (sw - cw) / 2; sw = cw; }
        else { const ch = sw / want; sy += (sh - ch) / 2; sh = ch; }
        ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    };

    const nameFits = () => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.font = '500 10px Oswald';
        ctx.letterSpacing = '1.4px';
        plan.stages.forEach((st) => {
            const w = ctx.measureText(st.house.name.toUpperCase()).width;
            fit.set(st, Math.min(Math.max(3.2, Math.min(st.w, st.h) * 0.16), ((st.w * 0.86) / w) * 10));
        });
        ctx.restore();
    };

    // the whole lot on a wide screen; on a tall one (a phone), its height across most of the screen,
    // the rest a drag away
    const whole = () => Math.min(W / (plan.width * 0.98), (H * 0.94) / plan.height);
    const overview = () => {
        const s = W < H ? (H * 0.6) / plan.height : whole();
        return { x: plan.width / 2, y: plan.height / 2 + (H * 0.02) / s, s };
    };
    const limits = () => ({ min: Math.min(whole(), overview().s) * 0.9, max: 90 });

    const draw = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const k = cam.s * dpr;
        ctx.setTransform(k, 0, 0, k, (W / 2 - cam.x * cam.s) * dpr, (H / 2 - cam.y * cam.s) * dpr);
        const x0 = cam.x - W / 2 / cam.s;
        const x1 = cam.x + W / 2 / cam.s;
        const y0 = cam.y - H / 2 / cam.s;
        const y1 = cam.y + H / 2 / cam.s;

        // the districts' names, painted on the ground
        ctx.textBaseline = 'alphabetic';
        ctx.font = '600 10px Oswald';
        ctx.letterSpacing = '3px';
        ctx.fillStyle = focused ? 'rgba(217, 173, 98, 0.3)' : 'rgba(217, 173, 98, 0.95)';
        for (const d of plan.districts) {
            if (d.x > x1 || d.x + d.w < x0 || d.y > y1 || d.y + d.h < y0) continue;
            if (10 * cam.s >= 7) ctx.fillText(d.name.toUpperCase(), d.x + 1, d.y + 10);
        }

        for (const st of plan.stages) {
            if (st.x > x1 || st.x + st.w < x0 || st.y > y1 || st.y + st.h < y0) continue;
            const on = st === hovered || st === focused;
            const lit = focused ? (st === focused ? 1 : 0.2) : on ? 1 : 0.86;
            const roofPx = st.w * cam.s;
            const open = st === focused ? 1 : arriving ? 0 : smooth(OPEN_FROM, OPEN_BY, roofPx);
            ctx.fillStyle = '#0b0a09';
            ctx.fillRect(st.x, st.y, st.w, st.h);
            // from the air: its signature film across the whole roof
            if (open < 1) {
                ctx.globalAlpha = (1 - open) * lit;
                picture(st.house.run?.[0]?.id || st.house.ids[0], st.x, st.y, st.w, st.h, roofPx * dpr);
            }
            // come close: every film it made
            if (open > 0) {
                ctx.globalAlpha = open * lit;
                const px = st.tileW * cam.s * dpr;
                for (const t of st.tiles) {
                    if (t.x > x1 || t.x + st.tileW < x0 || t.y > y1 || t.y + st.tileH < y0) continue;
                    picture(t.id, t.x, t.y, st.tileW, st.tileH, px);
                }
            }
            // its name across the foot of the roof, over a little dark
            const fs = fit.get(st) || 4;
            ctx.globalAlpha = 1;
            if (fs * cam.s >= 6.5) {
                const band = Math.min(st.h, fs * 2.6);
                const g = ctx.createLinearGradient(0, st.y + st.h - band, 0, st.y + st.h);
                g.addColorStop(0, 'rgba(5, 5, 5, 0)');
                g.addColorStop(1, `rgba(5, 5, 5, ${0.82 * (1 - open * 0.5)})`);
                ctx.fillStyle = g;
                ctx.fillRect(st.x, st.y + st.h - band, st.w, band);
                ctx.font = `500 ${fs}px Oswald`;
                ctx.letterSpacing = `${fs * 0.14}px`;
                ctx.fillStyle = on ? '#f0cf8e' : `rgba(241, 236, 226, ${0.3 + 0.68 * lit})`;
                ctx.fillText(st.house.name.toUpperCase(), st.x + fs * 0.55, st.y + st.h - fs * 0.6);
            }
            // the roof's edge, lit gold under a hand
            ctx.lineWidth = (on ? 2 : 1) / cam.s;
            ctx.strokeStyle = on ? 'rgba(217, 173, 98, 0.95)' : `rgba(241, 236, 226, ${0.12 * lit})`;
            ctx.strokeRect(st.x, st.y, st.w, st.h);
        }
        ctx.globalAlpha = 1;
    };

    const tick = (now) => {
        raf = 0;
        if (gone) return;
        let moving = false;
        if (flight) {
            const p = clamp((now - flight.t0) / flight.ms, 0, 1);
            const e = ease(p);
            const { from, to } = flight;
            // the scale travels in proportion, so a long crane reads as one smooth move
            cam.s = from.s * (to.s / from.s) ** e;
            cam.x = from.x + (to.x - from.x) * e;
            cam.y = from.y + (to.y - from.y) * e;
            moving = true;
            if (p >= 1) { const done = flight.done; flight = null; done?.(); }
        } else if (breathing && !focused) {
            // left alone over the lot, the crane breathes: a slow push in and out
            const o = overview();
            const t = (now - breath0) / 1000;
            cam.s = o.s * (1 + 0.05 * (1 - Math.cos(t / 5)) / 2);
            cam.x = o.x + Math.sin(t / 9) * plan.width * 0.012;
            cam.y = o.y;
            moving = true;
        }
        if (moving || dirty) { draw(); dirty = false; }
        if (moving) raf = requestAnimationFrame(tick);
    };
    function wake() { if (!raf && !gone) raf = requestAnimationFrame(tick); }
    const fly = (to, ms, done) => {
        flight = { from: { ...cam }, to, t0: performance.now(), ms, done };
        wake();
    };
    const breathe = () => { breathing = true; breath0 = performance.now(); wake(); };

    return {
        resize: () => {
            W = canvas.offsetWidth || 1;
            H = canvas.offsetHeight || 1;
            dpr = Math.min(2, window.devicePixelRatio || 1);
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            nameFits();
            dirty = true;
            wake();
        },
        setSheet: (img) => { sheet = img; SW = img.naturalWidth / index.cols; SH = img.naturalHeight / index.rows; dirty = true; wake(); },
        // where a point on the canvas falls: a roof, and (once it's open) the film under it
        pick: (px, py) => {
            const x = cam.x + (px - W / 2) / cam.s;
            const y = cam.y + (py - H / 2) / cam.s;
            const stage = plan.stages.find((st) => x >= st.x && x <= st.x + st.w && y >= st.y && y <= st.y + st.h);
            if (!stage) return null;
            const tile = stage.tiles.find((t) => x >= t.x && x <= t.x + stage.tileW && y >= t.y && y <= t.y + stage.tileH) || null;
            return { stage, tile };
        },
        hover: (stage) => { if (stage !== hovered) { hovered = stage; dirty = true; wake(); } },
        // the arrival: close over one roof, filling the screen, then the crane pulls up over the lot
        arrive: (stage, { still = false } = {}) => {
            const o = overview();
            if (still || !stage) { Object.assign(cam, o); dirty = true; wake(); return; }
            Object.assign(cam, { x: stage.x + stage.w / 2, y: stage.y + stage.h / 2, s: Math.max(W / stage.w, H / stage.h) * 1.02 });
            arriving = true;
            // the one picture, sharp, before anything shows (a moment at most), held a beat, then the crane
            const id = stage.house.run?.[0]?.id || stage.house.ids[0];
            stillFor(id, 'w780');
            const sharp = stills.get(`${id}@w780`);
            Promise.race([sharp ? sharp.decode().catch(() => {}) : Promise.resolve(), new Promise((r) => setTimeout(r, 600))]).then(() => {
                if (gone) return;
                dirty = true;
                wake();
                setTimeout(() => { if (!gone && !focused) fly(o, 2600, () => { arriving = false; breathe(); }); }, 450);
            });
        },
        // the crane down onto a roof, framed in a part of the screen: { x, y, w, h } as shares of it
        focus: (stage, frame = { x: 0, y: 0, w: 1, h: 1 }) => {
            focused = stage;
            arriving = false;
            breathing = false;
            const s = Math.min((frame.w * W) / (stage.w * 1.06), (frame.h * H) / (stage.h * 1.06));
            const ax = (frame.x + frame.w / 2) * W;
            const ay = (frame.y + frame.h / 2) * H;
            fly({ x: stage.x + stage.w / 2 - (ax - W / 2) / s, y: stage.y + stage.h / 2 - (ay - H / 2) / s, s }, 1100);
        },
        release: () => {
            focused = null;
            dirty = true;
            fly(overview(), 1000, breathe);
        },
        panBy: (dx, dy) => {
            flight = null;
            arriving = false;
            breathing = false;
            cam.x = clamp(cam.x - dx / cam.s, 0, plan.width);
            cam.y = clamp(cam.y - dy / cam.s, 0, plan.height);
            dirty = true;
            wake();
        },
        zoomAt: (px, py, factor) => {
            flight = null;
            arriving = false;
            breathing = false;
            const { min, max } = limits();
            const s = clamp(cam.s * factor, min, max);
            const wx = cam.x + (px - W / 2) / cam.s;
            const wy = cam.y + (py - H / 2) / cam.s;
            cam.s = s;
            cam.x = clamp(wx - (px - W / 2) / s, 0, plan.width);
            cam.y = clamp(wy - (py - H / 2) / s, 0, plan.height);
            dirty = true;
            wake();
        },
        destroy: () => { gone = true; cancelAnimationFrame(raf); },
    };
};
