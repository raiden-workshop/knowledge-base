import { DEFAULT_MEMORY_ROOT } from '../constants.js';
import { evaluatePermissionGate, PERMISSION_DECISION_DENY } from '../policy/permission-gate.js';
import { evaluateHitlCheckpoints, HITL_DECISION_ALLOW } from '../policy/hitl-checkpoints.js';
import {
  evaluateErrorRecovery,
  RECOVERY_DECISION_COMPLETE,
  RECOVERY_DECISION_FALLBACK,
  RECOVERY_DECISION_RETRY,
} from '../policy/error-recovery.js';

function defaultSuccessEvaluator(result) {
  if (result && typeof result.status === 'number') {
    return result.status === 0;
  }
  return true;
}

function finalizeBlocked(operation, permission, hitl) {
  return {
    operation,
    status: 'blocked',
    permitted: false,
    executed: false,
    success: false,
    permission,
    hitl,
    attempts: [],
    recovery: null,
    result: null,
    error: null,
    usedFallback: false,
  };
}

export function runGuardedAction({
  operation = 'operation',
  action = 'write',
  role = 'main',
  cwd = process.cwd(),
  memoryRoot = DEFAULT_MEMORY_ROOT,
  targetPath,
  explicitUserIntent = false,
  replacesRule = false,
  sensitive = false,
  externalSideEffect = false,
  phase,
  verificationStatus,
  maxAttempts = 2,
  perform,
  fallback,
  isSuccessfulResult = defaultSuccessEvaluator,
  permission,
  hitl,
} = {}) {
  if (typeof perform !== 'function') {
    throw new Error('runGuardedAction requires a perform function.');
  }

  const normalizedMaxAttempts = Math.max(1, Number(maxAttempts) || 1);
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
  const resolvedHitl =
    hitl ??
    evaluateHitlCheckpoints({
      action,
      role,
      targetPath,
      cwd,
      memoryRoot,
      permission: resolvedPermission,
      explicitUserIntent,
      replacesRule,
      sensitive,
      externalSideEffect,
      phase,
      verificationStatus,
    });

  if (resolvedPermission.decision === PERMISSION_DECISION_DENY || resolvedHitl.decision !== HITL_DECISION_ALLOW) {
    return finalizeBlocked(operation, resolvedPermission, resolvedHitl);
  }

  const attempts = [];
  for (let attempt = 1; attempt <= normalizedMaxAttempts; attempt += 1) {
    try {
      const result = perform({
        attempt,
        operation,
        permission: resolvedPermission,
        hitl: resolvedHitl,
      });

      if (isSuccessfulResult(result)) {
        return {
          operation,
          status: 'success',
          permitted: true,
          executed: true,
          success: true,
          permission: resolvedPermission,
          hitl: resolvedHitl,
          attempts: [...attempts, { attempt, outcome: 'success' }],
          recovery: evaluateErrorRecovery({
            operation,
            attempt,
            maxAttempts: normalizedMaxAttempts,
          }),
          result,
          error: null,
          usedFallback: false,
        };
      }

      const recovery = evaluateErrorRecovery({
        operation,
        result,
        attempt,
        maxAttempts: normalizedMaxAttempts,
        fallbackAvailable: typeof fallback === 'function',
      });
      attempts.push({
        attempt,
        outcome: 'failure',
        recovery: recovery.decision,
        failure: recovery.failure,
      });

      if (recovery.decision === RECOVERY_DECISION_RETRY) {
        continue;
      }

      if (recovery.decision === RECOVERY_DECISION_FALLBACK) {
        const fallbackResult = fallback({
          attempt,
          operation,
          permission: resolvedPermission,
          hitl: resolvedHitl,
          recovery,
          result,
          error: null,
        });
        const fallbackSuccess = isSuccessfulResult(fallbackResult);
        return {
          operation,
          status: fallbackSuccess ? 'fallback' : 'failed',
          permitted: true,
          executed: true,
          success: fallbackSuccess,
          permission: resolvedPermission,
          hitl: resolvedHitl,
          attempts,
          recovery,
          result: fallbackResult,
          error: null,
          usedFallback: true,
        };
      }

      return {
        operation,
        status: 'failed',
        permitted: true,
        executed: true,
        success: false,
        permission: resolvedPermission,
        hitl: resolvedHitl,
        attempts,
        recovery,
        result,
        error: null,
        usedFallback: false,
      };
    } catch (error) {
      const recovery = evaluateErrorRecovery({
        operation,
        error,
        attempt,
        maxAttempts: normalizedMaxAttempts,
        fallbackAvailable: typeof fallback === 'function',
      });
      attempts.push({
        attempt,
        outcome: 'exception',
        recovery: recovery.decision,
        failure: recovery.failure,
      });

      if (recovery.decision === RECOVERY_DECISION_RETRY) {
        continue;
      }

      if (recovery.decision === RECOVERY_DECISION_FALLBACK) {
        const fallbackResult = fallback({
          attempt,
          operation,
          permission: resolvedPermission,
          hitl: resolvedHitl,
          recovery,
          result: null,
          error,
        });
        const fallbackSuccess = isSuccessfulResult(fallbackResult);
        return {
          operation,
          status: fallbackSuccess ? 'fallback' : 'failed',
          permitted: true,
          executed: true,
          success: fallbackSuccess,
          permission: resolvedPermission,
          hitl: resolvedHitl,
          attempts,
          recovery,
          result: fallbackResult,
          error,
          usedFallback: true,
        };
      }

      return {
        operation,
        status: 'failed',
        permitted: true,
        executed: true,
        success: false,
        permission: resolvedPermission,
        hitl: resolvedHitl,
        attempts,
        recovery,
        result: null,
        error,
        usedFallback: false,
      };
    }
  }

  return {
    operation,
    status: 'failed',
    permitted: true,
    executed: true,
    success: false,
    permission: resolvedPermission,
    hitl: resolvedHitl,
    attempts,
    recovery: {
      operation,
      decision: RECOVERY_DECISION_COMPLETE,
      complete: false,
      retryable: false,
      fallbackAvailable: typeof fallback === 'function',
      attempt: normalizedMaxAttempts,
      maxAttempts: normalizedMaxAttempts,
      nextAttempt: null,
      reason: 'Execution exhausted all attempts without a terminal recovery decision.',
      failure: null,
    },
    result: null,
    error: null,
    usedFallback: false,
  };
}
