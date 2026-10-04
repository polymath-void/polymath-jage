import { levenshtein as original } from './src/core/levenshtein.js';

function levenshteinSafeFast(a, b) {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

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
    const temp = prev;
    prev = curr;
    curr = temp;
  }
  return prev[n];
}

const strings = Array(100).fill(0).map(() => Math.random().toString(36).substring(2, 15));

const startOld = process.hrtime.bigint();
for (let i = 0; i < 100; i++) {
  for (const s1 of strings) {
    for (const s2 of strings) {
      // original refers to the globally cached one currently in the file
      original(s1, s2);
    }
  }
}
const endOld = process.hrtime.bigint();

const startNew = process.hrtime.bigint();
for (let i = 0; i < 100; i++) {
  for (const s1 of strings) {
    for (const s2 of strings) {
      levenshteinSafeFast(s1, s2);
    }
  }
}
const endNew = process.hrtime.bigint();

console.log(`Global Cache Method: ${Number(endOld - startOld) / 1e6} ms`);
console.log(`Local Safe Method: ${Number(endNew - startNew) / 1e6} ms`);
