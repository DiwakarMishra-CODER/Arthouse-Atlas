import { useEffect, useMemo, useState } from 'react';
import { moviesAPI } from '../../services/api';
import { regionName } from '../../hooks/region';

// What the country picker (CountryPicker.jsx) needs from outside it: every country with listings,
// and where to open beside the word that opened it.

const FALLBACK = ['IN', 'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'BR', 'ES', 'IT'];
export const PICKER_W = 340;

// every country with listings, asked for once per visit, in name order (yours always among them)
let regionsAsked = null;
export const useRegions = (region) => {
    const [list, setList] = useState(FALLBACK);
    useEffect(() => {
        let gone = false;
        regionsAsked ??= moviesAPI.getWatchRegions().then((r) => r.data.regions || []).catch(() => { regionsAsked = null; return []; });
        regionsAsked.then((all) => { if (!gone && all.length) setList(all); });
        return () => { gone = true; };
    }, []);
    return useMemo(() => [...new Set([...list, region])].sort((a, b) => regionName(a).localeCompare(regionName(b))), [list, region]);
};

// under the word, or above it when there's no room below; held inside the window
export const placeBy = (r) => {
    const left = Math.min(Math.max(16, r.left - 12), window.innerWidth - Math.min(PICKER_W, window.innerWidth - 32) - 16);
    return window.innerHeight - r.bottom > 400
        ? { left, top: r.bottom + 12, from: 'top' }
        : { left, bottom: window.innerHeight - r.top + 12, from: 'bottom' };
};
