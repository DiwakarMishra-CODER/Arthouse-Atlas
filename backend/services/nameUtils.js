/**
 * Name comparison helpers shared by scoring services and data scripts.
 *
 * Director names arrive in several spellings — "Wong Kar-Wai" / "Wong Kar-wai",
 * "Bong Joon Ho" / "Bong Joon-ho", "Ryūsuke" / "Ryusuke" — and a case-sensitive
 * `.includes()` silently treats a master auteur as an unknown director.
 */

// Lowercase, strip diacritics, drop everything that isn't a letter or digit
export const normalizeName = (s = '') =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// True when the names are the same person under different spellings, or one
// is a surname-only reference ("Dardenne") contained in the other
export const namesMatch = (a, b) => {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
};

// Does any name in `names` match any name in `list`?
export const anyNameMatches = (names = [], list = []) =>
  names.some((n) => list.some((l) => namesMatch(n, l)));

// Looser: same surname ("Charles Chaplin" / "Charlie Chaplin", "Ozu Yasujirō" /
// "Yasujirō Ozu"). Only safe when title and year are already constrained.
export const surnamesMatch = (a = '', b = '') => {
  const parts = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[\s,\-]+/).filter((p) => p.length > 2);
  const pa = parts(a); const pb = parts(b);
  if (!pa.length || !pb.length) return false;
  // Surname = last token in Western order; allow reversed order (Ozu Yasujirō)
  // by also accepting last-of-one == first-of-other. Never a shared first name
  // alone — "Robert Bresson" is not "Robert Altman".
  const la = pa[pa.length - 1]; const lb = pb[pb.length - 1];
  if (la === lb) return true;
  return (la === pb[0] && lb === pa[0]);
};
