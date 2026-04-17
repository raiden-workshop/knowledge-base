import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import {
  FormalMemoryWriteError,
  classifyArtifactPath,
  guardWritePath,
} from '../src/policy/path-guard.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('guardWritePath rejects formal memory writes', () => {
  const fixture = createWorkspaceFixture();
  const formalMemoryPath = path.join(
    fixture.workspaceMemoryHome,
    'memories',
    'project',
    'truth.md'
  );

  assert.throws(
    () =>
      guardWritePath(formalMemoryPath, {
        cwd: fixture.workspaceRoot,
        memoryRoot: fixture.memoryRoot,
      }),
    FormalMemoryWriteError
  );
});

test('classifyArtifactPath distinguishes worker-run, telemetry, and other paths', () => {
  const fixture = createWorkspaceFixture();

  assert.equal(
    classifyArtifactPath(path.join(fixture.workspaceRoot, '.omx', 'state', 'ralph-state.json'), {
      cwd: fixture.workspaceRoot,
      memoryRoot: fixture.memoryRoot,
    }),
    'worker-run'
  );

  assert.equal(
    classifyArtifactPath(path.join(fixture.workspaceRoot, '.omx', 'logs', 'events.jsonl'), {
      cwd: fixture.workspaceRoot,
      memoryRoot: fixture.memoryRoot,
    }),
    'telemetry'
  );

  assert.equal(
    classifyArtifactPath(path.join(fixture.workspaceRoot, 'src', 'app.js'), {
      cwd: fixture.workspaceRoot,
      memoryRoot: fixture.memoryRoot,
    }),
    'other'
  );
});
