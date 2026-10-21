import { motion } from 'framer-motion';

/**
 * The slate (the clapperboard) held up to the lens before a take: black acrylic with its grid painted
 * on in white, the striped sticks open on their hinge. Its rows are the form: Google first, then
 * boxes to write in (typed in chalk, Courier) under plain painted labels; the box you're in lights gold.
 * The take counts up with every try. It only draws: the page (Admission) brings it in, claps it and
 * takes it away.
 *
 * stick: a motion value, the top stick's angle (open is about -11°, shut is 0) · google: the Google
 * button, set on the slate's own row
 */

const INK = 'var(--color-white)';
const BLACK = '#0c0c0b';
const stripes = (angle) => `repeating-linear-gradient(${angle}deg, ${INK} 0 20px, ${BLACK} 20px 40px)`;

const Cell = ({ label, children, className = '' }) => (
    <div className={`flex flex-col justify-between px-3.5 md:px-4 py-2 ${className}`}>
        <span className="font-label text-[11px] md:text-[12px] tracking-[0.14em] uppercase text-white/65">{label}</span>
        {children}
    </div>
);

// one row of the form: its painted label, and a box to write in (lit gold while you're in it)
const Row = ({ label, children }) => (
    <label className="group flex items-center gap-3 md:gap-4 px-3.5 md:px-4 py-2 md:py-2.5 border-t-2 border-white/80 cursor-text">
        <span className="w-[4.6rem] md:w-[5.4rem] shrink-0 font-label text-[11px] md:text-[12px] tracking-[0.14em] uppercase text-white/75">{label}</span>
        <span className="flex-1 min-w-0 flex items-center gap-2 px-3 rounded-[3px] bg-white/[0.07] ring-1 ring-white/40 group-focus-within:ring-2 group-focus-within:ring-gold-light group-focus-within:bg-white/[0.11] transition-[box-shadow,background-color] duration-200">
            {children}
        </span>
    </label>
);

const field = 'flex-1 min-w-0 bg-transparent font-courier text-[16px] md:text-[18px] text-white caret-gold-light placeholder:text-white/45 outline-none py-2.5';

const Slate = ({ scene, take, date, values, onValue, show, onShow, error, busy, slow, onSubmit, stick, google, autoFocus }) => {
    const join = scene === 'join';
    return (
        <form noValidate onSubmit={onSubmit} aria-label={join ? 'Join' : 'Sign in'} className="relative">
            {/* the sticks: the top one hinged at the left, open until the take is marked */}
            <div className="relative h-[28px] md:h-[34px]">
                <motion.div className="absolute inset-0 origin-[12px_100%]" style={{ rotate: stick }}>
                    <div className="h-full rounded-[3px] ring-1 ring-black/60" style={{ backgroundImage: stripes(135) }} />
                </motion.div>
            </div>
            <div className="relative h-[28px] md:h-[34px] rounded-t-[2px]" style={{ backgroundImage: stripes(45) }}>
                <span aria-hidden="true" className="absolute left-[6px] -top-[6px] w-3 h-3 rounded-full bg-gray-500 ring-2 ring-black" />
            </div>

            {/* the board */}
            <div className="p-2 md:p-2.5 rounded-b-md shadow-[0_40px_90px_-20px_rgba(0,0,0,0.95)]" style={{ background: `linear-gradient(165deg, rgba(255,255,255,0.08), transparent 38%), ${BLACK}` }}>
                <div className="border-2 border-white/80">
                    <div className="grid grid-cols-[1fr_auto]">
                        <Cell label="Prod.">
                            <span className="font-courier text-[15px] md:text-[17px] text-white">Arthouse Atlas</span>
                        </Cell>
                        <Cell label="Date" className="border-l-2 border-white/80">
                            <span className="font-courier text-[15px] md:text-[17px] text-white">{date}</span>
                        </Cell>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] border-t-2 border-white/80">
                        <Cell label="Scene">
                            <span key={scene} className="chalk-in font-courier text-[24px] md:text-[30px] leading-tight text-white">{join ? 'Join' : 'Sign in'}</span>
                        </Cell>
                        <Cell label="Take" className="border-l-2 border-white/80 min-w-[5.5rem] md:min-w-[7rem]">
                            <span key={take} className="chalk-in font-courier text-[30px] md:text-[38px] leading-none text-white">{take}</span>
                        </Cell>
                    </div>
                    {/* the quickest way in */}
                    {google && <div className="border-t-2 border-white/80 p-2.5 md:p-3">{google}</div>}
                    <div className="border-t-2 border-white/80 py-1.5 text-center font-label text-[11px] md:text-[12px] tracking-[0.3em] uppercase text-white/60">or with email</div>
                    {join && (
                        <Row label="Name">
                            <input name="username" autoFocus={autoFocus} autoComplete="username" value={values.name} onChange={(e) => onValue('name', e.target.value)} placeholder="what we call you" className={field} />
                        </Row>
                    )}
                    <Row label="Email">
                        <input name="email" autoFocus={autoFocus && !join} type="email" inputMode="email" autoComplete="email" value={values.email} onChange={(e) => onValue('email', e.target.value)} placeholder="you@email.com" className={field} />
                    </Row>
                    <Row label="Password">
                        <input name="password" type={show ? 'text' : 'password'} autoComplete={join ? 'new-password' : 'current-password'} value={values.password} onChange={(e) => onValue('password', e.target.value)} placeholder={join ? '6 characters or more' : '••••••'} className={field} />
                        <button type="button" onClick={onShow} className="shrink-0 min-h-11 px-1 font-label text-[11px] md:text-[12px] tracking-[0.14em] uppercase text-white/60 hover:text-white">
                            {show ? 'Hide' : 'Show'}
                        </button>
                    </Row>
                    {/* what went wrong with the last take, in chalk */}
                    <div className="flex items-center gap-3 md:gap-4 border-t-2 border-white/80 px-3.5 md:px-4 py-2.5 min-h-[46px]">
                        <span className="w-[4.6rem] md:w-[5.4rem] shrink-0 font-label text-[11px] md:text-[12px] tracking-[0.14em] uppercase text-white/65">Note</span>
                        <span aria-live="polite" className="flex-1 font-courier text-[14px] md:text-[15px] leading-snug text-gold-light">
                            {error ? <span key={`${take}-${error}`} className="chalk-in block">{error}</span> : slow ? <span className="chalk-in block">The server’s waking up. This can take half a minute.</span> : null}
                        </span>
                    </div>
                    <button
                        type="submit"
                        disabled={busy}
                        aria-label={join ? 'Join' : 'Sign in'}
                        className="block w-full min-h-[54px] border-t-2 border-white/80 bg-gold text-black font-label text-[14px] md:text-[15px] tracking-[0.3em] uppercase hover:bg-gold-light disabled:bg-gold/80 transition-colors"
                    >
                        {busy ? 'Rolling…' : 'Action'}
                    </button>
                </div>
            </div>
        </form>
    );
};

export default Slate;
