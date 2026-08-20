import { Logger } from './logger.js';

// NATIVE, ZERO-DEPENDENCY PARSERS (NO THIRD-PARTY MODULES)

function parseJSBlocks(content) {
  Logger.debug('Parser', 'Executing Native Zero-Dependency JS/JSX AST generation');
  const blocks = {};
  let skeleton = content;
  
  // Advanced regex to detect top-level functions, classes, and arrow functions
  const declarationRegex = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?\s+([a-zA-Z0-9_]+)|class\s+([a-zA-Z0-9_]+)|(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>)\s*\{?/gm;
  
  let match;
  const extractors = [];
  
  while ((match = declarationRegex.exec(content)) !== null) {
    const startIndex = match.index;
    const blockName = match[1] || match[2] || match[3] || 'anonymous';
    
    let openBraceIndex = content.indexOf('{', startIndex);
    if (openBraceIndex === -1) continue; 
    
    // Ensure we don't jump too far for the brace
    const textBetween = content.slice(startIndex, openBraceIndex);
    if (textBetween.includes(';')) continue;
    
    let braceCount = 0;
    let endIndex = -1;
    let inString = false;
    let stringChar = '';
    
    for (let i = openBraceIndex; i < content.length; i++) {
      const char = content[i];
      const prevChar = content[i-1];
      
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (stringChar === char) {
          inString = false;
        }
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        
        if (braceCount === 0) {
          endIndex = i;
          break;
        }
      }
    }
    
    if (endIndex !== -1) {
      const fullBlock = content.slice(startIndex, endIndex + 1);
      extractors.push({ id: `js_block_${blockName}`, content: fullBlock });
    }
  }
  
  for (const ext of extractors) {
    if (!blocks[ext.id]) {
      blocks[ext.id] = ext.content;
      skeleton = skeleton.replace(ext.content, `/* __JAGE_REF_${ext.id}__ */`);
    }
  }
  
  blocks['__skeleton__'] = skeleton;
  return blocks;
}

function parsePythonBlocks(content) {
  Logger.debug('Parser', 'Executing Python Regex AST generation');
  const blocks = {};
  let skeleton = content;
  const funcRegex = /^def\s+([a-zA-Z0-9_]+)\s*\([^)]*\):[\s\S]*?(?=(^def\s|^class\s|\Z))/gm;
  
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    const funcName = match[1];
    const funcFull = match[0];
    blocks[`py_function_${funcName}`] = funcFull.trim();
    skeleton = skeleton.replace(funcFull.trim(), `/* __JAGE_REF_py_function_${funcName}__ */`);
  }
  blocks['__skeleton__'] = skeleton;
  return blocks;
}

function parseCBlocks(content) {
  Logger.debug('Parser', 'Executing C/C++ Regex AST generation');
  const blocks = {};
  let skeleton = content;
  const funcRegex = /^(?:int|void|char|double|float)\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{[\s\S]*?^\}/gm;
  
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    const funcName = match[1];
    const funcFull = match[0];
    blocks[`c_function_${funcName}`] = funcFull;
    skeleton = skeleton.replace(funcFull, `/* __JAGE_REF_c_function_${funcName}__ */`);
  }
  blocks['__skeleton__'] = skeleton;
  return blocks;
}

function parseMarkdownBlocks(content) {
  Logger.debug('Parser', 'Executing Markdown Structural AST generation');
  const blocks = {};
  let skeleton = content;
  
  // Match markdown headers and capture until the next header of the same or higher level
  // Simplified logic: treat each H1/H2 as a distinct block
  const headerRegex = /^(#{1,3})\s+(.+?)$([\s\S]*?)(?=^(#{1,3})\s+|\Z)/gm;
  
  let match;
  while ((match = headerRegex.exec(content)) !== null) {
    // Sanitize block ID from the header text
    const blockName = match[2].trim().replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    const fullBlock = match[0];
    
    // Only extract if it has some content beyond just the header
    if (match[3].trim().length > 0) {
      blocks[`md_section_${blockName}`] = fullBlock;
      skeleton = skeleton.replace(fullBlock, `/* __JAGE_REF_md_section_${blockName}__ */\n`);
    }
  }
  blocks['__skeleton__'] = skeleton;
  return blocks;
}

export function parseSemanticBlocks(content, extension) {
  Logger.debug('Parser', `Incoming file with extension: ${extension}`);

  if (['.md'].includes(extension)) return parseMarkdownBlocks(content);
  if (['.py'].includes(extension)) return parsePythonBlocks(content);
  if (['.c', '.cpp'].includes(extension)) return parseCBlocks(content);
  if (['.js', '.jsx', '.ts', '.tsx'].includes(extension)) return parseJSBlocks(content);

  Logger.debug('Parser', `No AST engine found for ${extension}. Treating as raw blob.`);
  return { 'raw_blob': content };
}
