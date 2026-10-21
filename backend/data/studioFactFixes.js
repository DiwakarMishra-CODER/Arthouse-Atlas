/**
 * Corrections to the houses' facts, applied over what scripts/fetchStudioFacts.js fetches.
 *
 * Where Wikidata disagrees with the Wikipedia page a house links to, the page wins. Examples: Mosfilm
 * founded in 1924, Lux Film in 1934, Kino Lorber in 1976. Where Wikidata gives a headquarters building
 * or district instead of the city, the city is named. Where it lists no founders, the page's founders
 * are added. For the houses with no English Wikipedia page, the gaps are filled from standard
 * references, only where well documented (MK2: Marin Karmitz, 1974; Argos: Anatole Dauman and Philippe
 * Lifchitz, 1949). Filled by hand on 2026-10-21; for the owner to review.
 *
 * A key set to null removes a fetched value that's wrong (a country given as a city).
 */

export const FIXES = {
    mk2: { founded: 1974, founders: ['Marin Karmitz'], place: 'Paris' },
    argos: { founded: 1949, founders: ['Anatole Dauman', 'Philippe Lifchitz'], place: 'Paris' },
    'parc-film': { founders: ['Mag Bodard'], place: 'Paris' },
    'films-du-carrosse': { founded: 1957, founders: ['François Truffaut'], place: 'Paris' },
    mosfilm: { founded: 1924 },
    'lux-film': { founded: 1934, founders: ['Riccardo Gualino'] },
    'kino-lorber': { founded: 1976 },
    'why-not': { founders: ['Pascal Caucheteux', 'Grégoire Sorlat'] },
    pandora: { founders: ['Karl Baumgartner', 'Reinhard Brundig'] },
    'films-du-losange': { founders: ['Barbet Schroeder', 'Éric Rohmer'] },
    neon: { founders: ['Tom Quinn', 'Tim League'] },
    woodfall: { founded: null, founders: ['Tony Richardson', 'John Osborne', 'Harry Saltzman'] },
    'sony-pictures-classics': { founders: ['Michael Barker', 'Tom Bernard'] },
    'killer-films': { founders: ['Christine Vachon', 'Pamela Koffler'] },
    'the-archers': { founders: ['Michael Powell', 'Emeric Pressburger'] },
    'jet-tone': { founders: ['Wong Kar-wai', 'Jeffrey Lau'], place: 'Hong Kong' },
    wega: { founders: ['Veit Heiduschka'], place: 'Vienna' },
    champion: { founders: ['Carlo Ponti'], place: 'Rome' },
    chaplin: { founders: ['Charlie Chaplin'] },
    ghoulardi: { founders: ['Paul Thomas Anderson'] },
    detour: { founders: ['Richard Linklater'], place: 'Austin' },
    'kick-the-machine': { founders: ['Apichatpong Weerasethakul'], place: 'Bangkok' },
    herzog: { founders: ['Werner Herzog'], place: 'Munich' },
    tor: { place: 'Warsaw' },
    shochiku: { place: 'Kyoto' },
    gaumont: { place: 'Paris' },
    ghibli: { place: 'Tokyo' },
    'bbc-film': { place: 'London' },
    kanoon: { place: 'Tehran' },
    cmpc: { place: 'Taipei' },
    daiei: { place: null },
    'hawk-films': { place: null },
};
