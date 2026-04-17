import test from 'node:test';
import assert from 'node:assert/strict';

import { appendMemoryIntakeEntry, readMemoryIntakeEntries } from '../src/runtime/memory-intake-queue.js';
import { readPromotionAuditEntries } from '../src/runtime/promotion-audit-trail.js';
import {
  PROMOTION_DECISION_ALLOW,
  PROMOTION_DECISION_DENY,
  PROMOTION_DECISION_REVIEW,
  evaluatePromotionGate,
  triggerFormalPromotion,
} from '../src/runtime/promotion-gate.js';
import { markVerificationPending } from '../src/runtime/verification-state.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('leader can promote selected intake entries and records the audit trail', () => {
  const fixture = createWorkspaceFixture();
  const appended = appendMemoryIntakeEntry({
    role: 'worker',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    kind: 'note',
    content: 'Promote this note.',
    source: 'project_memory_add_note',
    createdAt: '2026-04-04T10:00:00Z',
  });

  const evaluation = evaluatePromotionGate({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    entryIds: [appended.entry.id],
    phase: 'terminal',
    verificationStatus: 'verified',
  });
  assert.equal(evaluation.decision, PROMOTION_DECISION_ALLOW);

  const calls = [];
  const result = triggerFormalPromotion({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    entryIds: [appended.entry.id],
    phase: 'terminal',
    verificationStatus: 'verified',
    runner(command) {
      calls.push(command);
      return { status: 0, stdout: 'ok', stderr: '' };
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.executed, true);
  assert.equal(calls.length, 1);
  assert.equal(result.auditEvents.length, 2);
  assert.equal(result.auditEvents[0].event, 'promotion_approved');
  assert.equal(result.auditEvents[1].event, 'promotion_refresh_completed');

  const audit = readPromotionAuditEntries({
    cwd: fixture.workspaceRoot,
  });
  assert.equal(audit.entries.length, 2);
  assert.equal(audit.entries[1].entry_ids[0], appended.entry.id);
});

test('worker cannot confirm promotion and the blocked attempt is audited', () => {
  const fixture = createWorkspaceFixture();
  const appended = appendMemoryIntakeEntry({
    role: 'worker',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    kind: 'note',
    content: 'Blocked promotion.',
  });

  const result = triggerFormalPromotion({
    role: 'worker',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    entryIds: [appended.entry.id],
  });

  assert.equal(result.decision, PROMOTION_DECISION_DENY);
  assert.equal(result.executed, false);
  assert.equal(result.auditEvents[0].event, 'promotion_blocked');
});

test('already promoted entries require review before re-promotion', () => {
  const fixture = createWorkspaceFixture();
  const appended = appendMemoryIntakeEntry({
    role: 'worker',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    kind: 'directive',
    content: 'Already promoted once.',
  });

  const first = triggerFormalPromotion({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    entryIds: [appended.entry.id],
    phase: 'terminal',
    verificationStatus: 'verified',
    runner() {
      return { status: 0, stdout: 'ok', stderr: '' };
    },
  });
  assert.equal(first.success, true);

  const second = evaluatePromotionGate({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    entryIds: [appended.entry.id],
    phase: 'terminal',
    verificationStatus: 'verified',
  });
  assert.equal(second.decision, PROMOTION_DECISION_REVIEW);
  assert.deepEqual(second.alreadyPromotedIds, [appended.entry.id]);
});

test('promotion gate prefers verification artifact status over the caller parameter', () => {
  const fixture = createWorkspaceFixture();
  const appended = appendMemoryIntakeEntry({
    role: 'worker',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    kind: 'note',
    content: 'Pending verification should block auto-promotion.',
  });

  markVerificationPending({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    notes: 'Still waiting on checks.',
  });

  const evaluation = evaluatePromotionGate({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    entryIds: [appended.entry.id],
    phase: 'terminal',
    verificationStatus: 'verified',
  });

  assert.equal(evaluation.decision, PROMOTION_DECISION_REVIEW);
  assert.equal(evaluation.refresh.verification.status, 'pending');
  assert.equal(evaluation.refresh.verification.source, 'artifact');
});
