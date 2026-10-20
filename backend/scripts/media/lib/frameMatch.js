/**
 * Is this the same frame, and is it a frame at all? For stills from TMDB.
 *
 * TMDB often has one frame under several file names: re-uploaded, re-encoded,
 * re-graded, or cropped tighter. A contact sheet showing it twice looks
 * careless, so new stills are checked against a film's frames two ways, on
 * small thumbnails (a few KB each):
 *
 *   dHash        a 64-bit gradient hash; ≤ 10 bits apart is the same picture
 *                (re-encodes, small grades)
 *   zoom match   the best normalised cross-correlation between one frame and
 *                any crop of the other (6 zooms × 7×7 offsets, both ways), on a
 *                32×18 grid; ≥ 0.85 is the same picture cropped or graded differently
 *   both         ≤ 16 bits and a zoom match ≥ 0.75: the same shot a beat later
 *                (a head turned, a hand raised), which reads as a repeat on a contact sheet
 *
 * Calibrated by eye on ~3,000 pairs from 58 films: duplicates scored 0.87–0.99 on
 * the zoom match; different frames reached 0.85–0.86 only when nearly empty (a
 * sky over a horizon), and different frames that came close on one test were far
 * apart on the other (23+ bits, or a zoom match ≤ 0.64). The rules lean towards
 * calling a pair the same, since skipping a distinct candidate costs little and
 * showing a frame twice is the visible failure.
 *
 * Artwork: TMDB's textless backdrops include fan and key art: cut-outs on white,
 * vignettes, collages, illustrations. Their tell is a digitally flat fill, so a
 * candidate is skipped when a quarter of its picture (above near-black) is flat:
 * every channel within 3 levels across a 5×5 patch, on the 185-px thumbnail. In
 * a sample of 1,345 frames, 3% scored that high; by eye ~85% of those were
 * artwork and the rest real frames with a white sky or snow (replaced by the
 * next candidate). Painted key art with texture isn't caught.
 */
import sharp from 'sharp';

export const DHASH_SAME = 10;
export const ZOOM_SAME = 0.85;
export const SHOT_BITS = 16;
export const SHOT_ZOOM = 0.75;
export const FLAT_ARTWORK = 0.25;

const GW = 32;
const GH = 18;
const SCALES = [1, 0.9, 0.8, 0.7, 0.6, 0.5];
const STEPS = 7;

const thumbUrl = (file) => `https://image.tmdb.org/t/p/w185/${file}`;

const fetchBuffer = async (url, attempt = 0) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw Object.assign(new Error(`${res.status} ${url}`), { status: res.status });
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    if (err.status === 404 || attempt >= 3) throw err;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    return fetchBuffer(url, attempt + 1);
  }
};

// Bilinear sample of a crop onto the GW×GH grid, normalised to mean 0, sd 1
const sampleCrop = (img, x0, y0, cw, ch) => {
  const out = new Float32Array(GW * GH);
  for (let gy = 0; gy < GH; gy++) {
    for (let gx = 0; gx < GW; gx++) {
      const x = x0 + ((gx + 0.5) / GW) * cw - 0.5;
      const y = y0 + ((gy + 0.5) / GH) * ch - 0.5;
      const xi = Math.max(0, Math.min(img.w - 2, Math.floor(x)));
      const yi = Math.max(0, Math.min(img.h - 2, Math.floor(y)));
      const fx = Math.min(1, Math.max(0, x - xi));
      const fy = Math.min(1, Math.max(0, y - yi));
      const p = (xx, yy) => img.d[yy * img.w + xx];
      out[gy * GW + gx] = p(xi, yi) * (1 - fx) * (1 - fy) + p(xi + 1, yi) * fx * (1 - fy)
        + p(xi, yi + 1) * (1 - fx) * fy + p(xi + 1, yi + 1) * fx * fy;
    }
  }
  let mean = 0;
  for (const v of out) mean += v;
  mean /= out.length;
  let ss = 0;
  for (let k = 0; k < out.length; k++) { out[k] -= mean; ss += out[k] * out[k]; }
  const sd = Math.sqrt(ss / out.length) || 1;
  for (let k = 0; k < out.length; k++) out[k] /= sd;
  return out;
};

// Everything the comparisons need, computed once per image (any image buffer)
export const fingerprintBuffer = async (buf, file) => {
  const { data, info } = await sharp(buf).resize(92, null, { withoutEnlargement: true }).grayscale().raw().toBuffer({ resolveWithObject: true });
  const img = { w: info.width, h: info.height, d: Float32Array.from(data) };
  // dHash: 9×8 grayscale, each pixel brighter than its right neighbour → 1
  const { data: small } = await sharp(buf).grayscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  let hash = 0n;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) hash = (hash << 1n) | (small[y * 9 + x] > small[y * 9 + x + 1] ? 1n : 0n);
  const crops = [];
  for (const s of SCALES) {
    const cw = img.w * s;
    const ch = img.h * s;
    const n = s === 1 ? 1 : STEPS;
    for (let ix = 0; ix < n; ix++) {
      for (let iy = 0; iy < n; iy++) {
        const x0 = n === 1 ? 0 : ((img.w - cw) * ix) / (n - 1);
        const y0 = n === 1 ? 0 : ((img.h - ch) * iy) / (n - 1);
        crops.push(sampleCrop(img, x0, y0, cw, ch));
      }
    }
  }
  return { file, hash, full: crops[0], crops };
};

// Share of the picture (above near-black) that is a flat fill: the artwork tell
export const flatShare = async (buf) => {
  const { data, info } = await sharp(buf).resize(185, null, { withoutEnlargement: true }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const R = 2;
  let flat = 0;
  let n = 0;
  for (let y = R; y < h - R; y++) {
    for (let x = R; x < w - R; x++) {
      n++;
      const o = (y * w + x) * 3;
      if (0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2] <= 40) continue;
      let ok = true;
      for (let c = 0; c < 3 && ok; c++) {
        let mn = 255;
        let mx = 0;
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const v = data[((y + dy) * w + x + dx) * 3 + c]; if (v < mn) mn = v; if (v > mx) mx = v; }
        if (mx - mn > 3) ok = false;
      }
      if (ok) flat++;
    }
  }
  return flat / n;
};

// A TMDB image by file name ('abc.jpg'): its fingerprint and flat share, from one 185-px thumbnail
export const analyse = async (file) => {
  const buf = await fetchBuffer(thumbUrl(file));
  return { fp: await fingerprintBuffer(buf, file), flat: await flatShare(buf) };
};

const hamming = (a, b) => { let x = a ^ b; let n = 0; while (x) { n += Number(x & 1n); x >>= 1n; } return n; };
const dot = (a, b) => { let s = 0; for (let k = 0; k < a.length; k++) s += a[k] * b[k]; return s / a.length; };
const zoomMatch = (A, B) => {
  let best = -1;
  for (const c of B.crops) { const v = dot(A.full, c); if (v > best) best = v; }
  for (const c of A.crops) { const v = dot(B.full, c); if (v > best) best = v; }
  return best;
};

export const compare = (A, B) => {
  const bits = hamming(A.hash, B.hash);
  const zoom = zoomMatch(A, B);
  return { bits, zoom, same: bits <= DHASH_SAME || zoom >= ZOOM_SAME || (bits <= SHOT_BITS && zoom >= SHOT_ZOOM) };
};
