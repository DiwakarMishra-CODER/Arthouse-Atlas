/**
 * Arthouse Scoring Service (Time-Weighted Canon Score)
 * 
 * Distinguishes between "Commercial Hype" and "Cinematic Heritage"
 * Score range: 0-100 (higher = more arthouse/canonical)
 */

// ============================================================================
// AUTEUR DIRECTORS - Verified arthouse/auteur filmmakers
// ============================================================================
const AUTEUR_LIST = [
  // Japan
  'Akira Kurosawa', 'Yasujirō Ozu', 'Kenji Mizoguchi', 'Masaki Kobayashi',
  'Kon Ichikawa', 'Nagisa Ōshima', 'Hirokazu Kore-eda', 'Takeshi Kitano',
  
  // Russia/USSR
  'Andrei Tarkovsky', 'Sergei Eisenstein', 'Dziga Vertov', 'Andrei Konchalovsky',
  
  // France
  'Jean-Luc Godard', 'François Truffaut', 'Agnès Varda', 'Jean Renoir',
  'Robert Bresson', 'Alain Resnais', 'Jacques Tati', 'Louis Malle',
  'Éric Rohmer', 'Jacques Rivette', 'Claire Denis', 'Leos Carax',
  
  // Italy
  'Federico Fellini', 'Michelangelo Antonioni', 'Pier Paolo Pasolini',
  'Luchino Visconti', 'Vittorio De Sica', 'Roberto Rossellini',
  'Bernardo Bertolucci', 'Paolo Sorrentino',
  
  // Sweden
  'Ingmar Bergman', 'Roy Andersson',
  
  // Germany
  'Rainer Werner Fassbinder', 'Werner Herzog', 'Wim Wenders',
  'Volker Schlöndorff', 'Florian Henckel von Donnersmarck',
  
  // USA
  'Stanley Kubrick', 'Terrence Malick', 'Paul Thomas Anderson',
  'David Lynch', 'Darren Aronofsky', 'Wes Anderson', 'Martin Scorsese',
  'Francis Ford Coppola', 'Orson Welles', 'Charlie Chaplin',
  'Billy Wilder', 'Robert Altman', 'Jim Jarmusch', 'Kelly Reichardt',
  
  // UK
  'Alfred Hitchcock', 'Mike Leigh', 'Ken Loach', 'Lynne Ramsay',
  
  // Hong Kong/China
  'Wong Kar-wai', 'Tsai Ming-liang', 'Edward Yang', 'Hou Hsiao-hsien',
  'Jia Zhangke', 'Zhang Yimou', 'Chen Kaige',
  
  // Iran
  'Abbas Kiarostami', 'Asghar Farhadi', 'Jafar Panahi',
  
  // South Korea
  'Bong Joon-ho', 'Park Chan-wook', 'Hong Sang-soo', 'Lee Chang-dong',
  'Kim Ki-duk',
  
  // Poland
  'Krzysztof Kieślowski', 'Andrzej Wajda', 'Paweł Pawlikowski',
  
  // Spain/Latin America
  'Pedro Almodóvar', 'Luis Buñuel', 'Alejandro González Iñárritu',
  'Alfonso Cuarón', 'Guillermo del Toro', 'Carlos Reygadas',
  
  // Other
  'Michael Haneke', 'Lars von Trier', 'Yorgos Lanthimos',
  'Apichatpong Weerasethakul', 'Nuri Bilge Ceylan'
];

// ============================================================================
// SCORING CONFIGURATION
// ============================================================================

const ARTHOUSE_COUNTRIES = {
  'France': 15,
  'Italy': 15,
  'Japan': 15,
  'Iran': 15,
  'South Korea': 15,
  'Germany': 12,
  'Russia': 12,
  'Sweden': 12,
  'Poland': 12,
  'United Kingdom': 8,
  'Spain': 10,
  'Taiwan': 12,
  'China': 10,
  'India': 8,
  'Brazil': 10,
  'Mexico': 10,
  'Argentina': 10
};

const ARTHOUSE_GENRES = {
  'Drama': 10,
  'Documentary': 8,
  'History': 8,
  'War': 6,
  'Music': 6,
  'Romance': 4
};

const MAINSTREAM_GENRES = {
  'Action': -10,
  'Adventure': -10,
  'Science Fiction': -10,
  'Fantasy': -8,
  'Animation': -5,
  'Comedy': -3
};

const ARTHOUSE_TAGS = {
  'contemplative': 5,
  'existential': 5,
  'slow': 5,
  'austere': 5,
  'dreamlike': 3,
  'surreal': 3,
  'enigmatic': 3,
  'psychological': 2,
  'intimate': 2,
  'melancholic': 2,
  'poetic': 4,
  'minimalist': 4,
  'lyrical': 3,
  'fragmented': 3
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a director is a certified auteur
 */
const isAuteurDirector = (directors) => {
  if (!directors || !Array.isArray(directors)) return false;
  
  return directors.some(director => {
    return AUTEUR_LIST.some(auteur => 
      director.toLowerCase().includes(auteur.toLowerCase()) ||
      auteur.toLowerCase().includes(director.toLowerCase())
    );
  });
};

/**
 * Check if a movie is a certified classic
 * Classic = Released >25 years ago AND rating > 7.7
 */
const isCertifiedClassic = (movie) => {
  const currentYear = new Date().getFullYear();
  const movieYear = movie.year || 0;
  const age = currentYear - movieYear;
  
  return age > 25 && (movie.vote_average || 0) > 7.7;
};

/**
 * Check if a movie is a critical masterpiece
 * Masterpiece = Rating > 8.2 (IMDb/TMDB Top 250 territory)
 */
const isCriticalMasterpiece = (movie) => {
  return (movie.vote_average || 0) > 8.2;
};

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

export const calculateArthouseScore = (movie) => {
  let score = 0;
  
  const isClassic = isCertifiedClassic(movie);
  const isMasterpiece = isCriticalMasterpiece(movie);
  const isAuteur = isAuteurDirector(movie.directors);
  const voteAverage = movie.vote_average || 0;
  const voteCount = movie.vote_count || 0;
  const popularity = movie.popularity || 0;

  // ========================================================================
  // MASTERPIECE FLOOR: Guaranteed minimum score of 85 for masterpieces
  // ========================================================================
  if (isMasterpiece) {
    score = Math.max(score, 85);
  }

  // ========================================================================
  // 1. POPULARITY SCORE (25 points)
  // ========================================================================
  // For classics: High popularity = Legacy Bonus (+10)
  // For modern films: Low popularity = arthouse indicator
  
  if (isClassic && popularity > 100) {
    // Classic films that remained popular = Cultural impact
    score += 10;
  } else if (popularity < 20) {
    score += 25;
  } else if (popularity < 50) {
    score += 15;
  } else if (popularity < 100) {
    score += 5;
  }

  // ========================================================================
  // 2. VOTE PATTERN SCORE (20 points)
  // ========================================================================
  // High quality + niche audience = arthouse
  
  if (voteAverage >= 7.5 && voteCount < 5000) {
    score += 20;
  } else if (voteAverage >= 7.0 && voteCount < 10000) {
    score += 15;
  } else if (voteAverage >= 6.5) {
    score += 10;
  } else if (voteAverage >= 6.0) {
    score += 5;
  }

  // ========================================================================
  // 3. GENRE SCORE (20 points)
  // ========================================================================
  // CRITICAL: Classics and Auteur films are immune to mainstream penalties
  
  const genres = movie.genres || [];
  let genreScore = 0;
  
  genres.forEach(genre => {
    if (ARTHOUSE_GENRES[genre]) {
      genreScore += ARTHOUSE_GENRES[genre];
    }
    
    // Only apply mainstream penalties to modern non-auteur films
    if (MAINSTREAM_GENRES[genre] && !isClassic && !isAuteur) {
      genreScore += MAINSTREAM_GENRES[genre];
    }
  });
  
  // Cap genre score between -10 and 20
  score += Math.max(-10, Math.min(20, genreScore));

  // ========================================================================
  // 4. TAG SCORE (20 points)
  // ========================================================================
  
  const tags = movie.derivedTags || [];
  let tagScore = 0;
  
  tags.forEach(tag => {
    if (ARTHOUSE_TAGS[tag]) {
      tagScore += ARTHOUSE_TAGS[tag];
    }
  });
  
  score += Math.min(20, tagScore);

  // ========================================================================
  // 5. COUNTRY/LANGUAGE SCORE (15 points)
  // ========================================================================
  // High-rated USA films (New Hollywood/Golden Age) don't get penalized
  
  const country = movie.country || '';
  
  if (country === 'United States of America' || country === 'USA') {
    // Remove USA penalty for high-rated films (>7.8)
    if (voteAverage <= 7.8) {
      score -= 10;
    }
  } else if (ARTHOUSE_COUNTRIES[country]) {
    score += ARTHOUSE_COUNTRIES[country];
  } else if (country && country !== '') {
    // Any non-USA country gets some points
    score += 8;
  }

  // ========================================================================
  // 6. AUTEUR DIRECTOR BONUS (+15 points)
  // ========================================================================
  
  if (isAuteur) {
    score += 15;
  }

  // ========================================================================
  // FINAL ADJUSTMENTS
  // ========================================================================
  
  // Ensure masterpieces don't drop below 85
  if (isMasterpiece) {
    score = Math.max(85, score);
  }
  
  // Ensure score is within 0-100 range
  return Math.max(0, Math.min(100, score));
};

// ============================================================================
// SCORE BREAKDOWN (for debugging/transparency)
// ============================================================================

export const getScoreBreakdown = (movie) => {
  const breakdown = {
    popularity: 0,
    votePattern: 0,
    genre: 0,
    tags: 0,
    country: 0,
    auteurBonus: 0,
    masterpieceFloor: false,
    isClassic: false,
    isAuteur: false,
    total: 0
  };

  const isClassic = isCertifiedClassic(movie);
  const isMasterpiece = isCriticalMasterpiece(movie);
  const isAuteur = isAuteurDirector(movie.directors);
  const voteAverage = movie.vote_average || 0;
  const voteCount = movie.vote_count || 0;
  const popularity = movie.popularity || 0;

  breakdown.isClassic = isClassic;
  breakdown.isAuteur = isAuteur;
  breakdown.masterpieceFloor = isMasterpiece;

  // Popularity
  if (isClassic && popularity > 100) {
    breakdown.popularity = 10; // Legacy Bonus
  } else if (popularity < 20) {
    breakdown.popularity = 25;
  } else if (popularity < 50) {
    breakdown.popularity = 15;
  } else if (popularity < 100) {
    breakdown.popularity = 5;
  }

  // Vote Pattern
  if (voteAverage >= 7.5 && voteCount < 5000) {
    breakdown.votePattern = 20;
  } else if (voteAverage >= 7.0 && voteCount < 10000) {
    breakdown.votePattern = 15;
  } else if (voteAverage >= 6.5) {
    breakdown.votePattern = 10;
  } else if (voteAverage >= 6.0) {
    breakdown.votePattern = 5;
  }

  // Genre
  const genres = movie.genres || [];
  let genreScore = 0;
  genres.forEach(genre => {
    if (ARTHOUSE_GENRES[genre]) {
      genreScore += ARTHOUSE_GENRES[genre];
    }
    if (MAINSTREAM_GENRES[genre] && !isClassic && !isAuteur) {
      genreScore += MAINSTREAM_GENRES[genre];
    }
  });
  breakdown.genre = Math.max(-10, Math.min(20, genreScore));

  // Tags
  const tags = movie.derivedTags || [];
  let tagScore = 0;
  tags.forEach(tag => {
    if (ARTHOUSE_TAGS[tag]) {
      tagScore += ARTHOUSE_TAGS[tag];
    }
  });
  breakdown.tags = Math.min(20, tagScore);

  // Country
  const country = movie.country || '';
  if (country === 'United States of America' || country === 'USA') {
    breakdown.country = voteAverage > 7.8 ? 0 : -10;
  } else if (ARTHOUSE_COUNTRIES[country]) {
    breakdown.country = ARTHOUSE_COUNTRIES[country];
  } else if (country && country !== '') {
    breakdown.country = 8;
  }

  // Auteur Bonus
  if (isAuteur) {
    breakdown.auteurBonus = 15;
  }

  breakdown.total = calculateArthouseScore(movie);
  return breakdown;
};

export default { calculateArthouseScore, getScoreBreakdown };
