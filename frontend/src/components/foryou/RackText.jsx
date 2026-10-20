import { useEffect, useState } from 'react';

/**
 * Words that rack into focus: a blurred copy (blurred once, never animated) crossed with the
 * sharp words, so only opacity moves. `play` starts it; `out` racks them out of focus again;
 * key the component to replay it. It's spans only: put it inside the heading it belongs to.
 */
const RackText = ({ children, play = true, out = false, delay = 0, className = '' }) => {
    const [sharp, setSharp] = useState(false);
    useEffect(() => {
        if (!play) return undefined;
        const t = setTimeout(() => setSharp(true), delay);
        return () => clearTimeout(t);
    }, [play, delay]);
    const shown = sharp && !out;
    const pace = out ? 'duration-500' : 'duration-[900ms]';
    return (
        <span className={`relative block ${className}`}>
            <span aria-hidden="true" className={`absolute inset-0 blur-[8px] transition-opacity ${pace} ${shown ? 'opacity-0' : 'opacity-90'}`}>{children}</span>
            <span className={`relative block transition-opacity ${pace} ${shown ? 'opacity-100' : 'opacity-0'}`}>{children}</span>
        </span>
    );
};

export default RackText;
