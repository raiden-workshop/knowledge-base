import { DEFAULT_MEMORY_ROOT } from '../constants.js';
import { classifyArtifactPath } from './path-guard.js';
import { canTriggerFormalMemoryRefresh } from '../team/team-contract.js';

export const PERMISSION_DECISION_ALLOW = 'allow';
export const PERMISSION_DECISION_REVIEW = 'review';
export const PERMISSION_DECISION_DENY = 'deny';

function escalate(current, next) {
  const order = {
    [PERMISSION_DECISION_ALLOW]: 0,
    [PERMISSION_DECISION_REVIEW]: 1,
    [PERMISSION_DECISION_DENY]: 2,
  };

  return order[next] > order[current] ? next : current;
}

export function evaluatePermissionGate({
  action,
  role = 'main',
  targetPath,
  cwd = process.cwd(),
  memoryRoot = DEFAULT_MEMORY_ROOT,
  replacesRule = false,
  sensitive = false,
  externalSideEffect = false,
} = {}) {
  let decision = PERMISSION_DECISION_ALLOW;
  const reasons = [];
  const classification = targetPath
    ? classifyArtifactPath(targetPath, { cwd, memoryRoot })
    : null;

  if (action === 'formal-memory-refresh') {
    if (!canTriggerFormalMemoryRefresh(role)) {
      return {
        decision: PERMISSION_DECISION_DENY,
        allowed: false,
        reasons: [`Role "${role}" cannot trigger formal memory refresh.`],
        action,
        role,
        targetPath,
        classification,
      };
    }

    reasons.push('Formal memory refresh is allowed for this role.');
  }

  if (action === 'write' && classification === 'formal-memory') {
    return {
      decision: PERMISSION_DECISION_DENY,
      allowed: false,
      reasons: ['Direct writes to formal memory are forbidden.'],
      action,
      role,
      targetPath,
      classification,
    };
  }

  if (action === 'write' && role === 'worker' && classification === 'other') {
    decision = escalate(decision, PERMISSION_DECISION_REVIEW);
    reasons.push('Workers writing outside runtime artifacts require explicit review.');
  }

  if (replacesRule) {
    decision = escalate(decision, PERMISSION_DECISION_REVIEW);
    reasons.push('Rule replacement requires human review.');
  }

  if (sensitive) {
    decision = escalate(decision, PERMISSION_DECISION_REVIEW);
    reasons.push('Sensitive operations require human review.');
  }

  if (externalSideEffect) {
    decision = escalate(decision, PERMISSION_DECISION_REVIEW);
    reasons.push('External side effects require human review.');
  }

  if (classification === 'worker-run') {
    reasons.push('Runtime artifact write is allowed.');
  } else if (classification === 'telemetry') {
    reasons.push('Telemetry write is allowed but remains excluded from formal memory.');
  } else if (classification === 'other' && action === 'write' && decision === PERMISSION_DECISION_ALLOW) {
    reasons.push('Write path is outside formal memory.');
  }

  if (reasons.length === 0) {
    reasons.push('No policy escalation required.');
  }

  return {
    decision,
    allowed: decision === PERMISSION_DECISION_ALLOW,
    reasons,
    action,
    role,
    targetPath,
    classification,
  };
}
