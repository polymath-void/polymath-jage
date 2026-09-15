import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { CWD, JSAGENT_DIR, SCHEMA_DIR } from '../core/config.js';
import { readBlob } from '../core/objects.js';
import { parseSemanticBlocks } from '../core/parser.js';
import { getSnapshotSchema, listSnapshots } from '../core/snapshots.js';
import { Logger } from '../core/logger.js';

/**
 * Recursively find a schema file by filename within the schema directory.
 */
function findSchemaFile(schemaDir, targetFilename) {
  if (!fs.existsSync(schemaDir)) return null;
  const items = fs.readdirSync(schemaDir);

  for (const item of items) {
    const fullPath = path.join(schemaDir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const found = findSchemaFile(fullPath, targetFilename);
      if (found) return found;
    } else if (item === targetFilename + '.schema.json') {
      return fullPath;
    }
  }
  return null;
}

/**
 * Get the relative schema path from the full schema file path.
 */
function getSchemaRelPath(schemaFilePath) {
  return path.relative(SCHEMA_DIR, schemaFilePath);
}

/**
 * Find the source file path from a schema file path.
 */
function findSourceFile(schemaDir, schemaFilePath) {
  const relPath = path.relative(SCHEMA_DIR, schemaFilePath);
  // Remove .schema.json suffix to get relative source path
  const sourceRelPath = relPath.replace('.schema.json', '');
  const sourcePath = path.join(CWD, sourceRelPath);
  if (fs.existsSync(sourcePath)) return sourcePath;
  return null;
}

/**
 * Locate a semantic block within file content and return its start/end offsets.
 */
function locateBlockInContent(content, blockId, blockContent) {
  const idx = content.indexOf(blockContent);
  if (idx !== -1) {
    return { startOffset: idx, endOffset: idx + blockContent.length };
  }

  // Fallback: try trimmed matching
  const trimmedBlock = blockContent.trim();
  const trimIdx = content.indexOf(trimmedBlock);
  if (trimIdx !== -1) {
    return { startOffset: trimIdx, endOffset: trimIdx + trimmedBlock.length };
  }

  return null;
}

/**
 * Validate JavaScript syntax using Node's native vm module.
 */
function validateJSSyntax(code) {
  try {
    new vm.Script(code);
    return { valid: true };
  } catch (e) {
    if (e instanceof SyntaxError) {
      return { valid: false, error: e.message };
    }
    return { valid: true }; // Non-syntax errors are OK
  }
}

/**
 * Main revert command handler.
 * Usage: jage revert node <filename>:<blockName> --version=<v#>
 */
export function runRevert(args) {
  if (!args || args.length === 0 || args[0] !== 'node') {
    console.log('Usage: jage revert node <filename>:<blockName> --version=<v#>');
    console.log('Example: jage revert node push.js:js_block_runPush --version=3');
    return;
  }

  const identifier = args[1];
  const versionFlag = args.find(a => a.startsWith('--version='));

  if (!identifier || !identifier.includes(':')) {
    Logger.error('Invalid identifier format. Use <filename>:<blockName>');
    Logger.info('Example: jage revert node push.js:js_block_runPush --version=3');
    return;
  }

  if (!versionFlag) {
    Logger.error('Missing --version flag.');
    Logger.info('Example: jage revert node push.js:js_block_runPush --version=3');
    return;
  }

  const [targetFilename, blockName] = identifier.split(':');
  const targetVersion = parseInt(versionFlag.split('=')[1], 10);

  if (isNaN(targetVersion)) {
    Logger.error('Invalid version number.');
    return;
  }

  // Check available snapshots
  const snapshots = listSnapshots();
  if (snapshots.length === 0) {
    Logger.error('No snapshots available. Run jage push at least twice to create version history.');
    return;
  }

  if (!snapshots.includes(targetVersion)) {
    Logger.error(`Version ${targetVersion} not found. Available versions: ${snapshots.join(', ')}`);
    return;
  }

  // Find the current schema file
  const currentSchemaPath = findSchemaFile(SCHEMA_DIR, targetFilename);
  if (!currentSchemaPath) {
    Logger.error(`No schema found for file '${targetFilename}'.`);
    return;
  }

  const schemaRelPath = getSchemaRelPath(currentSchemaPath);
  const currentSchema = JSON.parse(fs.readFileSync(currentSchemaPath, 'utf8'));

  // Check block exists in current schema
  if (!currentSchema.pointers[blockName]) {
    Logger.error(`Block '${blockName}' not found in schema for '${targetFilename}'.`);
    Logger.info(`Available blocks: ${Object.keys(currentSchema.pointers).filter(k => k !== '__skeleton__').join(', ')}`);
    return;
  }

  // Get the old schema from the snapshot
  const oldSchema = getSnapshotSchema(targetVersion, schemaRelPath);
  if (!oldSchema) {
    Logger.error(`Schema for '${targetFilename}' not found in version ${targetVersion} snapshot.`);
    return;
  }

  if (!oldSchema.pointers[blockName]) {
    Logger.error(`Block '${blockName}' did not exist in version ${targetVersion}.`);
    return;
  }

  const currentHash = currentSchema.pointers[blockName];
  const oldHash = oldSchema.pointers[blockName];

  if (currentHash === oldHash) {
    Logger.info(`Block '${blockName}' is identical in current version and v${targetVersion}. Nothing to revert.`);
    return;
  }

  // Read blob contents
  let oldBlockContent, currentBlockContent;
  try {
    oldBlockContent = readBlob(oldHash);
    currentBlockContent = readBlob(currentHash);
  } catch (e) {
    Logger.error(`Failed to read blob: ${e.message}`);
    return;
  }

  // Find the actual source file
  const sourceFilePath = findSourceFile(SCHEMA_DIR, currentSchemaPath);
  if (!sourceFilePath) {
    Logger.error(`Source file for '${targetFilename}' not found on disk.`);
    return;
  }

  const fileContent = fs.readFileSync(sourceFilePath, 'utf8');

  // Locate the current block in the file content
  const location = locateBlockInContent(fileContent, blockName, currentBlockContent);
  if (!location) {
    Logger.error(`Could not locate block '${blockName}' in the current file content. The file may have been manually edited since the last push.`);
    return;
  }

  // Text splice
  const before = fileContent.slice(0, location.startOffset);
  const after = fileContent.slice(location.endOffset);
  const splicedContent = before + oldBlockContent + after;

  // Dry-run validation for JS/TS files
  const ext = path.extname(sourceFilePath);
  if (['.js', '.jsx', '.ts', '.tsx', '.mjs'].includes(ext)) {
    // Strip import/export for vm.Script validation (it only handles scripts, not modules)
    const strippedForValidation = splicedContent
      .replace(/^import\s+.*$/gm, '// import stripped')
      .replace(/^export\s+/gm, '');

    const result = validateJSSyntax(strippedForValidation);
    if (!result.valid) {
      Logger.error(`Dry-run validation FAILED. The rollback would produce invalid syntax.`);
      Logger.error(`Syntax Error: ${result.error}`);
      Logger.info('Rollback aborted. No files were modified.');
      return;
    }
    Logger.info('Dry-run structural validation passed.');
  }

  // Write the spliced content
  fs.writeFileSync(sourceFilePath, splicedContent);

  Logger.success(`Successfully reverted '${blockName}' in '${targetFilename}' to version ${targetVersion}.`);
  Logger.info('Run "jage push" to update schemas with the reverted state.');
}
