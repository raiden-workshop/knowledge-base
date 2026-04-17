import path from 'node:path';

import {
  DEFAULT_MEMORY_ROOT,
  EXTERNAL_MEMORY_ROOT_ENV,
  STRICT_MODE_ENV,
} from '../constants.js';

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

export function parseBooleanFlag(value) {
  if (value == null) return null;
  const normalized = String(value).trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return null;
}

export function resolveStrictIntegrationConfig({
  cwd = process.cwd(),
  env = process.env,
  strictMode,
  memoryRoot,
} = {}) {
  const envStrictMode = parseBooleanFlag(env[STRICT_MODE_ENV]);
  const resolvedStrictMode = strictMode ?? envStrictMode ?? false;
  const resolvedMemoryRoot = path.resolve(
    memoryRoot ?? env[EXTERNAL_MEMORY_ROOT_ENV] ?? DEFAULT_MEMORY_ROOT
  );

  return {
    cwd: path.resolve(cwd),
    strictMode: resolvedStrictMode,
    memoryRoot: resolvedMemoryRoot,
    envVarNames: {
      strictMode: STRICT_MODE_ENV,
      memoryRoot: EXTERNAL_MEMORY_ROOT_ENV,
    },
  };
}

export function assertStrictIntegrationMode(config) {
  if (!config.strictMode) {
    throw new Error(
      `Strict integration mode is disabled. Enable ${STRICT_MODE_ENV}=1 to activate the formal memory guards.`
    );
  }

  return config;
}
