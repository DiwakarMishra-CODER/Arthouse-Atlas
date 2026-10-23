/**
 * Movement lineage — which movements each one grew from.
 *
 * Only well-attested lines: a shared method, named influence by the
 * movement's own directors, or a direct historical hand-off. The inverse
 * ("fed into") is derived by syncMovements.js, so each edge is stated once.
 */

export const movementLineage = {
  'Poetic Realism': ['German Expressionism'],
  'Hollywood Auteurs': ['German Expressionism'],
  'Italian Neorealism': ['Poetic Realism'],
  'French New Wave': ['Italian Neorealism', 'Hollywood Auteurs'],
  'Indian Parallel Cinema': ['Italian Neorealism'],
  'Iranian New Wave': ['Italian Neorealism'],
  'British New Wave': ['Italian Neorealism', 'Documentary / Cinema Vérité'],
  'L.A. Rebellion': ['Italian Neorealism', 'Third Cinema / Latin American Political Cinema'],
  'New German Cinema': ['French New Wave'],
  'Czech New Wave': ['French New Wave'],
  'New Hollywood': ['French New Wave', 'Hollywood Auteurs'],
  'Japanese New Wave': ['French New Wave', 'Japanese Golden Age'],
  'Hong Kong New Wave': ['French New Wave'],
  'Third Cinema / Latin American Political Cinema': ['Soviet Montage', 'Italian Neorealism'],
  'Dogme 95': ['French New Wave', 'American Independent Cinema'],
  'New Taiwanese Cinema': ['Japanese Golden Age'],
  'Documentary / Cinema Vérité': ['Soviet Montage'],
  'New Queer Cinema': ['Avant-garde / Experimental Cinema', 'New Hollywood', 'American Independent Cinema'],
  'American Independent Cinema': ['Italian Neorealism', 'Documentary / Cinema Vérité'],
  'Slow Cinema': ['Avant-garde / Experimental Cinema', 'New Taiwanese Cinema'],
  'Chinese Fifth & Sixth Generations': ['New Taiwanese Cinema'],
  'Romanian New Wave': ['Iranian New Wave', 'Slow Cinema'],
  'Korean New Wave': ['Hong Kong New Wave', 'New Hollywood']
};
