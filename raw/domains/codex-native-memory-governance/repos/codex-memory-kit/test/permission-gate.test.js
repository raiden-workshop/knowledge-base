import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import {
  PERMISSION_DECISION_ALLOW,
  PERMISSION_DECISION_DENY,
  PERMISSION_DECISION_REVIEW,
  evaluatePermissionGate,
} from '../src/policy/permission-gate.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('formal memory writes are denied', () => {
  const fixture = createWorkspaceFixture();
  const result = evaluatePermissionGate({
    action: 'write',
    role: 'worker',
    targetPath: path.join(fixture.workspaceMemoryHome, 'memories', 'project', 'truth.md'),
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
  });

  assert.equal(result.decision, PERMISSION_DECISION_DENY);
  assert.equal(result.allowed, false);
});

test('worker writes outside runtime artifacts require review', () => {
  const fixture = createWorkspaceFixture();
  const result = evaluatePermissionGate({
    action: 'write',
    role: 'worker',
    targetPath: path.join(fixture.workspaceRoot, 'src', 'feature.js'),
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
  });

  assert.equal(result.decision, PERMISSION_DECISION_REVIEW);
});

test('external side effects and rule replacements escalate to review', () => {
  const fixture = createWorkspaceFixture();
  const result = evaluatePermissionGate({
    action: 'write',
    role: 'leader',
    targetPath: path.join(fixture.workspaceRoot, '.omx', 'plans', 'plan.md'),
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    replacesRule: true,
    externalSideEffect: true,
  });

  assert.equal(result.decision, PERMISSION_DECISION_REVIEW);
  assert.match(result.reasons.join(' '), /review/i);
});

test('leader can trigger formal memory refresh but worker cannot', () => {
  const fixture = createWorkspaceFixture();

  const allowed = evaluatePermissionGate({
    action: 'formal-memory-refresh',
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
  });
  assert.equal(allowed.decision, PERMISSION_DECISION_ALLOW);

  const denied = evaluatePermissionGate({
    action: 'formal-memory-refresh',
    role: 'worker',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
  });
  assert.equal(denied.decision, PERMISSION_DECISION_DENY);
});
