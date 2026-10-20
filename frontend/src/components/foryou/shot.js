// One shot on the focus puller's monitor, as TheScreen, DepthStage and FocusRing share it.
//
// Two hands work a shot, as on a set: the focus puller's (`focus`: -1 focused close up, 0 on the
// film you loved, 1 on the pick, a little past either while it settles) and the dolly grip's
// (`camera`: 0 wide, 1 pushed in on the pick, CAMERA_OUT creeping on as the shot racks out).

export const CAMERA_OUT = 1.2;

// focus distances, in metres
export const CLOSE = 0.6; // where the ring rests between shots
export const NEAR = 1.1; // the film you loved, near the lens
export const FAR = 5; // the pick, far behind it

// where a distance sits on the ring: 0 at the lens's nearest focus, 1 at infinity (a real focus
// scale is close to even in 1/distance, which is why the far distances crowd together)
export const NEAREST = 0.45;
export const posOf = (m) => (m === Infinity ? 1 : 1 - NEAREST / m);

// focus (-1 close up, 0 your film, 1 the pick) to where it sits on the ring, and in metres
const RING = { close: posOf(CLOSE), near: posOf(NEAR), far: posOf(FAR) };
const ringAt = (f) => (f < 0 ? RING.near + f * (RING.near - RING.close) : RING.near + f * (RING.far - RING.near));
export const metresAt = (f) => {
    const p = ringAt(f);
    return p >= 1 ? Infinity : NEAREST / (1 - p);
};

// The playhead that runs the monitor through your picks (`at`): a whole number is a pick landed
// (0 the first, 1 the second…, on past the last back to the first); between two, the change from
// one to the next. The first quarter of a step racks the last pick out (focus slides off it, the
// camera creeps on); the rest is the next pick's shot: its seed comes sharp, focus racks to the
// pick, and the camera dollies in. So turning the ring by hand, or letting it turn itself, plays
// the same shots.
export const OUT_SHARE = 0.25;
const ease = (t) => t * t * (3 - 2 * t);
const span = (v, a, b) => Math.min(1, Math.max(0, (v - a) / (b - a)));
export const shotAt = (at) => {
    const i = Math.floor(at);
    const u = at - i;
    if (u < OUT_SHARE) {
        const w = ease(u / OUT_SHARE);
        return { k: i, focus: 1 - 2 * w, camera: 1 + (CAMERA_OUT - 1) * w };
    }
    const v = (u - OUT_SHARE) / (1 - OUT_SHARE);
    const focus = v < 0.3 ? -1 + ease(span(v, 0, 0.3)) : ease(span(v, 0.4, 0.72));
    const camera = 0.12 * ease(span(v, 0.4, 0.72)) + 0.88 * ease(span(v, 0.68, 1));
    return { k: i + 1, focus, camera };
};
