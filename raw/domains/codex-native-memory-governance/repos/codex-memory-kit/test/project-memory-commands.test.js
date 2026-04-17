import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  PROJECT_MEMORY_DECISION_ALLOW,
  PROJECT_MEMORY_DECISION_DENY,
  PROJECT_MEMORY_DECISION_DOWNGRADE,
  projectMemoryAddDirective,
  projectMemoryAddNote,
  projectMemoryRead,
  projectMemoryWrite,
} from '../src/runtime/project-memory-commands.js';
import { readMemoryIntakeEntries } from '../src/runtime/memory-intake-queue.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('projectMemoryRead follows the formal memory view in strict mode', () => {
  const fixture = createWorkspaceFixture();

  const result = projectMemoryRead({
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: true,
  });

  assert.equal(result.decision, PROJECT_MEMORY_DECISION_ALLOW);
  assert.equal(result.source, 'formal-memory');
  assert.ok(result.text.includes('Current task context'));
  assert.ok(!result.text.includes('"should": "be ignored"'));
});

test('projectMemoryWrite is explicitly denied in strict mode', () => {
  const fixture = createWorkspaceFixture();

  const result = projectMemoryWrite({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: true,
    payload: { should: 'not write' },
  });

  assert.equal(result.decision, PROJECT_MEMORY_DECISION_DENY);

  const raw = fs.readFileSync(path.join(fixture.workspaceRoot, '.omx', 'project-memory.json'), 'utf8');
  assert.ok(raw.includes('be ignored'));
  assert.ok(!raw.includes('not write'));
});

test('strict project_memory_add_note and add_directive downgrade into intake queue', () => {
  const fixture = createWorkspaceFixture();

  const note = projectMemoryAddNote({
    role: 'worker',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: true,
    note: 'Candidate note',
  });
  assert.equal(note.decision, PROJECT_MEMORY_DECISION_DOWNGRADE);

  const directive = projectMemoryAddDirective({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: true,
    directive: 'Candidate directive',
  });
  assert.equal(directive.decision, PROJECT_MEMORY_DECISION_DOWNGRADE);

  const queue = readMemoryIntakeEntries({
    cwd: fixture.workspaceRoot,
  });

  assert.equal(queue.entries.length, 2);
  assert.match(queue.entries[0].id, /^intake-/);
  assert.equal(queue.entries[0].source, 'project_memory_add_note');
  assert.equal(queue.entries[1].source, 'project_memory_add_directive');
});

test('non-strict project_memory_write and add_* update local project-memory.json', () => {
  const fixture = createWorkspaceFixture();
  const projectMemoryPath = path.join(fixture.workspaceRoot, '.omx', 'project-memory.json');

  const write = projectMemoryWrite({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: false,
    payload: { mode: 'local', notes: [] },
  });
  assert.equal(write.decision, PROJECT_MEMORY_DECISION_ALLOW);

  const note = projectMemoryAddNote({
    role: 'worker',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: false,
    note: 'Saved locally',
  });
  assert.equal(note.decision, PROJECT_MEMORY_DECISION_ALLOW);

  const directive = projectMemoryAddDirective({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: false,
    directive: 'Do this next',
  });
  assert.equal(directive.decision, PROJECT_MEMORY_DECISION_ALLOW);

  const parsed = JSON.parse(fs.readFileSync(projectMemoryPath, 'utf8'));
  assert.equal(parsed.mode, 'local');
  assert.equal(parsed.notes.length, 1);
  assert.equal(parsed.notes[0].note, 'Saved locally');
  assert.equal(parsed.directives.length, 1);
  assert.equal(parsed.directives[0].directive, 'Do this next');
});
