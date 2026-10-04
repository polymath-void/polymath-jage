import fs from 'fs';

const content = Array(10000).fill("const result = someImport(foo, bar);").join('\n') + "\n" + "import { a,b,c,d,e } from 'stuff';";
const imports = Array(50).fill(0).map((_, i) => `import_${i}`);

function findUsagesOld(content, localName) {
  const refRe = new RegExp('\\b' + localName + '\\b', 'g');
  let count = 0;
  let m;
  while ((m = refRe.exec(content)) !== null) {
    count++;
  }
  return Math.max(0, count - 1);
}

function buildIndex(content) {
  const wordRe = /[a-zA-Z0-9_$]+/g;
  const counts = {};
  let m;
  while ((m = wordRe.exec(content)) !== null) {
    counts[m[0]] = (counts[m[0]] || 0) + 1;
  }
  return counts;
}

function findUsagesNew(index, localName) {
  return Math.max(0, (index[localName] || 0) - 1);
}

const startOld = process.hrtime.bigint();
for (let i = 0; i < 100; i++) {
  for (const imp of imports) {
    findUsagesOld(content, imp);
  }
}
const endOld = process.hrtime.bigint();

const startNew = process.hrtime.bigint();
for (let i = 0; i < 100; i++) {
  const index = buildIndex(content);
  for (const imp of imports) {
    findUsagesNew(index, imp);
  }
}
const endNew = process.hrtime.bigint();

console.log(`Original Regex Method: ${Number(endOld - startOld) / 1e6} ms`);
console.log(`Optimized Hash Index Method: ${Number(endNew - startNew) / 1e6} ms`);
console.log(`Speedup: ${(Number(endOld - startOld) / Number(endNew - startNew)).toFixed(2)}x`);
