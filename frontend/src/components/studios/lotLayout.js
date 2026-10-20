/**
 * The Lot's plan: a studio backlot at night, seen from a crane. From the air every house is one lit
 * roof showing its signature film, sized by how many films it has, the roofs fitted edge to edge
 * into districts (one for each country, and one for the labels) with streets and avenues between.
 * Come down onto a roof and it opens into the house's films, every one of them, in the order it made
 * them. World units: the lot is 1600 wide.
 *
 * layout(houses) -> { width, height, districts: [{ name, x, y, w, h }],
 *   stages: [{ house, x, y, w, h, tileW, tileH, tiles: [{ id, x, y }] }] }
 */

const WIDTH = 1600;
const HEIGHT = 1000;
const AVENUE = 7; // between two districts
const STREET = 2.2; // between two roofs
const SIGN = 15; // a district's name, above its roofs
const GAP = 0.6; // between two films, once a roof opens

const COUNTRY = { 'United States of America': 'United States' };
// a house's share of the lot: more films, more roof, but a small house still gets a roof you can see
const weightOf = (house) => Math.max(1, house.count) ** 0.55;

// a squarified treemap: rectangles for the values, as close to square as they'll go
const worst = (row, side) => {
    const sum = row.reduce((t, r) => t + r.area, 0);
    const max = Math.max(...row.map((r) => r.area));
    const min = Math.min(...row.map((r) => r.area));
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
};
const squarify = (items, rect) => {
    const total = items.reduce((t, i) => t + i.value, 0);
    const queue = items.map((item) => ({ item, area: (item.value / total) * rect.w * rect.h }));
    let { x, y, w, h } = rect;
    const out = [];
    while (queue.length) {
        const side = Math.min(w, h);
        const row = [queue.shift()];
        while (queue.length && worst([...row, queue[0]], side) <= worst(row, side)) row.push(queue.shift());
        const sum = row.reduce((t, r) => t + r.area, 0);
        if (w >= h) {
            const cw = sum / h;
            let cy = y;
            row.forEach((r) => { const rh = r.area / cw; out.push({ ...r.item, x, y: cy, w: cw, h: rh }); cy += rh; });
            x += cw;
            w -= cw;
        } else {
            const rh = sum / w;
            let cx = x;
            row.forEach((r) => { const cw = r.area / rh; out.push({ ...r.item, x: cx, y, w: cw, h: rh }); cx += cw; });
            y += rh;
            h -= rh;
        }
    }
    return out;
};

// a roof's films, as big as they'll go, laid out in rows inside it
const filmsIn = (ids, w, h) => {
    const n = ids.length || 1;
    let best = { cols: 1, tw: 0 };
    for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols);
        const tw = Math.min((w - GAP * (cols - 1)) / cols, ((h - GAP * (rows - 1)) / rows) * (16 / 9));
        if (tw > best.tw) best = { cols, tw };
    }
    const tileW = best.tw;
    const tileH = (tileW * 9) / 16;
    const rows = Math.ceil(n / best.cols);
    const ox = (w - (best.cols * tileW + (best.cols - 1) * GAP)) / 2;
    const oy = (h - (rows * tileH + (rows - 1) * GAP)) / 2;
    return { tileW, tileH, tiles: ids.map((id, i) => ({ id, x: ox + (i % best.cols) * (tileW + GAP), y: oy + Math.floor(i / best.cols) * (tileH + GAP) })) };
};

export const layout = (houses) => {
    const groups = new Map();
    houses.forEach((h) => {
        const name = h.kind === 'label' ? 'Labels' : COUNTRY[h.country] || h.country;
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name).push(h);
    });
    const districtItems = [...groups]
        .map(([name, list]) => ({ name, list: list.sort((a, b) => b.count - a.count), value: list.reduce((t, h) => t + weightOf(h), 0) }))
        .sort((a, b) => b.value - a.value);
    const districts = squarify(districtItems, { x: 0, y: 0, w: WIDTH, h: HEIGHT });
    const stages = districts.flatMap((d) => {
        const inner = { x: d.x + AVENUE / 2, y: d.y + AVENUE / 2 + SIGN, w: d.w - AVENUE, h: d.h - AVENUE - SIGN };
        return squarify(d.list.map((house) => ({ house, value: weightOf(house) })), inner).map((r) => {
            const x = r.x + STREET / 2;
            const y = r.y + STREET / 2;
            const w = Math.max(1, r.w - STREET);
            const h = Math.max(1, r.h - STREET);
            const inside = filmsIn(r.house.ids, w, h);
            return { house: r.house, x, y, w, h, tileW: inside.tileW, tileH: inside.tileH, tiles: inside.tiles.map((t) => ({ id: t.id, x: x + t.x, y: y + t.y })) };
        });
    });
    return { width: WIDTH, height: HEIGHT, districts: districts.map(({ name, x, y, w, h }) => ({ name, x: x + AVENUE / 2, y: y + AVENUE / 2, w: w - AVENUE, h: h - AVENUE })), stages };
};
