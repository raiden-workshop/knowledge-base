import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';

import { createGovernanceFacade, createRuntimeFacade } from '../src/runtime/runtime-facade.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('strict governance facade uses formal memory for startup and project memory reads', () => {
  const fixture = createWorkspaceFixture();
  const facade = createGovernanceFacade({
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: true,
  });

  const startup = facade.startup.build({ role: 'worker' });
  const projectMemory = facade.projectMemory.read();
  const overlay = facade.overlay.build();

  assert.equal(facade.config.strictMode, true);
  assert.ok(startup.text.includes('Current task context'));
  assert.equal(projectMemory.source, 'formal-memory');
  assert.ok(!projectMemory.text.includes('"should": "be ignored"'));
  assert.ok(overlay.text.includes('Workspace memory'));
});

test('strict governance facade rejects writes and downgrades addNote into intake queue', () => {
  const fixture = createWorkspaceFixture();
  const facade = createGovernanceFacade({
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: true,
  });

  const denied = facade.projectMemory.write({
    role: 'leader',
    payload: { should: 'not persist' },
  });
  assert.equal(denied.decision, 'deny');

  const downgraded = facade.projectMemory.addNote({
    role: 'worker',
    note: 'Queue this note',
  });
  assert.equal(downgraded.decision, 'downgrade');

  const queue = facade.intake.read();
  assert.equal(queue.entries.length, 1);
  assert.equal(queue.entries[0].content, 'Queue this note');
});

test('non-strict governance facade can update local project memory and delegate refresh execution', () => {
  const fixture = createWorkspaceFixture();
  const facade = createGovernanceFacade({
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: false,
  });

  const write = facade.projectMemory.write({
    role: 'leader',
    payload: { mode: 'local' },
  });
  assert.equal(write.decision, 'allow');

  const note = facade.projectMemory.addDirective({
    role: 'leader',
    directive: 'Persist locally',
  });
  assert.equal(note.decision, 'allow');

  const parsed = JSON.parse(
    fs.readFileSync(path.join(fixture.workspaceRoot, '.omx', 'project-memory.json'), 'utf8')
  );
  assert.equal(parsed.mode, 'local');
  assert.equal(parsed.directives[0].directive, 'Persist locally');

  const calls = [];
  const refresh = facade.refresh.trigger({
    role: 'leader',
    phase: 'terminal',
    verificationStatus: 'verified',
    runner(command) {
      calls.push(command);
      return { status: 0, stdout: 'ok', stderr: '' };
    },
  });

  assert.equal(refresh.executed, true);
  assert.equal(refresh.success, true);
  assert.equal(calls.length, 1);
});

test('governance facade exposes review and guarded recovery helpers', () => {
  const fixture = createWorkspaceFixture();
  const facade = createGovernanceFacade({
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: true,
  });

  const review = facade.review.evaluate({
    action: 'write',
    role: 'leader',
    targetPath: path.join(fixture.workspaceRoot, '.omx', 'plans', 'plan.md'),
    externalSideEffect: true,
  });
  assert.equal(review.decision, 'review');

  let calls = 0;
  const recovery = facade.recovery.run({
    operation: 'runtime-check',
    action: 'write',
    role: 'leader',
    targetPath: path.join(fixture.workspaceRoot, '.omx', 'plans', 'plan.md'),
    maxAttempts: 2,
    perform() {
      calls += 1;
      if (calls === 1) {
        throw Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' });
      }
      return { status: 0 };
    },
    isSuccessfulResult(result) {
      return result.status === 0;
    },
  });

  assert.equal(recovery.status, 'success');
  assert.equal(recovery.success, true);
  assert.equal(calls, 2);
});

test('governance facade exposes promotion and verification helpers', () => {
  const fixture = createWorkspaceFixture();
  const facade = createGovernanceFacade({
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: true,
  });

  const queued = facade.intake.append({
    role: 'worker',
    kind: 'note',
    content: 'Promote through facade.',
    source: 'runtime-facade-test',
  });

  const evaluation = facade.promotion.evaluate({
    role: 'leader',
    entryIds: [queued.entry.id],
    phase: 'terminal',
    verificationStatus: 'verified',
  });
  assert.equal(evaluation.decision, 'allow');

  facade.verification.appendEvidence({
    role: 'worker',
    summary: 'npm test passed',
    kind: 'test',
    command: 'npm test',
  });
  assert.equal(facade.verification.read().status, 'pending');

  facade.verification.markVerified({
    role: 'leader',
    scope: ['tests'],
    commands: ['npm test'],
    notes: 'Checks passed.',
  });

  const trigger = facade.promotion.trigger({
    role: 'leader',
    entryIds: [queued.entry.id],
    phase: 'terminal',
    verificationStatus: 'pending',
    runner() {
      return { status: 0, stdout: 'ok', stderr: '' };
    },
  });
  assert.equal(trigger.success, true);

  const audit = facade.promotion.summarizeAudit();
  assert.ok(audit.promotedEntryIds.includes(queued.entry.id));
});

test('governance facade does not expose native-covered helpers at top level', () => {
  const fixture = createWorkspaceFixture();
  const facade = createGovernanceFacade({
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: true,
  });

  assert.equal('skills' in facade, false);
  assert.equal('subagents' in facade, false);
  assert.equal('observability' in facade, false);
  assert.equal('worktrees' in facade, false);
});

test('createRuntimeFacade is an alias of the kept governance surface', () => {
  const fixture = createWorkspaceFixture();
  const facade = createRuntimeFacade({
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    strictMode: true,
  });

  assert.equal(typeof facade.projectMemory.read, 'function');
  assert.equal(typeof facade.refresh.trigger, 'function');
  assert.equal('skills' in facade, false);
  assert.equal('worktrees' in facade, false);
});
