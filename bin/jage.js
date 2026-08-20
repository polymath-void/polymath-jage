#!/data/data/com.termux/files/usr/bin/env node

import { runInit } from '../src/commands/init.js';
import { runPush } from '../src/commands/push.js';
import { isInitialized, getConfig } from '../src/core/config.js';
import { Logger, Colors } from '../src/core/logger.js';

function printStatus() {
  if (!isInitialized()) return;
  const config = getConfig();
  Logger.divider();
  Logger.info(`jage (Codebase Manager) - v${config.version}`);
  Logger.info(`Last Update: ${config.lastUpdate}`);
  Logger.divider();
}

const args = process.argv.slice(2).filter(arg => arg !== '--debug');
const command = args[0];
const cmdArgs = args.slice(1);

switch (command) {
  case 'init':
  case 'update':
    runInit();
    printStatus();
    break;

  case 'push':
    runPush();
    printStatus();
    break;

  case 'fetch':
    Logger.info('Fetching codebase inconsistencies (Drift Analysis)... [WIP]');
    break;

  case 'revert':
    Logger.info('Reverting to previous AST schema state... [WIP]');
    break;

  case 'downgrade':
    Logger.info(`Downgrading semantic blocks to v${cmdArgs[0]}... [WIP]`);
    break;

  default:
    console.log('Usage: jage <init|update|push|fetch|revert|downgrade> [--debug]');
}
