import os from 'node:os';
import path from 'node:path';

export const DEFAULT_MEMORY_ROOT = path.join(os.homedir(), '.codex', 'memory');
export const STRICT_MODE_ENV = 'OMX_STRICT_MEMORY_MODE';
export const EXTERNAL_MEMORY_ROOT_ENV = 'OMX_EXTERNAL_MEMORY_ROOT';

export const SHARED_GUIDE_RELATIVE_PATHS = [
  ['company', path.join('instructions', 'company', 'GUIDE.md')],
  ['user', path.join('instructions', 'user', 'GUIDE.md')],
  ['local', path.join('instructions', 'local', 'GUIDE.md')],
];

export function normalizeLookupPath(inputPath) {
  return path.resolve(String(inputPath)).replace(/\\/g, '/');
}

export function workspaceMemoryHome(memoryRoot, key) {
  if (!key || !String(key).trim()) {
    throw new Error('workspaceMemoryHome requires a workspace key.');
  }

  return path.join(memoryRoot, 'workspaces', String(key));
}
