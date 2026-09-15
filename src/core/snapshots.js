import fs from 'fs';
import path from 'path';
import { JSAGENT_DIR, SCHEMA_DIR, HISTORY_DIR } from './config.js';
import { Logger } from './logger.js';

const SNAPSHOTS_DIR = path.join(HISTORY_DIR, 'snapshots');

/**
 * Recursively copy a directory.
 */
function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const items = fs.readdirSync(src);
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Save a snapshot of the current schema state for a given version.
 */
export function saveSnapshot(version) {
  if (!fs.existsSync(SCHEMA_DIR)) return;

  const snapshotDir = path.join(SNAPSHOTS_DIR, `v${version}`);
  if (fs.existsSync(snapshotDir)) return; // Already snapped

  try {
    copyDirRecursive(SCHEMA_DIR, snapshotDir);
    Logger.debug('Snapshot', `Saved schema snapshot for v${version}`);
  } catch (e) {
    Logger.debug('Snapshot', `Failed to save snapshot: ${e.message}`);
  }
}

/**
 * Get a schema file from a specific version snapshot.
 * @param {number} version - The version number
 * @param {string} schemaRelPath - Relative path to the schema file within the schema dir
 * @returns {object|null} - Parsed schema JSON or null
 */
export function getSnapshotSchema(version, schemaRelPath) {
  const snapshotPath = path.join(SNAPSHOTS_DIR, `v${version}`, schemaRelPath);
  if (!fs.existsSync(snapshotPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

/**
 * List all available snapshot versions.
 * @returns {number[]} - Sorted array of version numbers
 */
export function listSnapshots() {
  if (!fs.existsSync(SNAPSHOTS_DIR)) return [];
  const items = fs.readdirSync(SNAPSHOTS_DIR);
  return items
    .filter(item => item.startsWith('v'))
    .map(item => parseInt(item.slice(1), 10))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);
}
