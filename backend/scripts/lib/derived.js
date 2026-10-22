/**
 * The fields a film's record derives from its TMDB data (tags, moods and the old scores), computed
 * the same way for every record, whether it came in as a film (addFilms.js) or a series (catalogue/addSeries.js).
 */

import { generateTags } from '../../services/taggingService.js';
import { assignMoods } from '../../services/moodService.js';
import { calculateArthouseScore } from '../../services/arthouseScoring.js';
import {
  calculateBaseCanonScore, calculateCriticalConsensus, calculateFormalInnovation,
  calculateCulturalInfluence, calculateDepthScore
} from '../../services/baseCanonScoring.js';

export const recomputeDerived = (doc) => {
  const derivedTags = generateTags({ synopsis: doc.synopsis, keywords: doc.keywords, genres: doc.genres });
  const merged = { ...doc, derivedTags };
  merged.moods = assignMoods(merged);
  merged.criticalConsensus = calculateCriticalConsensus(merged);
  merged.formalInnovation = calculateFormalInnovation(merged);
  merged.culturalInfluence = calculateCulturalInfluence(merged);
  merged.depthScore = calculateDepthScore(merged);
  merged.arthouseScore = calculateArthouseScore(merged);
  merged.baseCanonScore = calculateBaseCanonScore(merged);
  const { derivedTags: t, moods, criticalConsensus, formalInnovation, culturalInfluence, depthScore, arthouseScore, baseCanonScore } = merged;
  return { derivedTags: t, moods, criticalConsensus, formalInnovation, culturalInfluence, depthScore, arthouseScore, baseCanonScore };
};
