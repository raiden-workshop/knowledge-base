import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { DEFAULT_MEMORY_ROOT } from '../constants.js';
import { assertTeamWriteAccess } from '../team/team-contract.js';

export const MEMORY_INTAKE_FILENAME = 'memory-intake.jsonl';

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function intakePathFromOptions({ cwd = process.cwd(), filePath } = {}) {
  return filePath ?? path.join(cwd, '.omx', MEMORY_INTAKE_FILENAME);
}

function toJsonLine(value) {
  return `${JSON.stringify(value)}\n`;
}

function buildIntakeEntryId({
  kind,
  role,
  source,
  content,
  metadata,
  createdAt,
}) {
  const hash = crypto
    .createHash('sha1')
    .update(
      JSON.stringify({
        kind,
        role,
        source,
        content,
        metadata,
        createdAt,
      })
    )
    .digest('hex')
    .slice(0, 12);

  return `intake-${hash}`;
}

function normalizeIntakeEntry(entry = {}) {
  const kind = entry.kind ?? 'note';
  const role = entry.role ?? 'main';
  const source = entry.source ?? 'runtime';
  const content = entry.content ?? '';
  const metadata = entry.metadata ?? {};
  const createdAt = entry.created_at ?? new Date(0).toISOString();

  return {
    ...entry,
    id:
      entry.id ??
      buildIntakeEntryId({
        kind,
        role,
        source,
        content,
        metadata,
        createdAt,
      }),
    kind,
    role,
    source,
    content,
    metadata,
    created_at: createdAt,
  };
}

export function appendMemoryIntakeEntry({
  role = 'main',
  cwd = process.cwd(),
  memoryRoot = DEFAULT_MEMORY_ROOT,
  filePath,
  kind = 'note',
  content,
  source = 'runtime',
  metadata = {},
  createdAt = new Date().toISOString(),
  entryId,
} = {}) {
  if (!content || !String(content).trim()) {
    throw new Error('Memory intake entries require non-empty content.');
  }

  const targetPath = intakePathFromOptions({ cwd, filePath });
  assertTeamWriteAccess({
    role,
    targetPath,
    cwd,
    memoryRoot,
  });

  const entry = {
    id:
      entryId ??
      buildIntakeEntryId({
        kind,
        role,
        source,
        content: String(content),
        metadata,
        createdAt,
      }),
    kind,
    role,
    source,
    content: String(content),
    metadata,
    created_at: createdAt,
  };

  ensureDirectory(targetPath);
  fs.appendFileSync(targetPath, toJsonLine(entry), 'utf8');

  return {
    path: targetPath,
    entry,
  };
}

export function readMemoryIntakeEntries({
  cwd = process.cwd(),
  filePath,
} = {}) {
  const targetPath = intakePathFromOptions({ cwd, filePath });
  try {
    const raw = fs.readFileSync(targetPath, 'utf8');
    const entries = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => normalizeIntakeEntry(JSON.parse(line)));

    return {
      path: targetPath,
      exists: true,
      entries,
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return {
        path: targetPath,
        exists: false,
        entries: [],
      };
    }
    throw error;
  }
}

export function summarizeMemoryIntake({
  cwd = process.cwd(),
  filePath,
} = {}) {
  const queue = readMemoryIntakeEntries({ cwd, filePath });
  return {
    ...queue,
    count: queue.entries.length,
    kinds: [...new Set(queue.entries.map((entry) => entry.kind))],
    latest: queue.entries.at(-1) ?? null,
  };
}
