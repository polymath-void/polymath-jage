import fs from 'fs';
import path from 'path';
import { CWD, SCHEMA_DIR, IGNORE_DIRS, TRACKED_EXTENSIONS, getConfig, saveConfig, isInitialized, JSAGENT_DIR, HISTORY_DIR, OBJECTS_DIR, CONFIG_FILE, LEDGER_FILE } from '../core/config.js';
import { runPush } from './push.js';
import { Logger } from '../core/logger.js';

export function runInit() {
  let wasEmpty = false;
  if (!fs.existsSync(JSAGENT_DIR)) fs.mkdirSync(JSAGENT_DIR, { recursive: true });
  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
  if (!fs.existsSync(SCHEMA_DIR)) fs.mkdirSync(SCHEMA_DIR, { recursive: true });
  if (!fs.existsSync(OBJECTS_DIR)) fs.mkdirSync(OBJECTS_DIR, { recursive: true });

  if (!fs.existsSync(CONFIG_FILE)) {
    wasEmpty = true;
    const initialConfig = {
      version: 0,
      lastUpdate: new Date().toISOString(),
      pendingChanges: [],
      projectType: "universal"
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(initialConfig, null, 2));
    fs.writeFileSync(LEDGER_FILE, JSON.stringify([]));
    Logger.success('Initialized empty jage repository.');
  }

  Logger.info('Triggering Initial Codebase Semantic Inspection...');
  runPush();
  
  if (wasEmpty) {
    Logger.success('Generated baseline semantic schema structure in .jsagent/schema/...');
  }
}
