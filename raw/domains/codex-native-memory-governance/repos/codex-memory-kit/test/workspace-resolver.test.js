import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { resolveWorkspaceNode } from '../src/integration/workspace-resolver.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('resolveWorkspaceNode finds the registered workspace for nested cwd', () => {
  const fixture = createWorkspaceFixture();
  const nestedCwd = path.join(fixture.workspaceRoot, 'src', 'components');

  const resolved = resolveWorkspaceNode({
    cwd: nestedCwd,
    memoryRoot: fixture.memoryRoot,
  });

  assert.equal(resolved.key, fixture.workspaceKey);
  assert.equal(resolved.workspaceRoot, fixture.workspaceRoot);
  assert.equal(resolved.memoryHome, fixture.workspaceMemoryHome);
  assert.match(resolved.repoGuidePath, /instructions\/repo\/GUIDE\.md$/);
});

test('resolveWorkspaceNode returns null when the workspace is not registered', () => {
  const fixture = createWorkspaceFixture();

  const resolved = resolveWorkspaceNode({
    cwd: '/tmp/unregistered-workspace',
    memoryRoot: fixture.memoryRoot,
  });

  assert.equal(resolved, null);
});

test('resolveWorkspaceNode returns null when the workspace index is missing', () => {
  const fixture = createWorkspaceFixture();
  fs.rmSync(path.join(fixture.memoryRoot, 'workspaces', 'index.json'));

  const resolved = resolveWorkspaceNode({
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
  });

  assert.equal(resolved, null);
});
