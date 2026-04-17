import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import {
  TEAM_ROLE_LEADER,
  TEAM_ROLE_MAIN,
  TEAM_ROLE_WORKER,
  assertFormalMemoryRefreshAuthority,
  assertTeamWriteAccess,
  canTriggerFormalMemoryRefresh,
} from '../src/team/team-contract.js';
import {
  FormalMemoryWriteError,
  RuntimeArtifactWriteError,
} from '../src/policy/path-guard.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('only leader and main execution owner can trigger formal memory refresh', () => {
  assert.equal(canTriggerFormalMemoryRefresh(TEAM_ROLE_LEADER), true);
  assert.equal(canTriggerFormalMemoryRefresh(TEAM_ROLE_MAIN), true);
  assert.equal(canTriggerFormalMemoryRefresh(TEAM_ROLE_WORKER), false);

  assert.doesNotThrow(() => assertFormalMemoryRefreshAuthority(TEAM_ROLE_LEADER));
  assert.throws(() => assertFormalMemoryRefreshAuthority(TEAM_ROLE_WORKER), /cannot trigger formal memory refresh/i);
});

test('team write access still blocks formal memory writes', () => {
  const fixture = createWorkspaceFixture();
  const forbiddenPath = path.join(
    fixture.workspaceMemoryHome,
    'memories',
    'feedback',
    'rule.md'
  );

  assert.throws(
    () =>
      assertTeamWriteAccess({
        role: TEAM_ROLE_WORKER,
        targetPath: forbiddenPath,
        cwd: fixture.workspaceRoot,
        memoryRoot: fixture.memoryRoot,
      }),
    FormalMemoryWriteError
  );

  const allowed = assertTeamWriteAccess({
    role: TEAM_ROLE_WORKER,
    targetPath: path.join(fixture.workspaceRoot, '.omx', 'context', 'task.md'),
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
  });

  assert.equal(allowed.allowed, true);
  assert.equal(allowed.classification, 'worker-run');
});

test('team workers cannot write arbitrary non-runtime paths', () => {
  const fixture = createWorkspaceFixture();

  assert.throws(
    () =>
      assertTeamWriteAccess({
        role: TEAM_ROLE_WORKER,
        targetPath: path.join(fixture.workspaceRoot, 'src', 'feature.js'),
        cwd: fixture.workspaceRoot,
        memoryRoot: fixture.memoryRoot,
      }),
    RuntimeArtifactWriteError
  );

  assert.doesNotThrow(() =>
    assertTeamWriteAccess({
      role: TEAM_ROLE_LEADER,
      targetPath: path.join(fixture.workspaceRoot, 'src', 'feature.js'),
      cwd: fixture.workspaceRoot,
      memoryRoot: fixture.memoryRoot,
    })
  );
});
