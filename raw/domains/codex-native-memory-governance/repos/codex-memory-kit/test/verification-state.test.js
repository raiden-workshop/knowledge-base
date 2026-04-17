import test from 'node:test';
import assert from 'node:assert/strict';

import {
  VERIFICATION_STATUS_PENDING,
  VERIFICATION_STATUS_VERIFIED,
  appendVerificationEvidence,
  markVerified,
  readVerificationState,
  resolveVerificationStatus,
} from '../src/runtime/verification-state.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('verification state defaults to pending when no artifact exists', () => {
  const fixture = createWorkspaceFixture();

  const state = readVerificationState({
    cwd: fixture.workspaceRoot,
  });

  assert.equal(state.exists, false);
  assert.equal(state.status, VERIFICATION_STATUS_PENDING);
  assert.deepEqual(state.evidence, []);
});

test('workers can append evidence but only leader can mark verified', () => {
  const fixture = createWorkspaceFixture();

  const appended = appendVerificationEvidence({
    role: 'worker',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    summary: '91/91 passed',
    kind: 'test',
    command: 'npm test',
    createdAt: '2026-04-04T12:00:00Z',
  });
  assert.equal(appended.exists, true);
  assert.equal(appended.evidence.length, 1);
  assert.equal(appended.evidence[0].observed_by, 'worker');

  assert.throws(
    () =>
      markVerified({
        role: 'worker',
        cwd: fixture.workspaceRoot,
        memoryRoot: fixture.memoryRoot,
        scope: ['tests'],
        commands: ['npm test'],
      }),
    /cannot mark verification as verified/i
  );

  const verified = markVerified({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    scope: ['tests'],
    commands: ['npm test'],
    notes: 'No blocking findings.',
    verifiedAt: '2026-04-04T12:05:00Z',
  });
  assert.equal(verified.status, VERIFICATION_STATUS_VERIFIED);
  assert.equal(verified.verified_by, 'leader');
  assert.equal(verified.verified_at, '2026-04-04T12:05:00Z');
  assert.equal(verified.evidence.length, 1);
});

test('resolveVerificationStatus prefers the artifact over a caller-supplied parameter', () => {
  const fixture = createWorkspaceFixture();

  markVerified({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    scope: ['tests'],
    commands: ['npm test'],
  });

  const resolved = resolveVerificationStatus({
    cwd: fixture.workspaceRoot,
    verificationStatus: 'pending',
  });

  assert.equal(resolved.status, VERIFICATION_STATUS_VERIFIED);
  assert.equal(resolved.source, 'artifact');
});
