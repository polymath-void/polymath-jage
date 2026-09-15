import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { runPush } from './push.js';
import { Logger } from '../core/logger.js';

const DAEMON_PID_FILE = path.join(process.cwd(), '.jsagent', 'daemon.pid');
const DAEMON_LOG_FILE = path.join(process.cwd(), '.jsagent', 'daemon.log');

export function runDaemon(action) {
  if (action === 'start') {
    startDaemon();
  } else if (action === 'stop') {
    stopDaemon();
  } else if (action === 'run') {
    executeDaemon();
  } else {
    console.log('Usage: jage daemon <start|stop>');
  }
}

function startDaemon() {
  if (fs.existsSync(DAEMON_PID_FILE)) {
    console.log('Daemon is already running or PID file exists.');
    return;
  }
  
  if (!fs.existsSync(path.join(process.cwd(), '.jsagent'))) {
    console.log('Error: Not a jage repository. Run jage init first.');
    return;
  }
  
  const jagePath = process.argv[1];
  const out = fs.openSync(DAEMON_LOG_FILE, 'a');
  const err = fs.openSync(DAEMON_LOG_FILE, 'a');

  const child = spawn(process.execPath, [jagePath, 'daemon', 'run'], {
    detached: true,
    stdio: ['ignore', out, err]
  });

  child.unref();
  console.log(`Daemon started in background (PID: ${child.pid}). Logs at .jsagent/daemon.log`);
}

function stopDaemon() {
  if (!fs.existsSync(DAEMON_PID_FILE)) {
    console.log('Daemon is not running.');
    return;
  }
  const pid = fs.readFileSync(DAEMON_PID_FILE, 'utf8').trim();
  try {
    process.kill(parseInt(pid, 10), 'SIGTERM');
    console.log(`Daemon stopped (PID: ${pid}).`);
  } catch (e) {
    console.log(`Failed to stop daemon or already stopped: ${e.message}`);
  }
  if (fs.existsSync(DAEMON_PID_FILE)) {
    fs.unlinkSync(DAEMON_PID_FILE);
  }
}

function executeDaemon() {
  fs.writeFileSync(DAEMON_PID_FILE, process.pid.toString());
  
  const rootDir = process.cwd();
  const ignoreDirs = new Set(['.jsagent', '.git', 'node_modules', 'blueprints', 'skills']);
  const watchers = [];

  let debounceTimer = null;
  let modifiedFiles = new Set();

  function triggerPush() {
    Logger.info(`Daemon triggered push for ${modifiedFiles.size} modified files.`);
    try {
      runPush();
    } catch (e) {
      Logger.error(`Daemon push failed: ${e.message}`);
    }
    modifiedFiles.clear();
  }

  function handleEvent(eventType, filename, dirPath) {
    if (!filename) return;
    const fullPath = path.join(dirPath, filename);
    
    // Ignore dotfiles and ignored dirs
    if (filename.startsWith('.') || ignoreDirs.has(filename)) return;

    modifiedFiles.add(fullPath);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(triggerPush, 500);
  }

  function watchDirRecursive(dir) {
    try {
      const watcher = fs.watch(dir, (eventType, filename) => {
        handleEvent(eventType, filename, dir);
      });
      watchers.push(watcher);
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && !ignoreDirs.has(entry.name)) {
          watchDirRecursive(path.join(dir, entry.name));
        }
      }
    } catch (e) {
      Logger.error(`Failed to watch dir ${dir}: ${e.message}`);
    }
  }

  watchDirRecursive(rootDir);
  Logger.info(`Daemon listening for file changes in ${rootDir}`);

  function cleanup() {
    for (const watcher of watchers) {
      watcher.close();
    }
    if (fs.existsSync(DAEMON_PID_FILE)) {
      fs.unlinkSync(DAEMON_PID_FILE);
    }
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}
