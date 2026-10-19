/**
 * Canon sources — the public lists that count as evidence a film belongs here.
 *
 * Each source gets a weight used by buildProvenance.js when scoring how much
 * canon evidence a film has. Rank-aware sources (polls, TSPDT) scale the weight
 * by position; membership sources (Criterion, awards) are flat.
 */

export const SOURCES = {
  'ss2022-critics': {
    family: 'all-time-poll', size: 250, eligible: { from: 1895, to: 2021 },
    label: "Sight & Sound 2022 — critics' poll",
    short: 'S&S 2022 critics',
    url: 'https://www.bfi.org.uk/sight-and-sound/greatest-films-all-time',
    raw: 'bfi-critics.html',
    kind: 'ranked',
    weight: 3.0
  },
  'ss2022-directors': {
    family: 'peer-poll', size: 100, eligible: { from: 1895, to: 2021 },
    label: "Sight & Sound 2022 — directors' poll",
    short: 'S&S 2022 directors',
    url: 'https://www.bfi.org.uk/sight-and-sound/directors-100-greatest-films-all-time',
    raw: 'bfi-directors.html',
    kind: 'ranked',
    weight: 3.0
  },
  'tspdt-1000': {
    family: 'all-time-poll', size: 1000, eligible: { from: 1895, to: 2023 },
    label: "They Shoot Pictures, Don't They? — 1,000 Greatest Films",
    short: 'TSPDT 1000',
    url: 'https://www.theyshootpictures.com/gf1000_all1000films_table.php',
    raw: 'tspdt.html',
    kind: 'ranked',
    weight: 2.0
  },
  'criterion': {
    family: 'institution',
    label: 'The Criterion Collection',
    short: 'Criterion',
    url: 'https://en.wikipedia.org/wiki/List_of_films_in_the_Criterion_Collection',
    raw: 'criterion.html',
    kind: 'membership',
    weight: 1.5
  },
  'cahiers-top10': {
    family: 'year-end',
    label: 'Cahiers du Cinéma — annual top 10',
    short: 'Cahiers top 10',
    url: "https://en.wikipedia.org/wiki/Cahiers_du_Cin%C3%A9ma%27s_Annual_Top_10_Lists",
    raw: 'cahiers.html',
    kind: 'ranked-yearly',
    weight: 1.5
  },
  'festival-awards': {
    family: 'prize',
    label: 'Major festival prizes (Wikidata)',
    short: 'Festival prize',
    url: 'https://query.wikidata.org/sparql',
    raw: 'wikidata-awards.json',
    sparql: 'awards.sparql',
    kind: 'membership',
    weight: 2.0
  }
};

// Festival awards we treat as canon evidence, with their Wikidata ids.
// Top prizes weigh full; runner-up prizes weigh less.
export const AWARDS = {
  Q179808:   { name: "Palme d'Or",                          festival: 'Cannes',  weight: 1.0 },
  Q844804:   { name: 'Grand Prix',                          festival: 'Cannes',  weight: 0.7 },
  Q164200:   { name: 'Jury Prize',                          festival: 'Cannes',  weight: 0.5 },
  Q17354954: { name: 'Un Certain Regard Award',             festival: 'Cannes',  weight: 0.4 },
  Q209459:   { name: 'Golden Lion',                         festival: 'Venice',  weight: 1.0 },
  Q944480:   { name: 'Grand Jury Prize',                    festival: 'Venice',  weight: 0.6 },
  Q154590:   { name: 'Golden Bear',                         festival: 'Berlin',  weight: 1.0 },
  Q664212:   { name: 'Silver Bear Grand Jury Prize',        festival: 'Berlin',  weight: 0.6 },
  Q1700510:  { name: 'Golden Leopard',                      festival: 'Locarno', weight: 0.8 },
  Q510175:   { name: 'Best Director',                       festival: 'Cannes',  weight: 0.5 },
  Q1337827:  { name: 'Silver Lion',                         festival: 'Venice',  weight: 0.5 },
  Q706031:   { name: 'Silver Bear for Best Director',       festival: 'Berlin',  weight: 0.5 },
  // The international critics' prizes. Wikidata records only a fraction of FIPRESCI winners,
  // so these are a floor, not the full picture.
  Q121788841: { name: 'FIPRESCI Grand Prix',                festival: 'FIPRESCI', weight: 0.6 },
  Q3404587:  { name: 'FIPRESCI Prize',                      festival: 'Cannes',  weight: 0.4 },
  Q15972045: { name: 'FIPRESCI Prize',                      festival: 'Venice',  weight: 0.4 },
  Q16020748: { name: 'FIPRESCI Prize',                      festival: 'Berlin',  weight: 0.4 },
  Q1168327:  { name: 'FIPRESCI Prize',                      festival: 'FIPRESCI', weight: 0.3 }
};

export const AWARDS_SPARQL = `
SELECT DISTINCT ?film ?filmLabel ?award ?awardLabel ?year ?tmdb ?imdb
  (GROUP_CONCAT(DISTINCT ?directorLabel; separator="; ") AS ?directors) WHERE {
  VALUES ?award { ${Object.keys(AWARDS).map((q) => `wd:${q}`).join(' ')} }
  ?film wdt:P31/wdt:P279* wd:Q11424 .
  ?film p:P166 ?s . ?s ps:P166 ?award .
  OPTIONAL { ?s pq:P585 ?pit }
  OPTIONAL { ?film wdt:P577 ?pub }
  BIND(YEAR(COALESCE(?pit, ?pub)) AS ?year)
  OPTIONAL { ?film wdt:P57 ?director . ?director rdfs:label ?directorLabel . FILTER(LANG(?directorLabel)="en") }
  OPTIONAL { ?film wdt:P4947 ?tmdb }
  OPTIONAL { ?film wdt:P345 ?imdb }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
GROUP BY ?film ?filmLabel ?award ?awardLabel ?year ?tmdb ?imdb`;
