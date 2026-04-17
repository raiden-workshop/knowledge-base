import { DEFAULT_MEMORY_ROOT } from '../constants.js';
import {
  evaluatePermissionGate,
  PERMISSION_DECISION_DENY,
  PERMISSION_DECISION_REVIEW,
} from './permission-gate.js';

export const HITL_DECISION_ALLOW = 'allow';
export const HITL_DECISION_REVIEW = 'review';
export const HITL_DECISION_DENY = 'deny';

function appendCheckpoint(checkpoints, checkpoint) {
  if (checkpoints.some((entry) => entry.id === checkpoint.id)) {
    return checkpoints;
  }
  checkpoints.push(checkpoint);
  return checkpoints;
}

function buildCheckpoint(id, label, reason) {
  return {
    id,
    label,
    reason,
  };
}

function mergeReasons(permissionReasons, checkpointReasons) {
  const merged = [...permissionReasons, ...checkpointReasons];
  return [...new Set(merged)];
}

export function evaluateHitlCheckpoints({
  action,
  role = 'main',
  targetPath,
  cwd = process.cwd(),
  memoryRoot = DEFAULT_MEMORY_ROOT,
  permission,
  explicitUserIntent = false,
  replacesRule = false,
  sensitive = false,
  externalSideEffect = false,
  phase,
  verificationStatus,
} = {}) {
  const resolvedPermission =
    permission ??
    evaluatePermissionGate({
      action,
      role,
      targetPath,
      cwd,
      memoryRoot,
      replacesRule,
      sensitive,
      externalSideEffect,
    });

  const checkpoints = [];

  if (resolvedPermission.decision === PERMISSION_DECISION_REVIEW && action === 'write' && role === 'worker') {
    appendCheckpoint(
      checkpoints,
      buildCheckpoint(
        'worker-outside-runtime',
        'Worker write outside runtime artifacts',
        'A worker is attempting to write outside the approved runtime artifact paths.'
      )
    );
  }

  if (replacesRule) {
    appendCheckpoint(
      checkpoints,
      buildCheckpoint(
        'rule-replacement',
        'Rule replacement',
        'Replacing an existing rule requires human confirmation.'
      )
    );
  }

  if (sensitive) {
    appendCheckpoint(
      checkpoints,
      buildCheckpoint(
        'sensitive-operation',
        'Sensitive operation',
        'Sensitive operations require human confirmation.'
      )
    );
  }

  if (externalSideEffect) {
    appendCheckpoint(
      checkpoints,
      buildCheckpoint(
        'external-side-effect',
        'External side effect',
        'External side effects require human confirmation.'
      )
    );
  }

  if (action === 'formal-memory-refresh' && phase != null && phase !== 'terminal') {
    appendCheckpoint(
      checkpoints,
      buildCheckpoint(
        'refresh-non-terminal',
        'Non-terminal refresh',
        'Formal memory refresh should normally wait until the terminal phase.'
      )
    );
  }

  if (
    action === 'formal-memory-refresh' &&
    verificationStatus != null &&
    verificationStatus !== 'verified'
  ) {
    appendCheckpoint(
      checkpoints,
      buildCheckpoint(
        'refresh-unverified',
        'Unverified refresh',
        'Formal memory refresh should normally wait until verification is complete.'
      )
    );
  }

  const checkpointReasons = checkpoints.map((checkpoint) => checkpoint.reason);
  let decision = HITL_DECISION_ALLOW;
  let satisfied = true;

  if (resolvedPermission.decision === PERMISSION_DECISION_DENY) {
    decision = HITL_DECISION_DENY;
    satisfied = false;
  } else if (checkpoints.length === 0) {
    decision = HITL_DECISION_ALLOW;
    satisfied = true;
  } else if (explicitUserIntent) {
    decision = HITL_DECISION_ALLOW;
    satisfied = true;
    checkpointReasons.push('Explicit user intent satisfies the required human review checkpoints.');
  } else {
    decision = HITL_DECISION_REVIEW;
    satisfied = false;
    checkpointReasons.push('Human review is required before continuing.');
  }

  return {
    action,
    role,
    targetPath,
    classification: resolvedPermission.classification,
    decision,
    allowed: decision === HITL_DECISION_ALLOW,
    requiresHuman: checkpoints.length > 0,
    satisfied,
    explicitUserIntent,
    checkpoints,
    reasons: mergeReasons(resolvedPermission.reasons, checkpointReasons),
    permission: resolvedPermission,
  };
}
