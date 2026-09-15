import fs from 'fs';
import path from 'path';
import { CWD, JSAGENT_DIR, IGNORE_DIRS, TRACKED_EXTENSIONS } from './config.js';
import { Logger } from './logger.js';

const GRAPH_FILE = path.join(JSAGENT_DIR, 'graph.json');

/**
 * Parse ES6 import/require statements from file content.
 * Returns array of { localName, exportedName, source }
 */
function parseImports(content, filePath) {
  const imports = [];

  // ES6: import { foo, bar as baz } from './module'
  const namedImportRe = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = namedImportRe.exec(content)) !== null) {
    const specifiers = m[1].split(',');
    const source = m[2];
    for (const spec of specifiers) {
      const trimmed = spec.trim();
      if (!trimmed) continue;
      const aliasParts = trimmed.split(/\s+as\s+/);
      imports.push({
        localName: (aliasParts[1] || aliasParts[0]).trim(),
        exportedName: aliasParts[0].trim(),
        source
      });
    }
  }

  // ES6: import defaultExport from './module'
  const defaultImportRe = /import\s+([a-zA-Z0-9_$]+)\s+from\s*['"]([^'"]+)['"]/g;
  while ((m = defaultImportRe.exec(content)) !== null) {
    // Skip if this was already matched by named import (has curly braces)
    const preceding = content.slice(Math.max(0, m.index - 1), m.index);
    imports.push({
      localName: m[1],
      exportedName: 'default',
      source: m[2]
    });
  }

  // CommonJS: const foo = require('./module')
  const requireRe = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = requireRe.exec(content)) !== null) {
    imports.push({
      localName: m[1],
      exportedName: 'default',
      source: m[2]
    });
  }

  // Destructured require: const { a, b } = require('./module')
  const destructuredRequireRe = /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = destructuredRequireRe.exec(content)) !== null) {
    const specifiers = m[1].split(',');
    const source = m[2];
    for (const spec of specifiers) {
      const trimmed = spec.trim();
      if (!trimmed) continue;
      const aliasParts = trimmed.split(/\s*:\s*/);
      imports.push({
        localName: (aliasParts[1] || aliasParts[0]).trim(),
        exportedName: aliasParts[0].trim(),
        source
      });
    }
  }

  return imports;
}

/**
 * Parse exported declarations from file content.
 * Returns array of { name, type, startLine }
 */
function parseExports(content) {
  const exports = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // export function foo / export default function foo / export async function foo
    let m = line.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\*?\s+([a-zA-Z0-9_$]+)/);
    if (m) {
      exports.push({ name: m[1], type: 'Function', startLine: i + 1 });
      continue;
    }

    // export class Foo
    m = line.match(/^(?:export\s+)?(?:default\s+)?class\s+([a-zA-Z0-9_$]+)/);
    if (m) {
      exports.push({ name: m[1], type: 'Class', startLine: i + 1 });
      continue;
    }

    // export const/let/var foo = ...
    m = line.match(/^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=/);
    if (m) {
      exports.push({ name: m[1], type: 'Variable', startLine: i + 1 });
      continue;
    }
  }

  return exports;
}

/**
 * Resolve an import source path relative to the importing file.
 */
function resolveImportPath(importSource, importingFile) {
  if (!importSource.startsWith('.')) return null; // skip node_modules / bare specifiers

  const dir = path.dirname(importingFile);
  let resolved = path.resolve(dir, importSource);

  // Try extensions
  const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs'];
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;

  for (const ext of extensions) {
    if (fs.existsSync(resolved + ext)) return resolved + ext;
  }

  // Try index files
  for (const ext of extensions) {
    const indexPath = path.join(resolved, 'index' + ext);
    if (fs.existsSync(indexPath)) return indexPath;
  }

  return null;
}

/**
 * Recursively collect all tracked files.
 */
function collectFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (IGNORE_DIRS.includes(item) || item.startsWith('.')) continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      collectFiles(fullPath, files);
    } else {
      const ext = path.extname(item);
      if (TRACKED_EXTENSIONS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

/**
 * Find all usages of imported symbols within a file's content.
 */
function findUsages(content, localName) {
  // Match function calls: localName( or localName.something(
  const callRe = new RegExp('\\b' + localName + '\\s*\\(', 'g');
  const refRe = new RegExp('\\b' + localName + '\\b', 'g');
  let count = 0;
  let m;
  while ((m = refRe.exec(content)) !== null) {
    count++;
  }
  // Subtract 1 for the import declaration itself
  return Math.max(0, count - 1);
}

/**
 * Build a full dependency graph across the project.
 */
export function buildDependencyGraph(rootDir) {
  const files = collectFiles(rootDir || CWD);
  const nodes = {};
  const edges = [];

  // Pass 1: Register all exported symbols as nodes
  for (const file of files) {
    const relPath = path.relative(CWD, file);
    try {
      const content = fs.readFileSync(file, 'utf8');
      const exported = parseExports(content);
      for (const exp of exported) {
        const nodeId = `${relPath}:${exp.name}`;
        nodes[nodeId] = {
          file: relPath,
          name: exp.name,
          type: exp.type,
          startLine: exp.startLine
        };
      }
    } catch (e) {
      Logger.debug('Graph', `Skipping ${relPath}: ${e.message}`);
    }
  }

  // Pass 2: Build edges from imports to declarations
  for (const file of files) {
    const relPath = path.relative(CWD, file);
    try {
      const content = fs.readFileSync(file, 'utf8');
      const fileImports = parseImports(content, file);
      const fileExports = parseExports(content);

      for (const imp of fileImports) {
        const resolvedPath = resolveImportPath(imp.source, file);
        if (!resolvedPath) continue;

        const targetRelPath = path.relative(CWD, resolvedPath);

        // Find the target node
        const targetNodeId = `${targetRelPath}:${imp.exportedName}`;

        // Find which local functions/classes use this imported symbol
        const usageCount = findUsages(content, imp.localName);
        if (usageCount === 0) continue;

        // Connect each local declaration that uses the import to the target
        for (const localExp of fileExports) {
          const localNodeId = `${relPath}:${localExp.name}`;
          if (nodes[targetNodeId]) {
            edges.push({
              from: localNodeId,
              to: targetNodeId,
              type: 'dependency'
            });
          }
        }
      }
    } catch (e) {
      Logger.debug('Graph', `Error processing ${relPath}: ${e.message}`);
    }
  }

  return { nodes, edges };
}

/**
 * BFS on reverse dependency graph to compute blast radius.
 */
export function computeBlastRadius(graph, modifiedNodeIds) {
  // Build reverse adjacency list (who depends on X)
  const reverseDeps = {};
  for (const edge of graph.edges) {
    if (!reverseDeps[edge.to]) reverseDeps[edge.to] = [];
    reverseDeps[edge.to].push(edge.from);
  }

  const affected = [];
  const visited = new Set();

  // BFS from each modified node
  for (const startId of modifiedNodeIds) {
    if (!reverseDeps[startId]) continue;

    const queue = reverseDeps[startId].map(id => ({ id, depth: 1 }));

    while (queue.length > 0) {
      const { id, depth } = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);

      const node = graph.nodes[id];
      if (node) {
        affected.push({
          nodeId: id,
          file: node.file,
          name: node.name,
          type: node.type,
          depth
        });
      }

      // Continue BFS
      if (reverseDeps[id]) {
        for (const depId of reverseDeps[id]) {
          if (!visited.has(depId)) {
            queue.push({ id: depId, depth: depth + 1 });
          }
        }
      }
    }
  }

  return affected;
}

/**
 * Save graph to .jsagent/graph.json
 */
export function saveGraph(graph) {
  fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2));
}

/**
 * Load graph from .jsagent/graph.json
 */
export function loadGraph() {
  if (!fs.existsSync(GRAPH_FILE)) return null;
  return JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'));
}

/**
 * Format blast radius results for output.
 */
export function formatBlastRadius(modifiedNodes, affected, graph) {
  const lines = [];
  lines.push('');
  lines.push('Analyzing AST modifications...');
  lines.push('Modified nodes detected:');
  for (const id of modifiedNodes) {
    const node = graph.nodes[id];
    if (node) {
      lines.push(`  - ${node.file}: ${node.name}()`);
    }
  }
  lines.push('');

  if (affected.length === 0) {
    lines.push('No downstream dependencies affected.');
  } else {
    lines.push('\u26a0\ufe0f  BLAST RADIUS WARNING \u26a0\ufe0f');
    lines.push('The following downstream nodes may be impacted:');

    const fileSet = new Set();
    for (const a of affected) {
      const depthLabel = a.depth === 1 ? 'Direct dependency' : `Depth ${a.depth} dependency`;
      lines.push(`  - ${a.file}: ${a.name}() (${depthLabel})`);
      fileSet.add(a.file);
    }
    lines.push('');
    lines.push(`Total impacted nodes: ${affected.length} across ${fileSet.size} file(s).`);
  }

  return lines.join('\n');
}
