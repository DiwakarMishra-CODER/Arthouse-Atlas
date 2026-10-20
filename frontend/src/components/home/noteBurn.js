/**
 * The studio's note, cut and burnt, drawn on a canvas.
 *
 * Plain JavaScript, outside React, like mosaicRenderer. The memo is paper and
 * typewriter text, and three things happen to it, each a progress 0 → 1 given
 * by the page's scroll:
 *
 *   typed  how much of the note has been typed
 *   cut    a splicer's blade: a line of light runs across the sheet, then the
 *          sheet comes apart along it, the two halves shearing away
 *   burn   film stalled in a projector's gate: the paper browns, then holes
 *          open where it caught, ragged and rimmed white-hot, and spread until
 *          nothing is left. Through them, whatever is behind the canvas.
 *
 * The burn is a "burn time" for every cell of a coarse grid: distance from
 * where the fire caught, roughened by fractal noise. A cell is gone once the
 * burn passes its time and glows just before. The grid is 4 px a cell,
 * scaled up smooth, so a frame costs well under a millisecond.
 *
 * Nothing expensive happens per frame: the paper's soft shadow is blurred once
 * into a sprite per half, and the two halves are composed once into an
 * off-screen canvas and only recomposed while they move. A burning frame is a
 * handful of plain image copies.
 *
 * Usage: const note = createNoteBurn(canvas, { note, title, director, seed })
 *        note.resize(paperWidth) → { width, height }   (the canvas's css size)
 *        note.draw({ typed, cut, burn, time })          (time in seconds, for the caret and the flicker)
 */

const FONT = '"Courier Prime", "Courier New", monospace';
const PAPER = '#f1ead9';
const INK = '#2a241c';
const MARGIN = 56;            // room around the sheet for the halves to fall into and the fire to glow in
const CELL = 4;               // css px per burn-grid cell
const GLINT = 0.42;           // share of the cut spent on the blade's light; the rest, coming apart
// the burn's bands, in burn-time units, from the hole outwards
const EMBER = 0.008;          // inside the hole: still glowing
const RIM = 0.006;            // white-hot edge
const FLAME = 0.013;          // orange to deep red
const CHAR = 0.045;           // blackened
const SCORCH = 0.13;          // paper browning ahead of the fire

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOut = (t) => 1 - (1 - t) ** 3;
const mix = (a, b, t) => a + (b - a) * t;

// deterministic value noise and its fractal sum (seeded, so every film burns its own way, the same way each time)
const hash = (x, y, s) => {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const noise = (x, y, s) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const u = (x - xi) ** 2 * (3 - 2 * (x - xi));
    const v = (y - yi) ** 2 * (3 - 2 * (y - yi));
    const a = hash(xi, yi, s);
    const b = hash(xi + 1, yi, s);
    const c = hash(xi, yi + 1, s);
    const d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x, y, s) => {
    let v = 0;
    let amp = 0.5;
    for (let o = 0; o < 5; o++) { v += amp * noise(x * 2 ** o, y * 2 ** o, s + o * 17); amp /= 2; }
    return v / 0.96875;
};

const offscreen = () => document.createElement('canvas');

export const createNoteBurn = (canvas, { note, title, director, seed = 1 }) => {
    const ctx = canvas.getContext('2d');
    const sheet = offscreen();
    const sctx = sheet.getContext('2d');
    const composed = offscreen();      // both halves, in place, with their cut edges
    let composedKey = '';
    let shadows = [];                  // each half's soft shadow, blurred once
    // the burn's three layers, one pixel per grid cell: what's gone, the colour on the paper, the light
    const layers = { hole: offscreen(), tint: offscreen(), glow: offscreen(), halo: offscreen() };

    let dpr = 1;
    let pw = 0, ph = 0, W = 0, H = 0;
    let L = null;              // text layout
    let sheetKey = '';         // what the sheet canvas currently shows
    let field = null;          // burn time per grid cell, 0 → 1
    let paperCell = null;      // 1 where there is (or was) paper: only paper can glow
    let gw = 0, gh = 0;
    let images = null;

    const spaced = (c, text, x, y, spacing) => {
        for (const ch of text) { c.fillText(ch, x, y); x += c.measureText(ch).width + spacing; }
        return x;
    };
    const spacedWidth = (c, text, spacing) => [...text].reduce((w, ch) => w + c.measureText(ch).width + spacing, 0) - spacing;

    // wrap the whole note once, so lines don't reflow while it types
    const wrap = (c, text, width) => {
        const lines = [];
        let line = '';
        for (const word of text.split(' ')) {
            const next = line ? `${line} ${word}` : word;
            if (line && c.measureText(next).width > width) { lines.push(`${line} `); line = word; }
            else line = next;
        }
        lines.push(line);
        return lines;
    };

    const layout = () => {
        const wide = pw >= 480;
        const small = wide ? 11 : 10;
        const size = wide ? 27 : 20;
        const padX = wide ? 32 : 24;
        sctx.font = `400 ${size}px ${FONT}`;
        const lines = wrap(sctx, note, pw - padX * 2);
        const lh = Math.round(size * 1.375);
        const headTop = 20;
        const noteTop = headTop + small * 1.5 + 4 + small * 1.5 + 12 + 1 + 16;
        const textH = Math.max(lines.length * lh, wide ? 88 : 72);
        return { wide, small, size, padX, lines, lh, headTop, noteTop, height: Math.round(noteTop + textH + 28) };
    };

    // where the blade crosses the sheet, in sheet coordinates (left edge low, right edge high)
    const cutLine = () => ({ yl: ph * 0.72, yr: ph * 0.34 });

    const buildField = () => {
        gw = Math.ceil(W / CELL);
        gh = Math.ceil(H / CELL);
        const { yl, yr } = cutLine();
        const r = (k) => hash(k, seed, 99) - 0.5;
        // it catches at the cut first, then in three more places, so no corner is left to burn alone at the end
        const sparks = [
            { x: MARGIN + pw * (0.46 + r(1) * 0.2), y: MARGIN + (yl + yr) / 2 + ph * 0.1, at: 0 },
            { x: MARGIN + pw * (0.18 + r(2) * 0.1), y: MARGIN + ph * (0.3 + r(3) * 0.2), at: 0.14 },
            { x: MARGIN + pw * (0.82 + r(4) * 0.1), y: MARGIN + ph * (0.78 + r(5) * 0.15), at: 0.22 },
            { x: MARGIN + pw * (0.86 + r(6) * 0.08), y: MARGIN + ph * (0.14 + r(7) * 0.1), at: 0.3 },
        ];
        const reach = Math.hypot(pw, ph) * 0.62;
        field = new Float32Array(gw * gh);
        paperCell = new Uint8Array(gw * gh);
        let lo = Infinity, hi = -Infinity;
        for (let gy = 0; gy < gh; gy++) {
            for (let gx = 0; gx < gw; gx++) {
                const x = (gx + 0.5) * CELL;
                const y = (gy + 0.5) * CELL;
                let t = Infinity;
                for (const s of sparks) t = Math.min(t, s.at + Math.hypot(x - s.x, y - s.y) / reach);
                const v = t * 0.72 + fbm(x / 42, y / 42, seed) * 0.23 + fbm(x / 8, y / 8, seed + 50) * 0.05;
                field[gy * gw + gx] = v;
                const onSheet = x > MARGIN - 24 && x < MARGIN + pw + 24 && y > MARGIN - 24 && y < MARGIN + ph + 24;
                if (onSheet) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
                // the sheet, with room for the halves' shift (the lower one drops furthest)
                paperCell[gy * gw + gx] = x > MARGIN - 6 && x < MARGIN + pw + 12 && y > MARGIN - 9 && y < MARGIN + ph + 22 ? 1 : 0;
            }
        }
        for (let i = 0; i < field.length; i++) field[i] = (field[i] - lo) / (hi - lo);
        for (const c of [layers.hole, layers.tint, layers.glow]) { c.width = gw; c.height = gh; }
        layers.halo.width = Math.ceil(gw / 3);
        layers.halo.height = Math.ceil(gh / 3);
        images = {
            hole: layers.hole.getContext('2d').createImageData(gw, gh),
            tint: layers.tint.getContext('2d').createImageData(gw, gh),
            glow: layers.glow.getContext('2d').createImageData(gw, gh),
        };
    };

    const resize = (paperWidth) => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        pw = Math.round(paperWidth);
        L = layout();
        ph = L.height;
        W = pw + MARGIN * 2;
        H = ph + MARGIN * 2;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        canvas.style.width = `${W}px`;
        canvas.style.height = `${H}px`;
        sheet.width = Math.round(pw * dpr);
        sheet.height = Math.round(ph * dpr);
        sheetKey = '';
        composed.width = canvas.width;
        composed.height = canvas.height;
        composedKey = '';
        shadows = pieces().map(shadowOf);
        buildField();
        return { width: W, height: H };
    };

    // the memo itself: paper, ruled lines, header, and as much of the note as is typed
    const drawSheet = (chars, caret) => {
        const key = `${chars}|${caret}`;
        if (key === sheetKey) return;
        sheetKey = key;
        const c = sctx;
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, pw, ph);
        c.fillStyle = PAPER;
        c.fillRect(0, 0, pw, ph);
        c.fillStyle = 'rgba(42,36,28,0.07)';
        for (let y = 27; y < ph; y += 28) c.fillRect(0, y, pw, 1);
        // a little age at the edges
        const age = c.createRadialGradient(pw / 2, ph / 2, Math.min(pw, ph) * 0.35, pw / 2, ph / 2, Math.max(pw, ph) * 0.75);
        age.addColorStop(0, 'rgba(120,90,50,0)');
        age.addColorStop(1, 'rgba(120,90,50,0.14)');
        c.fillStyle = age;
        c.fillRect(0, 0, pw, ph);

        const { small, size, padX, lines, lh, headTop, noteTop } = L;
        c.textBaseline = 'top';
        c.fillStyle = INK;
        c.font = `700 ${small}px ${FONT}`;
        const left = spaced(c, 'STUDIO NOTES', padX, headTop + small * 0.25, small * 0.22);
        c.font = `400 ${small}px ${FONT}`;
        c.fillStyle = 'rgba(42,36,28,0.65)';
        let re = `RE: ${title.toUpperCase()}`;
        const room = pw - padX - left - 16;
        while (re.length > 4 && spacedWidth(c, re, small * 0.22) > room) re = `${re.slice(0, -2)}…`;
        spaced(c, re, pw - padX - spacedWidth(c, re, small * 0.22), headTop + small * 0.25, small * 0.22);
        const from = `FROM: THE STUDIO${director ? ` · TO: ${director.toUpperCase()}` : ''}`;
        spaced(c, from, padX, headTop + small * 1.5 + 4 + small * 0.25, small * 0.18);
        c.fillStyle = 'rgba(42,36,28,0.3)';
        c.fillRect(0, noteTop - 17, pw, 1);

        c.fillStyle = INK;
        c.font = `400 ${size}px ${FONT}`;
        let left2 = chars;
        let cx = padX, cy = noteTop;
        lines.forEach((line, i) => {
            if (left2 <= 0) return;
            const part = line.slice(0, left2);
            left2 -= line.length;
            const y = noteTop + i * lh + (lh - size) / 2;
            c.fillText(part, padX, y);
            cx = padX + c.measureText(part).width;
            cy = y;
        });
        if (caret) {
            const ch = c.measureText('M').width;
            c.fillRect(cx, cy - size * 0.05, ch * 0.55, size * 1.05);
        }
    };

    const pieces = () => {
        const { yl, yr } = cutLine();
        return [
            { poly: [[0, 0], [pw, 0], [pw, yr], [0, yl]], centre: [pw / 2, (yl + yr) / 4], move: [-3, -6], turn: -0.6 },
            { poly: [[0, yl], [pw, yr], [pw, ph], [0, ph]], centre: [pw / 2, (yl + yr + ph * 2) / 4], move: [7, 14], turn: 1.6 },
        ];
    };

    const trace = (c, poly) => {
        c.beginPath();
        poly.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.closePath();
    };

    // a half's shadow, blurred once: the polygon at an offset of SHADOW_PAD, lit from above
    const SHADOW_PAD = 90;
    const shadowOf = (piece) => {
        const c = offscreen();
        c.width = Math.round((pw + SHADOW_PAD * 2) * dpr);
        c.height = Math.round((ph + SHADOW_PAD * 2) * dpr);
        const x = c.getContext('2d');
        x.setTransform(dpr, 0, 0, dpr, SHADOW_PAD * dpr, SHADOW_PAD * dpr);
        x.shadowColor = 'rgba(0,0,0,1)';
        x.shadowBlur = 60 * dpr;
        x.shadowOffsetY = 26 * dpr;
        x.fillStyle = PAPER;
        trace(x, piece.poly);
        x.fill();
        return c;
    };

    // move into a half's place: shifted and turned about its own centre as it comes apart
    const place = (c, piece, apart) => {
        c.translate(MARGIN + piece.centre[0] + piece.move[0] * apart, MARGIN + piece.centre[1] + piece.move[1] * apart);
        c.rotate((piece.turn * apart * Math.PI) / 180);
        c.translate(-piece.centre[0], -piece.centre[1]);
    };

    const compose = (apart) => {
        const key = `${sheetKey}|${apart}`;
        if (key === composedKey) return;
        composedKey = key;
        const c = composed.getContext('2d');
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, W, H);
        for (const piece of pieces()) {
            c.save();
            place(c, piece, apart);
            trace(c, piece.poly);
            c.clip();
            c.drawImage(sheet, 0, 0, pw, ph);
            if (apart > 0) {
                // the cut edge catches a little shadow, so the halves read as paper
                const [[x0, y0], [x1, y1]] = piece.poly[0][1] === 0 ? [piece.poly[3], piece.poly[2]] : [piece.poly[0], piece.poly[1]];
                c.strokeStyle = `rgba(42,36,28,${0.35 * apart})`;
                c.lineWidth = 1.5;
                c.beginPath();
                c.moveTo(x0, y0);
                c.lineTo(x1, y1);
                c.stroke();
            }
            c.restore();
        }
    };

    // the burn's layers for this moment, into their small canvases
    const paintBurn = (burn, time) => {
        const front = burn * (1 + SCORCH + 0.02) - SCORCH;
        const { hole, tint, glow } = images;
        const H1 = hole.data, T1 = tint.data, G1 = glow.data;
        const flickerAt = time * 7;
        // the last quarter cools: what's left chars and goes dark instead of glittering
        const cool = 1 - clamp01((burn - 0.72) / 0.28);
        for (let i = 0, n = field.length; i < n; i++) {
            const e = field[i] - front;
            const o = i * 4;
            H1[o + 3] = e < -0.002 ? 255 : e < 0.002 ? Math.round((0.002 - e) / 0.004 * 255) : 0;

            let r = 0, g = 0, b = 0, a = 0;
            if (e < RIM) { r = 255; g = 238; b = 190; a = 1; }
            else if (e < RIM + FLAME) { const t = (e - RIM) / FLAME; r = mix(255, 110, t); g = mix(150, 22, t); b = mix(40, 6, t); a = 1; }
            else if (e < RIM + FLAME + CHAR) { const t = (e - RIM - FLAME) / CHAR; r = mix(110, 38, t); g = mix(22, 24, t); b = mix(6, 16, t); a = mix(1, 0.72, t); }
            else if (e < RIM + FLAME + CHAR + SCORCH) { const t = (e - RIM - FLAME - CHAR) / SCORCH; r = mix(70, 150, t); g = mix(42, 105, t); b = mix(20, 50, t); a = mix(0.7, 0, t ** 0.8); }
            T1[o] = r; T1[o + 1] = g; T1[o + 2] = b; T1[o + 3] = a * 255;

            let light = 0;
            if (paperCell[i] && e > -EMBER && e < RIM + FLAME) {
                light = e < 0 ? (1 + e / EMBER) * 0.35 : e < RIM ? 1 : 1 - (e - RIM) / FLAME;
                const gx = i % gw;
                const gy = (i - gx) / gw;
                light *= (0.62 + 0.38 * noise(gx * 0.18 + flickerAt, gy * 0.18 - flickerAt * 0.5, seed + 7)) * cool;
            }
            G1[o] = 255 * light; G1[o + 1] = 150 * light; G1[o + 2] = 55 * light; G1[o + 3] = 255 * light;
        }
        layers.hole.getContext('2d').putImageData(hole, 0, 0);
        layers.tint.getContext('2d').putImageData(tint, 0, 0);
        layers.glow.getContext('2d').putImageData(glow, 0, 0);
        const hc = layers.halo.getContext('2d');
        hc.clearRect(0, 0, layers.halo.width, layers.halo.height);
        hc.drawImage(layers.glow, 0, 0, layers.halo.width, layers.halo.height);
    };

    const draw = ({ typed = 1, cut = 0, burn = 0, time = 0 }) => {
        if (!L) return;
        const chars = Math.round(clamp01(typed) * note.length);
        // the caret blinks while there's nothing else happening to the note
        drawSheet(chars, cut <= 0 && (chars < note.length || Math.floor(time * 1.9) % 2 === 0));

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, W, H);
        ctx.imageSmoothingEnabled = true;

        const glint = clamp01(cut / GLINT);
        const apart = easeOut(clamp01((cut - GLINT) / (1 - GLINT)));
        const shadow = 0.6 * (1 - clamp01(burn * 4));

        if (shadow > 0.01) {
            ctx.globalAlpha = shadow;
            pieces().forEach((piece, k) => {
                ctx.save();
                place(ctx, piece, apart);
                ctx.drawImage(shadows[k], -SHADOW_PAD, -SHADOW_PAD, pw + SHADOW_PAD * 2, ph + SHADOW_PAD * 2);
                ctx.restore();
            });
            ctx.globalAlpha = 1;
        }
        compose(apart);
        ctx.drawImage(composed, 0, 0, W, H);

        // the blade's light, running along the cut, fading as the halves part
        if (cut > 0 && apart < 1) {
            const { yl, yr } = cutLine();
            const x = MARGIN + (pw + 24) * glint - 12;
            const y = MARGIN + yl + (yr - yl) * ((x - MARGIN) / pw);
            const fade = 1 - apart;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineCap = 'round';
            // a soft wide stroke under a thin bright one: the glow without a per-frame blur
            for (const [width, alpha] of [[7, 0.18], [3.5, 0.35], [1.6, 0.95]]) {
                ctx.strokeStyle = `rgba(255,244,228,${alpha * fade})`;
                ctx.lineWidth = width;
                ctx.beginPath();
                ctx.moveTo(MARGIN - 12, MARGIN + yl - (yr - yl) * (12 / pw));
                ctx.lineTo(x, y);
                ctx.stroke();
            }
            if (glint < 1) {
                const flare = ctx.createRadialGradient(x, y, 0, x, y, 26);
                flare.addColorStop(0, 'rgba(255,255,255,0.95)');
                flare.addColorStop(0.25, 'rgba(255,240,215,0.5)');
                flare.addColorStop(1, 'rgba(255,240,215,0)');
                ctx.fillStyle = flare;
                ctx.fillRect(x - 26, y - 26, 52, 52);
            }
            ctx.restore();
        }

        if (burn > 0) {
            paintBurn(burn, time);
            ctx.globalCompositeOperation = 'destination-out';
            ctx.drawImage(layers.hole, 0, 0, W, H);
            ctx.globalCompositeOperation = 'source-atop';
            ctx.drawImage(layers.tint, 0, 0, W, H);
            ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(layers.glow, 0, 0, W, H);
            ctx.globalAlpha = 0.6;
            ctx.drawImage(layers.halo, 0, 0, W, H);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }
    };

    return { resize, draw };
};
