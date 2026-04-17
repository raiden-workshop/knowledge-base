import test from 'node:test';
import assert from 'node:assert/strict';

import {
  stateClear,
  stateGetStatus,
  stateListActive,
  stateRead,
  stateWrite,
} from '../src/runtime/state-store.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('stateWrite/stateRead/stateGetStatus round-trip state objects', () => {
  const fixture = createWorkspaceFixture();

  const written = stateWrite({
    role: 'worker',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    name: 'plan',
    data: { step: 1, status: 'active' },
  });
  assert.equal(written.active, true);

  const read = stateRead({
    cwd: fixture.workspaceRoot,
    name: 'plan',
  });
  assert.equal(read.exists, true);
  assert.equal(read.data.step, 1);

  const status = stateGetStatus({
    cwd: fixture.workspaceRoot,
    name: 'plan',
  });
  assert.deepEqual(status.keys, ['status', 'step']);
});

test('stateListActive and stateClear manage state lifecycle', () => {
  const fixture = createWorkspaceFixture();

  stateWrite({
    role: 'worker',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    name: 'alpha',
    data: { mode: 'a' },
  });
  stateWrite({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    name: 'beta',
    data: { mode: 'b' },
  });

  const listed = stateListActive({
    cwd: fixture.workspaceRoot,
  });
  assert.deepEqual(listed.states, ['alpha', 'beta', 'ralph']);

  const cleared = stateClear({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    name: 'alpha',
  });
  assert.equal(cleared.removed, true);

  const after = stateListActive({
    cwd: fixture.workspaceRoot,
  });
  assert.deepEqual(after.states, ['beta', 'ralph']);
});

test('workers cannot modify reserved verification state through raw state tools', () => {
  const fixture = createWorkspaceFixture();

  assert.throws(
    () =>
      stateWrite({
        role: 'worker',
        cwd: fixture.workspaceRoot,
        memoryRoot: fixture.memoryRoot,
        name: 'verification',
        data: { status: 'verified' },
      }),
    /reserved verification state/i
  );

  assert.throws(
    () =>
      stateClear({
        role: 'worker',
        cwd: fixture.workspaceRoot,
        memoryRoot: fixture.memoryRoot,
        name: 'verification',
      }),
    /reserved verification state/i
  );
});
