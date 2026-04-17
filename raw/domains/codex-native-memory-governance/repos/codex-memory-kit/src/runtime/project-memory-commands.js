import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_MEMORY_ROOT } from '../constants.js';
import { readProjectMemoryView } from '../integration/project-memory-view.js';
import { appendMemoryIntakeEntry } from './memory-intake-queue.js';
import { assertTeamWriteAccess } from '../team/team-contract.js';

export const PROJECT_MEMORY_DECISION_ALLOW = 'allow';
export const PROJECT_MEMORY_DECISION_DENY = 'deny';
export const PROJECT_MEMORY_DECISION_DOWNGRADE = 'downgrade';

function projectMemoryFilePath({ cwd = process.cwd(), filePath } = {}) {
  return filePath ?? path.join(cwd, '.omx', 'project-memory.json');
}

function readLocalProjectMemoryFile(targetPath) {
  try {
    return JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function writeLocalProjectMemoryFile(targetPath, payload) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function appendListItem(payload, key, item) {
  const next = { ...(payload ?? {}) };
  const currentList = Array.isArray(next[key]) ? next[key] : [];
  next[key] = [...currentList, item];
  return next;
}

export function projectMemoryRead({
  cwd = process.cwd(),
  memoryRoot = DEFAULT_MEMORY_ROOT,
  strictMode = false,
} = {}) {
  const view = readProjectMemoryView({
    cwd,
    memoryRoot,
    strictMode,
  });

  return {
    operation: 'project_memory_read',
    decision: PROJECT_MEMORY_DECISION_ALLOW,
    strictMode,
    ...view,
  };
}

export function projectMemoryWrite({
  role = 'main',
  cwd = process.cwd(),
  memoryRoot = DEFAULT_MEMORY_ROOT,
  strictMode = false,
  payload,
  filePath,
} = {}) {
  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('project_memory_write requires an object payload.');
  }

  const targetPath = projectMemoryFilePath({ cwd, filePath });

  if (strictMode) {
    return {
      operation: 'project_memory_write',
      decision: PROJECT_MEMORY_DECISION_DENY,
      strictMode,
      path: targetPath,
      message:
        'Strict integration mode forbids direct project_memory_write. Use the formal memory pipeline or intake queue instead.',
    };
  }

  assertTeamWriteAccess({
    role,
    targetPath,
    cwd,
    memoryRoot,
  });
  writeLocalProjectMemoryFile(targetPath, payload);

  return {
    operation: 'project_memory_write',
    decision: PROJECT_MEMORY_DECISION_ALLOW,
    strictMode,
    path: targetPath,
    payload,
  };
}

function downgradeProjectMemoryAppend({
  operation,
  role,
  cwd,
  memoryRoot,
  kind,
  content,
  metadata = {},
}) {
  const appended = appendMemoryIntakeEntry({
    role,
    cwd,
    memoryRoot,
    kind,
    content,
    source: operation,
    metadata,
  });

  return {
    operation,
    decision: PROJECT_MEMORY_DECISION_DOWNGRADE,
    downgraded_to: 'memory-intake-queue',
    intake: appended,
  };
}

function appendLocalProjectMemoryEntry({
  role,
  cwd,
  memoryRoot,
  filePath,
  listKey,
  value,
  operation,
}) {
  const targetPath = projectMemoryFilePath({ cwd, filePath });
  assertTeamWriteAccess({
    role,
    targetPath,
    cwd,
    memoryRoot,
  });

  const current = readLocalProjectMemoryFile(targetPath);
  const next = appendListItem(current, listKey, value);
  writeLocalProjectMemoryFile(targetPath, next);

  return {
    operation,
    decision: PROJECT_MEMORY_DECISION_ALLOW,
    path: targetPath,
    payload: next,
  };
}

export function projectMemoryAddNote({
  role = 'main',
  cwd = process.cwd(),
  memoryRoot = DEFAULT_MEMORY_ROOT,
  strictMode = false,
  note,
  metadata = {},
  filePath,
} = {}) {
  if (!note || !String(note).trim()) {
    throw new Error('project_memory_add_note requires non-empty note content.');
  }

  if (strictMode) {
    return downgradeProjectMemoryAppend({
      operation: 'project_memory_add_note',
      role,
      cwd,
      memoryRoot,
      kind: 'note',
      content: String(note),
      metadata,
    });
  }

  return appendLocalProjectMemoryEntry({
    role,
    cwd,
    memoryRoot,
    filePath,
    listKey: 'notes',
    value: {
      note: String(note),
      metadata,
    },
    operation: 'project_memory_add_note',
  });
}

export function projectMemoryAddDirective({
  role = 'main',
  cwd = process.cwd(),
  memoryRoot = DEFAULT_MEMORY_ROOT,
  strictMode = false,
  directive,
  metadata = {},
  filePath,
} = {}) {
  if (!directive || !String(directive).trim()) {
    throw new Error('project_memory_add_directive requires non-empty directive content.');
  }

  if (strictMode) {
    return downgradeProjectMemoryAppend({
      operation: 'project_memory_add_directive',
      role,
      cwd,
      memoryRoot,
      kind: 'directive',
      content: String(directive),
      metadata,
    });
  }

  return appendLocalProjectMemoryEntry({
    role,
    cwd,
    memoryRoot,
    filePath,
    listKey: 'directives',
    value: {
      directive: String(directive),
      metadata,
    },
    operation: 'project_memory_add_directive',
  });
}
