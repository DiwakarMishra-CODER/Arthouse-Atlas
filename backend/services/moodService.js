/**
 * Mood Assignment Service
 * Maps derivedTags to mood weights for discovery engine
 */

// Mood taxonomy
export const MOODS = [
  'contemplative', 'melancholic', 'dreamlike', 'surreal', 'intimate',
  'existential', 'psychological', 'minimalist', 'slow', 'austere',
  'poetic', 'lyrical', 'enigmatic', 'fragmented', 'bleak'
];

// Tag to mood mapping with weights
const TAG_TO_MOOD_MAPPING = {
  'contemplative': { contemplative: 0.9, slow: 0.5, existential: 0.3 },
  'melancholic': { melancholic: 0.9, intimate: 0.4, bleak: 0.3 },
  'dreamlike': { dreamlike: 0.9, surreal: 0.6, enigmatic: 0.5, poetic: 0.4 },
  'surreal': { surreal: 0.9, dreamlike: 0.6, enigmatic: 0.5 },
  'intimate': { intimate: 0.9, psychological: 0.5, melancholic: 0.3 },
  'existential': { existential: 0.9, contemplative: 0.6, bleak: 0.4 },
  'psychological': { psychological: 0.9, intimate: 0.5, enigmatic: 0.3 },
  'minimalist': { minimalist: 0.9, austere: 0.7, slow: 0.5 },
  'slow': { slow: 0.9, contemplative: 0.6, minimalist: 0.4 },
  'austere': { austere: 0.9, minimalist: 0.7, bleak: 0.4 },
  'poetic': { poetic: 0.9, lyrical: 0.7, dreamlike: 0.5 },
  'lyrical': { lyrical: 0.9, poetic: 0.7, intimate: 0.4 },
  'enigmatic': { enigmatic: 0.9, surreal: 0.6, dreamlike: 0.5 },
  'fragmented': { fragmented: 0.9, enigmatic: 0.6, psychological: 0.4 },
  'bleak': { bleak: 0.9, melancholic: 0.5, austere: 0.4 }
};

export const assignMoods = (film) => {
  const moodsMap = {};
  
  if (!film.derivedTags || film.derivedTags.length === 0) {
    // Default mood assignment for untagged films
    return { contemplative: 0.5 };
  }
  
  // For each derived tag, apply its mood mapping
  film.derivedTags.forEach(tag => {
    const mapping = TAG_TO_MOOD_MAPPING[tag];
    if (mapping) {
      Object.entries(mapping).forEach(([mood, weight]) => {
        // Accumulate weights (max out at 1.0)
        moodsMap[mood] = Math.min((moodsMap[mood] || 0) + weight, 1.0);
      });
    }
  });
  
  // Normalize all values to ensure they're between 0 and 1
  const maxWeight = Math.max(...Object.values(moodsMap), 1);
  Object.keys(moodsMap).forEach(mood => {
    moodsMap[mood] = Math.min(moodsMap[mood] / maxWeight, 1.0);
  });
  
  return moodsMap;
};

export const getMoodMatch = (filmMoods, selectedMoods) => {
  if (!filmMoods || Object.keys(filmMoods).length === 0) return 0;
  if (!selectedMoods || selectedMoods.length === 0) return 0;
  
  let totalMatch = 0;
  let totalWeight = selectedMoods.length;
  
  selectedMoods.forEach(mood => {
    const filmMoodWeight = filmMoods[mood] || 0;
    totalMatch += filmMoodWeight;
  });
  
  return totalMatch / totalWeight; // Returns 0-1
};

export default {
  MOODS,
  assignMoods,
  getMoodMatch
};
