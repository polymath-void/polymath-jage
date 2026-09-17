#!/data/data/com.termux/files/usr/bin/env node

import { runInit } from '../src/commands/init.js';
import { runPush } from '../src/commands/push.js';
import { runDaemon } from '../src/commands/daemon.js';
import { runRevert } from '../src/commands/revert.js';
import { isInitialized, getConfig } from '../src/core/config.js';
import { Logger } from '../src/core/logger.js';

function printStatus() {
  if (!isInitialized()) return;
  const config = getConfig();
  Logger.divider();
  Logger.info(`jage (Codebase Manager) - v${config.version}`);
  Logger.info(`Last Update: ${config.lastUpdate}`);
  Logger.divider();
}

function showHelp() {
  console.log(`
polymath-jage (Codebase Manager) v1.0.0
A zero-dependency universal semantic AST version control and orchestration engine.

Usage:
  jage <command> [options]

Available Commands:
  init      Initialize a new jage repository in the current directory.
            (Auto-binds to Root Swarms if initialized in a sub-directory)
            
  push      Scan codebase, generate Semantic AST hashes, and push to database.
            (Deduplicates blocks and automatically syncs with Symbiotic Nodes)
            Use --analyze to compute blast radius warnings.
            
  revert    node <file>:<block> --version=<v#>
            Surgically revert a single AST node to a previous version.
            
  daemon    <start|stop> Run jage push continuously in the background

Options:
  -h, --help    Show this help message
  --debug       Enable debug logging

Examples:
  $ jage init
  $ jage push
  $ jage push --analyze
  $ jage revert node push.js:js_block_runPush --version=3
  $ jage daemon start
  `);
}

const args = process.argv.slice(2).filter(arg => arg !== '--debug');
const command = args[0];

if (!command || command === 'help' || command === '--help' || command === '-h') {
  showHelp();
} else {
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

    case 'daemon':
      runDaemon(args[1]);
      break;

    case 'fetch':
      Logger.info('Fetching codebase inconsistencies (Drift Analysis)... [WIP]');
      break;

    case 'revert':
      runRevert(args.slice(1));
      break;

    case 'downgrade':
      Logger.info(`Downgrading semantic blocks... [WIP]`);
      break;

    default:
      console.log('Unknown command.');
      showHelp();
  }
}
