/**
 * The houses in the Studios room.
 *
 * Production houses: every company with four or more films in the atlas by TMDB's production
 * credits, one company's spellings merged (`credits`), and the credits that aren't studios left out
 * (TV channels, funds, sales agents and agencies: ARTE, ZDF, WDR, France 2/3 Cinéma, RTBF, SVT, BR,
 * RAI, NHK, Hubert Bals Fund, Film i Väst, BFI, The Match Factory, Bandai Visual, Hakuhodo, dentsu…).
 * The mainstream machines are left out too, by the owner's choice (2026-10-21): the Hollywood majors
 * (Paramount, Warner Bros., Columbia, Universal, 20th Century Fox, MGM) and Working Title. Their films
 * here belong to their directors, not to a house style.
 *
 * `wiki`: the house's English Wikipedia page, for its facts (scripts/fetchStudioFacts.js).
 *
 * Labels: the companies that release these films rather than make them. Criterion holds every film
 * the canon cites from its collection (the `criterion` source, by spine). The others hold the films
 * on their Studio record, less the ones checked and found to be another company's (`drop`).
 */

export const HOUSES = [
    { slug: 'mk2', wiki: 'MK2 (company)', name: 'MK2', country: 'France', credits: ['MK2 Productions', 'MK2 Films', 'mk2 Films', 'MK Productions'] },
    { slug: 'argos', wiki: 'Argos Films', name: 'Argos Films', country: 'France', credits: ['Argos films', 'Argos Films'] },
    { slug: 'toho', wiki: 'Toho', name: 'Toho', country: 'Japan', credits: ['TOHO', 'Toho', 'Toho Company'] },
    { slug: 'shochiku', wiki: 'Shochiku', name: 'Shochiku', country: 'Japan', credits: ['Shochiku', 'Shochiku Ofuna Film Studio'] },
    { slug: 'film4', wiki: 'Film4 Productions', name: 'Film4', country: 'United Kingdom', credits: ['Film4 Productions', 'Film4', 'Channel Four Films'] },
    { slug: 'sf-studios', wiki: 'SF Studios', name: 'SF Studios', country: 'Sweden', credits: ['SF Studios', 'Svensk Filmindustri'] },
    { slug: 'mosfilm', wiki: 'Mosfilm', name: 'Mosfilm', country: 'Soviet Union', credits: ['Mosfilm'] },
    { slug: 'barrandov', wiki: 'Barrandov Studios', name: 'Barrandov', country: 'Czechoslovakia', credits: ['Filmové studio Barrandov', 'Barrandov Studio'] },
    { slug: 'daiei', wiki: 'Daiei Film', name: 'Daiei', country: 'Japan', credits: ['Daiei Film'] },
    { slug: 'ghibli', wiki: 'Studio Ghibli', name: 'Studio Ghibli', country: 'Japan', credits: ['Studio Ghibli'] },
    { slug: 'parc-film', wiki: 'Parc Film', name: 'Parc Film', country: 'France', credits: ['Parc Film'] },
    { slug: 'bbc-film', wiki: 'BBC Film', name: 'BBC Film', country: 'United Kingdom', credits: ['BBC Film', 'BBC Films'] },
    { slug: 'films-du-fleuve', wiki: 'Les Films du Fleuve', name: 'Les Films du Fleuve', country: 'Belgium', credits: ['Les Films du Fleuve'] },
    { slug: 'cj', wiki: 'CJ Entertainment', name: 'CJ Entertainment', country: 'South Korea', credits: ['CJ Entertainment'] },
    { slug: 'films-du-losange', wiki: 'Les Films du Losange', name: 'Les Films du Losange', country: 'France', credits: ['Les Films du Losange'] },
    { slug: 'studiocanal', wiki: 'StudioCanal', name: 'StudioCanal', country: 'France', credits: ['Le Studio Canal+', 'StudioCanal', 'Studio Canal'] },
    { slug: 'rank', wiki: 'The Rank Organisation', name: 'The Rank Organisation', country: 'United Kingdom', credits: ['J. Arthur Rank Organisation', 'The Rank Organisation'] },
    { slug: 'kanoon', wiki: 'Institute for the Intellectual Development of Children and Young Adults', name: 'Kanoon', country: 'Iran', credits: ['Kanoon'] },
    { slug: 'films-du-carrosse', wiki: 'Les Films du Carrosse', name: 'Les Films du Carrosse', country: 'France', credits: ['Les Films du Carrosse'] },
    { slug: 'ciby-2000', wiki: 'CiBy 2000', name: 'CiBy 2000', country: 'France', credits: ['CiBy 2000', 'CiBy Pictures'] },
    { slug: 'united-artists', wiki: 'United Artists', name: 'United Artists', country: 'United States', credits: ['United Artists'] },
    { slug: 'why-not', wiki: 'Why Not Productions', name: 'Why Not Productions', country: 'France', credits: ['Why Not Productions'] },
    { slug: 'the-archers', wiki: 'Powell and Pressburger', name: 'The Archers', country: 'United Kingdom', credits: ['The Archers'] },
    { slug: 'pandora', wiki: 'Pandora Film', name: 'Pandora Film', country: 'Germany', credits: ['Pandora Film', 'Pandora Filmproduktion'] },
    { slug: 'zentropa', wiki: 'Zentropa', name: 'Zentropa', country: 'Denmark', credits: ['Zentropa Entertainments', 'Zentropa International Sweden', 'Zentropa International Netherlands'] },
    { slug: 'paradis', wiki: 'Paradis Films', name: 'Paradis Films', country: 'France', credits: ['Paradis Films'] },
    { slug: 'titanus', wiki: 'Titanus', name: 'Titanus', country: 'Italy', credits: ['Titanus'] },
    { slug: 'chaplin', wiki: 'Charles Chaplin Productions', name: 'Charles Chaplin Productions', country: 'United States', credits: ['Charles Chaplin Productions'] },
    { slug: 'cmpc', wiki: 'Central Motion Picture Corporation', name: 'Central Motion Picture Corporation', country: 'Taiwan', credits: ['Central Motion Picture Corporation'] },
    { slug: 'komplizen', wiki: 'Komplizen Film', name: 'Komplizen Film', country: 'Germany', credits: ['Komplizen Film'] },
    { slug: 'ghoulardi', wiki: 'Ghoulardi Film Company', name: 'Ghoulardi Film Company', country: 'United States', credits: ['Ghoulardi Film Company'] },
    { slug: 'louverture', wiki: 'Louverture Films', name: 'Louverture Films', country: 'United States', credits: ['Louverture Films'] },
    { slug: 'cineriz', wiki: 'Cineriz', name: 'Cineriz', country: 'Italy', credits: ['Cineriz'] },
    { slug: 'lux-film', wiki: 'Lux Film', name: 'Lux Film', country: 'Italy', credits: ['Lux Film'] },
    { slug: 'tv-man-union', wiki: 'TV Man Union', name: 'TV Man Union', country: 'Japan', credits: ['TV Man Union'] },
    { slug: 'cab', wiki: 'CAB Productions', name: 'CAB Productions', country: 'Switzerland', credits: ['CAB Productions'] },
    { slug: 'tor', wiki: 'Tor Film Production', name: 'Studio Filmowe Tor', country: 'Poland', credits: ['Studio Filmowe Tor', 'Zespół Filmowy "Tor"'] },
    { slug: 'anouchka', wiki: 'Anouchka Films', name: 'Anouchka Films', country: 'France', credits: ['Anouchka Films'] },
    { slug: 'champion', wiki: 'Compagnia Cinematografica Champion', name: 'C. C. Champion', country: 'Italy', credits: ['C. C. Champion'] },
    { slug: 'memento', wiki: 'Memento Films', name: 'Memento Films', country: 'France', credits: ['Memento Films Production', 'Memento Production'] },
    { slug: 'herzog', wiki: 'Werner Herzog Filmproduktion', name: 'Werner Herzog Filmproduktion', country: 'Germany', credits: ['Werner Herzog Filmproduktion'] },
    { slug: 'jet-tone', wiki: 'Jet Tone Films', name: 'Jet Tone', country: 'Hong Kong', credits: ['Jet Tone Production', 'Jet Tone Films'] },
    { slug: 'gaumont', wiki: 'Gaumont Film Company', name: 'Gaumont', country: 'France', credits: ['Gaumont', 'Gaumont Distribution', 'Gaumont-Franco Film-Aubert (G.F.F.A)'] },
    { slug: 'xstream', wiki: 'Xstream Pictures', name: 'Xstream Pictures', country: 'China', credits: ['Xstream Pictures'] },
    { slug: 'alain-sarde', wiki: 'Alain Sarde', name: 'Les Films Alain Sarde', country: 'France', credits: ['Les Films Alain Sarde'] },
    { slug: 'woodfall', wiki: 'Woodfall Film Productions', name: 'Woodfall', country: 'United Kingdom', credits: ['Woodfall Film Productions'] },
    { slug: 'wega', wiki: 'Wega Film', name: 'Wega Film', country: 'Austria', credits: ['Wega Film'] },
    { slug: 'kick-the-machine', wiki: 'Kick the Machine', name: 'Kick the Machine', country: 'Thailand', credits: ['Kick the Machine'] },
    { slug: 'anna-sanders', wiki: 'Anna Sanders Films', name: 'Anna Sanders Films', country: 'France', credits: ['Anna Sanders Films'] },
    { slug: 'killer-films', wiki: 'Killer Films', name: 'Killer Films', country: 'United States', credits: ['Killer Films'] },
    { slug: 'icaic', wiki: 'Cuban Institute of Cinematographic Art and Industry', name: 'ICAIC', country: 'Cuba', credits: ['ICAIC'] },
    { slug: 'detour', wiki: 'Detour Filmproduction', name: 'Detour Filmproduction', country: 'United States', credits: ['Detour Filmproduction'] },
    { slug: 'archipel', wiki: 'Archipel 33', name: 'Archipel 33', country: 'France', credits: ['Archipel 33>35'] },
    { slug: 'hawk-films', wiki: 'Hawk Films', name: 'Hawk Films', country: 'United Kingdom', credits: ['Hawk Films'] },
    { slug: 'a24', wiki: 'A24', name: 'A24', country: 'United States', credits: ['A24'], studio: 'A24' },
];

export const LABELS = [
    { slug: 'criterion', wiki: 'The Criterion Collection', name: 'The Criterion Collection', country: 'United States', provenance: 'criterion' },
    { slug: 'neon', wiki: 'Neon (company)', name: 'NEON', country: 'United States', studio: 'NEON', drop: ['Drive My Car'] },
    { slug: 'sony-pictures-classics', wiki: 'Sony Pictures Classics', name: 'Sony Pictures Classics', country: 'United States', studio: 'Sony Pictures Classics', drop: ['The Diving Bell and the Butterfly', 'Ida'] },
    { slug: 'ifc', wiki: 'IFC Films', name: 'IFC Films', country: 'United States', studio: 'IFC Films' },
    { slug: 'kino-lorber', wiki: 'Kino Lorber', name: 'Kino Lorber', country: 'United States', studio: 'Kino Lorber' },
    { slug: 'dogwoof', wiki: 'Dogwoof', name: 'Dogwoof', country: 'United Kingdom', studio: 'Dogwoof' },
    { slug: 'curzon', wiki: 'Curzon Film', name: 'Curzon', country: 'United Kingdom', studio: 'Curzon', drop: ['The Worst Person in the World'] },
];
