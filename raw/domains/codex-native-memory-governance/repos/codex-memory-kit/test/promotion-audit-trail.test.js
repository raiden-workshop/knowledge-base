import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendPromotionAuditEvent,
  PROMOTION_AUDIT_FILENAME,
  readPromotionAuditEntries,
  summarizePromotionAuditTrail,
} from '../src/runtime/promotion-audit-trail.js';
import { createWorkspaceFixture } from './helpers/fixtures.js';

test('promotion audit trail appends and reads audit events under .omx', () => {
  const fixture = createWorkspaceFixture();

  const appended = appendPromotionAuditEvent({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    event: 'promotion_approved',
    selectedEntries: [{ id: 'intake-1', kind: 'note', role: 'worker', source: 'queue', created_at: '2026-04-04T10:00:00Z' }],
    metadata: { reason: 'reviewed' },
    createdAt: '2026-04-04T10:10:00Z',
    success: true,
  });

  assert.match(appended.path, new RegExp(`\\.omx/${PROMOTION_AUDIT_FILENAME.replace('.', '\\.')}$`));

  const audit = readPromotionAuditEntries({
    cwd: fixture.workspaceRoot,
  });

  assert.equal(audit.exists, true);
  assert.equal(audit.entries.length, 1);
  assert.equal(audit.entries[0].event, 'promotion_approved');
  assert.equal(audit.entries[0].entry_ids[0], 'intake-1');
});

test('promotion audit summary reports completed promoted entry ids', () => {
  const fixture = createWorkspaceFixture();

  appendPromotionAuditEvent({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    event: 'promotion_approved',
    selectedEntries: [{ id: 'intake-1', kind: 'note', role: 'worker', source: 'queue', created_at: '2026-04-04T10:00:00Z' }],
    success: true,
  });
  appendPromotionAuditEvent({
    role: 'leader',
    cwd: fixture.workspaceRoot,
    memoryRoot: fixture.memoryRoot,
    event: 'promotion_refresh_completed',
    selectedEntries: [{ id: 'intake-1', kind: 'note', role: 'worker', source: 'queue', created_at: '2026-04-04T10:00:00Z' }],
    success: true,
  });

  const summary = summarizePromotionAuditTrail({
    cwd: fixture.workspaceRoot,
  });

  assert.equal(summary.count, 2);
  assert.ok(summary.events.includes('promotion_refresh_completed'));
  assert.deepEqual(summary.promotedEntryIds, ['intake-1']);
});
