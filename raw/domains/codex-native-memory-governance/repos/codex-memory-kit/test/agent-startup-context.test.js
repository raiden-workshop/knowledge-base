import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAgentStartupContext } from '../src/runtime/agent-startup-context.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('strict startup context uses formal overlay text and blocks legacy primary memory sources', () => {
  const fixture = createWorkspaceFixture();

  const startup = buildAgentStartupContext({
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: true,
    role: 'worker',
  });

  assert.equal(startup.config.strictMode, true);
  assert.equal(startup.projectMemoryView.mode, 'strict-formal-memory');
  assert.ok(startup.text.includes('Current task context'));
  assert.ok(startup.text.includes('Workspace memory'));
  assert.ok(!startup.text.includes('"should": "be ignored"'));

  const localProjectMemoryPolicy = startup.legacySourcePolicy.find(
    (entry) => entry.sourceType === 'local-project-memory'
  );
  const notepadPolicy = startup.legacySourcePolicy.find(
    (entry) => entry.sourceType === 'notepad'
  );

  assert.equal(localProjectMemoryPolicy.decision, 'block');
  assert.equal(notepadPolicy.decision, 'supplement');
  assert.ok(
    startup.diagnostics.some((entry) => entry.kind === 'legacy-memory-source-blocked')
  );
});

test('non-strict startup context still exposes local project memory view', () => {
  const fixture = createWorkspaceFixture();

  const startup = buildAgentStartupContext({
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: false,
    role: 'main',
  });

  assert.equal(startup.projectMemoryView.mode, 'local-project-memory');
  assert.ok(startup.projectMemoryView.text.includes('"should": "be ignored"'));
  assert.ok(startup.text.includes('Current task context'));
});
