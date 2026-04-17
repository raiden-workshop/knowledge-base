import test from 'node:test';
import assert from 'node:assert/strict';

import { buildOverlayContext } from '../src/overlay/build-overlay-context.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('buildOverlayContext follows the formal memory first read order', () => {
  const fixture = createWorkspaceFixture();

  const overlay = buildOverlayContext({
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
  });

  assert.deepEqual(
    overlay.sections.map((section) => section.source),
    [
      'omx-state',
      'active-context',
      'memory-index',
      'repo-guide',
      'shared-guide:company',
      'shared-guide:user',
      'shared-guide:local',
      'notepad-priority',
    ]
  );

  assert.ok(overlay.text.includes('Current task context'));
  assert.ok(overlay.text.includes('Workspace memory'));
  assert.ok(!overlay.text.includes('should":"be ignored'));
});
