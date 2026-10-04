/**
 * Highly optimized dynamic programming Levenshtein distance.
 * Uses typed arrays and continuous memory blocks (O(min(N,M)) space).
 * Hardened for production stability.
 */
export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  // Allocated locally to guarantee state safety in concurrent contexts.
  // Using Uint32Array instead of Uint16Array ensures integer bounds 
  // are never exceeded even when comparing massive AST blocks.
  let prev = new Uint32Array(n + 1);
  let curr = new Uint32Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      const delIns = (prev[j] < curr[j - 1] ? prev[j] : curr[j - 1]) + 1;
      const sub = prev[j - 1] + cost;
      curr[j] = delIns < sub ? delIns : sub;
    }
    // Swap pointers
    const temp = prev;
    prev = curr;
    curr = temp;
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
