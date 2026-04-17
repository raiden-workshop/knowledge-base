import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REFRESH_DECISION_ALLOW,
  REFRESH_DECISION_DENY,
  REFRESH_DECISION_REVIEW,
  buildRefreshCommand,
  evaluateRefreshTrigger,
  triggerFormalMemoryRefresh,
} from '../src/runtime/leader-refresh-trigger.js';
import { markVerificationPending, markVerified } from '../src/runtime/verification-state.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('buildRefreshCommand targets the shared refresh script', () => {
  const fixture = createWorkspaceFixture();
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  assert.deepEqual(buildRefreshCommand({ workspaceRoot: fixture.workspaceRoot }), [
    'python3',
    path.join(codexHome, 'scripts', 'refresh_memory.py'),
    '--workspace-root',
    fixture.workspaceRoot,
  ]);
});

test('leader terminal verified refresh is allowed, worker is denied', () => {
  const fixture = createWorkspaceFixture();

  const allowed = evaluateRefreshTrigger({
    role: 'leader',
    workspaceRoot: fixture.workspaceRoot,
    phase: 'terminal',
    verificationStatus: 'verified',
    memoryRoot: fixture.memoryRoot,
  });
  assert.equal(allowed.decision, REFRESH_DECISION_ALLOW);
  assert.equal(allowed.allowed, true);

  const denied = evaluateRefreshTrigger({
    role: 'worker',
    workspaceRoot: fixture.workspaceRoot,
    phase: 'terminal',
    verificationStatus: 'verified',
    memoryRoot: fixture.memoryRoot,
  });
  assert.equal(denied.decision, REFRESH_DECISION_DENY);
  assert.equal(denied.allowed, false);
});

test('refresh outside terminal or before verification requires review unless explicitly requested', () => {
  const fixture = createWorkspaceFixture();

  const early = evaluateRefreshTrigger({
    role: 'leader',
    workspaceRoot: fixture.workspaceRoot,
    phase: 'active',
    verificationStatus: 'verified',
    memoryRoot: fixture.memoryRoot,
  });
  assert.equal(early.decision, REFRESH_DECISION_REVIEW);

  const unverified = evaluateRefreshTrigger({
    role: 'leader',
    workspaceRoot: fixture.workspaceRoot,
    phase: 'terminal',
    verificationStatus: 'pending',
    memoryRoot: fixture.memoryRoot,
  });
  assert.equal(unverified.decision, REFRESH_DECISION_REVIEW);

  const explicit = evaluateRefreshTrigger({
    role: 'leader',
    workspaceRoot: fixture.workspaceRoot,
    phase: 'active',
    verificationStatus: 'pending',
    explicitUserIntent: true,
    memoryRoot: fixture.memoryRoot,
  });
  assert.equal(explicit.decision, REFRESH_DECISION_ALLOW);
});

test('refresh evaluation prefers verification artifact status over the caller parameter', () => {
  const fixture = createWorkspaceFixture();

  markVerificationPending({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    notes: 'Verification still pending.',
  });

  const pending = evaluateRefreshTrigger({
    role: 'leader',
    workspaceRoot: fixture.workspaceRoot,
    phase: 'terminal',
    verificationStatus: 'verified',
    memoryRoot: fixture.memoryRoot,
  });
  assert.equal(pending.decision, REFRESH_DECISION_REVIEW);
  assert.equal(pending.verification.source, 'artifact');
  assert.equal(pending.verification.status, 'pending');

  markVerified({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    scope: ['tests'],
    commands: ['npm test'],
  });

  const verified = evaluateRefreshTrigger({
    role: 'leader',
    workspaceRoot: fixture.workspaceRoot,
    phase: 'terminal',
    verificationStatus: 'pending',
    memoryRoot: fixture.memoryRoot,
  });
  assert.equal(verified.decision, REFRESH_DECISION_ALLOW);
  assert.equal(verified.verification.source, 'artifact');
  assert.equal(verified.verification.status, 'verified');
});

test('triggerFormalMemoryRefresh executes via the injected runner only when allowed', () => {
  const fixture = createWorkspaceFixture();
  const calls = [];

  const success = triggerFormalMemoryRefresh({
    role: 'leader',
    workspaceRoot: fixture.workspaceRoot,
    phase: 'terminal',
    verificationStatus: 'verified',
    memoryRoot: fixture.memoryRoot,
    runner(command) {
      calls.push(command);
      return { status: 0, stdout: 'ok', stderr: '' };
    },
  });

  assert.equal(success.executed, true);
  assert.equal(success.success, true);
  assert.equal(calls.length, 1);

  const blocked = triggerFormalMemoryRefresh({
    role: 'worker',
    workspaceRoot: fixture.workspaceRoot,
    phase: 'terminal',
    verificationStatus: 'verified',
    memoryRoot: fixture.memoryRoot,
    runner(command) {
      calls.push(command);
      return { status: 0 };
    },
  });

  assert.equal(blocked.executed, false);
  assert.equal(calls.length, 1);
});

test('triggerFormalMemoryRefresh retries transient runner failures before succeeding', () => {
  const fixture = createWorkspaceFixture();
  let calls = 0;

  const result = triggerFormalMemoryRefresh({
    role: 'leader',
    workspaceRoot: fixture.workspaceRoot,
    phase: 'terminal',
    verificationStatus: 'verified',
    memoryRoot: fixture.memoryRoot,
    maxAttempts: 2,
    runner() {
      calls += 1;
      if (calls === 1) {
        throw Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' });
      }
      return { status: 0, stdout: 'ok', stderr: '' };
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.executed, true);
  assert.equal(calls, 2);
  assert.equal(result.attempts.length, 2);
  assert.equal(result.recovery.complete, true);
});
