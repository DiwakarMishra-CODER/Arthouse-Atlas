import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { aboutAPI } from '../../services/api';
import { pic } from '../directors/arrange';
import { sizeFor, useDecoded } from './frames';

/**
 * Why the atlas exists, as a commentary track: on a film's disc, the director talks over the film as
 * it plays; here the atlas's maker talks over the films that made them.
 *
 * It plays as a short cut, and the page's own scroll is its playhead: the frame holds still while each
 * step of scrolling cuts to the next film, so even someone scrolling straight past sees every film.
 * The picture fills the screen, held from its top so no head is ever cropped; the chapter is named in
 * a slim strip above it, never on it, and the words are its subtitles, low over the picture the way a
 * film's are, on a soft dark that rises from its foot: a lead-in and then, a beat later, the line that
 * matters most. "Read it as text" sets the whole note as a page
 * (and with reduced motion it starts that way).
 *
 * The words are the owner's own, edited lightly with them by Claude (2026-10-22), nothing added.
 * *Title* is set in italics.
 */

const CHAPTERS = [
    { film: 'Moonlight', phone: '35% 0%', focus: '50% 0%', lead: '*Moonlight* was where it started for me: family made not by blood but by people who care.', best: 'Juan holding Chiron up in the sea, teaching him to float: one of the most powerful moments in cinema.',  frame: '/rKftsJQc7E6SmLW6q9ITTWarOSN.jpg', lines: [
        ['*Moonlight* was the first.'],
        ['I kept seeing it on one decade-end list after another, so I watched it.'],
        ['I still think of Juan holding Chiron up in the sea, teaching him to float,'],
        ['and of the home Chiron finds with him and Teresa:'],
        ['family made not by blood but by people who care.', true],
    ] },
    { film: 'Mulholland Drive', phone: '59% 0%', focus: '50% 0%', lead: 'I’d never seen a film like it, or felt that way watching one.', best: 'While it plays, it makes a kind of sense, the way a dream does while you’re in it.',  frame: '/g9ClaS5EqU0Hk8WIbMNhld0Bk6f.jpg', lines: [
        ['Then I found *Mulholland Drive*.'],
        ['I’d never seen a film like it, or felt that way watching one.'],
        ['While it plays, it makes a kind of sense, the way a dream does while you’re in it.', true],
        ['Then you wake up, try to follow it back to an answer, and there isn’t one, just like a dream.'],
        ['There’s an eerie feeling all the way through, like something is wrong,'],
        ['and you can’t point to what or why.'],
        ['It feels almost real, until something from somewhere seeps in'],
        ['and strange things start to happen, and you wonder whether any of it is real.'],
        ['Maybe it’s all a dream.'],
        ['Maybe it’s an actress building a perfect world for herself,'],
        ['where everything goes the way she wants, while reality keeps seeping in.'],
        ['You never get to know which.'],
    ] },
    { film: 'Persona', phone: '22% 0%', focus: '50% 0%', lead: 'An actress stops speaking, and the nurse caring for her talks and talks to fill the silence.', best: 'Then their faces merge into one, and you’re no longer sure they’re two different people.',  frame: '/32gSSQeykkCvmQ3rJ6mt6pht8cz.jpg', lines: [
        ['Then *Persona*.'],
        ['An actress stops speaking, and her nurse talks to fill the silence.'],
        ['For the whole film you think the actress is soaking up the nurse’s life.'],
        ['Then their two faces merge into one, and you realise you don’t know.', true],
        ['Is she absorbing the nurse, or is the nurse only a part of her, and she’s alone?'],
        ['Maybe her own life had started to feel like a role she was playing, so she stopped speaking.'],
        ['I didn’t know two people on screen for an hour and a half could be this gripping.'],
    ] },
    { film: 'Mirror', phone: '50% 0%', focus: '50% 0%', lead: 'I watched it after coming back from a maths exam. A film of under two hours took me more than two and a half.', best: 'That burning barn is burned into my head.',  frame: '/9UAcMhSCDJ2OCo5QdPpSERjhMA1.jpg', lines: [
        ['I watched *Mirror* after coming back from a maths exam.'],
        ['I knew it was called one of the most confusing films ever made, and went in anyway.'],
        ['A film of under two hours took me more than two and a half,'],
        ['pausing, trying to understand what was on screen.'],
        ['It plays like memory: a dying man’s life coming back to him in pieces,'],
        ['his mother, his childhood home.'],
        ['That burning barn is burned into my head,', true],
        ['and his mother sitting on the fence, and floating above her bed.'],
        ['You don’t remember everything, only fragments, and the film is made of fragments.'],
        ['It left me feeling a strange way.'],
    ] },
    { film: 'Portrait of a Lady on Fire', phone: '48% 0%', focus: '50% 0%', lead: 'There’s hardly any music: the two women’s acting, the space between them and the shots do it all.', best: 'Love that’s felt, not said, and never pushed on you by a score.',  frame: '/xhuGwXvm5o2G9ms9YxP23NXjbl7.jpg', lines: [
        ['*Portrait of a Lady on Fire* is a painting in every frame, which is right for a film about a painter.'],
        ['The two leads play it so quietly that you feel the love without anyone having to say it.'],
        ['There’s hardly any music: their acting, the space between them and the shots do it all.'],
        ['So when the music does come, it’s overwhelming:'],
        ['the women singing around the fire, and Vivaldi’s storm at the very end.'],
        ['They notice the smallest things about each other,'],
        ['an expression, what one of them does when she’s moved:'],
        ['the understanding of someone you truly love.'],
        ['Love that’s felt, not said, and never pushed on you by a score.', true],
        ['The truest love I’ve seen on film.'],
    ] },
    { film: 'Chungking Express', phone: '41% 0%', focus: '50% 0%', lead: 'Wong Kar-wai films the neon-lit city of Hong Kong, full of people longing for connection.', best: 'On the surface, so beautiful and bright; at heart, just as lonely.',  frame: '/8e6avmXiqurj5LHkmdHBq6rc5jm.jpg', card: { title: 'Wong Kar-wai' }, lines: [
        ['Wong Kar-wai films the neon-lit city of Hong Kong, full of people longing for connection.'],
        ['On the surface, so beautiful and bright; at heart, just as lonely.', true],
    ] },
    { film: 'Three Colors: Red', phone: '62% 0%', focus: '60% 0%', lead: 'Three films, *Blue*, *White* and *Red*, each take one word of France’s motto (liberty, equality, fraternity) and ask what it means in an ordinary life now.', best: 'In all three, an old woman struggles to push a bottle into a recycling bin. Only in *Red*, the film about fraternity, does someone help her.',  frame: '/pZcoSJUb3Lgr9Rzg2shg1PtTBP9.jpg', card: { title: 'Three Colours', line: 'Krzysztof Kieślowski · 1993–1994' }, lines: [
        ['And Krzysztof Kieślowski’s *Three Colours*.'],
        ['Most trilogies need the film before; these each stand on their own,'],
        ['taking one word of France’s motto (liberty, equality, fraternity)'],
        ['and asking what it means in an ordinary life now.'],
        ['In *Blue*, a woman whose husband and daughter have died'],
        ['tries to free herself from his life and his work, and can’t.'],
        ['In *Red*, a lonely retired judge listens in on his neighbours’ calls,'],
        ['and Valentine shows him there’s still kindness in people.'],
        ['In all three films an old woman struggles to push a bottle into a recycling bin,'],
        ['and only Valentine helps her.', true],
        ['At the end, the three stories meet.'],
    ] },
    { film: 'Jeanne Dielman, 23, quai du Commerce, 1080 Bruxelles', phone: '58% 0%', focus: '50% 0%', lead: 'There are so many films, and I only wanted the best, so I went digging for sources I could trust.', best: 'So the atlas is built on what critics and filmmakers have actually agreed on, list by list, not on an algorithm’s guesses. This is my attempt to do these films justice.',  card: { title: 'Why the atlas', line: 'In the frame: Sight and Sound’s greatest film, Jeanne Dielman' }, sign: true, lines: [
        ['They changed what I thought a film could be:'],
        ['not just a story to follow,'],
        ['but someone’s own way of seeing the world, made with care and never shouting about it.'],
        ['There are so many films, and I only wanted to watch the best,'],
        ['so I went digging for sources I could trust:'],
        ['Sight and Sound’s greatest-films polls and its lists of the year,'],
        ['the BBC’s polls, CriticsTop10, the Criterion Closet picks, and many more.'],
        ['I wanted them all in one place.'],
        ['Not an algorithm’s guesses, but what critics and filmmakers have actually agreed on, list by list,'],
        ['so anyone who wants to explore these films can, without all the digging I had to do.'],
        ['I wanted to do these filmmakers justice.'],
        ['This is my attempt at it.', true],
    ] },
];

// *Title* in italics
const words = (text) => text.split(/(\*[^*]+\*)/).map((s, i) => (s.startsWith('*') ? <em key={i}>{s.slice(1, -1)}</em> : s));
const STEP = 55; // svh of scrolling for each film
// (each frame is held from its top, so a crop only ever takes the bottom and never a head, and on its
// faces sideways: focus on a wide screen, phone on a tall one, where the sides go)

// the short cut, letterboxed: the scroll is the playhead, a film and its lines at each step
const ShortCut = ({ films }) => {
    const section = useRef(null);
    const [c, setC] = useState(0);
    const [size] = useState(sizeFor);
    const [ready, want] = useDecoded(); // frames decoded ahead, so none is ever shown half drawn
    const n = CHAPTERS.length;
    const srcOf = (i) => {
        const x = CHAPTERS[i];
        const f = x && (x.frame || films[x.film]?.s);
        return f ? pic(f, size) : null;
    };
    // this chapter's frame and the ones either side, decoded ahead of the scroll
    useEffect(() => {
        want([c, c + 1, c - 1].map((i) => {
            const x = CHAPTERS[i];
            const f = x && (x.frame || films[x.film]?.s);
            return f ? pic(f, size) : null;
        }));
    }, [c, films, size, want]);
    const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
    useMotionValueEvent(scrollYProgress, 'change', (p) => {
        const i = Math.min(n - 1, Math.max(0, Math.floor(p * n)));
        if (i !== c) setC(i);
    });
    const toChapter = (i) => {
        const el = section.current;
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + ((el.offsetHeight - window.innerHeight) * (i + 0.5)) / n, behavior: 'smooth' });
    };
    const ch = CHAPTERS[c];
    const film = films[ch.film];
    const src = srcOf(c);
    const title = ch.card?.title || ch.film;
    const credit = ch.card?.line || [film?.d?.join(' & '), film?.y].filter(Boolean).join(', ');

    return (
        // (data-lights-down: while it holds the screen, the navbar leaves, so the monitor has the whole of it)
        <div ref={section} data-lights-down className="relative" style={{ height: `${100 + n * STEP}svh` }}>
            <div aria-hidden="true" className="sticky top-0 h-[100svh] flex flex-col bg-black select-none">
                {/* the top bar: the track, and the chapter, named in the black */}
                <div className="relative shrink-0 h-10 md:h-11 px-4 md:px-8 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 font-label text-[11px] md:text-[12px] tracking-[0.18em] uppercase text-gray-400 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold" /><span className="hidden sm:inline">Commentary · Diwakar Mishra</span><span className="sm:hidden">Commentary</span>
                    </div>
                    <div key={`t-${c}`} className="subtitle-in min-w-0 flex items-baseline justify-end md:justify-center gap-2 md:gap-3 md:absolute md:left-1/2 md:-translate-x-1/2 text-right md:text-center">
                        <span className="font-label text-[11px] md:text-[12px] tracking-[0.2em] uppercase text-gold whitespace-nowrap">Chapter {c + 1} of {n}</span>
                        <span className="font-serif italic text-[15px] md:text-[19px] text-[#f1ece2] truncate">{title}</span>
                        {credit && <span className="hidden md:inline font-label text-[11px] md:text-[12px] tracking-[0.14em] uppercase text-gray-500 whitespace-nowrap">{credit}</span>}
                    </div>
                </div>

                {/* the whole picture, the camera creeping in; its words over it, the way a film's subtitles are */}
                <div className="relative flex-1 min-h-0 overflow-hidden">
                    {src && ready.has(src) && <img key={`f-${c}`} src={src} alt="" className="absolute inset-0 w-full h-full object-cover max-w-none frame-push [object-position:var(--fm)] [transform-origin:var(--fm)] md:[object-position:var(--fd)] md:[transform-origin:var(--fd)]" style={{ '--fd': ch.focus || '50% 30%', '--fm': ch.phone || ch.focus || '50% 30%' }} />}
                    {/* a soft dark rising from the foot, under the words only, so they read on any frame */}
                    <div className="absolute inset-x-0 bottom-0 h-[50%] md:h-[48%] bg-[linear-gradient(to_top,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.72)_38%,rgba(0,0,0,0.35)_68%,transparent)]" />

                    <div className="absolute inset-x-0 bottom-0 px-5 md:px-8 pb-1.5 text-center [text-shadow:0_0_2px_rgba(0,0,0,0.95),0_2px_10px_rgba(0,0,0,0.85)]">
                        <div className="flex flex-col items-center">
                            {ch.lead && <p key={`a-${c}`} className="subtitle-in max-w-3xl font-serif text-[1.05rem] md:text-[1.3rem] leading-snug text-[#e9e3d6]">{words(ch.lead)}</p>}
                            <p key={`b-${c}`} className="subtitle-late mt-2 max-w-4xl font-serif text-[1.2rem] md:text-[1.65rem] leading-snug text-[#fbf8f2]">{words(ch.best)}</p>
                            {ch.sign && <p key={`s-${c}`} className="subtitle-late mt-1 font-serif italic text-[1.1rem] md:text-[1.3rem] text-gold-light">Diwakar Mishra</p>}
                        </div>
                        {/* where you are */}
                        <div className="max-w-5xl mx-auto mt-4 md:mt-5 [text-shadow:none]">
                            <div className="relative h-[2px] bg-white/20">
                                <motion.span className="absolute inset-0 bg-gold origin-left" style={{ scaleX: scrollYProgress }} />
                            </div>
                            <ol className="mt-1 flex flex-wrap justify-center gap-x-4 md:gap-x-6">
                                {CHAPTERS.map((x, i) => (
                                    <li key={x.film}>
                                        <button type="button" tabIndex={-1} onClick={() => toChapter(i)} className={`min-h-9 font-label text-[11px] md:text-[12px] tracking-[0.12em] uppercase transition-colors ${i === c ? 'text-gold-light' : 'text-gray-400 hover:text-white'}`}>
                                            {i + 1}{i === c && <span className="hidden md:inline"> · {x.card?.title || x.film}</span>}
                                        </button>
                                    </li>
                                ))}
                            </ol>
                            <div className="font-label text-[11px] tracking-[0.14em] uppercase text-gray-400">{c < n - 1 ? 'Scroll for the next film' : 'That’s all eight'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Commentary = ({ reducedMotion }) => {
    const [films, setFilms] = useState({});
    const [asText, setAsText] = useState(false);
    const top = useRef(null);

    useEffect(() => {
        let gone = false;
        aboutAPI.films(CHAPTERS.map((c) => c.film)).then((r) => {
            if (gone) return;
            setFilms(r.data);
        }).catch(() => {});
        return () => { gone = true; };
    }, []);
    // (with reduced motion it starts as text)
    useEffect(() => {
        if (!reducedMotion) return undefined;
        const t = setTimeout(() => setAsText(true), 0);
        return () => clearTimeout(t);
    }, [reducedMotion]);
    const toggle = () => { setAsText((v) => !v); setTimeout(() => top.current?.scrollIntoView({ block: 'start' }), 0); };

    const fullText = (
        <div className="grid gap-12">
            {CHAPTERS.map((c, i) => (
                <div key={c.film}>
                    <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">Chapter {i + 1} · {c.card?.title || c.film}</div>
                    <p className="mt-3 font-serif text-[1.25rem] md:text-[1.45rem] leading-[1.55] text-gray-100">
                        {c.lines.map(([t], j) => <span key={j}>{words(t)}{' '}</span>)}
                    </p>
                    {c.sign && <p className="mt-6 font-serif italic text-3xl text-gold-light">Diwakar Mishra</p>}
                </div>
            ))}
        </div>
    );

    return (
        <section aria-labelledby="why" className="relative">
            <div ref={top} className="scroll-mt-16 max-w-7xl mx-auto px-4 md:px-10 mb-6 md:mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-2">
                <div>
                    <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">The maker’s note</div>
                    <h2 id="why" className="scroll-mt-24 mt-1 font-serif font-light text-4xl md:text-6xl leading-[1.05] text-white">Why I made this</h2>
                    <p className="mt-2 max-w-2xl font-serif italic text-lg text-gray-300">A commentary on the films that made the atlas, by the person who made it.</p>
                </div>
                <button type="button" onClick={toggle} className="shrink-0 self-start md:self-end min-h-11 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">
                    {asText ? 'Play it as the commentary ›' : 'Read it as text ›'}
                </button>
            </div>
            {asText
                ? <div className="max-w-3xl mx-auto px-4 md:px-10 pb-6">{fullText}</div>
                : <><div className="sr-only">{fullText}</div><ShortCut films={films} /></>}
        </section>
    );
};

export default Commentary;
