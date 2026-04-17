import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_MEMORY_ROOT } from '../constants.js';
import { canTriggerFormalMemoryRefresh } from '../team/team-contract.js';
import { assertTeamWriteAccess } from '../team/team-contract.js';

export const VERIFICATION_STATE_FILENAME = 'verification-state.json';
export const VERIFICATION_STATE_NAME = 'verification';

export const VERIFICATION_STATUS_PENDING = 'pending';
export const VERIFICATION_STATUS_VERIFIED = 'verified';
export const VERIFICATION_STATUS_FAILED = 'failed';
export const VERIFICATION_STATUS_STALE = 'stale';

const ALLOWED_STATUSES = new Set([
  VERIFICATION_STATUS_PENDING,
  VERIFICATION_STATUS_VERIFIED,
  VERIFICATION_STATUS_FAILED,
  VERIFICATION_STATUS_STALE,
]);

function verificationFilePath({ cwd = process.cwd(), dirPath, filePath } = {}) {
  return filePath ?? path.join(dirPath ?? path.join(cwd, '.omx', 'state'), VERIFICATION_STATE_FILENAME);
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item ?? '').trim()).filter(Boolean))];
}

function normalizeStatus(status, fallback = VERIFICATION_STATUS_PENDING) {
  const candidate = String(status ?? fallback).trim().toLowerCase();
  if (!ALLOWED_STATUSES.has(candidate)) {
    throw new Error(`Unsupported verification status: "${status}".`);
  }
  return candidate;
}

function normalizeEvidenceEntry(entry, defaults = {}) {
  if (entry == null) {
    throw new Error('Verification evidence entry is required.');
  }

  if (typeof entry === 'string') {
    return {
      kind: 'note',
      summary: entry.trim(),
      command: null,
      metadata: {},
      observed_by: defaults.observedBy ?? 'main',
      created_at: defaults.createdAt ?? new Date().toISOString(),
    };
  }

  if (typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error('Verification evidence entry must be a string or object.');
  }

  const summary = String(entry.summary ?? entry.message ?? entry.text ?? '').trim();
  if (!summary) {
    throw new Error('Verification evidence entry requires a non-empty summary.');
  }

  const metadata =
    entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
      ? entry.metadata
      : {};

  return {
    kind: String(entry.kind ?? 'note').trim() || 'note',
    summary,
    command: entry.command != null ? String(entry.command) : null,
    metadata,
    observed_by: String(entry.observed_by ?? entry.observedBy ?? defaults.observedBy ?? 'main'),
    created_at: entry.created_at ?? entry.createdAt ?? defaults.createdAt ?? new Date().toISOString(),
  };
}

function normalizeEvidenceList(value, defaults = {}) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => normalizeEvidenceEntry(entry, defaults));
}

function buildDefaultVerificationState(targetPath) {
  return {
    path: targetPath,
    exists: false,
    active: false,
    status: VERIFICATION_STATUS_PENDING,
    scope: [],
    commands: [],
    evidence: [],
    notes: '',
    verified_by: null,
    verified_at: null,
    updated_at: null,
    source: 'default',
  };
}

function normalizeStateData(data, { targetPath, exists }) {
  const normalized = buildDefaultVerificationState(targetPath);
  normalized.exists = exists;
  normalized.active = exists;
  normalized.source = exists ? 'artifact' : 'default';

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return normalized;
  }

  normalized.status = normalizeStatus(data.status, normalized.status);
  normalized.scope = normalizeStringArray(data.scope);
  normalized.commands = normalizeStringArray(data.commands);
  normalized.evidence = normalizeEvidenceList(data.evidence);
  normalized.notes = data.notes != null ? String(data.notes) : '';
  normalized.verified_by = data.verified_by != null ? String(data.verified_by) : null;
  normalized.verified_at = data.verified_at != null ? String(data.verified_at) : null;
  normalized.updated_at = data.updated_at != null ? String(data.updated_at) : null;

  if (normalized.status !== VERIFICATION_STATUS_VERIFIED) {
    normalized.verified_by = null;
    normalized.verified_at = null;
  }

  return normalized;
}

function readJsonFile(targetPath) {
  try {
    const raw = fs.readFileSync(targetPath, 'utf8');
    return {
      exists: true,
      data: JSON.parse(raw),
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return {
        exists: false,
        data: null,
      };
    }
    throw error;
  }
}

function writeStateFile(targetPath, data) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function assertVerificationAuthority(role, status) {
  if (status === VERIFICATION_STATUS_VERIFIED && !canTriggerFormalMemoryRefresh(role)) {
    throw new Error(`Role "${role}" cannot mark verification as verified.`);
  }
}

export function readVerificationState({
  cwd = process.cwd(),
  dirPath,
  filePath,
} = {}) {
  const targetPath = verificationFilePath({ cwd, dirPath, filePath });
  const current = readJsonFile(targetPath);
  return normalizeStateData(current.data, {
    targetPath,
    exists: current.exists,
  });
}

export function appendVerificationEvidence({
  role = 'main',
  cwd = process.cwd(),
  memoryRoot = DEFAULT_MEMORY_ROOT,
  dirPath,
  filePath,
  evidence,
  summary,
  kind,
  command,
  metadata,
  createdAt,
} = {}) {
  const targetPath = verificationFilePath({ cwd, dirPath, filePath });
  assertTeamWriteAccess({
    role,
    targetPath,
    cwd,
    memoryRoot,
  });

  const current = readVerificationState({ cwd, dirPath, filePath });
  const entry = normalizeEvidenceEntry(
    evidence ?? {
      kind,
      summary,
      command,
      metadata,
      observed_by: role,
      created_at: createdAt,
    },
    {
      observedBy: role,
      createdAt,
    }
  );

  const next = {
    status: current.status,
    scope: current.scope,
    commands: entry.command ? normalizeStringArray([...current.commands, entry.command]) : current.commands,
    evidence: [...current.evidence, entry],
    notes: current.notes,
    verified_by: current.verified_by,
    verified_at: current.verified_at,
    updated_at: createdAt ?? new Date().toISOString(),
  };

  writeStateFile(targetPath, next);

  return readVerificationState({ cwd, dirPath, filePath });
}

export function markVerificationStatus({
  role = 'main',
  cwd = process.cwd(),
  memoryRoot = DEFAULT_MEMORY_ROOT,
  dirPath,
  filePath,
  status,
  scope,
  commands,
  evidence,
  notes,
  updatedAt,
  verifiedAt,
} = {}) {
  const targetPath = verificationFilePath({ cwd, dirPath, filePath });
  assertTeamWriteAccess({
    role,
    targetPath,
    cwd,
    memoryRoot,
  });

  const nextStatus = normalizeStatus(status);
  assertVerificationAuthority(role, nextStatus);

  const current = readVerificationState({ cwd, dirPath, filePath });
  const nextUpdatedAt = updatedAt ?? new Date().toISOString();
  const nextEvidence = evidence != null
    ? [...current.evidence, ...normalizeEvidenceList(evidence, { observedBy: role, createdAt: nextUpdatedAt })]
    : current.evidence;

  const next = {
    status: nextStatus,
    scope: scope != null ? normalizeStringArray(scope) : current.scope,
    commands: commands != null ? normalizeStringArray(commands) : current.commands,
    evidence: nextEvidence,
    notes: notes != null ? String(notes) : current.notes,
    verified_by: nextStatus === VERIFICATION_STATUS_VERIFIED ? role : null,
    verified_at: nextStatus === VERIFICATION_STATUS_VERIFIED ? (verifiedAt ?? nextUpdatedAt) : null,
    updated_at: nextUpdatedAt,
  };

  writeStateFile(targetPath, next);

  return readVerificationState({ cwd, dirPath, filePath });
}

export function resolveVerificationStatus({
  cwd = process.cwd(),
  dirPath,
  filePath,
  verificationStatus,
} = {}) {
  const state = readVerificationState({ cwd, dirPath, filePath });
  if (state.exists) {
    return {
      status: state.status,
      source: 'artifact',
      state,
      path: state.path,
    };
  }

  const status = verificationStatus != null
    ? normalizeStatus(verificationStatus, VERIFICATION_STATUS_PENDING)
    : VERIFICATION_STATUS_VERIFIED;

  return {
    status,
    source: verificationStatus != null ? 'parameter' : 'default',
    state,
    path: state.path,
  };
}

export function markVerified(options = {}) {
  return markVerificationStatus({
    ...options,
    status: VERIFICATION_STATUS_VERIFIED,
  });
}

export function markVerificationPending(options = {}) {
  return markVerificationStatus({
    ...options,
    status: VERIFICATION_STATUS_PENDING,
  });
}

export function markVerificationFailed(options = {}) {
  return markVerificationStatus({
    ...options,
    status: VERIFICATION_STATUS_FAILED,
  });
}

export function markVerificationStale(options = {}) {
  return markVerificationStatus({
    ...options,
    status: VERIFICATION_STATUS_STALE,
  });
}
