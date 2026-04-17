import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_MEMORY_ROOT } from '../constants.js';
import { assertTeamWriteAccess } from '../team/team-contract.js';

export const PROMOTION_AUDIT_FILENAME = 'promotion-audit.jsonl';

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function auditPathFromOptions({ cwd = process.cwd(), filePath } = {}) {
  return filePath ?? path.join(cwd, '.omx', PROMOTION_AUDIT_FILENAME);
}

function toJsonLine(value) {
  return `${JSON.stringify(value)}\n`;
}

function sanitizeSelectedEntries(selectedEntries = []) {
  return selectedEntries.map((entry) => ({
    id: entry.id,
    kind: entry.kind,
    role: entry.role,
    source: entry.source,
    created_at: entry.created_at,
  }));
}

export function appendPromotionAuditEvent({
  role = 'main',
  cwd = process.cwd(),
  memoryRoot = DEFAULT_MEMORY_ROOT,
  filePath,
  event,
  decision = 'allow',
  selectedEntries = [],
  metadata = {},
  createdAt = new Date().toISOString(),
  success,
} = {}) {
  if (!event || !String(event).trim()) {
    throw new Error('Promotion audit events require a non-empty event name.');
  }

  const targetPath = auditPathFromOptions({ cwd, filePath });
  assertTeamWriteAccess({
    role,
    targetPath,
    cwd,
    memoryRoot,
  });

  const entry = {
    event: String(event),
    role,
    decision,
    success: typeof success === 'boolean' ? success : null,
    entry_ids: sanitizeSelectedEntries(selectedEntries).map((item) => item.id).filter(Boolean),
    selected_entries: sanitizeSelectedEntries(selectedEntries),
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

export function readPromotionAuditEntries({
  cwd = process.cwd(),
  filePath,
} = {}) {
  const targetPath = auditPathFromOptions({ cwd, filePath });
  try {
    const raw = fs.readFileSync(targetPath, 'utf8');
    const entries = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));

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

export function summarizePromotionAuditTrail({
  cwd = process.cwd(),
  filePath,
} = {}) {
  const audit = readPromotionAuditEntries({ cwd, filePath });
  return {
    ...audit,
    count: audit.entries.length,
    events: [...new Set(audit.entries.map((entry) => entry.event))],
    latest: audit.entries.at(-1) ?? null,
    promotedEntryIds: [
      ...new Set(
        audit.entries
          .filter((entry) => entry.event === 'promotion_refresh_completed' && entry.success === true)
          .flatMap((entry) => entry.entry_ids ?? [])
      ),
    ],
  };
}
