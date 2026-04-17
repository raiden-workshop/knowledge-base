import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RECOVERY_DECISION_ESCALATE,
  RECOVERY_DECISION_FALLBACK,
  RECOVERY_DECISION_HALT,
  RECOVERY_DECISION_RETRY,
  evaluateErrorRecovery,
} from '../src/policy/error-recovery.js';
import { FormalMemoryWriteError } from '../src/policy/path-guard.js';

test('transient failures retry before the max attempt is exhausted', () => {
  const error = Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' });
  const result = evaluateErrorRecovery({
    operation: 'refresh',
    error,
    attempt: 1,
    maxAttempts: 2,
  });

  assert.equal(result.decision, RECOVERY_DECISION_RETRY);
  assert.equal(result.nextAttempt, 2);
  assert.equal(result.failure.category, 'transient');
});

test('fallback is selected when retry budget is exhausted and a fallback exists', () => {
  const result = evaluateErrorRecovery({
    operation: 'refresh',
    result: { status: 124, stderr: 'timed out' },
    attempt: 2,
    maxAttempts: 2,
    fallbackAvailable: true,
  });

  assert.equal(result.decision, RECOVERY_DECISION_FALLBACK);
  assert.equal(result.failure.category, 'transient');
});

test('policy and validation failures do not auto-retry', () => {
  const policy = evaluateErrorRecovery({
    operation: 'write',
    error: new FormalMemoryWriteError('Blocked by policy.'),
    attempt: 1,
    maxAttempts: 3,
  });
  assert.equal(policy.decision, RECOVERY_DECISION_ESCALATE);

  const validation = evaluateErrorRecovery({
    operation: 'write',
    error: new Error('project_memory_add_note requires non-empty note content.'),
    attempt: 1,
    maxAttempts: 3,
  });
  assert.equal(validation.decision, RECOVERY_DECISION_HALT);
});
