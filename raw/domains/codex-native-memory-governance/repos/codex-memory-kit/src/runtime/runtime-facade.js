import { resolveStrictIntegrationConfig } from '../contracts/strict-integration-mode.js';
import { buildOverlayContext } from '../overlay/build-overlay-context.js';
import { evaluateErrorRecovery } from '../policy/error-recovery.js';
import { evaluateHitlCheckpoints } from '../policy/hitl-checkpoints.js';
import { buildAgentStartupContext } from './agent-startup-context.js';
import { runGuardedAction } from './guarded-action-runner.js';
import {
  buildRefreshCommand,
  evaluateRefreshTrigger,
  triggerFormalMemoryRefresh,
} from './leader-refresh-trigger.js';
import {
  appendMemoryIntakeEntry,
  readMemoryIntakeEntries,
  summarizeMemoryIntake,
} from './memory-intake-queue.js';
import {
  projectMemoryAddDirective,
  projectMemoryAddNote,
  projectMemoryRead,
  projectMemoryWrite,
} from './project-memory-commands.js';
import {
  evaluatePromotionGate,
  readPromotionAuditEntries,
  summarizePromotionAuditTrail,
  triggerFormalPromotion,
} from './promotion-gate.js';
import {
  stateClear,
  stateGetStatus,
  stateListActive,
  stateRead,
  stateWrite,
} from './state-store.js';
import {
  appendVerificationEvidence,
  markVerificationFailed,
  markVerificationPending,
  markVerificationStale,
  markVerified,
  readVerificationState,
  resolveVerificationStatus,
} from './verification-state.js';

function createConfigResolver(baseOptions = {}) {
  const baseConfig = resolveStrictIntegrationConfig(baseOptions);
  const baseEnv = baseOptions.env ?? process.env;

  function resolve(overrides = {}) {
    return resolveStrictIntegrationConfig({
      cwd: overrides.cwd ?? baseConfig.cwd,
      env: overrides.env ?? baseEnv,
      strictMode: overrides.strictMode ?? baseConfig.strictMode,
      memoryRoot: overrides.memoryRoot ?? baseConfig.memoryRoot,
    });
  }

  return { baseConfig, resolve };
}

export function createGovernanceFacade(baseOptions = {}) {
  const { baseConfig, resolve } = createConfigResolver(baseOptions);

  return {
    config: baseConfig,
    resolveConfig(overrides = {}) {
      return resolve(overrides);
    },
    startup: {
      build(options = {}) {
        const config = resolve(options);
        return buildAgentStartupContext({
          ...config,
          role: options.role ?? 'main',
        });
      },
    },
    overlay: {
      build(options = {}) {
        const config = resolve(options);
        return buildOverlayContext(config);
      },
    },
    projectMemory: {
      read(options = {}) {
        const config = resolve(options);
        return projectMemoryRead(config);
      },
      write(options = {}) {
        const config = resolve(options);
        return projectMemoryWrite({
          ...config,
          role: options.role ?? 'main',
          payload: options.payload,
          filePath: options.filePath,
        });
      },
      addNote(options = {}) {
        const config = resolve(options);
        return projectMemoryAddNote({
          ...config,
          role: options.role ?? 'main',
          note: options.note,
          metadata: options.metadata,
          filePath: options.filePath,
        });
      },
      addDirective(options = {}) {
        const config = resolve(options);
        return projectMemoryAddDirective({
          ...config,
          role: options.role ?? 'main',
          directive: options.directive,
          metadata: options.metadata,
          filePath: options.filePath,
        });
      },
    },
    intake: {
      append(options = {}) {
        const config = resolve(options);
        return appendMemoryIntakeEntry({
          ...config,
          role: options.role ?? 'main',
          kind: options.kind,
          content: options.content,
          source: options.source,
          metadata: options.metadata,
          createdAt: options.createdAt,
          filePath: options.filePath,
        });
      },
      read(options = {}) {
        const config = resolve(options);
        return readMemoryIntakeEntries({
          cwd: config.cwd,
          filePath: options.filePath,
        });
      },
      summarize(options = {}) {
        const config = resolve(options);
        return summarizeMemoryIntake({
          cwd: config.cwd,
          filePath: options.filePath,
        });
      },
    },
    promotion: {
      evaluate(options = {}) {
        const config = resolve(options);
        return evaluatePromotionGate({
          ...config,
          role: options.role ?? 'main',
          entryIds: options.entryIds ?? [],
          intakeFilePath: options.intakeFilePath,
          auditFilePath: options.auditFilePath,
          phase: options.phase,
          verificationStatus: options.verificationStatus,
          verificationFilePath: options.verificationFilePath,
          explicitUserIntent: options.explicitUserIntent ?? false,
        });
      },
      trigger(options = {}) {
        const config = resolve(options);
        return triggerFormalPromotion({
          ...config,
          role: options.role ?? 'main',
          entryIds: options.entryIds ?? [],
          intakeFilePath: options.intakeFilePath,
          auditFilePath: options.auditFilePath,
          phase: options.phase,
          verificationStatus: options.verificationStatus,
          verificationFilePath: options.verificationFilePath,
          explicitUserIntent: options.explicitUserIntent ?? false,
          reason: options.reason,
          execute: options.execute,
          runner: options.runner,
          maxAttempts: options.maxAttempts,
        });
      },
      readAudit(options = {}) {
        const config = resolve(options);
        return readPromotionAuditEntries({
          cwd: config.cwd,
          filePath: options.filePath ?? options.auditFilePath,
        });
      },
      summarizeAudit(options = {}) {
        const config = resolve(options);
        return summarizePromotionAuditTrail({
          cwd: config.cwd,
          filePath: options.filePath ?? options.auditFilePath,
        });
      },
    },
    verification: {
      read(options = {}) {
        const config = resolve(options);
        return readVerificationState({
          cwd: config.cwd,
          dirPath: options.dirPath,
          filePath: options.filePath ?? options.verificationFilePath,
        });
      },
      resolveStatus(options = {}) {
        const config = resolve(options);
        return resolveVerificationStatus({
          cwd: config.cwd,
          dirPath: options.dirPath,
          filePath: options.filePath ?? options.verificationFilePath,
          verificationStatus: options.verificationStatus,
        });
      },
      appendEvidence(options = {}) {
        const config = resolve(options);
        return appendVerificationEvidence({
          ...config,
          role: options.role ?? 'main',
          dirPath: options.dirPath,
          filePath: options.filePath ?? options.verificationFilePath,
          evidence: options.evidence,
          summary: options.summary,
          kind: options.kind,
          command: options.command,
          metadata: options.metadata,
          createdAt: options.createdAt,
        });
      },
      markVerified(options = {}) {
        const config = resolve(options);
        return markVerified({
          ...config,
          role: options.role ?? 'main',
          dirPath: options.dirPath,
          filePath: options.filePath ?? options.verificationFilePath,
          scope: options.scope,
          commands: options.commands,
          evidence: options.evidence,
          notes: options.notes,
          updatedAt: options.updatedAt,
          verifiedAt: options.verifiedAt,
        });
      },
      markFailed(options = {}) {
        const config = resolve(options);
        return markVerificationFailed({
          ...config,
          role: options.role ?? 'main',
          dirPath: options.dirPath,
          filePath: options.filePath ?? options.verificationFilePath,
          scope: options.scope,
          commands: options.commands,
          evidence: options.evidence,
          notes: options.notes,
          updatedAt: options.updatedAt,
        });
      },
      markPending(options = {}) {
        const config = resolve(options);
        return markVerificationPending({
          ...config,
          role: options.role ?? 'main',
          dirPath: options.dirPath,
          filePath: options.filePath ?? options.verificationFilePath,
          scope: options.scope,
          commands: options.commands,
          evidence: options.evidence,
          notes: options.notes,
          updatedAt: options.updatedAt,
        });
      },
      markStale(options = {}) {
        const config = resolve(options);
        return markVerificationStale({
          ...config,
          role: options.role ?? 'main',
          dirPath: options.dirPath,
          filePath: options.filePath ?? options.verificationFilePath,
          scope: options.scope,
          commands: options.commands,
          evidence: options.evidence,
          notes: options.notes,
          updatedAt: options.updatedAt,
        });
      },
    },
    review: {
      evaluate(options = {}) {
        const config = resolve(options);
        return evaluateHitlCheckpoints({
          ...config,
          action: options.action,
          role: options.role ?? 'main',
          targetPath: options.targetPath,
          permission: options.permission,
          explicitUserIntent: options.explicitUserIntent ?? false,
          replacesRule: options.replacesRule ?? false,
          sensitive: options.sensitive ?? false,
          externalSideEffect: options.externalSideEffect ?? false,
          phase: options.phase,
          verificationStatus: options.verificationStatus,
        });
      },
    },
    recovery: {
      evaluate(options = {}) {
        return evaluateErrorRecovery({
          operation: options.operation,
          error: options.error,
          result: options.result,
          attempt: options.attempt,
          maxAttempts: options.maxAttempts,
          fallbackAvailable: options.fallbackAvailable,
        });
      },
      run(options = {}) {
        const config = resolve(options);
        return runGuardedAction({
          ...config,
          operation: options.operation,
          action: options.action,
          role: options.role ?? 'main',
          targetPath: options.targetPath,
          explicitUserIntent: options.explicitUserIntent ?? false,
          replacesRule: options.replacesRule ?? false,
          sensitive: options.sensitive ?? false,
          externalSideEffect: options.externalSideEffect ?? false,
          phase: options.phase,
          verificationStatus: options.verificationStatus,
          maxAttempts: options.maxAttempts,
          perform: options.perform,
          fallback: options.fallback,
          isSuccessfulResult: options.isSuccessfulResult,
          permission: options.permission,
          hitl: options.hitl,
        });
      },
    },
    state: {
      read(options = {}) {
        const config = resolve(options);
        return stateRead({
          cwd: config.cwd,
          dirPath: options.dirPath,
          name: options.name,
        });
      },
      write(options = {}) {
        const config = resolve(options);
        return stateWrite({
          ...config,
          role: options.role ?? 'main',
          dirPath: options.dirPath,
          name: options.name,
          data: options.data,
        });
      },
      clear(options = {}) {
        const config = resolve(options);
        return stateClear({
          ...config,
          role: options.role ?? 'main',
          dirPath: options.dirPath,
          name: options.name,
        });
      },
      listActive(options = {}) {
        const config = resolve(options);
        return stateListActive({
          cwd: config.cwd,
          dirPath: options.dirPath,
        });
      },
      getStatus(options = {}) {
        const config = resolve(options);
        return stateGetStatus({
          cwd: config.cwd,
          dirPath: options.dirPath,
          name: options.name,
        });
      },
    },
    refresh: {
      buildCommand(options = {}) {
        const config = resolve(options);
        return buildRefreshCommand({
          workspaceRoot: options.workspaceRoot ?? config.cwd,
        });
      },
      evaluate(options = {}) {
        const config = resolve(options);
        return evaluateRefreshTrigger({
          ...config,
          role: options.role ?? 'main',
          workspaceRoot: options.workspaceRoot ?? config.cwd,
          phase: options.phase,
          verificationStatus: options.verificationStatus,
          verificationFilePath: options.verificationFilePath,
          explicitUserIntent: options.explicitUserIntent,
        });
      },
      trigger(options = {}) {
        const config = resolve(options);
        return triggerFormalMemoryRefresh({
          ...config,
          role: options.role ?? 'main',
          workspaceRoot: options.workspaceRoot ?? config.cwd,
          phase: options.phase,
          verificationStatus: options.verificationStatus,
          verificationFilePath: options.verificationFilePath,
          explicitUserIntent: options.explicitUserIntent,
          reason: options.reason,
          execute: options.execute,
          runner: options.runner,
          maxAttempts: options.maxAttempts,
        });
      },
    },
  };
}

export const createRuntimeFacade = createGovernanceFacade;
