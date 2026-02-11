/**
 * Arthouse Scoring Service
 * 
 * Calculates how "arthouse" a film is based on TMDB metadata
 * Score range: 0-100 (higher = more arthouse)
 */

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

export const calculateArthouseScore = (movie) => {
  let score = 0;

  // 1. Popularity Score (25 points)
  // Lower popularity = more arthouse
  if (movie.popularity < 20) {
    score += 25;
  } else if (movie.popularity < 50) {
    score += 15;
  } else if (movie.popularity < 100) {
    score += 5;
  }

  // 2. Vote Pattern Score (20 points)
  // High quality + niche audience = arthouse
  const { vote_average = 0, vote_count = 0 } = movie;
  
  if (vote_average >= 7.5 && vote_count < 5000) {
    score += 20;
  } else if (vote_average >= 7.0 && vote_count < 10000) {
    score += 15;
  } else if (vote_average >= 6.5) {
    score += 10;
  } else if (vote_average >= 6.0) {
    score += 5;
  }

  // 3. Genre Score (20 points)
  const genres = movie.genres || [];
  let genreScore = 0;
  
  genres.forEach(genre => {
    if (ARTHOUSE_GENRES[genre]) {
      genreScore += ARTHOUSE_GENRES[genre];
    }
    if (MAINSTREAM_GENRES[genre]) {
      genreScore += MAINSTREAM_GENRES[genre];
    }
  });
  
  // Cap genre score at 20
  score += Math.max(-10, Math.min(20, genreScore));

  // 4. Tag Score (20 points)
  const tags = movie.derivedTags || [];
  let tagScore = 0;
  
  tags.forEach(tag => {
    if (ARTHOUSE_TAGS[tag]) {
      tagScore += ARTHOUSE_TAGS[tag];
    }
  });
  
  // Cap tag score at 20
  score += Math.min(20, tagScore);

  // 5. Country/Language Score (15 points)
  const country = movie.country || '';
  
  if (country === 'United States of America' || country === 'USA') {
    score -= 10;
  } else if (ARTHOUSE_COUNTRIES[country]) {
    score += ARTHOUSE_COUNTRIES[country];
  } else if (country && country !== '') {
    // Any non-USA country gets some points
    score += 8;
  }

  // Ensure score is within 0-100 range
  return Math.max(0, Math.min(100, score));
};

export const getScoreBreakdown = (movie) => {
  const breakdown = {
    popularity: 0,
    votePattern: 0,
    genre: 0,
    tags: 0,
    country: 0,
    total: 0
  };

  // Popularity
  if (movie.popularity < 20) breakdown.popularity = 25;
  else if (movie.popularity < 50) breakdown.popularity = 15;
  else if (movie.popularity < 100) breakdown.popularity = 5;

  // Vote Pattern
  const { vote_average = 0, vote_count = 0 } = movie;
  if (vote_average >= 7.5 && vote_count < 5000) breakdown.votePattern = 20;
  else if (vote_average >= 7.0 && vote_count < 10000) breakdown.votePattern = 15;
  else if (vote_average >= 6.5) breakdown.votePattern = 10;
  else if (vote_average >= 6.0) breakdown.votePattern = 5;

  // Genre
  const genres = movie.genres || [];
  let genreScore = 0;
  genres.forEach(genre => {
    if (ARTHOUSE_GENRES[genre]) genreScore += ARTHOUSE_GENRES[genre];
    if (MAINSTREAM_GENRES[genre]) genreScore += MAINSTREAM_GENRES[genre];
  });
  breakdown.genre = Math.max(-10, Math.min(20, genreScore));

  // Tags
  const tags = movie.derivedTags || [];
  let tagScore = 0;
  tags.forEach(tag => {
    if (ARTHOUSE_TAGS[tag]) tagScore += ARTHOUSE_TAGS[tag];
  });
  breakdown.tags = Math.min(20, tagScore);

  // Country
  const country = movie.country || '';
  if (country === 'United States of America' || country === 'USA') {
    breakdown.country = -10;
  } else if (ARTHOUSE_COUNTRIES[country]) {
    breakdown.country = ARTHOUSE_COUNTRIES[country];
  } else if (country && country !== '') {
    breakdown.country = 8;
  }

  breakdown.total = calculateArthouseScore(movie);
  return breakdown;
};

export default { calculateArthouseScore, getScoreBreakdown };
