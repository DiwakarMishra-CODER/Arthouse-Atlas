/**
 * Every movement in its own visual language.
 *
 * Nine treatments, each borrowed from how that cinema actually looked —
 * Expressionism's skewed chiaroscuro, constructivist red-and-black diagonals,
 * Godard's primary-colour intertitles, the slow cinema's empty frame. A
 * treatment decides the image grade, the title's typography and placement,
 * and what happens on hover. Cards, title cards and the next-reel teaser all
 * read from here, so a movement looks like itself everywhere on the site.
 *
 * hover:  'flicker' | 'cuts' | 'pushin' | 'crossfade' | 'smear' | 'jitter' | 'shift'
 * title:  'over' (set on the image) | 'below' (set under it, image left alone)
 */

export const TREATMENTS = {
    expressionist: {
        filter: 'grayscale(1) contrast(1.6) brightness(0.9)',
        screenFilter: 'grayscale(1) contrast(1.35)',
        hover: 'flicker',
        title: 'over',
        accent: '#d9d2c0',
        // the frame itself is a little off-true
        frameClass: '[clip-path:polygon(0_3%,100%_0,98%_100%,2%_96%)]'
    },
    constructivist: {
        filter: 'grayscale(1) contrast(1.45) brightness(1.05)',
        screenFilter: 'grayscale(1) contrast(1.3)',
        hover: 'cuts',
        title: 'over',
        accent: '#d0201f',
        duotone: '#d0201f'
    },
    classical: {
        filter: 'sepia(0.22) saturate(1.3) contrast(1.05)',
        screenFilter: 'sepia(0.12) saturate(1.15)',
        hover: 'pushin',
        title: 'below',
        accent: '#c5a059'
    },
    nouvelle: {
        filter: 'saturate(1.15) contrast(1.05)',
        screenFilter: 'none',
        hover: 'cuts',
        title: 'over',
        accent: '#e10600',
        boxes: [
            { bg: '#e10600', fg: '#ffffff' },
            { bg: '#ffffff', fg: '#0a0a0a' },
            { bg: '#0046ad', fg: '#ffffff' }
        ]
    },
    neorealist: {
        filter: 'grayscale(1) sepia(0.35) contrast(1.1)',
        screenFilter: 'grayscale(0.6) sepia(0.2)',
        hover: 'pushin',
        title: 'below',
        accent: '#bfb39b',
        grain: true
    },
    contemplative: {
        filter: 'saturate(0.55) brightness(0.92)',
        screenFilter: 'saturate(0.85)',
        hover: 'crossfade',
        title: 'below',
        accent: '#9aa0a6'
    },
    neon: {
        filter: 'saturate(1.55) contrast(1.12)',
        screenFilter: 'saturate(1.2)',
        hover: 'smear',
        title: 'over',
        accent: '#ff2e88'
    },
    raw: {
        filter: 'none',
        screenFilter: 'none',
        hover: 'jitter',
        title: 'over',
        accent: '#ff3b30',
        viewfinder: true
    },
    collage: {
        filter: 'contrast(1.25) saturate(0.75)',
        screenFilter: 'contrast(1.1)',
        hover: 'shift',
        title: 'over',
        accent: '#f1ead8'
    }
};

// slug (Movement.tag) → treatment
const BY_SLUG = {
    expressionism: 'expressionist',
    poetic_realism: 'expressionist',
    montage: 'constructivist',
    third_cinema: 'constructivist',
    hollywood_auteurs: 'classical',
    gold_age_japan: 'classical',
    nouvelle_vague: 'nouvelle',
    czech_new_wave: 'nouvelle',
    japanese_new_wave: 'nouvelle',
    new_german_cinema: 'nouvelle',
    british_new_wave: 'nouvelle',
    neorealism: 'neorealist',
    parallel_cinema: 'neorealist',
    la_rebellion: 'neorealist',
    slow_cinema: 'contemplative',
    taiwan_new_wave: 'contemplative',
    iranian_new_wave: 'contemplative',
    hong_kong_new_wave: 'neon',
    korean_new_wave: 'neon',
    chinese_generations: 'neon',
    dogme95: 'raw',
    documentary: 'raw',
    romanian_new_wave: 'raw',
    new_hollywood: 'raw',
    experimental: 'collage',
    new_queer_cinema: 'collage'
};

// Neon colour per movement — Hong Kong pink, Seoul cyan, the red of the lanterns
const NEON = { hong_kong_new_wave: '#ff2e88', korean_new_wave: '#2ee6ff', chinese_generations: '#ff3b2e' };

export const treatmentFor = (movement) => {
    const key = BY_SLUG[movement?.tag] || 'classical';
    const t = TREATMENTS[key];
    return { key, ...t, accent: key === 'neon' ? (NEON[movement.tag] || t.accent) : t.accent };
};

// Two titles are too long to typeset as a title card; everything else as stored
const SHORT = {
    'Third Cinema / Latin American Political Cinema': 'Third Cinema',
    'Documentary / Cinema Vérité': 'Cinéma Vérité',
    'Avant-garde / Experimental Cinema': 'The Avant-garde'
};
export const displayTitle = (m) => SHORT[m?.title] || m?.title || '';

// TMDB serves sizes by path segment; cards don't need the original
export const sized = (url, size = 'w1280') => (url ? url.replace(/\/t\/p\/(original|w\d+)\//, `/t/p/${size}/`) : url);
