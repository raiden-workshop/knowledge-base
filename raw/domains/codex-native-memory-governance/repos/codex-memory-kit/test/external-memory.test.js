import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  buildFormalMemorySummary,
  readFormalMemoryContext,
} from '../src/integration/external-memory.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('readFormalMemoryContext falls back cleanly when the workspace index is missing', () => {
  const fixture = createWorkspaceFixture();
  fs.rmSync(path.join(fixture.memoryRoot, 'workspaces', 'index.json'));

  const context = readFormalMemoryContext({
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
  });

  assert.equal(context.workspace, null);
  assert.equal(context.repoGuide, null);
  assert.equal(context.memoryIndex, null);
  assert.equal(context.activeContext, null);
  assert.equal(context.sharedGuides.length, 3);
  assert.equal(context.diagnostics[0]?.kind, 'workspace-memory-unavailable');
});

test('buildFormalMemorySummary still returns shared guides during fallback', () => {
  const fixture = createWorkspaceFixture();
  fs.rmSync(path.join(fixture.memoryRoot, 'workspaces', 'index.json'));

  const summary = buildFormalMemorySummary(
    readFormalMemoryContext({
      cwd: fixture.workspaceRoot,
      memoryRoot: fixture.memoryRoot,
    })
  );

  assert.equal(summary.workspace, null);
  assert.deepEqual(
    summary.sections.map((section) => section.source),
    ['shared-guide:company', 'shared-guide:user', 'shared-guide:local']
  );
  assert.ok(summary.text.includes('Company rules'));
  assert.ok(summary.text.includes('User rules'));
  assert.ok(summary.text.includes('Local rules'));
});
