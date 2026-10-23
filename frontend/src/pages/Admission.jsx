import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import BackButton from '../components/BackButton';
import { useAuth } from '../context/AuthContext';
import { useMotionPreference } from '../hooks/useMotionPreference';
import GoogleAuthButton from '../components/GoogleAuthButton';
import Slate from '../components/admission/Slate';
import { pic } from '../components/directors/arrange';
import { usePageTitle } from '../hooks/usePageTitle';

/**
 * Sign in and Join: your first take. The shot is a film from the atlas, waiting in the dark, and while
 * the crew sets up it changes every few seconds, the camera creeping in on each; once you're writing on
 * the slate it holds (quiet on set). In front of it, an assistant holds up the slate, never quite still. Its rows are the form. "Action" marks the
 * take: the sticks clap shut, the frame jolts, the slate whips out of shot, the picture comes up to
 * full light and the camera pushes in, and you're back where you were, signed in. A wrong password is just
 * another take: the slate shakes, the take counts up, and the chalk says what went wrong.
 *
 * One page for both (scene "in" or "join"): switching scenes swaps the slate rather than the page.
 */

const OPEN = -11; // the top stick, open (degrees: the stick is the slate's full width, so its end rises far)
const TILT = -1.5; // how the slate is held
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STAY = 3200; // ms on each shot while the crew sets up
const ASIDE = 22; // vw the shot stands to the right of the slate on a wide screen, so the slate never hides a face
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// how bright a film's still is, from its average colour (0–255)
const light = (hex) => (hex?.length === 7 ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).reduce((s, v, i) => s + v * [0.3, 0.59, 0.11][i], 0) : 0);
const today = () => {
    const d = new Date();
    return [d.getDate(), d.getMonth() + 1, d.getFullYear() % 100].map((n) => String(n).padStart(2, '0')).join('.');
};

// what's wrong before the take is even shot
const check = (scene, v) => {
    if (scene === 'join' && v.name.trim().length < 3) return 'A name needs 3 letters or more.';
    if (!EMAIL.test(v.email.trim())) return v.email.trim() ? 'That email doesn’t look right.' : 'Type your email.';
    if (!v.password) return 'Type your password.';
    if (scene === 'join' && v.password.length < 6) return 'A password needs 6 characters or more.';
    return null;
};
// what went wrong, in plain words
const say = (err) => {
    if (!err?.response) return 'Couldn’t reach the atlas. Try again in a moment.';
    const m = err.response.data?.message || '';
    if (err.response.status === 429) return 'Too many takes. Wait a minute, then go again.';
    if (/invalid credentials/i.test(m)) return 'That email and password don’t match.';
    if (/already exists/i.test(m)) return 'That name or email already has an account.';
    if (/valid email/i.test(m)) return 'That email doesn’t look right.';
    return m || 'Something went wrong. Try again.';
};

const Admission = ({ scene }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const reducedMotion = useMotionPreference();
    usePageTitle(scene === 'join' ? 'Join' : 'Sign in');
    const { login, register, isAuthenticated, loading: authLoading } = useAuth();
    const from = location.state?.from;
    const dest = from && !/^\/(login|register)/.test(from) ? from : '/';

    const [shown, setShown] = useState(scene); // the scene on the slate (it changes once the slate's swapped)
    const [values, setValues] = useState({ name: '', email: '', password: '' });
    const [show, setShow] = useState(false);
    const [take, setTake] = useState(1);
    const [error, setError] = useState('');
    const [phase, setPhase] = useState('idle'); // idle · rolling (asking the atlas) · cut (signed in, playing out)
    const [slow, setSlow] = useState(false);
    const [shots, setShots] = useState([]); // the last two shots up (the newest on top), each decoded first
    const film = shots.at(-1);
    // quiet on set: once you're writing on the slate (or the take is rolling), the shot holds
    const quiet = useRef(false);
    const inside = useRef(false);
    const typed = useRef(false);
    const [date] = useState(today);
    const [fine] = useState(() => !!window.matchMedia?.('(pointer: fine)').matches); // (a phone's keyboard isn't pushed up unasked)

    // the camera: the slate's place and angle, its sticks, the frame's jolt, and the set behind
    const y = useMotionValue(typeof window === 'undefined' ? 900 : window.innerHeight);
    const rot = useMotionValue(7);
    const x = useMotionValue(0);
    const stick = useMotionValue(OPEN);
    const jolt = useMotionValue(0);
    const dark = useMotionValue(1); // the shot, waiting in the dark
    const push = useMotionValue(1);
    const [wide] = useState(() => !!window.matchMedia?.('(min-width: 1024px)').matches);
    const aside = useMotionValue(wide ? 1 : 0); // the shot framed beside the slate (1), or centred (0)
    const pan = useTransform(aside, (a) => `${a * ASIDE}vw`);
    const rest = useMotionValue(1);

    // films from the atlas on the set, a new run each visit (ones bright enough to see past the slate);
    // each goes up only once its picture is decoded, so a change never stalls a frame
    useEffect(() => {
        let gone = false;
        let timer;
        const show = async (reel, i) => {
            const f = reel[i % reel.length];
            const big = new Image();
            big.src = pic(f.s, 'w1280');
            await big.decode().catch(() => {});
            if (gone) return;
            setShots((s) => [...s.slice(-1), f]);
            if (reducedMotion) return;
            const tick = () => { timer = quiet.current || (inside.current && typed.current) || document.hidden ? setTimeout(tick, 800) : (show(reel, i + 1), null); };
            timer = setTimeout(tick, STAY);
        };
        fetch('/mosaic/mosaic.json').then((r) => r.json()).then((j) => {
            const bright = j.tiles.filter((t) => t.s && light(t.c) > 70);
            const reel = Array.from({ length: Math.min(12, bright.length) }, () => bright.splice(Math.floor(Math.random() * bright.length), 1)[0]);
            if (!gone && reel.length) show(reel, 0);
        }).catch(() => {});
        return () => { gone = true; clearTimeout(timer); };
    }, [reducedMotion]);

    // the assistant steps in and holds the slate up to the lens
    const bringIn = () => {
        if (reducedMotion) { y.set(0); rot.set(TILT); return; }
        animate(y, 0, { type: 'spring', stiffness: 140, damping: 19, mass: 0.9 });
        animate(rot, TILT, { type: 'spring', stiffness: 120, damping: 16 });
    };
    useEffect(() => {
        const t = setTimeout(bringIn, reducedMotion ? 0 : 120);
        return () => clearTimeout(t);
        // (once, on arriving)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reducedMotion]);

    // a new scene: this slate whips out, a fresh one comes in
    useEffect(() => {
        if (scene === shown) return undefined;
        let gone = false;
        const swap = async () => {
            if (!reducedMotion) await animate(y, window.innerHeight, { duration: 0.24, ease: [0.5, 0, 0.9, 0.6] });
            if (gone) return;
            setShown(scene);
            setTake(1);
            setError('');
            stick.set(OPEN);
            rot.set(6);
            bringIn();
        };
        swap();
        return () => { gone = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene]);

    // "Action": the sticks clap, the frame jolts, the slate leaves, the lens racks onto the film, push in
    const cut = async () => {
        setPhase('cut');
        quiet.current = true;
        if (reducedMotion) { navigate(dest, { replace: true }); return; }
        await animate(stick, 0, { duration: 0.09, ease: [0.7, 0, 1, 1] });
        animate(jolt, [0, 7, -3, 0], { duration: 0.24 });
        await wait(180);
        animate(y, window.innerHeight * 1.1, { duration: 0.38, ease: [0.5, 0, 0.9, 0.6] });
        animate(rot, 8, { duration: 0.38 });
        animate(rest, 0, { duration: 0.2 });
        animate(dark, 0, { duration: 0.6, ease: 'easeOut' });
        animate(aside, 0, { duration: 0.72, ease: [0.3, 0, 0.2, 1] }); // the camera pans onto the shot
        await animate(push, 1.07, { duration: 0.72, ease: [0.3, 0, 0.2, 1] });
        navigate(dest, { replace: true });
    };
    // another take: the slate shakes, the take counts up, the chalk says why
    const retake = (words) => {
        setTake((t) => t + 1);
        setError(words);
        if (!reducedMotion) animate(x, [0, -12, 10, -6, 3, 0], { duration: 0.42 });
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (phase !== 'idle') return;
        const problem = check(shown, values);
        if (problem) { retake(problem); return; }
        setError('');
        setPhase('rolling');
        const slowly = setTimeout(() => setSlow(true), 5000);
        try {
            if (shown === 'join') await register({ username: values.name.trim(), email: values.email.trim(), password: values.password });
            else await login({ email: values.email.trim(), password: values.password });
            clearTimeout(slowly);
            await cut();
        } catch (err) {
            clearTimeout(slowly);
            setSlow(false);
            setPhase('idle');
            retake(say(err));
        }
    };

    // already signed in: straight back
    if (!authLoading && isAuthenticated && phase === 'idle') return <Navigate to={dest} replace />;

    const join = shown === 'join';
    return (
        <div className="own-transitions relative min-h-[100svh] px-4 md:px-10 lg:px-[6vw] pt-24 md:pt-28 pb-12 flex flex-col justify-center items-center lg:items-start overflow-hidden">
            {/* the shot: a film, waiting in the dark beside the slate (on a phone, behind it) */}
            <motion.div aria-hidden="true" className="fixed inset-0 overflow-hidden" style={{ y: jolt }}>
                {/* (on a wide screen it stands right of the slate, its edge fading into the dark) */}
                <motion.div className="absolute inset-0 lg:[mask-image:linear-gradient(90deg,transparent,black_16%)]" style={{ x: pan, scale: push }}>
                    {shots.map((f) => <img key={f.id} src={pic(f.s, 'w1280')} alt="" className={`absolute inset-0 w-full h-full object-cover max-w-none ${reducedMotion ? '' : 'shot-up'}`} />)}
                </motion.div>
                <motion.div className="absolute inset-0" style={{ opacity: dark }}>
                    <div className="absolute inset-0 lg:hidden bg-[#050505]/65" />
                    <div className="absolute inset-0 hidden lg:block bg-[linear-gradient(90deg,rgba(5,5,5,0.92)_0%,rgba(5,5,5,0.78)_34%,rgba(5,5,5,0.15)_62%,rgba(5,5,5,0.05))]" />
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#050505]/70 to-transparent" />
                </motion.div>
            </motion.div>

            {/* the way back, above the slate (in the flow, so the slate can never cover it) */}
            <div className="relative z-20 w-full max-w-[580px] mb-8 md:mb-10"><BackButton /></div>

            {/* the slate, held up to the lens */}
            <motion.div
                className="relative z-10 w-full max-w-[580px]"
                style={{ x, y, rotate: rot }}
                onFocus={() => { inside.current = true; }}
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) inside.current = false; }}
            >
                <div className={reducedMotion ? '' : 'hand-sway'}>
                    <motion.div style={{ y: jolt }}>
                        <Slate
                            scene={shown}
                            take={take}
                            date={date}
                            values={values}
                            onValue={(k, v) => { typed.current = true; setValues((s) => ({ ...s, [k]: v })); }}
                            show={show}
                            onShow={() => setShow((s) => !s)}
                            error={error}
                            busy={phase !== 'idle'}
                            slow={slow}
                            onSubmit={onSubmit}
                            stick={stick}
                            autoFocus={fine}
                            google={(
                                <GoogleAuthButton
                                    text={join ? 'Join with Google' : 'Sign in with Google'}
                                    className="w-full min-h-[52px]"
                                    onStart={() => setPhase('rolling')}
                                    onSignedIn={() => cut()}
                                    onFailed={(words) => { setPhase('idle'); retake(words); }}
                                />
                            )}
                        />
                    </motion.div>
                </div>
            </motion.div>

            {/* the other ways in */}
            <motion.div className="relative z-10 mt-6 md:mt-7 w-full max-w-[580px] text-center" style={{ opacity: rest }}>
                <Link to={join ? '/login' : '/register'} replace state={location.state} className="font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gray-300 hover:text-white">
                    {join ? 'Have an account? ' : 'New here? '}<span className="text-gold-light">{join ? 'Sign in ›' : 'Join ›'}</span>
                </Link>
            </motion.div>

            {film && (
                <motion.div aria-hidden="true" className="hidden lg:block fixed bottom-8 right-10 z-10 text-right" style={{ opacity: rest }}>
                    <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">On set</div>
                    <div key={film.id} className="chalk-in">
                        <div className="mt-1 font-serif italic text-2xl text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.6)]">{film.t}</div>
                        <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-300">{film.y}</div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default Admission;
