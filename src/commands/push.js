import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CWD, IGNORE_DIRS, TRACKED_EXTENSIONS, getConfig, saveConfig, getLedger, saveLedger, JSAGENT_DIR } from '../core/config.js';
import { parseSemanticBlocks } from '../core/parser.js';
import { Logger } from '../core/logger.js';

function getParentChain(agentDir) {
  const chain = [];
  let current = agentDir;
  const maxDepth = 20; // prevent infinite loops
  for (let i = 0; i < maxDepth; i++) {
    const configPath = path.join(current, 'config.json');
    if (!fs.existsSync(configPath)) break;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.parent_node && config.parent_node !== current) {
        chain.push(config.parent_node);
        current = config.parent_node;
      } else {
        break;
      }
    } catch(e) { break; }
  }
  return chain;
}

export function processFilePush(fullPath, item, relativeFilePath, agentDir, rootAgentDir) {
  Logger.debug('Push', `Processing file: ${fullPath}`);
  const ext = path.extname(item);
  const content = fs.readFileSync(fullPath, 'utf8');
  
  const semanticBlocks = parseSemanticBlocks(content, ext);
  const schema = { file: item, extension: ext, pointers: {} };
  
  for (const [blockId, blockContent] of Object.entries(semanticBlocks)) {
    const hash = crypto.createHash('sha1').update(blockContent).digest('hex');
    
    // 1. Write to Local Sub-Agent Node
    const localObjPath = path.join(agentDir, 'objects', hash);
    if (!fs.existsSync(localObjPath)) fs.writeFileSync(localObjPath, blockContent);
    
    // 2. Write to All Root Overlord Nodes (Infinite Symbiotic Chain)
    const parents = getParentChain(agentDir);
    for (const p of parents) {
      const rootObjPath = path.join(p, 'objects', hash);
      if (!fs.existsSync(rootObjPath)) fs.writeFileSync(rootObjPath, blockContent);
    }
    
    schema.pointers[blockId] = hash;
  }
  
  // Write Local Schema
  const localSchemaPath = path.join(agentDir, 'schema', relativeFilePath + '.schema.json');
  fs.mkdirSync(path.dirname(localSchemaPath), { recursive: true });
  fs.writeFileSync(localSchemaPath, JSON.stringify(schema, null, 2));
  Logger.debug('Push', `Wrote local schema: ${localSchemaPath}`);
  
  // Write Root Schemas (Infinite Symbiotic Chain)
  const parents = getParentChain(agentDir);
  for (const p of parents) {
    const rootBaseDir = path.dirname(p);
    const rootRelativePath = path.relative(rootBaseDir, fullPath);
    const rootSchemaPath = path.join(p, 'schema', rootRelativePath + '.schema.json');
    fs.mkdirSync(path.dirname(rootSchemaPath), { recursive: true });
    fs.writeFileSync(rootSchemaPath, JSON.stringify(schema, null, 2));
  }
}

function scanAndPush(dir, agentDir, rootAgentDir) {
  const items = fs.readdirSync(dir);
  let currentAgentDir = agentDir;
  
  // Check if this directory is a Sub-Agent Node
  const potentialAgent = path.join(dir, '.jsagent');
  if (dir !== path.dirname(rootAgentDir) && fs.existsSync(potentialAgent)) {
    currentAgentDir = potentialAgent;
    
    // Symbiotic Bind: Inject Parent Notation
    const subConfigPath = path.join(potentialAgent, 'config.json');
    if (fs.existsSync(subConfigPath)) {
      const subConfig = JSON.parse(fs.readFileSync(subConfigPath, 'utf8'));
      if (subConfig.parent_node !== rootAgentDir) {
        subConfig.parent_node = rootAgentDir;
        fs.writeFileSync(subConfigPath, JSON.stringify(subConfig, null, 2));
        Logger.info(`🔗 Symbiotic Bind: Linked Sub-Agent [${path.basename(dir)}] to Root Swarm.`);
      }
    }
  }

  for (const item of items) {
    if (IGNORE_DIRS.includes(item)) continue;
    
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      scanAndPush(fullPath, currentAgentDir, rootAgentDir);
    } else {
      const ext = path.extname(item);
      if (TRACKED_EXTENSIONS.includes(ext)) {
        const agentRootDir = path.dirname(currentAgentDir);
        const relativeFilePath = path.relative(agentRootDir, fullPath);
        processFilePush(fullPath, item, relativeFilePath, currentAgentDir, rootAgentDir);
      }
    }
  }
}

function cleanStaleSchemas(schemaDir, sourceDir) {
  if (!fs.existsSync(schemaDir)) return;
  const items = fs.readdirSync(schemaDir);
  for (const item of items) {
    const schemaPath = path.join(schemaDir, item);
    const stat = fs.statSync(schemaPath);
    if (stat.isDirectory()) {
      const sourceSubDir = path.join(sourceDir, item);
      cleanStaleSchemas(schemaPath, sourceSubDir);
      if (fs.readdirSync(schemaPath).length === 0) {
        fs.rmdirSync(schemaPath);
      }
    } else if (item.endsWith('.schema.json')) {
      const sourceFileName = item.replace('.schema.json', '');
      const sourceFilePath = path.join(sourceDir, sourceFileName);
      if (!fs.existsSync(sourceFilePath)) {
        fs.unlinkSync(schemaPath);
      }
    }
  }
}

export function runPush() {
  const config = getConfig();
  
  const localAgentDir = JSAGENT_DIR;
  const rootAgentDir = config.parent_node || JSAGENT_DIR;
  
  Logger.info('Scanning semantic diffs and generating Content-Addressable Blobs...');
  scanAndPush(CWD, localAgentDir, rootAgentDir);
  
  Logger.info('Cleaning up stale schemas for deleted or moved files...');
  cleanStaleSchemas(path.join(localAgentDir, 'schema'), CWD);
  
  Logger.info('Propagating staleness checks to Root Swarm...');
  const parents = getParentChain(localAgentDir);
  for (const p of parents) {
    cleanStaleSchemas(path.join(p, 'schema'), path.dirname(p));
  }
  
  config.version += 1;
  saveConfig(config);
  
  const ledger = getLedger();
  ledger.push(`[v${config.version}] ACTION: PUSH_AST_SYNC (Swarm Mapped)`);
  saveLedger(ledger);
  
  Logger.success(`Codebase successfully pushed to v${config.version}.`);
  Logger.success('Semantic blocks deduplicated via Symbiotic Node Hashing.');
}
