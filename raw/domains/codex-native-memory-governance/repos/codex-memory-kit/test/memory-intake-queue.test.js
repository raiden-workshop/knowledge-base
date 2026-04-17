import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  MEMORY_INTAKE_FILENAME,
  appendMemoryIntakeEntry,
  readMemoryIntakeEntries,
  summarizeMemoryIntake,
} from '../src/runtime/memory-intake-queue.js';
import { RuntimeArtifactWriteError } from '../src/policy/path-guard.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('memory intake queue appends and reads entries from .omx/memory-intake.jsonl', () => {
  const fixture = createWorkspaceFixture();

  const appended = appendMemoryIntakeEntry({
    role: 'worker',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    kind: 'observation',
    content: 'Potential durable rule candidate.',
    metadata: { source_file: 'plan.md' },
    createdAt: '2026-04-04T10:00:00Z',
  });

  assert.match(appended.path, new RegExp(`\\.omx/${MEMORY_INTAKE_FILENAME.replace('.', '\\.')}$`));

  const queue = readMemoryIntakeEntries({
    cwd: fixture.workspaceRoot,
  });

  assert.equal(queue.exists, true);
  assert.equal(queue.entries.length, 1);
  assert.match(queue.entries[0].id, /^intake-/);
  assert.equal(queue.entries[0].kind, 'observation');
  assert.equal(queue.entries[0].role, 'worker');
  assert.equal(queue.entries[0].metadata.source_file, 'plan.md');
});

test('memory intake summary reports kinds and latest entry', () => {
  const fixture = createWorkspaceFixture();

  appendMemoryIntakeEntry({
    role: 'worker',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    kind: 'observation',
    content: 'First note.',
    createdAt: '2026-04-04T10:00:00Z',
  });
  appendMemoryIntakeEntry({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    kind: 'directive',
    content: 'Second note.',
    createdAt: '2026-04-04T10:05:00Z',
  });

  const summary = summarizeMemoryIntake({
    cwd: fixture.workspaceRoot,
  });

  assert.equal(summary.count, 2);
  assert.deepEqual(summary.kinds.sort(), ['directive', 'observation']);
  assert.equal(summary.latest.content, 'Second note.');
});

test('workers cannot place the intake queue outside runtime artifacts', () => {
  const fixture = createWorkspaceFixture();

  assert.throws(
    () =>
      appendMemoryIntakeEntry({
        role: 'worker',
        cwd: fixture.workspaceRoot,
        memoryRoot: fixture.memoryRoot,
        filePath: path.join(fixture.workspaceRoot, 'notes', 'memory-intake.jsonl'),
        kind: 'observation',
        content: 'This should fail.',
      }),
    RuntimeArtifactWriteError
  );
});

test('legacy intake entries without ids are normalized on read', () => {
  const fixture = createWorkspaceFixture();
  const legacyPath = path.join(fixture.workspaceRoot, '.omx', MEMORY_INTAKE_FILENAME);
  fs.writeFileSync(
    legacyPath,
    `${JSON.stringify({
      kind: 'note',
      role: 'worker',
      source: 'legacy',
      content: 'Old queue entry',
      metadata: {},
      created_at: '2026-04-04T10:00:00Z',
    })}\n`,
    'utf8'
  );

  const queue = readMemoryIntakeEntries({
    cwd: fixture.workspaceRoot,
  });

  assert.equal(queue.entries.length, 1);
  assert.match(queue.entries[0].id, /^intake-/);
  assert.equal(queue.entries[0].source, 'legacy');
});
