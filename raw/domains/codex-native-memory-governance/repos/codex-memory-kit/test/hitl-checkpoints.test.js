import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import {
  HITL_DECISION_ALLOW,
  HITL_DECISION_DENY,
  HITL_DECISION_REVIEW,
  evaluateHitlCheckpoints,
} from '../src/policy/hitl-checkpoints.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('high-risk writes require HITL review until explicit user intent is present', () => {
  const fixture = createWorkspaceFixture();
  const targetPath = path.join(fixture.workspaceRoot, '.omx', 'plans', 'plan.md');

  const review = evaluateHitlCheckpoints({
    action: 'write',
    role: 'leader',
    targetPath,
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    replacesRule: true,
    externalSideEffect: true,
  });

  assert.equal(review.decision, HITL_DECISION_REVIEW);
  assert.equal(review.requiresHuman, true);
  assert.deepEqual(
    review.checkpoints.map((checkpoint) => checkpoint.id).sort(),
    ['external-side-effect', 'rule-replacement']
  );

  const allowed = evaluateHitlCheckpoints({
    action: 'write',
    role: 'leader',
    targetPath,
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    replacesRule: true,
    externalSideEffect: true,
    explicitUserIntent: true,
  });

  assert.equal(allowed.decision, HITL_DECISION_ALLOW);
  assert.equal(allowed.satisfied, true);
});

test('refresh preconditions become HITL checkpoints when verification or phase is incomplete', () => {
  const fixture = createWorkspaceFixture();

  const result = evaluateHitlCheckpoints({
    action: 'formal-memory-refresh',
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    phase: 'active',
    verificationStatus: 'pending',
  });

  assert.equal(result.decision, HITL_DECISION_REVIEW);
  assert.deepEqual(
    result.checkpoints.map((checkpoint) => checkpoint.id).sort(),
    ['refresh-non-terminal', 'refresh-unverified']
  );
});

test('permission denial remains denied even before HITL satisfaction is considered', () => {
  const fixture = createWorkspaceFixture();
  const targetPath = path.join(fixture.workspaceMemoryHome, 'memories', 'project', 'truth.md');

  const result = evaluateHitlCheckpoints({
    action: 'write',
    role: 'worker',
    targetPath,
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
  });

  assert.equal(result.decision, HITL_DECISION_DENY);
  assert.equal(result.allowed, false);
});
