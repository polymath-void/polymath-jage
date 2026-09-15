/**
 * Classic dynamic programming Levenshtein distance.
 * Zero dependencies.
 */
export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  // Use single-row optimization for memory efficiency
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

/**
 * Find the closest matching string from a list of candidates.
 * @param {string} target - The string to match against
 * @param {string[]} candidates - Array of candidate strings
 * @param {number} maxDistance - Maximum edit distance to consider (default: 5)
 * @returns {{ match: string, distance: number } | null}
 */
export function findClosestMatch(target, candidates, maxDistance = 5) {
  let bestMatch = null;
  let bestDistance = maxDistance + 1;

  for (const candidate of candidates) {
    const dist = levenshtein(target.toLowerCase(), candidate.toLowerCase());
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = candidate;
    }
  }

  if (bestDistance <= maxDistance) {
    return { match: bestMatch, distance: bestDistance };
  }
  return null;
}
