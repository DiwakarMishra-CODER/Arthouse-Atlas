// Automated Tagging Service
// Uses rule-based keyword matching to assign derivedTags

// Fixed vocabulary of arthouse tags
export const ARTHOUSE_TAGS = [
  'slow',
  'dreamlike',
  'melancholic',
  'intimate',
  'existential',
  'minimalist',
  'bleak',
  'poetic',
  'psychological',
  'fragmented',
  'contemplative',
  'surreal',
  'austere',
  'lyrical',
  'enigmatic'
];

// Keyword mapping for each tag
const TAG_KEYWORDS = {
  slow: ['slow', 'meditative', 'paced', 'deliberate', 'contemplation', 'quiet', 'stillness'],
  dreamlike: ['dream', 'surreal', 'ethereal', 'hypnotic', 'trance', 'fantastical', 'otherworldly'],
  melancholic: ['melancholy', 'sad', 'grief', 'loss', 'sorrow', 'tragic', 'despair', 'longing'],
  intimate: ['intimate', 'personal', 'close', 'private', 'confessional', 'relationship', 'character study'],
  existential: ['existential', 'meaning', 'existence', 'philosophy', 'identity', 'absurd', 'alienation'],
  minimalist: ['minimal', 'sparse', 'simple', 'austere', 'stripped', 'bare', 'essential'],
  bleak: ['bleak', 'dark', 'harsh', 'grim', 'desolate', 'hopeless', 'stark'],
  poetic: ['poetic', 'lyrical', 'visual poetry', 'artistic', 'metaphor', 'symbolic', 'imagery'],
  psychological: ['psychological', 'mind', 'mental', 'psyche', 'inner', 'subconscious', 'memory'],
  fragmented: ['fragmented', 'nonlinear', 'disjointed', 'experimental', 'abstract', 'unconventional'],
  contemplative: ['contemplative', 'reflective', 'thoughtful', 'introspective', 'meditation'],
  surreal: ['surreal', 'bizarre', 'strange', 'weird', 'uncanny', 'dreamscape'],
  austere: ['austere', 'severe', 'rigorous', 'restrained', 'disciplined', 'stark'],
  lyrical: ['lyrical', 'musical', 'rhythmic', 'flowing', 'graceful', 'elegant'],
  enigmatic: ['enigmatic', 'mysterious', 'ambiguous', 'cryptic', 'puzzling', 'obscure']
};

/**
 * Generate derivedTags for a movie based on its metadata
 * @param {Object} movieData - Object with synopsis, keywords, and genres
 * @returns {Array} Array of 3-5 derived tags
 */
export const generateTags = (movieData) => {
  const { synopsis = '', keywords = [], genres = [] } = movieData;
  
  // Combine all text into one searchable string
  const combinedText = [
    synopsis,
    keywords.join(' '),
    genres.join(' ')
  ].join(' ').toLowerCase();

  // Score each tag based on keyword matches
  const tagScores = {};
  
  ARTHOUSE_TAGS.forEach(tag => {
    let score = 0;
    const keywordList = TAG_KEYWORDS[tag] || [];
    
    keywordList.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}`, 'gi');
      const matches = combinedText.match(regex);
      if (matches) {
        score += matches.length;
      }
    });
    
    tagScores[tag] = score;
  });

  // Sort tags by score and take top 3-5
  const sortedTags = Object.entries(tagScores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tag]) => tag);

  // If no tags matched, assign default based on genres
  if (sortedTags.length === 0) {
    const genreStr = genres.join(' ').toLowerCase();
    if (genreStr.includes('drama')) sortedTags.push('contemplative');
    if (genreStr.includes('thriller') || genreStr.includes('horror')) sortedTags.push('psychological');
    if (genreStr.includes('romance')) sortedTags.push('intimate');
    
    // Ensure at least one tag
    if (sortedTags.length === 0) {
      sortedTags.push('contemplative');
    }
  }

  return sortedTags.slice(0, 5); // Max 5 tags
};
