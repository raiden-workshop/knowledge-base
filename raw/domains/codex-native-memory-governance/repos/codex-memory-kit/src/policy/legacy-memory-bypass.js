import path from 'node:path';

import { classifyArtifactPath, isOmxPath } from './path-guard.js';

export const LEGACY_SOURCE_DECISION_ALLOW = 'allow';
export const LEGACY_SOURCE_DECISION_SUPPLEMENT = 'supplement';
export const LEGACY_SOURCE_DECISION_BLOCK = 'block';

function normalizeBasename(filePath) {
  return path.basename(filePath || '').toLowerCase();
}

export function classifyLegacyMemorySource(sourcePath, { cwd = process.cwd(), memoryRoot } = {}) {
  const artifactClass = classifyArtifactPath(sourcePath, { cwd, memoryRoot });
  const basename = normalizeBasename(sourcePath);

  if (artifactClass === 'telemetry') return 'telemetry';
  if (!isOmxPath(sourcePath, cwd)) return 'other';
  if (basename === 'project-memory.json') return 'local-project-memory';
  if (basename === 'notepad.md') return 'notepad';
  return 'runtime-artifact';
}

export function evaluateLegacyMemorySource({
  sourcePath,
  intendedUse = 'primary',
  strictMode = false,
  cwd = process.cwd(),
  memoryRoot,
} = {}) {
  const sourceType = classifyLegacyMemorySource(sourcePath, { cwd, memoryRoot });

  if (sourceType === 'telemetry') {
    return {
      decision: LEGACY_SOURCE_DECISION_BLOCK,
      sourceType,
      sourcePath,
      intendedUse,
      reason: 'Telemetry sources are excluded from startup memory context.',
    };
  }

  if (sourceType === 'local-project-memory') {
    if (strictMode) {
      return {
        decision: LEGACY_SOURCE_DECISION_BLOCK,
        sourceType,
        sourcePath,
        intendedUse,
        reason:
          'Strict integration mode blocks .omx/project-memory.json from acting as a primary memory source.',
      };
    }

    return {
      decision: LEGACY_SOURCE_DECISION_ALLOW,
      sourceType,
      sourcePath,
      intendedUse,
      reason: '.omx/project-memory.json is available only outside strict integration mode.',
    };
  }

  if (sourceType === 'notepad') {
    return {
      decision:
        intendedUse === 'supplement'
          ? LEGACY_SOURCE_DECISION_SUPPLEMENT
          : LEGACY_SOURCE_DECISION_BLOCK,
      sourceType,
      sourcePath,
      intendedUse,
      reason:
        intendedUse === 'supplement'
          ? '.omx/notepad.md may contribute temporary hot context as a supplement.'
          : '.omx/notepad.md cannot replace formal memory as the primary startup source.',
    };
  }

  return {
    decision: LEGACY_SOURCE_DECISION_ALLOW,
    sourceType,
    sourcePath,
    intendedUse,
    reason: 'No legacy memory bypass detected for this source.',
  };
}

export function evaluateLegacyMemorySources(sources, options) {
  return sources.map((source) => evaluateLegacyMemorySource({ ...source, ...options }));
}
