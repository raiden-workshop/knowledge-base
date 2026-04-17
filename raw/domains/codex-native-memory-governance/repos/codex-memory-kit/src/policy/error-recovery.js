import { FormalMemoryWriteError, RuntimeArtifactWriteError } from './path-guard.js';

export const RECOVERY_DECISION_COMPLETE = 'complete';
export const RECOVERY_DECISION_RETRY = 'retry';
export const RECOVERY_DECISION_FALLBACK = 'fallback';
export const RECOVERY_DECISION_ESCALATE = 'escalate';
export const RECOVERY_DECISION_HALT = 'halt';

const TRANSIENT_ERROR_CODES = new Set([
  'EAGAIN',
  'EBUSY',
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'ETIMEDOUT',
  'EAI_AGAIN',
]);

const PREREQUISITE_ERROR_CODES = new Set(['ENOENT', 'ENOTDIR']);
const INTERRUPT_SIGNALS = new Set(['SIGINT', 'SIGTERM']);

function normalizeFailureFromError(error) {
  if (!error) return null;

  const message = error.message ?? String(error);
  let category = 'unknown';

  if (error instanceof FormalMemoryWriteError || error instanceof RuntimeArtifactWriteError) {
    category = 'policy';
  } else if (TRANSIENT_ERROR_CODES.has(error.code)) {
    category = 'transient';
  } else if (PREREQUISITE_ERROR_CODES.has(error.code)) {
    category = 'prerequisite';
  } else if (/requires .+ payload|requires non-empty|invalid/i.test(message)) {
    category = 'validation';
  } else if (/forbidden|cannot trigger|requires explicit review|strict integration mode forbids/i.test(message)) {
    category = 'policy';
  }

  return {
    source: 'error',
    category,
    message,
    code: error.code ?? null,
    status: null,
    signal: error.signal ?? null,
    name: error.name ?? 'Error',
  };
}

function categorizeProcessStatus(status, signal, stderr = '') {
  if (signal && INTERRUPT_SIGNALS.has(signal)) {
    return 'interrupt';
  }

  if (status === 124) {
    return 'transient';
  }

  if (status === 126 || status === 127) {
    return 'prerequisite';
  }

  if (/timed out|timeout|temporar/i.test(stderr)) {
    return 'transient';
  }

  return 'unknown';
}

function normalizeFailureFromResult(result) {
  if (!result) return null;
  const status = typeof result.status === 'number' ? result.status : null;

  if (status == null || status === 0) {
    return null;
  }

  const stderr = result.stderr ? String(result.stderr) : '';
  return {
    source: 'result',
    category: categorizeProcessStatus(status, result.signal ?? null, stderr),
    message: stderr || `Operation exited with status ${status}.`,
    code: result.code ?? null,
    status,
    signal: result.signal ?? null,
    name: 'ProcessResultError',
  };
}

function normalizeFailure({ error, result } = {}) {
  return normalizeFailureFromError(error) ?? normalizeFailureFromResult(result);
}

function finalizeRecovery({
  operation,
  decision,
  reason,
  attempt,
  maxAttempts,
  failure,
  fallbackAvailable,
}) {
  return {
    operation,
    decision,
    complete: decision === RECOVERY_DECISION_COMPLETE,
    retryable: decision === RECOVERY_DECISION_RETRY,
    fallbackAvailable,
    attempt,
    maxAttempts,
    nextAttempt: decision === RECOVERY_DECISION_RETRY ? attempt + 1 : null,
    reason,
    failure,
  };
}

export function evaluateErrorRecovery({
  operation = 'operation',
  error,
  result,
  attempt = 1,
  maxAttempts = 2,
  fallbackAvailable = false,
} = {}) {
  const normalizedMaxAttempts = Math.max(1, Number(maxAttempts) || 1);
  const failure = normalizeFailure({ error, result });

  if (!failure) {
    return finalizeRecovery({
      operation,
      decision: RECOVERY_DECISION_COMPLETE,
      reason: 'No recovery action is required.',
      attempt,
      maxAttempts: normalizedMaxAttempts,
      failure: null,
      fallbackAvailable,
    });
  }

  if (failure.category === 'transient' && attempt < normalizedMaxAttempts) {
    return finalizeRecovery({
      operation,
      decision: RECOVERY_DECISION_RETRY,
      reason: 'Transient failure detected; retrying the operation.',
      attempt,
      maxAttempts: normalizedMaxAttempts,
      failure,
      fallbackAvailable,
    });
  }

  if ((failure.category === 'transient' || failure.category === 'prerequisite') && fallbackAvailable) {
    return finalizeRecovery({
      operation,
      decision: RECOVERY_DECISION_FALLBACK,
      reason: 'Primary execution failed; falling back to the secondary path.',
      attempt,
      maxAttempts: normalizedMaxAttempts,
      failure,
      fallbackAvailable,
    });
  }

  if (failure.category === 'policy') {
    return finalizeRecovery({
      operation,
      decision: RECOVERY_DECISION_ESCALATE,
      reason: 'Policy or boundary enforcement blocked the operation and requires review.',
      attempt,
      maxAttempts: normalizedMaxAttempts,
      failure,
      fallbackAvailable,
    });
  }

  if (failure.category === 'validation' || failure.category === 'interrupt') {
    return finalizeRecovery({
      operation,
      decision: RECOVERY_DECISION_HALT,
      reason: 'The operation cannot be retried automatically and should stop here.',
      attempt,
      maxAttempts: normalizedMaxAttempts,
      failure,
      fallbackAvailable,
    });
  }

  return finalizeRecovery({
    operation,
    decision: fallbackAvailable ? RECOVERY_DECISION_FALLBACK : RECOVERY_DECISION_ESCALATE,
    reason: fallbackAvailable
      ? 'Primary execution failed with an unknown error; using fallback.'
      : 'Primary execution failed with an unknown error and requires review.',
    attempt,
    maxAttempts: normalizedMaxAttempts,
    failure,
    fallbackAvailable,
  });
}
