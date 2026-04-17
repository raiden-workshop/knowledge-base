import path from 'node:path';

import { DEFAULT_MEMORY_ROOT, normalizeLookupPath } from '../constants.js';

const TELEMETRY_HINTS = [
  '/logs/',
  '/hud/',
  '/metrics/',
  'buddypulse',
  'notification',
  'pane-capture',
];

export class FormalMemoryWriteError extends Error {
  constructor(targetPath) {
    super(`Direct writes to formal memory are forbidden in strict integration mode: ${targetPath}`);
    this.name = 'FormalMemoryWriteError';
    this.targetPath = targetPath;
  }
}

export class RuntimeArtifactWriteError extends Error {
  constructor(targetPath, role) {
    super(`Role "${role}" may only write runtime artifacts under .omx/**: ${targetPath}`);
    this.name = 'RuntimeArtifactWriteError';
    this.targetPath = targetPath;
    this.role = role;
  }
}

export function isFormalMemoryPath(targetPath, memoryRoot = DEFAULT_MEMORY_ROOT) {
  const normalizedTarget = normalizeLookupPath(targetPath);
  const normalizedRoot = normalizeLookupPath(memoryRoot);

  if (!normalizedTarget.startsWith(`${normalizedRoot}/`)) return false;

  const relativePath = normalizedTarget.slice(normalizedRoot.length + 1);
  const parts = relativePath.split('/').filter(Boolean);

  if (parts[0] === 'global' && parts[1] === 'memories') return true;
  if (parts[0] === 'workspaces' && parts.length >= 3 && parts[2] === 'memories') return true;

  return false;
}

export function isOmxPath(targetPath, cwd = process.cwd()) {
  const normalizedTarget = normalizeLookupPath(targetPath);
  const normalizedOmxRoot = normalizeLookupPath(path.join(cwd, '.omx'));
  return normalizedTarget === normalizedOmxRoot || normalizedTarget.startsWith(`${normalizedOmxRoot}/`);
}

export function classifyArtifactPath(
  targetPath,
  { cwd = process.cwd(), memoryRoot = DEFAULT_MEMORY_ROOT } = {}
) {
  if (isFormalMemoryPath(targetPath, memoryRoot)) {
    return 'formal-memory';
  }

  if (isOmxPath(targetPath, cwd)) {
    const normalizedTarget = normalizeLookupPath(targetPath);
    if (TELEMETRY_HINTS.some((hint) => normalizedTarget.includes(hint))) {
      return 'telemetry';
    }
    return 'worker-run';
  }

  return 'other';
}

export function guardWritePath(
  targetPath,
  { cwd = process.cwd(), memoryRoot = DEFAULT_MEMORY_ROOT } = {}
) {
  const classification = classifyArtifactPath(targetPath, { cwd, memoryRoot });
  if (classification === 'formal-memory') {
    throw new FormalMemoryWriteError(targetPath);
  }

  return {
    allowed: true,
    classification,
    targetPath,
  };
}
