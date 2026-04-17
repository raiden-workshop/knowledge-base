import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import {
  LEGACY_SOURCE_DECISION_ALLOW,
  LEGACY_SOURCE_DECISION_BLOCK,
  LEGACY_SOURCE_DECISION_SUPPLEMENT,
  classifyLegacyMemorySource,
  evaluateLegacyMemorySource,
} from '../src/policy/legacy-memory-bypass.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('legacy source classification distinguishes local memory, notepad, and telemetry', () => {
  const fixture = createWorkspaceFixture();

  assert.equal(
    classifyLegacyMemorySource(path.join(fixture.workspaceRoot, '.omx', 'project-memory.json'), {
      cwd: fixture.workspaceRoot,
      memoryRoot: fixture.memoryRoot,
    }),
    'local-project-memory'
  );

  assert.equal(
    classifyLegacyMemorySource(path.join(fixture.workspaceRoot, '.omx', 'notepad.md'), {
      cwd: fixture.workspaceRoot,
      memoryRoot: fixture.memoryRoot,
    }),
    'notepad'
  );

  assert.equal(
    classifyLegacyMemorySource(path.join(fixture.workspaceRoot, '.omx', 'logs', 'events.jsonl'), {
      cwd: fixture.workspaceRoot,
      memoryRoot: fixture.memoryRoot,
    }),
    'telemetry'
  );
});

test('strict mode blocks local project memory as a primary source', () => {
  const fixture = createWorkspaceFixture();

  const result = evaluateLegacyMemorySource({
    sourcePath: path.join(fixture.workspaceRoot, '.omx', 'project-memory.json'),
    intendedUse: 'primary',
    strictMode: true,
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
  });

  assert.equal(result.decision, LEGACY_SOURCE_DECISION_BLOCK);
});

test('notepad is allowed only as a supplement and telemetry is always blocked', () => {
  const fixture = createWorkspaceFixture();

  const supplement = evaluateLegacyMemorySource({
    sourcePath: path.join(fixture.workspaceRoot, '.omx', 'notepad.md'),
    intendedUse: 'supplement',
    strictMode: true,
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
  });
  assert.equal(supplement.decision, LEGACY_SOURCE_DECISION_SUPPLEMENT);

  const telemetry = evaluateLegacyMemorySource({
    sourcePath: path.join(fixture.workspaceRoot, '.omx', 'logs', 'events.jsonl'),
    intendedUse: 'primary',
    strictMode: false,
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
  });
  assert.equal(telemetry.decision, LEGACY_SOURCE_DECISION_BLOCK);

  const localNonStrict = evaluateLegacyMemorySource({
    sourcePath: path.join(fixture.workspaceRoot, '.omx', 'project-memory.json'),
    intendedUse: 'primary',
    strictMode: false,
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
  });
  assert.equal(localNonStrict.decision, LEGACY_SOURCE_DECISION_ALLOW);
});
