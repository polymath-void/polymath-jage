import fs from 'fs';
import path from 'path';
import { Logger, Colors } from '../core/logger.js';
import { findClosestMatch } from '../core/levenshtein.js';

/**
 * Recursively collect files matching given extensions from a directory.
 */
function collectFilesWithExt(dir, extensions, files = []) {
  if (!fs.existsSync(dir)) return files;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      collectFilesWithExt(fullPath, extensions, files);
    } else {
      const ext = path.extname(item);
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

// ─── Phase 1: XML Resource Resolution ────────────────────────────────────────

/**
 * Build a global resource dictionary from res/values/ XML files.
 * Returns Map<resourceType, Set<resourceName>>
 */
function buildResourceDictionary(rootDir) {
  const valuesDir = path.join(rootDir, 'res', 'values');
  const dict = new Map();

  // Initialize known resource types
  for (const type of ['string', 'color', 'style', 'dimen', 'drawable', 'id', 'array', 'bool', 'integer']) {
    dict.set(type, new Set());
  }

  const xmlFiles = collectFilesWithExt(valuesDir, ['.xml']);

  for (const file of xmlFiles) {
    const content = fs.readFileSync(file, 'utf8');

    // Match: <string name="app_name">, <color name="primary">, <style name="Theme.App">, etc.
    const resourceTagRe = /<(string|color|style|dimen|drawable|item|bool|integer|integer-array|string-array)\s+name\s*=\s*"([^"]+)"/g;
    let m;
    while ((m = resourceTagRe.exec(content)) !== null) {
      let type = m[1];
      const name = m[2];

      // Normalize array types
      if (type === 'integer-array' || type === 'string-array') type = 'array';
      if (type === 'item') {
        // Items with type attribute: <item name="..." type="id" />
        const typeMatch = content.slice(m.index, m.index + 200).match(/type\s*=\s*"([^"]+)"/);
        if (typeMatch) type = typeMatch[1];
        else continue;
      }

      if (!dict.has(type)) dict.set(type, new Set());
      dict.get(type).add(name);
    }
  }

  return dict;
}

/**
 * Validate layout XML files against the resource dictionary.
 * Returns array of error objects.
 */
function validateLayouts(rootDir, dictionary) {
  const layoutDir = path.join(rootDir, 'res', 'layout');
  const errors = [];

  const xmlFiles = collectFilesWithExt(layoutDir, ['.xml']);

  for (const file of xmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const relPath = path.relative(rootDir, file);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match @string/xxx, @color/xxx, @style/xxx, @dimen/xxx, @drawable/xxx
      const refRe = /@(string|color|style|dimen|drawable|id)\/([a-zA-Z0-9_.]+)/g;
      let m;
      while ((m = refRe.exec(line)) !== null) {
        const type = m[1];
        const name = m[2];

        const typeSet = dictionary.get(type);
        if (!typeSet || !typeSet.has(name)) {
          const col = m.index + 1;
          const error = {
            file: relPath,
            line: i + 1,
            col,
            message: `resource '${type}/${name}' not found`
          };

          // Fuzzy suggestion
          if (typeSet && typeSet.size > 0) {
            const closest = findClosestMatch(name, Array.from(typeSet), 4);
            if (closest) {
              error.suggestion = `@${type}/${closest.match}`;
            }
          }

          errors.push(error);
        }
      }
    }
  }

  return errors;
}

// ─── Phase 2: Kotlin Semantic Checks ─────────────────────────────────────────

/**
 * Lint Kotlin files for val reassignment and misplaced delegates.
 * Returns array of error objects.
 */
function lintKotlinFiles(rootDir) {
  const errors = [];
  const ktFiles = collectFilesWithExt(rootDir, ['.kt']);

  for (const file of ktFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const relPath = path.relative(rootDir, file);

    // Track val/var declarations with a simple scope tracker
    const declarations = []; // { name, mutability, scopeDepth, line }
    let scopeDepth = 0;
    let inFunction = false;
    let functionDepth = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Track scope depth
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;

      // Detect function entry
      if (line.match(/^\s*(?:private\s+|public\s+|internal\s+|protected\s+)?(?:override\s+)?fun\s+/)) {
        inFunction = true;
        functionDepth = scopeDepth;
      }

      scopeDepth += openBraces;

      // Check for val/var declarations
      const declMatch = line.match(/\b(val|var)\s+([a-zA-Z0-9_]+)/);
      if (declMatch) {
        declarations.push({
          name: declMatch[2],
          mutability: declMatch[1],
          scopeDepth,
          line: i + 1
        });
      }

      // Check for val reassignment: identifier = <value> (but not ==, !=, <=, >=, +=, -=, etc.)
      const assignMatch = line.match(/^([a-zA-Z0-9_]+)\s*=[^=]/);
      if (assignMatch) {
        const varName = assignMatch[1];
        // Find the most recent declaration of this variable
        const decl = declarations.filter(d => d.name === varName && d.scopeDepth <= scopeDepth).pop();
        if (decl && decl.mutability === 'val') {
          errors.push({
            file: relPath,
            line: i + 1,
            col: 1,
            message: `reassignment of val '${varName}' (declared at line ${decl.line})`
          });
        }
      }

      // Check for misplaced delegates inside functions
      if (inFunction && scopeDepth > functionDepth + 1) {
        const delegateMatch = line.match(/by\s+(activityViewModels|viewModels|lazy)\s*\(/);
        if (delegateMatch) {
          errors.push({
            file: relPath,
            line: i + 1,
            col: line.indexOf('by') + 1,
            message: `'${delegateMatch[1]}()' delegate must be a class-level property, not inside a function body`
          });
        }
      }

      scopeDepth -= closeBraces;

      // Clean up declarations that go out of scope
      if (closeBraces > 0) {
        while (declarations.length > 0 && declarations[declarations.length - 1].scopeDepth > scopeDepth) {
          declarations.pop();
        }
        if (scopeDepth <= functionDepth) {
          inFunction = false;
          functionDepth = -1;
        }
      }
    }
  }

  return errors;
}

// ─── Plugin Interface ────────────────────────────────────────────────────────

/**
 * Format errors in AAPT2 style.
 */
function formatErrors(errors) {
  const lines = [];
  for (const err of errors) {
    let msg = `${err.file}:${err.line}:${err.col}: error: ${err.message}`;
    if (err.suggestion) {
      msg += `\n   -> Did you mean: '${err.suggestion}'?`;
    }
    lines.push(msg);
  }
  return lines;
}

/**
 * Run the full Android linter suite.
 * Returns { errors: [], passed: boolean }
 */
export function runLint(rootDir) {
  const allErrors = [];
  const resDir = path.join(rootDir, 'res');

  // Phase 1: XML Resource Resolution
  if (fs.existsSync(resDir)) {
    Logger.info('Android Linter: Building resource dictionary...');
    const dictionary = buildResourceDictionary(rootDir);

    let totalResources = 0;
    for (const [type, names] of dictionary) {
      totalResources += names.size;
    }
    Logger.debug('AndroidLint', `Indexed ${totalResources} resources across ${dictionary.size} types`);

    Logger.info('Android Linter: Validating layout references...');
    const layoutErrors = validateLayouts(rootDir, dictionary);
    allErrors.push(...layoutErrors);
  }

  // Phase 2: Kotlin Semantic Checks
  const ktFiles = collectFilesWithExt(rootDir, ['.kt']);
  if (ktFiles.length > 0) {
    Logger.info(`Android Linter: Scanning ${ktFiles.length} Kotlin file(s)...`);
    const ktErrors = lintKotlinFiles(rootDir);
    allErrors.push(...ktErrors);
  }

  // Output
  if (allErrors.length > 0) {
    console.log('');
    console.log(`${Colors.FgRed}[FATAL] Semantic Resolution Failed${Colors.Reset}`);
    const formatted = formatErrors(allErrors);
    for (const line of formatted) {
      console.log(`  ${Colors.FgRed}${line}${Colors.Reset}`);
    }
    console.log('');
    console.log(`${Colors.FgRed}[ABORT] Push cancelled. Codebase structural integrity preserved.${Colors.Reset}`);
  } else {
    if (fs.existsSync(resDir) || ktFiles.length > 0) {
      Logger.success('Android Linter: All references resolved. No errors found.');
    }
  }

  return { errors: allErrors, passed: allErrors.length === 0 };
}

/**
 * Register the plugin with the jage engine.
 */
export function register(options = {}) {
  return {
    name: 'android-linter',
    phase: 'pre-push',
    execute: (rootDir) => runLint(rootDir)
  };
}
