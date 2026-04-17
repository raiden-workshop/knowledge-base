import { DEFAULT_MEMORY_ROOT } from '../constants.js';
import { TEAM_ROLE_LEADER, TEAM_ROLE_MAIN } from '../team/team-contract.js';
import { evaluateRefreshTrigger, triggerFormalMemoryRefresh } from './leader-refresh-trigger.js';
import { readMemoryIntakeEntries } from './memory-intake-queue.js';
import {
  appendPromotionAuditEvent,
  readPromotionAuditEntries,
  summarizePromotionAuditTrail,
} from './promotion-audit-trail.js';

export const PROMOTION_DECISION_ALLOW = 'allow';
export const PROMOTION_DECISION_REVIEW = 'review';
export const PROMOTION_DECISION_DENY = 'deny';

function isPromotionAuthority(role) {
  return role === TEAM_ROLE_LEADER || role === TEAM_ROLE_MAIN;
}

function mapRefreshDecisionToPromotionDecision(decision) {
  if (decision === 'deny') return PROMOTION_DECISION_DENY;
  if (decision === 'review') return PROMOTION_DECISION_REVIEW;
  return PROMOTION_DECISION_ALLOW;
}

function selectEntries(allEntries, entryIds = []) {
  if (!Array.isArray(entryIds) || entryIds.length === 0) {
    return {
      selectedEntries: [...allEntries],
      missingEntryIds: [],
    };
  }

  const byId = new Map(allEntries.map((entry) => [entry.id, entry]));
  const selectedEntries = [];
  const missingEntryIds = [];

  for (const id of entryIds) {
    if (byId.has(id)) {
      selectedEntries.push(byId.get(id));
    } else {
      missingEntryIds.push(id);
    }
  }

  return {
    selectedEntries,
    missingEntryIds,
  };
}

export function evaluatePromotionGate({
  role = 'main',
  cwd = process.cwd(),
  memoryRoot = DEFAULT_MEMORY_ROOT,
  entryIds = [],
  intakeFilePath,
  auditFilePath,
  phase = 'terminal',
  verificationStatus = 'verified',
  verificationFilePath,
  explicitUserIntent = false,
} = {}) {
  const queue = readMemoryIntakeEntries({
    cwd,
    filePath: intakeFilePath,
  });
  const audit = summarizePromotionAuditTrail({
    cwd,
    filePath: auditFilePath,
  });
  const { selectedEntries, missingEntryIds } = selectEntries(queue.entries, entryIds);
  const alreadyPromotedIds = selectedEntries
    .map((entry) => entry.id)
    .filter((id) => audit.promotedEntryIds.includes(id));
  const reasons = [];

  if (!isPromotionAuthority(role)) {
    reasons.push(`Role "${role}" cannot confirm promotion into the formal memory pipeline.`);
    return {
      decision: PROMOTION_DECISION_DENY,
      allowed: false,
      reasons,
      role,
      selectedEntries,
      selectedEntryIds: selectedEntries.map((entry) => entry.id),
      missingEntryIds,
      alreadyPromotedIds,
      queue,
      audit,
      refresh: null,
    };
  }

  if (selectedEntries.length === 0) {
    reasons.push('No pending intake entries were selected for promotion.');
  }

  if (missingEntryIds.length > 0) {
    reasons.push('Some requested intake entries were not found in the queue.');
  }

  if (alreadyPromotedIds.length > 0 && !explicitUserIntent) {
    reasons.push('Some selected intake entries were already promoted and require explicit confirmation to promote again.');
  }

  const refresh = evaluateRefreshTrigger({
    role,
    workspaceRoot: cwd,
    phase,
    verificationStatus,
    verificationFilePath,
    explicitUserIntent,
    memoryRoot,
  });
  reasons.push(...refresh.reasons);

  let decision = mapRefreshDecisionToPromotionDecision(refresh.decision);
  if (selectedEntries.length === 0 || missingEntryIds.length > 0 || alreadyPromotedIds.length > 0) {
    decision = decision === PROMOTION_DECISION_DENY ? decision : PROMOTION_DECISION_REVIEW;
  }

  return {
    decision,
    allowed: decision === PROMOTION_DECISION_ALLOW,
    reasons: [...new Set(reasons)],
    role,
    selectedEntries,
    selectedEntryIds: selectedEntries.map((entry) => entry.id),
    missingEntryIds,
    alreadyPromotedIds,
    queue,
    audit,
    refresh,
  };
}

function buildAuditMetadata({
  evaluation,
  reason,
  explicitUserIntent,
  phase,
  verificationStatus,
  verificationFilePath,
  refresh,
}) {
  return {
    reason,
    explicit_user_intent: explicitUserIntent,
    phase,
    verification_status: refresh?.verification?.status ?? evaluation.refresh?.verification?.status ?? verificationStatus,
    verification_source: refresh?.verification?.source ?? evaluation.refresh?.verification?.source ?? null,
    verification_file_path: verificationFilePath ?? refresh?.verification?.path ?? evaluation.refresh?.verification?.path ?? null,
    refresh_decision: refresh?.decision ?? evaluation.refresh?.decision ?? null,
    refresh_allowed: refresh?.allowed ?? evaluation.refresh?.allowed ?? null,
    missing_entry_ids: evaluation.missingEntryIds,
    already_promoted_ids: evaluation.alreadyPromotedIds,
  };
}

export function triggerFormalPromotion({
  role = 'main',
  cwd = process.cwd(),
  memoryRoot = DEFAULT_MEMORY_ROOT,
  entryIds = [],
  intakeFilePath,
  auditFilePath,
  phase = 'terminal',
  verificationStatus = 'verified',
  verificationFilePath,
  explicitUserIntent = false,
  reason = 'promotion-gate',
  execute = true,
  runner,
  maxAttempts = 2,
} = {}) {
  const evaluation = evaluatePromotionGate({
    role,
    cwd,
    memoryRoot,
    entryIds,
    intakeFilePath,
    auditFilePath,
    phase,
    verificationStatus,
    verificationFilePath,
    explicitUserIntent,
  });

  if (!evaluation.allowed) {
    const blocked = appendPromotionAuditEvent({
      role,
      cwd,
      memoryRoot,
      filePath: auditFilePath,
      event: 'promotion_blocked',
      decision: evaluation.decision,
      selectedEntries: evaluation.selectedEntries,
      metadata: buildAuditMetadata({
        evaluation,
        reason,
        explicitUserIntent,
        phase,
        verificationStatus,
        verificationFilePath,
      }),
      success: false,
    });

    return {
      ...evaluation,
      executed: false,
      success: false,
      reason,
      command: null,
      refreshResult: null,
      auditEvents: [blocked.entry],
      auditPath: blocked.path,
    };
  }

  const approved = appendPromotionAuditEvent({
    role,
    cwd,
    memoryRoot,
    filePath: auditFilePath,
    event: 'promotion_approved',
    decision: evaluation.decision,
    selectedEntries: evaluation.selectedEntries,
    metadata: buildAuditMetadata({
      evaluation,
      reason,
      explicitUserIntent,
      phase,
      verificationStatus,
      verificationFilePath,
    }),
    success: true,
  });

  if (!execute) {
    return {
      ...evaluation,
      executed: false,
      success: false,
      reason,
      command: null,
      refreshResult: null,
      auditEvents: [approved.entry],
      auditPath: approved.path,
    };
  }

  const refreshResult = triggerFormalMemoryRefresh({
    role,
    workspaceRoot: cwd,
    phase,
    verificationStatus,
    verificationFilePath,
    explicitUserIntent,
    reason,
    execute,
    memoryRoot,
    runner,
    maxAttempts,
  });

  const finalEvent = appendPromotionAuditEvent({
    role,
    cwd,
    memoryRoot,
    filePath: auditFilePath,
    event: refreshResult.success ? 'promotion_refresh_completed' : 'promotion_refresh_failed',
    decision: refreshResult.decision,
    selectedEntries: evaluation.selectedEntries,
    metadata: {
      ...buildAuditMetadata({
        evaluation,
        reason,
        explicitUserIntent,
        phase,
        verificationStatus,
        verificationFilePath,
        refresh: refreshResult,
      }),
      command: refreshResult.command,
      attempts: refreshResult.attempts ?? [],
      recovery_decision: refreshResult.recovery?.decision ?? null,
      confirmed_by: role,
    },
    success: refreshResult.success,
  });

  return {
    ...evaluation,
    executed: refreshResult.executed,
    success: refreshResult.success,
    reason,
    command: refreshResult.command,
    refreshResult,
    auditEvents: [approved.entry, finalEvent.entry],
    auditPath: approved.path,
  };
}

export { readPromotionAuditEntries, summarizePromotionAuditTrail };
