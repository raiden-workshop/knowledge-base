import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { runGuardedAction } from '../src/runtime/guarded-action-runner.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('guarded actions stop at HITL checkpoints until explicit user intent is provided', () => {
  const fixture = createWorkspaceFixture();
  const targetPath = path.join(fixture.workspaceRoot, '.omx', 'plans', 'plan.md');

  const blocked = runGuardedAction({
    operation: 'rule-sync',
    action: 'write',
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    targetPath,
    replacesRule: true,
    perform() {
      return { status: 0 };
    },
    isSuccessfulResult(result) {
      return result.status === 0;
    },
  });

  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.executed, false);

  const allowed = runGuardedAction({
    operation: 'rule-sync',
    action: 'write',
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    targetPath,
    replacesRule: true,
    explicitUserIntent: true,
    perform() {
      return { status: 0 };
    },
    isSuccessfulResult(result) {
      return result.status === 0;
    },
  });

  assert.equal(allowed.status, 'success');
  assert.equal(allowed.success, true);
  assert.equal(allowed.hitl.satisfied, true);
});

test('guarded actions retry transient failures and then succeed', () => {
  const fixture = createWorkspaceFixture();
  const targetPath = path.join(fixture.workspaceRoot, '.omx', 'plans', 'plan.md');
  let calls = 0;

  const result = runGuardedAction({
    operation: 'refresh-plan',
    action: 'write',
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    targetPath,
    perform() {
      calls += 1;
      if (calls === 1) {
        throw Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' });
      }
      return { status: 0 };
    },
    isSuccessfulResult(outcome) {
      return outcome.status === 0;
    },
    maxAttempts: 2,
  });

  assert.equal(result.status, 'success');
  assert.equal(result.success, true);
  assert.equal(calls, 2);
  assert.equal(result.attempts.length, 2);
  assert.equal(result.attempts[0].recovery, 'retry');
});

test('guarded actions can fall back after a prerequisite failure', () => {
  const fixture = createWorkspaceFixture();
  let fallbackCalled = 0;

  const result = runGuardedAction({
    operation: 'external-read',
    action: 'read',
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    perform() {
      throw Object.assign(new Error('missing binary'), { code: 'ENOENT' });
    },
    fallback() {
      fallbackCalled += 1;
      return { status: 0, source: 'fallback' };
    },
    isSuccessfulResult(outcome) {
      return outcome.status === 0;
    },
  });

  assert.equal(result.status, 'fallback');
  assert.equal(result.success, true);
  assert.equal(result.usedFallback, true);
  assert.equal(fallbackCalled, 1);
});
