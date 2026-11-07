import { useSyncExternalStore } from 'react';

/**
 * The country the visitor watches in, for "where to watch". Their own choice when they've made one
 * (kept in this browser); otherwise the country Vercel's edge saw them in (a meta tag the middleware
 * adds); otherwise their time zone, then their browser's language; the United States last of all.
 * The time zone comes before the language because many browsers in India say en-US.
 */

const KEY = 'aa-region';
const CODE = /^[A-Z]{2}$/;
const ZONES = {
    'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Europe/London': 'GB', 'Europe/Dublin': 'IE',
    'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL',
    'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK', 'Europe/Warsaw': 'PL', 'Europe/Lisbon': 'PT',
    'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Singapore': 'SG', 'Asia/Dubai': 'AE', 'Asia/Hong_Kong': 'HK', 'Asia/Taipei': 'TW',
    'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Perth': 'AU', 'Pacific/Auckland': 'NZ',
    'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US', 'America/Phoenix': 'US',
    'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Mexico_City': 'MX', 'America/Sao_Paulo': 'BR', 'America/Argentina/Buenos_Aires': 'AR',
};

const detect = () => {
    try {
        const kept = localStorage.getItem(KEY);
        if (CODE.test(kept || '')) return kept;
    } catch { /* storage blocked */ }
    const seen = document.querySelector('meta[name="viewer-country"]')?.content;
    if (CODE.test(seen || '')) return seen;
    try {
        const zone = ZONES[Intl.DateTimeFormat().resolvedOptions().timeZone];
        if (zone) return zone;
    } catch { /* no Intl */ }
    for (const lang of navigator.languages || []) {
        const r = lang.split('-')[1]?.toUpperCase();
        if (CODE.test(r || '')) return r;
    }
    return 'US';
};

let region = null;
const listeners = new Set();
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const current = () => (region ??= detect());

export const setRegion = (cc) => {
    if (!CODE.test(cc)) return;
    region = cc;
    try { localStorage.setItem(KEY, cc); } catch { /* storage blocked */ }
    listeners.forEach((fn) => fn());
};

export const useRegion = () => useSyncExternalStore(subscribe, current, () => 'US');

// "India", "the United States": a country's name as a sentence uses it
const THE = new Set(['US', 'GB', 'NL', 'PH', 'AE', 'CZ', 'DO', 'BS', 'CF', 'GM']);
let names;
export const regionName = (cc, { inSentence = false } = {}) => {
    try { names ??= new Intl.DisplayNames(['en'], { type: 'region' }); } catch { names = null; }
    const name = names?.of(cc) || cc;
    return inSentence && THE.has(cc) ? `the ${name}` : name;
};
