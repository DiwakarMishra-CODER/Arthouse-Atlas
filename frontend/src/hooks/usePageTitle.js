import { useEffect } from 'react';
import { markPage } from './trail';

/**
 * The browser tab's title, and the page's description, for each page.
 *
 * usePageTitle('Persona (1966)', 'A nurse and an actress…') sets the tab to
 * "Persona (1966) · Arthouse Atlas". With no title (the home page) the tab reads the site's own
 * name and line. Leaving the page puts the site's own back, so a page without a title never shows
 * the last page's. (A shared link's preview is set on the server instead, by middleware.js, since
 * the services that draw previews don't run the page's JavaScript.)
 */

export const SITE = 'Arthouse Atlas';
export const SITE_TITLE = 'Arthouse Atlas: a curated atlas of arthouse cinema';
// (no counts here: they'd go stale as the catalogue grows)
export const SITE_LINE = 'A curated atlas of arthouse cinema: every film placed in a canon built from critics’ polls, lists and festival prizes, with picks for you learned from real viewers’ ratings.';

const setDescription = (text) => {
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', 'description');
        document.head.appendChild(tag);
    }
    tag.setAttribute('content', text);
};

export const usePageTitle = (title, description) => {
    useEffect(() => {
        document.title = title ? `${title} · ${SITE}` : SITE_TITLE;
        setDescription(description || SITE_LINE);
        markPage({ path: window.location.pathname, title: title || null }); // (so a Back button can name this page)
        return () => {
            document.title = SITE_TITLE;
            setDescription(SITE_LINE);
        };
    }, [title, description]);
};
