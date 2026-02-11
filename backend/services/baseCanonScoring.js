/**
 * Base Canon Score Calculation Service
 * 
 * BaseCanonScore = 0.35*CriticalConsensus + 0.25*HistoricalImportance + 
 *                  0.20*AuteurImportance + 0.10*FormalInnovation + 0.10*CulturalInfluence
 */

// Top-tier auteur directors
const MASTER_AUTEURS = [
  'Robert Bresson', 'Andrei Tarkovsky', 'Carl Theodor Dreyer', 'Yasujirō Ozu',
  'Ingmar Bergman', 'Akira Kurosawa', 'Jean-Luc Godard', 'François Truffaut',
  'Michelangelo Antonioni', 'Federico Fellini', 'Luis Buñuel', 'Orson Welles',
  'Stanley Kubrick', 'Terrence Malick', 'Andrei Tarkovsky', 'Béla Tarr',
  'Abbas Kiarostami', 'Wong Kar-wai', 'Edward Yang', 'Hou Hsiao-hsien',
  'Krzysztof Kieślowski', 'Jean-Pierre Melville', 'Chris Marker', 'Chantal Akerman'
];

const ESTABLISHED_AUTEURS = [
  'David Lynch', 'Pedro Almodóvar', 'Wes Anderson', 'Paul Thomas Anderson',
  'Dardenne', 'Michael Haneke', 'Claire Denis', 'Apichatpong Weerasethakul',
  'Jafar Panahi', 'Kelly Reichardt', 'Carlos Reygadas', 'Lucrecia Martel',
  'Pedro Costa', 'Tsai Ming-liang', 'Nuri Bilge Ceylan','Aki Kaurismäki'
];

export const calculateCriticalConsensus = (film) => {
  // Normalize vote_average (typically 0-10) to 0-100
  const voteScore = (film.vote_average || 0) * 10;
  
  // Weight by vote count (higher count = more reliable)
  const countWeight = Math.min(film.vote_count / 5000, 1); // Cap at 5000 votes
  
  return voteScore * (0.7 + 0.3 * countWeight);
};

export const calculateHistoricalImportance = (film) => {
  let score = 0;
  
  // Tier-based importance
  if (film.tier === 1) score += 70;
  else if (film.tier === 2) score += 50;
  else score += 30;
  
  // Age bonus (older films often more historically significant)
  const age = 2025 - film.year;
  if (age > 70) score += 20;      // Pre-1955
  else if (age > 50) score += 15; // 1955-1975
  else if (age > 30) score += 10; // 1975-1995
  else if (age > 10) score += 5;  // 1995-2015
  
  // Festival wins bonus
  if (film.festivalWins && film.festivalWins.length > 0) {
    score += Math.min(film.festivalWins.length * 5, 10);
  }
  
  return Math.min(score, 100);
};

export const calculateAuteurImportance = (film) => {
  if (!film.directors || film.directors.length === 0) return 25;
  
  const director = film.directors[0]; // Use primary director
  
  // Check if master auteur
  if (MASTER_AUTEURS.some(master => director.includes(master))) {
    return 100;
  }
  
  // Check if established auteur
  if (ESTABLISHED_AUTEURS.some(established => director.includes(established))) {
    return 75;
  }
  
  // Check if multiple films in database (auteur by volume)
  // This would require a database lookup, skip for MVP
  
  // Default for unknown directors
  return 50;
};

export const calculateFormalInnovation = (film) => {
  // MVP: Use existing data points
  let score = 0;
  
  // Certain tags indicate formal experimentation
  const innovativeTags = ['surreal', 'enigmatic', 'fragmented', 'dreamlike', 'minimalist'];
  const matchedTags = film.derivedTags?.filter(tag => innovativeTags.includes(tag)) || [];
  
  score += matchedTags.length * 15;
  
  // Very early cinema (experimental by nature)
  if (film.year < 1940) score += 20;
  
  // Certain genres
  if (film.genres?.includes('Documentary') && film.year > 1960) score += 10;
  
  return Math.min(score, 100);
};

export const calculateCulturalInfluence = (film) => {
  // MVP: Estimate based on tier, votes, and age
  let score = 0;
  
  // High vote count suggests cultural reach
  if (film.vote_count > 10000) score += 30;
  else if (film.vote_count > 5000) score += 20;
  else if (film.vote_count > 1000) score += 10;
  
  // Tier 1 films are culturally significant by definition
  if (film.tier === 1) score += 40;
  else if (film.tier === 2) score += 20;
  
  // Recent films with high scores = contemporary influence
  if (film.year > 2010 && film.vote_average > 7.5) score += 20;
  
  // Older films that endure = lasting influence
  if (film.year < 1980 && film.vote_average > 7.0) score += 30;
  
  return Math.min(score, 100);
};

export const calculateBaseCanonScore = (film) => {
  const criticalConsensus = calculateCriticalConsensus(film);
  const historicalImportance = calculateHistoricalImportance(film);
  const auteurImportance = calculateAuteurImportance(film);
  const formalInnovation = film.formalInnovation || calculateFormalInnovation(film);
  const culturalInfluence = film.culturalInfluence || calculateCulturalInfluence(film);
  
  const baseScore = (
    0.35 * criticalConsensus +
    0.25 * historicalImportance +
    0.20 * auteurImportance +
    0.10 * formalInnovation +
    0.10 * culturalInfluence
  );
  
  return Math.round(Math.min(baseScore, 100));
};

export default {
  calculateBaseCanonScore,
  calculateCriticalConsensus,
  calculateHistoricalImportance,
  calculateAuteurImportance,
  calculateFormalInnovation,
  calculateCulturalInfluence
};
