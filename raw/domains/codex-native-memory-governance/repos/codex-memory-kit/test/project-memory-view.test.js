import test from 'node:test';
import assert from 'node:assert/strict';

import { readProjectMemoryView } from '../src/integration/project-memory-view.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('strict mode project memory view ignores local .omx/project-memory.json', () => {
  const fixture = createWorkspaceFixture();

  const view = readProjectMemoryView({
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: true,
  });

  assert.equal(view.mode, 'strict-formal-memory');
  assert.equal(view.source, 'formal-memory');
  assert.ok(view.text.includes('Current task context'));
  assert.ok(view.text.includes('Workspace memory'));
  assert.ok(!view.text.includes('should'));
  assert.equal(view.localProjectMemory.exists, true);
  assert.equal(view.diagnostics.at(-1)?.kind, 'local-project-memory-ignored');
});

test('non-strict mode project memory view can read local .omx/project-memory.json', () => {
  const fixture = createWorkspaceFixture();

  const view = readProjectMemoryView({
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: false,
  });

  assert.equal(view.mode, 'local-project-memory');
  assert.equal(view.source, 'local-project-memory');
  assert.ok(view.text.includes('"should": "be ignored"'));
});
