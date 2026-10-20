/**
 * The houses in the Studios room.
 *
 * Production houses: every company with four or more films in the atlas by TMDB's production
 * credits, one company's spellings merged (`credits`), and the credits that aren't studios left out
 * (TV channels, funds, sales agents and agencies: ARTE, ZDF, WDR, France 2/3 Cinéma, RTBF, SVT, BR,
 * RAI, NHK, Hubert Bals Fund, Film i Väst, BFI, The Match Factory, Bandai Visual, Hakuhodo, dentsu…).
 *
 * Labels: the companies that release these films rather than make them. Criterion holds every film
 * the canon cites from its collection (the `criterion` source, by spine). The others hold the films
 * on their Studio record, less the ones checked and found to be another company's (`drop`).
 */

export const HOUSES = [
    { slug: 'mk2', name: 'MK2', country: 'France', credits: ['MK2 Productions', 'MK2 Films', 'mk2 Films', 'MK Productions'] },
    { slug: 'argos', name: 'Argos Films', country: 'France', credits: ['Argos films', 'Argos Films'] },
    { slug: 'toho', name: 'Toho', country: 'Japan', credits: ['TOHO', 'Toho', 'Toho Company'] },
    { slug: 'shochiku', name: 'Shochiku', country: 'Japan', credits: ['Shochiku', 'Shochiku Ofuna Film Studio'] },
    { slug: 'film4', name: 'Film4', country: 'United Kingdom', credits: ['Film4 Productions', 'Film4', 'Channel Four Films'] },
    { slug: 'paramount', name: 'Paramount', country: 'United States', credits: ['Paramount Pictures', 'Paramount Vantage'] },
    { slug: 'sf-studios', name: 'SF Studios', country: 'Sweden', credits: ['SF Studios', 'Svensk Filmindustri'] },
    { slug: 'mosfilm', name: 'Mosfilm', country: 'Soviet Union', credits: ['Mosfilm'] },
    { slug: 'barrandov', name: 'Barrandov', country: 'Czechoslovakia', credits: ['Filmové studio Barrandov', 'Barrandov Studio'] },
    { slug: 'warner', name: 'Warner Bros.', country: 'United States', credits: ['Warner Bros. Pictures', 'Warner Bros.', 'Warner Independent Pictures'] },
    { slug: 'daiei', name: 'Daiei', country: 'Japan', credits: ['Daiei Film'] },
    { slug: 'columbia', name: 'Columbia', country: 'United States', credits: ['Columbia Pictures'] },
    { slug: 'ghibli', name: 'Studio Ghibli', country: 'Japan', credits: ['Studio Ghibli'] },
    { slug: 'parc-film', name: 'Parc Film', country: 'France', credits: ['Parc Film'] },
    { slug: 'bbc-film', name: 'BBC Film', country: 'United Kingdom', credits: ['BBC Film', 'BBC Films'] },
    { slug: 'films-du-fleuve', name: 'Les Films du Fleuve', country: 'Belgium', credits: ['Les Films du Fleuve'] },
    { slug: 'universal', name: 'Universal', country: 'United States', credits: ['Universal Pictures', 'Universal International Pictures'] },
    { slug: 'cj', name: 'CJ Entertainment', country: 'South Korea', credits: ['CJ Entertainment'] },
    { slug: 'films-du-losange', name: 'Les Films du Losange', country: 'France', credits: ['Les Films du Losange'] },
    { slug: 'studiocanal', name: 'StudioCanal', country: 'France', credits: ['Le Studio Canal+', 'StudioCanal', 'Studio Canal'] },
    { slug: 'rank', name: 'The Rank Organisation', country: 'United Kingdom', credits: ['J. Arthur Rank Organisation', 'The Rank Organisation'] },
    { slug: 'kanoon', name: 'Kanoon', country: 'Iran', credits: ['Kanoon'] },
    { slug: 'films-du-carrosse', name: 'Les Films du Carrosse', country: 'France', credits: ['Les Films du Carrosse'] },
    { slug: 'mgm', name: 'MGM', country: 'United States', credits: ['Metro-Goldwyn-Mayer', 'Metro-Goldwyn-Mayer (MGM)'] },
    { slug: 'ciby-2000', name: 'CiBy 2000', country: 'France', credits: ['CiBy 2000', 'CiBy Pictures'] },
    { slug: 'united-artists', name: 'United Artists', country: 'United States', credits: ['United Artists'] },
    { slug: 'why-not', name: 'Why Not Productions', country: 'France', credits: ['Why Not Productions'] },
    { slug: 'the-archers', name: 'The Archers', country: 'United Kingdom', credits: ['The Archers'] },
    { slug: 'pandora', name: 'Pandora Film', country: 'Germany', credits: ['Pandora Film', 'Pandora Filmproduktion'] },
    { slug: 'zentropa', name: 'Zentropa', country: 'Denmark', credits: ['Zentropa Entertainments', 'Zentropa International Sweden', 'Zentropa International Netherlands'] },
    { slug: 'paradis', name: 'Paradis Films', country: 'France', credits: ['Paradis Films'] },
    { slug: 'fox', name: '20th Century Fox', country: 'United States', credits: ['20th Century Fox', 'Twentieth Century Fox', 'Fox Film Corporation'] },
    { slug: 'titanus', name: 'Titanus', country: 'Italy', credits: ['Titanus'] },
    { slug: 'chaplin', name: 'Charles Chaplin Productions', country: 'United States', credits: ['Charles Chaplin Productions'] },
    { slug: 'cmpc', name: 'Central Motion Picture Corporation', country: 'Taiwan', credits: ['Central Motion Picture Corporation'] },
    { slug: 'komplizen', name: 'Komplizen Film', country: 'Germany', credits: ['Komplizen Film'] },
    { slug: 'ghoulardi', name: 'Ghoulardi Film Company', country: 'United States', credits: ['Ghoulardi Film Company'] },
    { slug: 'louverture', name: 'Louverture Films', country: 'United States', credits: ['Louverture Films'] },
    { slug: 'working-title', name: 'Working Title', country: 'United Kingdom', credits: ['Working Title', 'Working Title Films'] },
    { slug: 'cineriz', name: 'Cineriz', country: 'Italy', credits: ['Cineriz'] },
    { slug: 'lux-film', name: 'Lux Film', country: 'Italy', credits: ['Lux Film'] },
    { slug: 'tv-man-union', name: 'TV Man Union', country: 'Japan', credits: ['TV Man Union'] },
    { slug: 'cab', name: 'CAB Productions', country: 'Switzerland', credits: ['CAB Productions'] },
    { slug: 'tor', name: 'Studio Filmowe Tor', country: 'Poland', credits: ['Studio Filmowe Tor', 'Zespół Filmowy "Tor"'] },
    { slug: 'anouchka', name: 'Anouchka Films', country: 'France', credits: ['Anouchka Films'] },
    { slug: 'champion', name: 'C. C. Champion', country: 'Italy', credits: ['C. C. Champion'] },
    { slug: 'memento', name: 'Memento Films', country: 'France', credits: ['Memento Films Production', 'Memento Production'] },
    { slug: 'herzog', name: 'Werner Herzog Filmproduktion', country: 'Germany', credits: ['Werner Herzog Filmproduktion'] },
    { slug: 'jet-tone', name: 'Jet Tone', country: 'Hong Kong', credits: ['Jet Tone Production', 'Jet Tone Films'] },
    { slug: 'gaumont', name: 'Gaumont', country: 'France', credits: ['Gaumont', 'Gaumont Distribution', 'Gaumont-Franco Film-Aubert (G.F.F.A)'] },
    { slug: 'xstream', name: 'Xstream Pictures', country: 'China', credits: ['Xstream Pictures'] },
    { slug: 'alain-sarde', name: 'Les Films Alain Sarde', country: 'France', credits: ['Les Films Alain Sarde'] },
    { slug: 'woodfall', name: 'Woodfall', country: 'United Kingdom', credits: ['Woodfall Film Productions'] },
    { slug: 'wega', name: 'Wega Film', country: 'Austria', credits: ['Wega Film'] },
    { slug: 'kick-the-machine', name: 'Kick the Machine', country: 'Thailand', credits: ['Kick the Machine'] },
    { slug: 'anna-sanders', name: 'Anna Sanders Films', country: 'France', credits: ['Anna Sanders Films'] },
    { slug: 'killer-films', name: 'Killer Films', country: 'United States', credits: ['Killer Films'] },
    { slug: 'icaic', name: 'ICAIC', country: 'Cuba', credits: ['ICAIC'] },
    { slug: 'detour', name: 'Detour Filmproduction', country: 'United States', credits: ['Detour Filmproduction'] },
    { slug: 'archipel', name: 'Archipel 33', country: 'France', credits: ['Archipel 33>35'] },
    { slug: 'hawk-films', name: 'Hawk Films', country: 'United Kingdom', credits: ['Hawk Films'] },
    { slug: 'a24', name: 'A24', country: 'United States', credits: ['A24'], studio: 'A24' },
];

export const LABELS = [
    { slug: 'criterion', name: 'The Criterion Collection', country: 'United States', provenance: 'criterion' },
    { slug: 'neon', name: 'NEON', country: 'United States', studio: 'NEON', drop: ['Drive My Car'] },
    { slug: 'sony-pictures-classics', name: 'Sony Pictures Classics', country: 'United States', studio: 'Sony Pictures Classics', drop: ['The Diving Bell and the Butterfly', 'Ida'] },
    { slug: 'ifc', name: 'IFC Films', country: 'United States', studio: 'IFC Films' },
    { slug: 'kino-lorber', name: 'Kino Lorber', country: 'United States', studio: 'Kino Lorber' },
    { slug: 'dogwoof', name: 'Dogwoof', country: 'United Kingdom', studio: 'Dogwoof' },
    { slug: 'curzon', name: 'Curzon', country: 'United Kingdom', studio: 'Curzon', drop: ['The Worst Person in the World'] },
];
