import fs from 'fs';
import path from 'path';

export const CWD = process.cwd();
export const JSAGENT_DIR = path.join(CWD, '.jsagent');
export const CONFIG_FILE = path.join(JSAGENT_DIR, 'config.json');
export const SCHEMA_DIR = path.join(JSAGENT_DIR, 'schema');
export const HISTORY_DIR = path.join(JSAGENT_DIR, 'history');
export const OBJECTS_DIR = path.join(JSAGENT_DIR, 'objects');
export const LEDGER_FILE = path.join(HISTORY_DIR, 'ledger.json');

export const IGNORE_DIRS = ['node_modules', '.git', '.jsagent', 'dist', 'build', 'target'];
export const TRACKED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.py', '.c', '.cpp', '.java', '.md'];

export function isInitialized() {
  return fs.existsSync(JSAGENT_DIR);
}

export function getConfig() {
  if (!isInitialized()) throw new Error('Not initialized. Run jage init first.');
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

export function saveConfig(config) {
  config.lastUpdate = new Date().toISOString();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function getLedger() {
  if (!fs.existsSync(LEDGER_FILE)) return [];
  return JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
}

export function saveLedger(ledger) {
  fs.writeFileSync(LEDGER_FILE, JSON.stringify(ledger, null, 2));
}
