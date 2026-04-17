import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_MEMORY_ROOT } from '../constants.js';
import { assertTeamWriteAccess, canTriggerFormalMemoryRefresh } from '../team/team-contract.js';

const RESERVED_VERIFICATION_STATE = 'verification';

function stateDirFromOptions({ cwd = process.cwd(), dirPath } = {}) {
  return dirPath ?? path.join(cwd, '.omx', 'state');
}

function normalizeStateName(name) {
  if (!name || !String(name).trim()) {
    throw new Error('State operations require a non-empty state name.');
  }
  return String(name).trim().replace(/\.json$/i, '').replace(/-state$/i, '');
}

function stateFilePath({ cwd = process.cwd(), dirPath, name } = {}) {
  const stateName = normalizeStateName(name);
  return path.join(stateDirFromOptions({ cwd, dirPath }), `${stateName}-state.json`);
}

function readJsonFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return {
      exists: true,
      raw,
      data: JSON.parse(raw),
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return {
        exists: false,
        raw: '',
        data: null,
      };
    }
    throw error;
  }
}

export function stateRead({
  cwd = process.cwd(),
  dirPath,
  name,
} = {}) {
  const targetPath = stateFilePath({ cwd, dirPath, name });
  const stateName = normalizeStateName(name);
  const current = readJsonFile(targetPath);

  return {
    name: stateName,
    path: targetPath,
    exists: current.exists,
    active: current.exists,
    data: current.data,
  };
}

export function stateWrite({
  role = 'main',
  cwd = process.cwd(),
  memoryRoot = DEFAULT_MEMORY_ROOT,
  dirPath,
  name,
  data,
} = {}) {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('state_write requires an object payload.');
  }

  const targetPath = stateFilePath({ cwd, dirPath, name });
  const stateName = normalizeStateName(name);
  if (stateName === RESERVED_VERIFICATION_STATE && !canTriggerFormalMemoryRefresh(role)) {
    throw new Error('Workers must not modify reserved verification state via raw state_write.');
  }
  assertTeamWriteAccess({
    role,
    targetPath,
    cwd,
    memoryRoot,
  });

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

  return {
    name: stateName,
    path: targetPath,
    exists: true,
    active: true,
    data,
  };
}

export function stateClear({
  role = 'main',
  cwd = process.cwd(),
  memoryRoot = DEFAULT_MEMORY_ROOT,
  dirPath,
  name,
} = {}) {
  const targetPath = stateFilePath({ cwd, dirPath, name });
  const stateName = normalizeStateName(name);
  if (stateName === RESERVED_VERIFICATION_STATE && !canTriggerFormalMemoryRefresh(role)) {
    throw new Error('Workers must not clear reserved verification state via raw state_clear.');
  }
  assertTeamWriteAccess({
    role,
    targetPath,
    cwd,
    memoryRoot,
  });

  try {
    fs.unlinkSync(targetPath);
    return {
      name: stateName,
      path: targetPath,
      removed: true,
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return {
        name: stateName,
        path: targetPath,
        removed: false,
      };
    }
    throw error;
  }
}

export function stateListActive({
  cwd = process.cwd(),
  dirPath,
} = {}) {
  const targetDir = stateDirFromOptions({ cwd, dirPath });
  try {
    const states = fs
      .readdirSync(targetDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('-state.json'))
      .map((entry) => normalizeStateName(entry.name))
      .sort();

    return {
      dir: targetDir,
      states,
      count: states.length,
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return {
        dir: targetDir,
        states: [],
        count: 0,
      };
    }
    throw error;
  }
}

export function stateGetStatus({
  cwd = process.cwd(),
  dirPath,
  name,
} = {}) {
  const current = stateRead({ cwd, dirPath, name });
  return {
    name: current.name,
    path: current.path,
    active: current.active,
    exists: current.exists,
    keys: current.data ? Object.keys(current.data).sort() : [],
  };
}
