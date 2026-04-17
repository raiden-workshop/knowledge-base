import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { DEFAULT_MEMORY_ROOT } from '../constants.js';
import { assertFormalMemoryRefreshAuthority } from '../team/team-contract.js';
import { evaluatePermissionGate, PERMISSION_DECISION_ALLOW } from '../policy/permission-gate.js';
import {
  evaluateHitlCheckpoints,
  HITL_DECISION_ALLOW,
  HITL_DECISION_DENY,
  HITL_DECISION_REVIEW,
} from '../policy/hitl-checkpoints.js';
import { runGuardedAction } from './guarded-action-runner.js';
import { resolveVerificationStatus } from './verification-state.js';

export const REFRESH_DECISION_ALLOW = 'allow';
export const REFRESH_DECISION_REVIEW = 'review';
export const REFRESH_DECISION_DENY = 'deny';

const DEFAULT_TRIGGER_REASON = 'team-terminal';

export function evaluateRefreshTrigger({
  role,
  workspaceRoot,
  phase = 'terminal',
  verificationStatus = 'verified',
  verificationFilePath,
  explicitUserIntent = false,
  memoryRoot = DEFAULT_MEMORY_ROOT,
} = {}) {
  try {
    assertFormalMemoryRefreshAuthority(role);
  } catch (error) {
    return {
      decision: REFRESH_DECISION_DENY,
      allowed: false,
      reasons: [error.message],
      role,
      workspaceRoot,
      phase,
      verificationStatus,
      verification: null,
      explicitUserIntent,
    };
  }

  const verification = resolveVerificationStatus({
    cwd: workspaceRoot,
    filePath: verificationFilePath,
    verificationStatus,
  });

  const permission = evaluatePermissionGate({
    action: 'formal-memory-refresh',
    role,
    cwd: workspaceRoot,
    memoryRoot,
  });
  const hitl = evaluateHitlCheckpoints({
    action: 'formal-memory-refresh',
    role,
    cwd: workspaceRoot,
    memoryRoot,
    permission,
    explicitUserIntent,
    phase,
    verificationStatus: verification.status,
  });
  const reasons = [...new Set([...permission.reasons, ...hitl.reasons])];
  const decision =
    permission.decision !== PERMISSION_DECISION_ALLOW || hitl.decision === HITL_DECISION_DENY
      ? REFRESH_DECISION_DENY
      : hitl.decision === HITL_DECISION_REVIEW
        ? REFRESH_DECISION_REVIEW
        : REFRESH_DECISION_ALLOW;

  return {
    decision,
    allowed: decision === REFRESH_DECISION_ALLOW,
    reasons,
    permission,
    hitl,
    verification,
    role,
    workspaceRoot,
    phase,
    verificationStatus: verification.status,
    explicitUserIntent,
  };
}

export function buildRefreshCommand({ workspaceRoot }) {
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  return [
    'python3',
    path.join(codexHome, 'scripts', 'refresh_memory.py'),
    '--workspace-root',
    workspaceRoot,
  ];
}

function defaultRefreshRunner(command) {
  return spawnSync(command[0], command.slice(1), {
    encoding: 'utf8',
  });
}

export function triggerFormalMemoryRefresh({
  role,
  workspaceRoot,
  phase = 'terminal',
  verificationStatus = 'verified',
  verificationFilePath,
  explicitUserIntent = false,
  reason = DEFAULT_TRIGGER_REASON,
  execute = true,
  memoryRoot = DEFAULT_MEMORY_ROOT,
  runner = defaultRefreshRunner,
  maxAttempts = 2,
} = {}) {
  const evaluation = evaluateRefreshTrigger({
    role,
    workspaceRoot,
    phase,
    verificationStatus,
    verificationFilePath,
    explicitUserIntent,
    memoryRoot,
  });

  if (!evaluation.allowed) {
    return {
      ...evaluation,
      executed: false,
      reason,
      command: buildRefreshCommand({ workspaceRoot }),
      result: null,
    };
  }

  const command = buildRefreshCommand({ workspaceRoot });
  if (!execute) {
    return {
      ...evaluation,
      executed: false,
      reason,
      command,
      result: null,
    };
  }
  const execution = runGuardedAction({
    operation: 'formal-memory-refresh',
    action: 'formal-memory-refresh',
    role,
    cwd: workspaceRoot,
    memoryRoot,
    explicitUserIntent,
    phase,
    verificationStatus: evaluation.verification?.status ?? verificationStatus,
    maxAttempts,
    permission: evaluation.permission,
    hitl: evaluation.hitl,
    perform() {
      return runner(command);
    },
    isSuccessfulResult(result) {
      return (result?.status ?? 0) === 0;
    },
  });

  return {
    ...evaluation,
    executed: execution.executed,
    reason,
    command,
    result: execution.result,
    success: execution.success,
    attempts: execution.attempts,
    recovery: execution.recovery,
    usedFallback: execution.usedFallback,
    status: execution.status,
    error: execution.error,
  };
}
