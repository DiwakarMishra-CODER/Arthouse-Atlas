import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compactEntry, buildIndex, offersIn, watchView, watchPath, DAY, familiesOf, streamingFamilies, matchesScreens, screensFacet } from '../services/watchIndex.js';

const p = (id, name, priority = 1) => ({ provider_id: id, provider_name: name, logo_path: `/${id}.png`, display_priority: priority });
const MUBI = p(11, 'MUBI', 1);
const MUBI_AMAZON = p(201, 'MUBI Amazon Channel', 5);
const PRIME = p(9, 'Amazon Prime Video', 2);
const PRIME_ADS = p(2100, 'Amazon Prime Video with Ads', 3);
const KANOPY = p(191, 'Kanopy', 4);

test('TMDB results become ids per kind, and the providers they name are kept once', () => {
  const providers = {};
  const entry = compactEntry({
    IN: { link: 'x', flatrate: [MUBI], rent: [PRIME], buy: [PRIME] },
    US: { free: [KANOPY], ads: [KANOPY] },
    FR: { link: 'only a link' },
  }, providers);
  assert.deepEqual(entry, { IN: { s: [11], f: [], r: [9], b: [9] }, US: { s: [], f: [191], r: [], b: [] } });
  assert.deepEqual(Object.keys(providers).sort(), ['11', '191', '9']);
});

test('series and seasons are asked for at their own address', () => {
  assert.equal(watchPath({ tmdbId: 15 }), '/movie/15/watch/providers');
  assert.equal(watchPath({ tmdbTv: 1920, tmdbSeason: 3 }), '/tv/1920/season/3/watch/providers');
  assert.equal(watchPath({}), null);
});

const films = [{ _id: 'a', tmdbId: 1 }, { _id: 'b', tmdbId: 2 }, { _id: 'c', tmdbId: 3 }, { _id: 'd', tmdbId: 4 }, { _id: 'e', tmdbId: 5 },
  { _id: 'f', tmdbId: 6 }, { _id: 'g', tmdbId: 7 }, { _id: 'h', tmdbId: 8 }, { _id: 'i', tmdbId: 9 }, { _id: 'j', tmdbId: 10 }, { _id: 'k', tmdbId: 11 }];
const listing = { IN: { flatrate: [MUBI] } };

test('a film TMDB fails on keeps yesterday\'s listing', async () => {
  const previous = (await buildIndex(films, async () => listing)).index;
  const { index, failed } = await buildIndex(films, async (f) => { if (f._id === 'c') throw new Error('timeout'); return listing; }, previous);
  assert.equal(failed, 1);
  assert.deepEqual(index.films.get('c'), { IN: { s: [11], f: [], r: [], b: [] } });
});

test('a build where more than a tenth of films fail is thrown away', async () => {
  const { index, why } = await buildIndex(films, async (f) => { if (f.tmdbId <= 2) throw new Error('down'); return listing; });
  assert.equal(index, null);
  assert.match(why, /too many/);
});

test('a build that suddenly loses most of its listings is thrown away, not believed', async () => {
  const previous = (await buildIndex(films, async () => listing)).index;
  const { index, why } = await buildIndex(films, async () => ({}), previous);
  assert.equal(index, null);
  assert.match(why, /lost most/);
});

test('a channel or ad tier folds into the service it belongs to; streaming comes first', () => {
  const providers = {};
  const entry = compactEntry({ IN: { flatrate: [MUBI_AMAZON, MUBI], rent: [PRIME], ads: [PRIME_ADS] } }, providers);
  const offers = offersIn(entry, providers, 'IN');
  assert.deepEqual(offers.map((o) => [o.name, o.kinds]), [['MUBI', ['stream']], ['Amazon Prime Video', ['free', 'rent']]]);
  const sony = {};
  const both = compactEntry({ IN: { flatrate: [p(237, 'Sony Liv'), p(2049, 'Sonyliv Amazon Channel')] } }, sony);
  assert.deepEqual(offersIn(both, sony, 'IN').map((o) => o.name), ['Sony Liv'], 'spacing and case aside, it is the same service');
});

test('not showing here: it says how widely it is showing, and where, free first', () => {
  const providers = {};
  const entry = compactEntry({ GB: { flatrate: [MUBI] }, US: { free: [KANOPY] }, DE: { rent: [PRIME] } }, providers);
  const view = watchView({ tmdbId: 7 }, entry, providers, 'IN', new Date());
  assert.deepEqual(view.offers, []);
  assert.equal(view.countries, 2); // renting alone doesn't count as showing
  assert.deepEqual(view.showingIn, ['GB', 'US']);
  assert.deepEqual(view.elsewhere, { region: 'US', name: 'Kanopy', free: true });
  assert.equal(view.page, 'https://www.themoviedb.org/movie/7/watch?locale=IN');
});

test('a listing older than three days says so', () => {
  const now = Date.now();
  assert.equal(watchView({ tmdbId: 1 }, {}, {}, 'IN', new Date(now - DAY), now).stale, false);
  assert.equal(watchView({ tmdbId: 1 }, {}, {}, 'IN', new Date(now - 4 * DAY), now).stale, true);
});

// Explore's "streaming on": services as families, the filter and its counts
const listings = () => {
  const providers = {};
  const films = {
    a: compactEntry({ IN: { flatrate: [MUBI_AMAZON] } }, providers), // MUBI, through its Amazon channel only
    b: compactEntry({ IN: { flatrate: [MUBI, PRIME] } }, providers),
    c: compactEntry({ IN: { ads: [PRIME_ADS], rent: [PRIME] } }, providers), // free, with ads
    d: compactEntry({ IN: { rent: [PRIME] }, US: { free: [KANOPY] } }, providers), // only to rent here
  };
  return { providers, lookup: (id, cc) => streamingFamilies(films[id], cc, providers) };
};

test('a service and its channels and ad tiers are one family, named by the plain one', () => {
  const { providers } = listings();
  const fam = familiesOf(providers);
  assert.equal(fam.get(201).name, 'MUBI');
  assert.equal(fam.get(2100), fam.get(9));
  assert.equal(fam.get(9).name, 'Amazon Prime Video');
});

test('streaming on MUBI finds a film that is only on its Amazon channel; renting is not streaming', () => {
  const { lookup } = listings();
  const on = (id, v) => matchesScreens(id, { region: 'IN', ...v }, lookup);
  assert.deepEqual(['a', 'b', 'c', 'd'].filter((id) => on(id, { mode: 'ids', ids: new Set([11]) })), ['a', 'b']);
  assert.deepEqual(['a', 'b', 'c', 'd'].filter((id) => on(id, { mode: 'all' })), ['a', 'b', 'c']);
  assert.deepEqual(['a', 'b', 'c', 'd'].filter((id) => on(id, { mode: 'free' })), ['c']);
  assert.equal(on('d', { mode: 'all', region: 'US' }), true);
});

test('the counts: streaming at all, free, and each service, most films first', () => {
  const { lookup } = listings();
  const facet = screensFacet(['a', 'b', 'c', 'd'].map((_id) => ({ _id })), 'IN', lookup);
  assert.equal(facet.all, 3);
  assert.equal(facet.free, 1);
  assert.deepEqual(facet.services.map((s) => [s.name, s.n]), [['Amazon Prime Video', 2], ['MUBI', 2]]);
});
