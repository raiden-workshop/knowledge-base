import fs from 'node:fs';
import path from 'node:path';

import { normalizeLookupPath, workspaceMemoryHome } from '../constants.js';

export function loadWorkspaceIndex(memoryRoot) {
  const indexPath = path.join(memoryRoot, 'workspaces', 'index.json');
  let raw;
  try {
    raw = fs.readFileSync(indexPath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== 'object' || typeof parsed.workspaces !== 'object') {
    throw new Error(`Invalid workspace index: ${indexPath}`);
  }

  return {
    indexPath,
    version: parsed.version ?? null,
    workspaces: parsed.workspaces,
  };
}

function findBestWorkspaceMatch(workspaces, cwd) {
  const lookupCwd = normalizeLookupPath(cwd);
  let bestMatch = null;

  for (const [storedPath, entry] of Object.entries(workspaces)) {
    if (!entry || typeof entry !== 'object') continue;

    const candidatePath = normalizeLookupPath(entry.path ?? storedPath);
    if (lookupCwd !== candidatePath && !lookupCwd.startsWith(`${candidatePath}/`)) {
      continue;
    }

    if (!bestMatch || candidatePath.length > bestMatch.lookupPath.length) {
      bestMatch = {
        lookupPath: candidatePath,
        registeredPath: entry.path ?? storedPath,
        key: entry.key,
      };
    }
  }

  return bestMatch;
}

export function resolveWorkspaceNode({ cwd = process.cwd(), memoryRoot }) {
  const index = loadWorkspaceIndex(memoryRoot);
  if (!index) return null;
  const match = findBestWorkspaceMatch(index.workspaces, cwd);
  if (!match) return null;

  const memoryHome = workspaceMemoryHome(memoryRoot, match.key);

  return {
    key: match.key,
    workspaceRoot: path.resolve(match.registeredPath),
    memoryHome,
    repoGuidePath: path.join(memoryHome, 'instructions', 'repo', 'GUIDE.md'),
    memoryIndexPath: path.join(memoryHome, 'memories', 'MEMORY.md'),
    activeContextPath: path.join(memoryHome, 'runtime', 'active_context.md'),
    indexPath: index.indexPath,
  };
}
