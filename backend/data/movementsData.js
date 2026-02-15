export const movementsData = [
  // 10 Essential Movements
  {
    title: "German Expressionism",
    era: "1920–1933",
    vibe: "Nightmares, madness, shadows.",
    philosophy: "External sets & light reflect inner torment.",
    visualSignatures: ["extreme chiaroscuro", "jagged sets", "Dutch tilt"],
    keyDirectors: ["Fritz Lang", "F.W. Murnau", "Robert Wiene"],
    essentialFilms: [
      { title: "Metropolis", year: 1927 },
      { title: "The Cabinet of Dr. Caligari", year: 1920 },
      { title: "Nosferatu", year: 1922 }
    ],
    description: "A stylistic movement in German cinema that used exaggerated sets and lighting to represent subjective emotional states.",
    tagline: "Shadows of the mind made visible.",
    tag: "expressionism",
    icon: "mask", // Suggestion
    cardColor: "#2c2c2c" // Dark grey/black
  },
  {
    title: "Soviet Montage",
    era: "1924–1930",
    vibe: "Revolution, collision, rhythmic shock.",
    philosophy: "Meaning created by editing: shot + shot = idea.",
    visualSignatures: ["rapid rhythmic cuts", "crowd tableaux", "intellectual montage"],
    keyDirectors: ["Sergei Eisenstein", "Dziga Vertov"],
    essentialFilms: [
      { title: "Battleship Potemkin", year: 1925 },
      { title: "Man with a Movie Camera", year: 1929 },
      { title: "Strike", year: 1925 }
    ],
    description: "A movement that relied heavily on editing (montage) rather than narrative to create meaning and emotional impact.",
    tagline: "The revolution will be edited.",
    tag: "montage",
    icon: "film-strip",
    cardColor: "#8a2e2e" // Red
  },
  {
    title: "Italian Neorealism",
    era: "1944–1952",
    vibe: "Dust, poverty, intimate truth.",
    philosophy: "Show postwar reality with non-stars and on-location shooting.",
    visualSignatures: ["natural light", "non-actors", "long takes in streets/ruins"],
    keyDirectors: ["Vittorio De Sica", "Roberto Rossellini"],
    essentialFilms: [
      { title: "Bicycle Thieves", year: 1948 },
      { title: "Rome, Open City", year: 1945 },
      { title: "Umberto D.", year: 1952 }
    ],
    description: "A national film movement characterized by stories set amongst the poor and the working class, filmed on location, frequently using non-professional actors.",
    tagline: "Life as it is.",
    tag: "neorealism",
    icon: "bicycle",
    cardColor: "#5d5d5d" // Greyscale/Concrete
  },
  {
    title: "Japanese Golden Age",
    era: "1950–1960",
    vibe: "Honor, humanism, exquisite composition.",
    philosophy: "Formal restraint and moral inquiry; quiet intensity.",
    visualSignatures: ["tatami-level framing", "frame-within-frame composition", "long takes"],
    keyDirectors: ["Akira Kurosawa", "Yasujirō Ozu", "Kenji Mizoguchi"],
    essentialFilms: [
      { title: "Tokyo Story", year: 1953 },
      { title: "Seven Samurai", year: 1954 },
      { title: "Ugetsu", year: 1953 }
    ],
    description: "A period of high artistic achievement in Japanese cinema, gaining international acclaim for its humanistic storytelling and visual mastery.",
    tagline: "The art of stillness and motion.",
    tag: "gold_age_japan",
    icon: "cherry-blossom",
    cardColor: "#b8860b" // Dark Goldenrod
  },
  {
    title: "French New Wave",
    era: "1958–1964",
    vibe: "Cool, improvisational, rule-breaking.",
    philosophy: "Director as author; break classical grammar to show subjectivity.",
    visualSignatures: ["jump cuts", "handheld", "on-the-streets shooting", "self-reflexivity"],
    keyDirectors: ["Jean-Luc Godard", "François Truffaut", "Agnès Varda"],
    essentialFilms: [
      { title: "Breathless", year: 1960 },
      { title: "The 400 Blows", year: 1959 },
      { title: "Cléo from 5 to 7", year: 1962 }
    ],
    description: "An art film movement that rejected traditional filmmaking conventions in favor of experimentation and a spirit of iconoclasm.",
    tagline: "Cinema reinvents itself.",
    tag: "nouvelle_vague",
    icon: "cigarette",
    cardColor: "#000000" // Black and white cool
  },
  {
    title: "New Hollywood",
    era: "1967–1980",
    vibe: "Grit, moral ambiguity, anti-heroes.",
    philosophy: "Filmmakers (movie-brats) fuse personal voice with studio muscle; darker tone.",
    visualSignatures: ["location shooting", "ensemble casts", "ambiguous endings"],
    keyDirectors: ["Martin Scorsese", "Francis Ford Coppola", "Robert Altman"],
    essentialFilms: [
      { title: "Taxi Driver", year: 1976 },
      { title: "The Godfather", year: 1972 },
      { title: "Apocalypse Now", year: 1979 }
    ],
    description: "A period in American film history when a new generation of film school-educated directors took over the studios and infused them with European art cinema sensibilities.",
    tagline: "The inmates take over the asylum.",
    tag: "new_hollywood",
    icon: "taxi",
    cardColor: "#3b3b3b"
  },

  {
    title: "Slow Cinema",
    era: "1980s–present",
    vibe: "Meditative, durational, patient.",
    philosophy: "Time as material; viewer attention becomes the engine.",
    visualSignatures: ["very long takes", "static compositions", "minimal dialogue"],
    keyDirectors: ["Andrei Tarkovsky", "Béla Tarr", "Tsai Ming-liang"],
    essentialFilms: [
      { title: "Stalker", year: 1979 },
      { title: "Sátántangó", year: 1994 },
      { title: "Goodbye, Dragon Inn", year: 2003 }
    ],
    description: "A genre of art house film making that emphasizes long takes, and is often minimalist, observational, and with little or no narrative.",
    tagline: "Sculpting in time.",
    tag: "slow_cinema",
    icon: "hourglass",
    cardColor: "#4682B4" // Steel Blue - calm
  },
  {
    title: "Iranian New Wave",
    era: "1980s–present",
    vibe: "Quiet, ethical, poetic realism.",
    philosophy: "Moral/ethical dilemmas in sparse formal language; reality & fiction blur.",
    visualSignatures: ["restrained camera", "children/non-actors", "minimalist interiors", "long contemplative shots"],
    keyDirectors: ["Abbas Kiarostami", "Mohsen Makhmalbaf", "Asghar Farhadi"],
    essentialFilms: [
      { title: "Close-Up", year: 1990 },
      { title: "Taste of Cherry", year: 1997 },
      { title: "A Separation", year: 2011 }
    ],
    description: "A movement in Iranian cinema that started in the late 1960s and includes the works of directors like Abbas Kiarostami, known for their poetic and allegorical storytelling.",
    tagline: "Poetry in the everyday.",
    tag: "iranian_new_wave",
    icon: "olive-branch",
    cardColor: "#A0522D" // Sienna - earth
  },
  {
    title: "New Taiwanese Cinema",
    era: "1980s–2000s",
    vibe: "Memory, urban alienation, elegiac observation.",
    philosophy: "Long, elliptical narratives that examine social change & memory.",
    visualSignatures: ["long takes", "restrained acting", "urban emptiness", "time’s passage"],
    keyDirectors: ["Hou Hsiao-hsien", "Edward Yang", "Tsai Ming-liang"],
    essentialFilms: [
      { title: "A Brighter Summer Day", year: 1991 },
      { title: "Yi Yi", year: 2000 },
      { title: "Flowers of Shanghai", year: 1998 }
    ],
    description: "A movement in Taiwanese cinema that emerged in the 1980s, characterized by realistic and sympathetic portrayals of Taiwanese life.",
    tagline: "Time, memory, and the city.",
    tag: "taiwan_new_wave",
    icon: "lantern",
    cardColor: "#2F4F4F" // Dark Slate Gray
  },
  // 5 Additional Movements
  {
    title: "Documentary / Cinema Vérité",
    era: "1920s-Present",
    vibe: "Truth, witness, the camera as witness.",
    philosophy: "Film as testimony; reality recorded and interrogated.",
    visualSignatures: ["vérité handheld camera", "observational framings", "portrait interviews", "long observational sequences"],
    keyDirectors: ["Dziga Vertov", "Chris Marker", "Frederick Wiseman", "Agnès Varda"],
    essentialFilms: [
      { title: "Man with a Movie Camera", year: 1929 },
      { title: "Night and Fog", year: 1956 },
      { title: "The Act of Killing", year: 2012 }
    ],
    description: "Documentary cinema and cinéma vérité insist that cinema can observe the world — ethically, politically, poetically. From essay films to vérité portraits and investigative documentaries, this movement put nonfiction at the center of cinematic innovation.",
    tagline: "Truth, witness, the camera as witness.",
    tag: "documentary",
    icon: "camcorder", // "camcorder / eye"
    cardColor: "#2b5d7a"
  },
  {
    title: "Avant-garde / Experimental Cinema",
    era: "1920s-Present",
    vibe: "Form first — cinema as experiment.",
    philosophy: "Cinema as material and structure — meaning made through form, not story.",
    visualSignatures: ["jump-cut montage", "non-narrative collage", "abstract photochemical or single-frame effects"],
    keyDirectors: ["Maya Deren", "Luis Buñuel", "Kenneth Anger", "Stan Brakhage"],
    essentialFilms: [
      { title: "Un Chien Andalou", year: 1929 },
      { title: "Meshes of the Afternoon", year: 1943 },
      { title: "The Passion of Joan of Arc", year: 1928 }
    ],
    description: "Experimental cinema knocked down narrative walls and remade what moving image could be: dream logic, collage, structural film, and shock pedagogy. This is where cinema becomes poetry — and provocation.",
    tagline: "Form first — cinema as experiment.",
    tag: "experimental",
    icon: "abstract-shapes",
    cardColor: "#6b4f6b"
  },
  {
    title: "Third Cinema / Latin American Political Cinema",
    era: "1960s-1970s", // Approximate peak
    vibe: "Cinema of struggle, anti-imperial, political urgency.",
    philosophy: "Film as political praxis — anti-imperialist, mass-oriented, collective authorship.",
    visualSignatures: ["documentary-realist aesthetics", "montage of mass scenes", "didactic sequences", "street politics"],
    keyDirectors: ["Glauber Rocha", "Fernando Solanas", "Pablo Larraín"],
    essentialFilms: [
      { title: "The Hour of the Furnaces", year: 1968 },
      { title: "The Battle of Algiers", year: 1966 },
      { title: "Memories of Underdevelopment", year: 1968 }
    ],
    description: "Third Cinema emerged as a decolonial filmmaking practice: militant, collective, and unapologetically political. It uses cinema as a weapon of cultural resistance and social pedagogy across Latin America and the Global South.",
    tagline: "Cinema of struggle, anti-imperial, political urgency.",
    tag: "third_cinema",
    icon: "raised-fist",
    cardColor: "#8a2e2e"
  },


];
