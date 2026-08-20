import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { OBJECTS_DIR } from './config.js';

export function hashContent(content) {
  return crypto.createHash('sha1').update(content, 'utf8').digest('hex');
}

export function writeBlob(content) {
  const hash = hashContent(content);
  const objectPath = path.join(OBJECTS_DIR, hash);
  if (!fs.existsSync(objectPath)) {
    fs.writeFileSync(objectPath, content, 'utf8');
  }
  return hash;
}

export function readBlob(hash) {
  const objectPath = path.join(OBJECTS_DIR, hash);
  if (!fs.existsSync(objectPath)) {
    throw new Error(`Object blob missing: ${hash}`);
  }
  return fs.readFileSync(objectPath, 'utf8');
}
