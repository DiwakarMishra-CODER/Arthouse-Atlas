/**
 * The world map of the atlas: the earth at night.
 *
 * Like the night side of the planet seen from orbit. The continents are bare
 * dark silhouettes, no borders, no grid, and cinema is light: every country the
 * atlas has films from carries a scatter of tiny warm lights inside its borders
 * and a soft halo, dark until its cinema happens. As the year moves, a
 * country's lights come up while its films are being made and settle to a
 * faint glow once its history is made.
 *
 * Two levels, like a real map. The world: countries, hovered and clicked. A
 * country: click one and the camera flies in until it fills the frame, the
 * rest of the world sinking into the dark, and each of its films becomes its
 * own light placed across the land — hovered and clicked one by one.
 *
 * The world view is drawn from layers painted once, off-screen; the country
 * view is drawn live from the vector shapes as the projection animates, so it
 * stays sharp at any zoom. Draws only while on screen.
 *
 * Usage: const map = createAtlasRenderer(canvas, { topo, regions, model, getYear, getAll, onStatus, onHover, onFilmHover })
 *   getAll() (0..1, default 0): how far every film shows at once, whatever the year: a country lit by
 *   how many films it has (a member's own atlas rests there)
 *   map.setPointer(x, y) / setPointer(null) · map.setHighlight(key) · map.setSelected(key | null, { instant })
 *   map.setFilmHighlight(id) · map.filmAtPointer() · map.resize() · map.destroy()
 */
import { geoArea, geoBounds, geoCentroid, geoCircle, geoContains, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';

const WINDOW = 4.5;          // years either side of the slider in which a film counts as happening
const FULL = 2.5;            // this much happening lights a country fully
const AT_REST = 0.07;        // how much a country's lights show before its cinema has begun…
const MADE = 0.2;            // …and once its films are made
const FLY = 1100;            // ms the camera takes to fly into a country or back out
const PANEL = 0.4;           // share of the width the film list takes when a country is open (wide screens)

const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const hashOf = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2147483647, 7) || 7;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// a soft warm light, rendered once and stamped for each film in a country
const glowSprite = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,244,220,1)');
    grad.addColorStop(0.15, 'rgba(255,214,150,0.9)');
    grad.addColorStop(0.45, 'rgba(240,170,90,0.25)');
    grad.addColorStop(1, 'rgba(240,170,90,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return c;
};

// `room` is the strip at the foot of the canvas kept clear of land for the controls laid over it (px):
// a little for the world, all of it for a country
export const createAtlasRenderer = (canvas, { topo, regions, model, getYear, getAll = () => 0, room = () => ({ world: 0, country: 0 }), onStatus = () => {}, onHover = () => {}, onFilmHover = () => {} }) => {
    const ctx = canvas.getContext('2d');
    const world = feature(topo, topo.objects.countries).features.filter((f) => f.properties.name !== 'Antarctica');
    const byName = new Map(world.map((f) => [f.properties.name, f]));
    const { shapes } = model;
    const glow = glowSprite();

    let W = 0, H = 0, dpr = 1;
    let worldProjection = null;
    let land = null;          // the dark continents (world view)
    const lit = new Map();    // key → { path, sparks, halo, x, y, w, h, area, weight }
    let pointer = null;
    let hovered = null;
    let highlight = null;
    let selected = null;
    let filmHighlight = null;
    let hoveredFilm = null;
    let raf = 0;
    let visible = true;
    let lastYear = null;

    // the camera: it glides from wherever it is to wherever it's sent (a country, or back to the world).
    // p is the projection (scale, translate); l is how far into a country we are (0 world, 1 inside)
    const fly = { key: null, films: [], fromP: null, toP: null, fromL: 0, toL: 0, start: 0 };
    const params = (proj) => ({ s: proj.scale(), t: proj.translate(), r: proj.rotate()[0] });

    const shapeOf = (key) => (key.startsWith('point:')
        ? geoCircle().center(regions.points[key.slice(6)]).radius(1.6)()
        : byName.get(key));

    // a country's main landmass: what the camera frames and where its films go — France without
    // French Guiana, the United States without Alaska and Hawaii (the whole shape is still drawn)
    const mainland = (shape) => {
        if (shape.geometry?.type !== 'MultiPolygon') return shape;
        const parts = shape.geometry.coordinates.map((c) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: c } }));
        return parts.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a));
    };

    const layer = (w, h) => {
        const c = document.createElement('canvas');
        c.width = Math.ceil(w * dpr);
        c.height = Math.ceil(h * dpr);
        const g = c.getContext('2d');
        g.scale(dpr, dpr);
        return [c, g];
    };

    // a country across the 180° line (Russia) is seen turned, so it sits whole in the frame;
    // everywhere else the map doesn't turn
    const turnFor = (key) => {
        const [[x0], [x1]] = geoBounds(mainland(shapeOf(key)));
        return x1 < x0 ? -geoCentroid(mainland(shapeOf(key)))[0] : 0;
    };

    // where the camera ends up for a country: fitted into the frame left of the film list
    const countryProjection = (key) => {
        const right = W >= 900 ? W * (1 - PANEL) : W;
        return geoNaturalEarth1()
            .rotate([turnFor(key), 0])
            .fitExtent([[W * 0.06, H * 0.12], [right - W * 0.04, Math.min(H * 0.88, H - room().country)]], mainland(shapeOf(key)));
    };

    // each film's place inside its country, the same every time
    const placeFilms = (key) => {
        const shape = mainland(shapeOf(key));
        let [[x0, y0], [x1, y1]] = geoBounds(shape);
        // a country across the 180° line (Russia) has bounds that wrap: its east edge has the smaller longitude
        if (x1 < x0) x1 += 360;
        const wrap = (lon) => ((lon + 540) % 360) - 180;
        const centre = geoCentroid(shape);
        return model.filmsFor(key).map((f, i) => {
            const rnd = seeded(hashOf(f.id));
            for (let k = 0; k < 120; k++) {
                const p = [wrap(x0 + rnd() * (x1 - x0)), y0 + rnd() * (y1 - y0)];
                if (geoContains(shape, p)) return { f, at: p };
            }
            // never stack films on one point: any that can't be placed fan out around the centre
            const a = i * 2.399963;
            return { f, at: [centre[0] + Math.cos(a) * 0.6 * Math.sqrt(i), centre[1] + Math.sin(a) * 0.4 * Math.sqrt(i)] };
        });
    };

    const resize = () => {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = canvas.clientWidth;
        H = canvas.clientHeight;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);

        worldProjection = geoNaturalEarth1().fitExtent([[12, 12], [W - 12, H - 12 - room().world]], { type: 'FeatureCollection', features: world });
        const path = geoPath(worldProjection);

        const [l, lg] = layer(W, H);
        lg.fillStyle = 'rgba(255,255,255,0.045)';
        for (const f of world) lg.fill(new Path2D(path(f)));
        land = l;

        const blur = Math.max(6, W / 90);
        const pad = Math.ceil(blur * 2.5);
        const density = 1 / Math.max(28, (W / 1200) * 40);
        lit.clear();
        shapes.forEach((_, key) => {
            let p;
            let box;
            if (key.startsWith('point:')) {
                const [x, y] = worldProjection(regions.points[key.slice(6)]);
                const r = Math.max(3, W / 300);
                p = new Path2D();
                p.arc(x, y, r, 0, Math.PI * 2);
                box = [[x - r, y - r], [x + r, y + r]];
            } else {
                const f = byName.get(key);
                if (!f) return;
                p = new Path2D(path(f));
                box = path.bounds(f);
            }
            const x0 = Math.floor(box[0][0]) - pad;
            const y0 = Math.floor(box[0][1]) - pad;
            const w = Math.ceil(box[1][0] - box[0][0]) + pad * 2;
            const h = Math.ceil(box[1][1] - box[0][1]) + pad * 2;

            const [sc, sg] = layer(w, h);
            sg.translate(-x0, -y0);
            sg.save();
            sg.clip(p);
            const rnd = seeded(hashOf(key));
            const n = Math.max(6, Math.round((w - pad * 2) * (h - pad * 2) * density));
            for (let i = 0; i < n; i++) {
                const x = box[0][0] + rnd() * (box[1][0] - box[0][0]);
                const y = box[0][1] + rnd() * (box[1][1] - box[0][1]);
                const big = rnd() < 0.12;
                sg.fillStyle = big ? 'rgba(255,244,220,0.95)' : 'rgba(255,214,150,0.75)';
                sg.beginPath();
                sg.arc(x, y, big ? 1.1 : 0.6, 0, Math.PI * 2);
                sg.fill();
            }
            sg.restore();

            const [hc, hg] = layer(w, h);
            hg.translate(-x0, -y0);
            hg.filter = `blur(${blur}px)`;
            hg.fillStyle = 'rgba(255,190,110,0.55)';
            hg.fill(p);

            // big countries need more films to blaze: light spreads over the whole country
            const area = key.startsWith('point:') ? 0 : path.area(byName.get(key));
            lit.set(key, { path: p, sparks: sc, halo: hc, x: x0, y: y0, w, h, area });
        });
        const france = lit.get('France')?.area || 1;
        lit.forEach((d) => { d.weight = Math.min(3, Math.max(1, Math.sqrt(d.area / france))); });
        // a resize mid-flight lands the camera where it was going
        if (fly.key) {
            fly.toP = fly.toL ? params(countryProjection(fly.key)) : params(worldProjection);
            fly.fromP = fly.toP;
        }
    };
    resize();

    const happening = (s, year, weight = 1) => {
        let a = 0;
        let made = 0;
        let count = 0;
        for (const f of s.films) {
            const d = Math.abs(f.y - year);
            if (d < WINDOW) { a += 1 - d / WINDOW; count++; }
            if (f.y <= year) made++;
        }
        return { bright: Math.min(1, a / (FULL * weight)), made, now: a, count };
    };

    const camera = (now) => {
        const e = ease(Math.min(1, (now - fly.start) / FLY));
        const s = Math.exp(Math.log(fly.fromP.s) + (Math.log(fly.toP.s) - Math.log(fly.fromP.s)) * e);
        const t = [fly.fromP.t[0] + (fly.toP.t[0] - fly.fromP.t[0]) * e, fly.fromP.t[1] + (fly.toP.t[1] - fly.fromP.t[1]) * e];
        const r = fly.fromP.r + (fly.toP.r - fly.fromP.r) * e;
        return { s, t, r, l: fly.fromL + (fly.toL - fly.fromL) * e, done: e >= 1 };
    };

    // the world: cached layers, countries hovered and clicked
    const drawWorld = (year, fade) => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = fade;
        ctx.drawImage(land, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const ranked = [];
        let hit = null;
        const all = getAll();
        lit.forEach((d, key) => {
            const s = shapes.get(key);
            const h = happening(s, year, d.weight);
            // every film at once: lit by how many it has for its size (even one shows; a vast country needs more)
            const bright = all ? h.bright * (1 - all) + Math.min(1, (0.3 + s.films.length / FULL) / d.weight) * all : h.bright;
            const { made, count } = h;
            const now = all ? h.now * (1 - all) + s.films.length * all : h.now;
            const focus = key === hovered || key === highlight;
            const halo = Math.max(bright, focus ? 0.5 : 0) * fade;
            if (halo > 0.01) {
                ctx.globalAlpha = halo;
                ctx.drawImage(d.halo, d.x, d.y, d.w, d.h);
            }
            ctx.globalAlpha = Math.max(bright, made ? MADE : AT_REST, focus ? 0.75 : 0) * fade;
            ctx.drawImage(d.sparks, d.x, d.y, d.w, d.h);
            if (focus && fade > 0.5) {
                ctx.globalAlpha = 0.7;
                ctx.strokeStyle = 'rgba(255,236,200,0.9)';
                ctx.lineWidth = 0.8;
                ctx.stroke(d.path);
            }
            if (now > 0) ranked.push({ key, now, count });
            if (pointer && fade > 0.5 && ctx.isPointInPath(d.path, pointer.x * dpr, pointer.y * dpr)) hit = key;
        });
        return { ranked, hit };
    };

    // a country: live vector shapes under an animated projection, its films as lights
    const drawCountry = (year, cam) => {
        const t = cam.l;
        const projection = geoNaturalEarth1().rotate([cam.r, 0]).scale(cam.s).translate(cam.t);
        const path = geoPath(projection, ctx);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // the rest of the world sinks into the dark as the camera arrives
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(255,255,255,${0.045 * (1 - 0.6 * t)})`;
        for (const f of world) {
            ctx.beginPath();
            path(f);
            ctx.fill();
        }
        // the country itself: a faint warm ground and a lit coastline
        const shape = shapeOf(fly.key);
        ctx.beginPath();
        path(shape);
        ctx.fillStyle = `rgba(255,200,130,${0.07 * t})`;
        ctx.fill();
        ctx.shadowColor = 'rgba(246,212,143,0.7)';
        ctx.shadowBlur = 14 * t;
        ctx.strokeStyle = `rgba(255,236,200,${0.65 * t})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // its films, each a light: blazing near the year, glowing softly otherwise
        let best = Infinity;
        let hit = null;
        const size = Math.max(18, Math.min(W, H) / 20);
        for (const { f, at } of fly.films) {
            const [x, y] = projection(at);
            const d = Math.abs(f.y - year);
            const blaze = Math.max(d < WINDOW ? 1 - d / WINDOW : 0, getAll());
            const strong = f.r != null && f.r <= 150;
            const on = f.id === filmHighlight || (hoveredFilm && f.id === hoveredFilm.id);
            const light = Math.max(0.55, blaze) * t;
            const r = size * (strong ? 1.25 : 1) * (on ? 1.8 : 1) * (0.7 + 0.5 * blaze);
            ctx.globalAlpha = light;
            ctx.drawImage(glow, x - r / 2, y - r / 2, r, r);
            if (on) {
                ctx.globalAlpha = t;
                ctx.strokeStyle = '#fff6e4';
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.arc(x, y, r * 0.32, 0, Math.PI * 2);
                ctx.stroke();
            }
            if (pointer && t > 0.9) {
                const dist = Math.hypot(x - pointer.x, y - pointer.y);
                if (dist < Math.max(10, r * 0.4) && dist < best) { best = dist; hit = { f, x, y }; }
            }
        }
        ctx.globalAlpha = 1;
        return hit;
    };

    const frame = (now) => {
        raf = requestAnimationFrame(frame);
        if (!visible) return;
        const year = getYear();
        const cam = fly.key ? camera(now) : null;
        if (cam && fly.toL === 0 && cam.done) fly.key = null; // landed back on the world
        const t = fly.key ? cam.l : 0;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let ranked = [];
        let hit = null;
        let filmHit = null;
        if (fly.key && t > 0) {
            // the world's lights fade as the camera leaves it
            if (t < 0.35) ({ ranked } = drawWorld(year, 1 - t / 0.35));
            filmHit = drawCountry(year, cam);
        } else {
            ({ ranked, hit } = drawWorld(year, 1));
        }

        if (hit !== hovered) { hovered = hit; onHover(hit); }
        const film = filmHit?.f || null;
        if ((film && film.id) !== (hoveredFilm && hoveredFilm.id)) {
            hoveredFilm = film;
            onFilmHover(filmHit ? { film: filmHit.f, x: filmHit.x, y: filmHit.y } : null);
        }
        canvas.style.cursor = hovered || hoveredFilm ? 'pointer' : 'default';

        const y = Math.round(year);
        if (y !== lastYear && !fly.key) {
            lastYear = y;
            ranked.sort((a, b) => b.now - a.now);
            onStatus({ year: y, top: ranked.slice(0, 3).map((r) => r.key) });
        } else if (y !== lastYear) {
            lastYear = y;
            onStatus({ year: y, top: [] });
        }
    };
    raf = requestAnimationFrame(frame);

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);

    // { instant } lands the camera without the flight — for coming back to a country you'd opened
    const setSelected = (key, { instant = false } = {}) => {
        if (key === selected) return;
        const now = performance.now();
        // the camera sets off from exactly where it is now
        const here = fly.key ? camera(now) : { ...params(worldProjection), l: 0 };
        fly.fromP = { s: here.s, t: here.t, r: here.r };
        fly.fromL = here.l;
        fly.start = now;
        if (key) {
            fly.key = key;
            fly.films = placeFilms(key);
            fly.toP = params(countryProjection(key));
            fly.toL = 1;
        } else if (fly.key) {
            fly.toP = params(worldProjection);
            fly.toL = 0;
        }
        if (instant) fly.start = now - FLY;
        selected = key;
        hoveredFilm = null;
        onFilmHover(null);
    };

    return {
        resize,
        setPointer: (x, y) => { pointer = x == null ? null : { x, y }; },
        setHighlight: (key) => { highlight = key; },
        setSelected,
        setFilmHighlight: (id) => { filmHighlight = id; },
        filmAtPointer: () => hoveredFilm,
        destroy: () => { cancelAnimationFrame(raf); io.disconnect(); }
    };
};
