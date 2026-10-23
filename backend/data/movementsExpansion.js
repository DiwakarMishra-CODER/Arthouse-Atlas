/**
 * Movement expansion — proposed additions to the 12 in movementsData.js.
 *
 * Chosen to cover the regions and eras the catalogue audit found empty (Czech
 * New Wave 0 films, Indian Parallel Cinema 3, L.A. Rebellion 0) and the
 * clusters of films already here that had no movement to belong to (Wong
 * Kar-wai ×5, Korean films ×12, New German Cinema ×7).
 *
 * essentialFilms are the seed list for each movement; keyDirectors drive the
 * director × era tagging rule. Years are release years.
 */

export const movementsExpansion = [
  {
    title: "Hollywood Auteurs",
    era: "1930–1959",
    vibe: "Genre pictures made by people with a signature — the studio system's secret art cinema.",
    philosophy: "The Cahiers critics' founding argument: inside Westerns, melodramas and screwball comedies, certain directors were authors. Auteur theory — and so the New Wave — begins here.",
    visualSignatures: ["invisible classical cutting", "Technicolor melodrama as emotional weather", "the long two-shot of people talking fast", "landscape in Monument Valley"],
    keyDirectors: ["Howard Hawks", "John Ford", "Ernst Lubitsch", "Preston Sturges", "Douglas Sirk", "Nicholas Ray", "Max Ophüls", "Joseph L. Mankiewicz", "Billy Wilder", "Alfred Hitchcock", "Orson Welles", "Samuel Fuller", "Robert Aldrich"],
    essentialFilms: [
      { title: "Trouble in Paradise", year: 1932 },
      { title: "Only Angels Have Wings", year: 1939 },
      { title: "The Lady Eve", year: 1941 },
      { title: "Letter from an Unknown Woman", year: 1948 },
      { title: "In a Lonely Place", year: 1950 },
      { title: "All About Eve", year: 1950 },
      { title: "The Searchers", year: 1956 },
      { title: "Written on the Wind", year: 1956 },
      { title: "Vertigo", year: 1958 },
      { title: "Rio Bravo", year: 1959 }
    ],
    description: "Why Hitchcock and Hawks are on a site about arthouse cinema: because in the 1950s a group of young French critics insisted that these studio directors were artists, built a theory of authorship around them, and then picked up cameras themselves. Every New Wave that followed inherited the idea.",
    tagline: "Where auteur theory was born.",
    tag: "hollywood_auteurs",
    icon: "studio",
    cardColor: "#b08d57"
  },
  {
    title: "Poetic Realism",
    era: "1934–1939",
    vibe: "Fog, fatalism, working-class romance doomed from the first frame.",
    philosophy: "Lyrical studio artifice in service of ordinary lives; beauty as a form of pity.",
    visualSignatures: ["fog-bound studio streets", "chiaroscuro interiors", "the fatal gesture in close-up"],
    keyDirectors: ["Jean Vigo", "Jean Renoir", "Marcel Carné", "Julien Duvivier"],
    essentialFilms: [
      { title: "L'Atalante", year: 1934 },
      { title: "Port of Shadows", year: 1938 },
      { title: "Le Jour se lève", year: 1939 },
      { title: "The Rules of the Game", year: 1939 },
      { title: "Children of Paradise", year: 1945 }
    ],
    description: "The French cinema of the late 1930s, where Popular Front hope curdled into melancholy: tender, pessimistic films about dockers, deserters and lovers, shot with painterly care on studio sets.",
    tagline: "Beauty as a form of pity.",
    tag: "poetic_realism",
    icon: "fog",
    cardColor: "#3a3f4a"
  },
  {
    title: "Japanese New Wave",
    era: "1956–1979",
    vibe: "Sex, politics, cruelty, formal rebellion.",
    philosophy: "Reject the humanism of the Golden Age; put the body, the crime and the state on screen without consolation.",
    visualSignatures: ["widescreen compositions broken by violence", "jump cuts and freeze frames", "flat, hard colour or stark monochrome"],
    keyDirectors: ["Nagisa Ōshima", "Shōhei Imamura", "Masahiro Shinoda", "Hiroshi Teshigahara", "Seijun Suzuki", "Yoshishige Yoshida"],
    essentialFilms: [
      { title: "Cruel Story of Youth", year: 1960 },
      { title: "The Insect Woman", year: 1963 },
      { title: "Woman in the Dunes", year: 1964 },
      { title: "Pale Flower", year: 1964 },
      { title: "Branded to Kill", year: 1967 },
      { title: "Death by Hanging", year: 1968 },
      { title: "Funeral Parade of Roses", year: 1969 }
    ],
    description: "A generation that came of age under the Occupation turned on Ozu's and Kurosawa's humanism with films about delinquents, outcasts and the violence under Japanese modernity — the most formally radical national cinema of the 1960s.",
    tagline: "Nothing sacred, least of all the frame.",
    tag: "japanese_new_wave",
    icon: "blade",
    cardColor: "#7a1f1f"
  },
  {
    title: "Czech New Wave",
    era: "1963–1968",
    vibe: "Absurdist, playful, humane — and then the tanks.",
    philosophy: "Observe real people with comic tenderness; let surrealism and satire say what censorship forbids.",
    visualSignatures: ["non-professional casts", "improvised dialogue", "collage and colour experiments", "deadpan long takes"],
    keyDirectors: ["Miloš Forman", "Věra Chytilová", "Jiří Menzel", "František Vláčil", "Jan Němec", "Ivan Passer", "Juraj Herz"],
    essentialFilms: [
      { title: "Loves of a Blonde", year: 1965 },
      { title: "The Shop on Main Street", year: 1965 },
      { title: "Daisies", year: 1966 },
      { title: "Closely Watched Trains", year: 1966 },
      { title: "Marketa Lazarová", year: 1967 },
      { title: "The Firemen's Ball", year: 1967 },
      { title: "The Cremator", year: 1969 },
      { title: "Valerie and Her Week of Wonders", year: 1970 }
    ],
    description: "Five years of extraordinary freedom at the Barrandov studios before the 1968 Soviet invasion ended it: gentle comedies of provincial life alongside some of the most anarchic experimental films ever made inside a state system.",
    tagline: "Five years of freedom, then silence.",
    tag: "czech_new_wave",
    icon: "daisy",
    cardColor: "#5b7f4f"
  },
  {
    title: "British New Wave",
    era: "1959–1963",
    vibe: "Kitchen sinks, factory whistles, angry young men.",
    philosophy: "Put the industrial North on screen in its own accent; class as the subject, not the backdrop.",
    visualSignatures: ["location shooting in terraced streets", "black-and-white realism", "the long walk along the canal"],
    keyDirectors: ["Tony Richardson", "Karel Reisz", "Lindsay Anderson", "John Schlesinger", "Jack Clayton"],
    essentialFilms: [
      { title: "Room at the Top", year: 1959 },
      { title: "Saturday Night and Sunday Morning", year: 1960 },
      { title: "A Taste of Honey", year: 1961 },
      { title: "The Loneliness of the Long Distance Runner", year: 1962 },
      { title: "This Sporting Life", year: 1963 },
      { title: "Billy Liar", year: 1963 },
      { title: "Kes", year: 1969 }
    ],
    description: "Born of Free Cinema documentaries and the Royal Court's angry young playwrights, these films gave working-class Britain a cinema of its own and a lineage that runs straight through Loach, Leigh and Arnold.",
    tagline: "The North, in its own accent.",
    tag: "british_new_wave",
    icon: "chimney",
    cardColor: "#4a4a4a"
  },
  {
    title: "New German Cinema",
    era: "1962–1982",
    vibe: "Guilt, longing, road movies, melodrama with the volume up.",
    philosophy: "\"Papa's cinema is dead\": a state-funded generation confronts the Federal Republic's silence about its past.",
    visualSignatures: ["Sirkian melodrama turned cold", "long travelling shots across landscapes", "theatrical staging in domestic rooms"],
    keyDirectors: ["Rainer Werner Fassbinder", "Werner Herzog", "Wim Wenders", "Volker Schlöndorff", "Alexander Kluge", "Margarethe von Trotta", "Jean-Marie Straub"],
    essentialFilms: [
      { title: "Yesterday Girl", year: 1966 },
      { title: "Aguirre, the Wrath of God", year: 1972 },
      { title: "Ali: Fear Eats the Soul", year: 1974 },
      { title: "Alice in the Cities", year: 1974 },
      { title: "Stroszek", year: 1977 },
      { title: "The Marriage of Maria Braun", year: 1979 },
      { title: "The Tin Drum", year: 1979 },
      { title: "Berlin Alexanderplatz", year: 1980 }
    ],
    description: "From the Oberhausen Manifesto to Fassbinder's death, West Germany produced a cinema of outsiders and expatriates that was as prolific as it was haunted — Fassbinder alone made forty films in fifteen years.",
    tagline: "Papa's cinema is dead.",
    cardColor: "#2f3e46",
    tag: "new_german_cinema",
    icon: "autobahn"
  },
  {
    title: "Indian Parallel Cinema",
    era: "1955–1990",
    vibe: "Humanist, unhurried, politically awake.",
    philosophy: "An alternative to the song-and-dance mainstream: realism rooted in Bengali literature, regional life and the aftermath of Partition.",
    visualSignatures: ["natural light and location sound", "faces held in silence", "landscape as emotional register", "literary adaptation"],
    keyDirectors: ["Satyajit Ray", "Ritwik Ghatak", "Mrinal Sen", "Guru Dutt", "Shyam Benegal", "Adoor Gopalakrishnan", "Mani Kaul", "G. Aravindan", "Girish Kasaravalli"],
    essentialFilms: [
      { title: "Pather Panchali", year: 1955 },
      { title: "Pyaasa", year: 1957 },
      { title: "The Music Room", year: 1958 },
      { title: "The Cloud-Capped Star", year: 1960 },
      { title: "Charulata", year: 1964 },
      { title: "Subarnarekha", year: 1965 },
      { title: "Bhuvan Shome", year: 1969 },
      { title: "Uski Roti", year: 1969 },
      { title: "Garm Hava", year: 1973 },
      { title: "Ankur", year: 1974 },
      { title: "Rat-Trap", year: 1981 }
    ],
    description: "Beginning in Bengal with Ray and Ghatak and spreading through Kerala, Karnataka and Hindi cinema with state support in the 1970s, the Parallel Cinema was one of the richest realist traditions anywhere — and remains one of the least seen outside India.",
    tagline: "The other Indian cinema.",
    tag: "parallel_cinema",
    icon: "lotus",
    cardColor: "#8a5a2b"
  },
  {
    title: "Hong Kong New Wave",
    era: "1979–2004",
    vibe: "Neon, rain, time running out before the handover.",
    philosophy: "Television-trained directors bring location realism and then, in the Second Wave, a swooning formalism about memory and displacement.",
    visualSignatures: ["step-printed slow motion", "saturated neon interiors", "handheld through crowds", "voice-over as diary"],
    keyDirectors: ["Ann Hui", "Tsui Hark", "Patrick Tam", "Allen Fong", "Wong Kar-wai", "Stanley Kwan", "Fruit Chan"],
    essentialFilms: [
      { title: "Father and Son", year: 1981 },
      { title: "Boat People", year: 1982 },
      { title: "Rouge", year: 1987 },
      { title: "Days of Being Wild", year: 1990 },
      { title: "Center Stage", year: 1991 },
      { title: "Chungking Express", year: 1994 },
      { title: "Made in Hong Kong", year: 1997 },
      { title: "In the Mood for Love", year: 2000 }
    ],
    description: "A first wave of socially engaged realists in the early 1980s, then a Second Wave — Wong Kar-wai, Stanley Kwan, Fruit Chan — who made the city's anxiety about 1997 into some of the most sensual cinema of the century.",
    tagline: "A city remembering itself in advance.",
    tag: "hong_kong_new_wave",
    icon: "neon",
    cardColor: "#a3245c"
  },
  {
    title: "Dogme 95",
    era: "1995–2005",
    vibe: "Handheld, raw, a vow of chastity against artifice.",
    philosophy: "Ten rules — location shooting, natural light, no added sound, no genre, no director credit — to force truth out of actors.",
    visualSignatures: ["available light and video grain", "handheld whip-pans", "no score", "actors cornered in real rooms"],
    keyDirectors: ["Lars von Trier", "Thomas Vinterberg", "Søren Kragh-Jacobsen", "Kristian Levring", "Lone Scherfig", "Susanne Bier"],
    essentialFilms: [
      { title: "The Celebration", year: 1998 },
      { title: "The Idiots", year: 1998 },
      { title: "Mifune", year: 1999 },
      { title: "Julien Donkey-Boy", year: 1999 },
      { title: "The King Is Alive", year: 2000 },
      { title: "Italian for Beginners", year: 2000 },
      { title: "Open Hearts", year: 2002 }
    ],
    description: "A Danish manifesto that half the world mistook for a joke until The Celebration won at Cannes. Its rules were abandoned within a decade; its influence on digital, performance-first filmmaking never was.",
    tagline: "The vow of chastity.",
    tag: "dogme95",
    icon: "handheld",
    cardColor: "#6b6b6b"
  },
  {
    title: "New Queer Cinema",
    era: "1990–1998",
    vibe: "Defiant, formally restless, made in the shadow of AIDS.",
    philosophy: "Refuse positive-image politics; tell queer stories with irony, anger and whatever form the story needs.",
    visualSignatures: ["pastiche of genres and film stocks", "direct address", "period drag", "Super 8 and video intercut"],
    keyDirectors: ["Todd Haynes", "Gus Van Sant", "Derek Jarman", "Gregg Araki", "Tom Kalin", "Cheryl Dunye", "Jennie Livingston"],
    essentialFilms: [
      { title: "Paris Is Burning", year: 1990 },
      { title: "Poison", year: 1991 },
      { title: "My Own Private Idaho", year: 1991 },
      { title: "Edward II", year: 1991 },
      { title: "Swoon", year: 1992 },
      { title: "The Living End", year: 1992 },
      { title: "Safe", year: 1995 },
      { title: "The Watermelon Woman", year: 1996 },
      { title: "Happy Together", year: 1997 }
    ],
    description: "Named by B. Ruby Rich after the 1991 Sundance and Toronto festivals, a loose, furious movement of independent filmmakers who made queerness the form of their films, not just the subject.",
    tagline: "Not asking permission.",
    tag: "new_queer_cinema",
    icon: "prism",
    cardColor: "#7b3fa0"
  },
  {
    title: "Korean New Wave",
    era: "1993–present",
    vibe: "Genre as a trapdoor into grief and rage.",
    philosophy: "After censorship lifted, a generation fuses art cinema with thriller and melodrama — moral seriousness delivered with total craft.",
    visualSignatures: ["tonal whiplash within a scene", "rain-soaked procedural", "long static takes of talk and soju", "violence staged as choreography"],
    keyDirectors: ["Hong Sang-soo", "Lee Chang-dong", "Kim Ki-duk", "Bong Joon-ho", "Park Chan-wook", "Im Kwon-taek", "Kim Jee-woon"],
    essentialFilms: [
      { title: "The Day a Pig Fell into the Well", year: 1996 },
      { title: "Peppermint Candy", year: 1999 },
      { title: "Oasis", year: 2002 },
      { title: "Memories of Murder", year: 2003 },
      { title: "Oldboy", year: 2003 },
      { title: "Spring, Summer, Fall, Winter... and Spring", year: 2003 },
      { title: "Secret Sunshine", year: 2007 },
      { title: "Mother", year: 2009 },
      { title: "Poetry", year: 2010 }
    ],
    description: "The decade when South Korea went from a cinema few outsiders saw to the most exciting in the world: Hong's talky miniatures, Lee Chang-dong's moral tragedies and the genre-bending of Bong and Park all emerging within a few years of each other.",
    tagline: "Genre as a trapdoor.",
    tag: "korean_new_wave",
    icon: "umbrella",
    cardColor: "#1f4e79"
  },
  {
    title: "Romanian New Wave",
    era: "2001–present",
    vibe: "Deadpan, real-time, bureaucracy as tragedy.",
    philosophy: "Long takes and no score; the camera waits while ordinary people negotiate a system that outlasted the dictator.",
    visualSignatures: ["single-take scenes in real time", "available light", "dialogue overlapping in cramped flats", "no music"],
    keyDirectors: ["Cristi Puiu", "Cristian Mungiu", "Corneliu Porumboiu", "Radu Muntean", "Radu Jude", "Călin Peter Netzer"],
    essentialFilms: [
      { title: "The Death of Mr. Lazarescu", year: 2005 },
      { title: "12:08 East of Bucharest", year: 2006 },
      { title: "4 Months, 3 Weeks and 2 Days", year: 2007 },
      { title: "Police, Adjective", year: 2009 },
      { title: "Tuesday, After Christmas", year: 2010 },
      { title: "Beyond the Hills", year: 2012 },
      { title: "Child's Pose", year: 2013 },
      { title: "Aferim!", year: 2015 },
      { title: "Sieranevada", year: 2016 },
      { title: "Bad Luck Banging or Loony Porn", year: 2021 }
    ],
    description: "A small country with almost no film industry produced, in a single decade, a run of Cannes and Berlin winners built from the plainest means — and a moral seriousness about complicity that no other contemporary cinema matches.",
    tagline: "The camera waits.",
    tag: "romanian_new_wave",
    icon: "corridor",
    cardColor: "#5a5a3c"
  },
  {
    title: "L.A. Rebellion",
    era: "1967–1991",
    vibe: "Neorealist, lyrical, Black Los Angeles on its own terms.",
    philosophy: "UCLA-trained filmmakers reject Hollywood's images of Black life and build a cinema from Third Cinema, Italian neorealism and the blues.",
    visualSignatures: ["16mm black-and-white location work", "children and labour observed", "music as structure", "non-professional casts"],
    keyDirectors: ["Charles Burnett", "Julie Dash", "Haile Gerima", "Billy Woodberry", "Larry Clark", "Zeinabu irene Davis"],
    essentialFilms: [
      { title: "Bush Mama", year: 1979 },
      { title: "Killer of Sheep", year: 1978 },
      { title: "Passing Through", year: 1977 },
      { title: "Ashes and Embers", year: 1982 },
      { title: "Bless Their Little Hearts", year: 1984 },
      { title: "To Sleep with Anger", year: 1990 },
      { title: "Daughters of the Dust", year: 1991 }
    ],
    description: "Largely unseen for decades, this UCLA movement produced some of the most beautiful American films of its era — Killer of Sheep was shot for under $10,000 and sat unreleased for thirty years before being recognised as a masterpiece.",
    tagline: "A cinema built from scratch.",
    tag: "la_rebellion",
    icon: "record",
    cardColor: "#3d2b1f"
  },
  {
    title: "Chinese Fifth & Sixth Generations",
    era: "1984–present",
    vibe: "Epic landscape and colour, then concrete and demolition.",
    philosophy: "The Fifth Generation rediscovers image and history after the Cultural Revolution; the Sixth turns to the present with digital cameras and no permission.",
    visualSignatures: ["saturated red and yellow against loess hills", "painterly widescreen", "then: handheld DV in half-demolished cities"],
    keyDirectors: ["Chen Kaige", "Zhang Yimou", "Tian Zhuangzhuang", "Jia Zhangke", "Wang Xiaoshuai", "Lou Ye"],
    essentialFilms: [
      { title: "Yellow Earth", year: 1984 },
      { title: "The Horse Thief", year: 1986 },
      { title: "Red Sorghum", year: 1987 },
      { title: "Raise the Red Lantern", year: 1991 },
      { title: "Farewell My Concubine", year: 1993 },
      { title: "The Blue Kite", year: 1993 },
      { title: "Xiao Wu", year: 1997 },
      { title: "Platform", year: 2000 },
      { title: "Suzhou River", year: 2000 },
      { title: "Still Life", year: 2006 }
    ],
    description: "The first Beijing Film Academy class to graduate after the Cultural Revolution made China's history visible in colour and landscape; the generation after them made its present visible in grain and rubble.",
    tagline: "History in colour, the present in rubble.",
    tag: "chinese_generations",
    icon: "lantern",
    cardColor: "#9b2d20"
  },
  {
    title: "American Independent Cinema",
    era: "1959–present",
    vibe: "Close, rough and unhurried: people talking in small rooms, shot by friends.",
    philosophy: "Make it outside the studios, with your own money and your own people, and let the performances and the place do what a budget would.",
    visualSignatures: ["handheld 16mm in borrowed apartments", "scenes that run on past where a studio would cut", "friends and non-professionals cast", "real streets, motels and small towns"],
    keyDirectors: ["John Cassavetes", "Shirley Clarke", "Barbara Loden", "Jim Jarmusch", "Spike Lee", "Steven Soderbergh", "Richard Linklater", "Todd Haynes", "Gus Van Sant", "Kelly Reichardt", "Noah Baumbach", "Greta Gerwig", "Barry Jenkins", "Sean Baker", "Josh Safdie", "Benny Safdie", "Debra Granik"],
    essentialFilms: [
      { title: "Shadows", year: 1959 },
      { title: "Portrait of Jason", year: 1967 },
      { title: "Faces", year: 1968 },
      { title: "Wanda", year: 1970 },
      { title: "A Woman Under the Influence", year: 1974 },
      { title: "Stranger Than Paradise", year: 1984 },
      { title: "Do the Right Thing", year: 1989 },
      { title: "sex, lies, and videotape", year: 1989 },
      { title: "Slacker", year: 1990 },
      { title: "Safe", year: 1995 },
      { title: "Wendy and Lucy", year: 2008 },
      { title: "Moonlight", year: 2016 },
      { title: "The Florida Project", year: 2017 }
    ],
    description: "American films made outside the studios, from John Cassavetes's Shadows, paid for partly with money raised on late-night radio, to Kelly Reichardt's quiet Oregon. Cheaper and rougher than Hollywood, and closer to the people in them. When sex, lies, and videotape won the Palme d'Or in 1989, the independents found a market; the best of them kept the old habits.",
    tagline: "Off the lot.",
    tag: "american_independent",
    icon: "lamp",
    cardColor: "#8a5a2b"
  }
];
