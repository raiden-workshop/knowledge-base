import path from 'node:path';

import { resolveStrictIntegrationConfig } from '../contracts/strict-integration-mode.js';
import { readFormalMemoryContext } from '../integration/external-memory.js';
import { readProjectMemoryView } from '../integration/project-memory-view.js';
import { buildOverlayContext } from '../overlay/build-overlay-context.js';
import { evaluateLegacyMemorySources } from '../policy/legacy-memory-bypass.js';

export function buildAgentStartupContext({
  cwd = process.cwd(),
  env = process.env,
  strictMode,
  memoryRoot,
  role = 'main',
} = {}) {
  const config = resolveStrictIntegrationConfig({
    cwd,
    env,
    strictMode,
    memoryRoot,
  });

  const formalContext = readFormalMemoryContext({
    cwd: config.cwd,
    memoryRoot: config.memoryRoot,
  });
  const projectMemoryView = readProjectMemoryView({
    cwd: config.cwd,
    memoryRoot: config.memoryRoot,
    strictMode: config.strictMode,
  });
  const overlay = buildOverlayContext({
    cwd: config.cwd,
    memoryRoot: config.memoryRoot,
  });

  const legacySourcePolicy = evaluateLegacyMemorySources(
    [
      {
        sourcePath: path.join(config.cwd, '.omx', 'project-memory.json'),
        intendedUse: 'primary',
      },
      {
        sourcePath: path.join(config.cwd, '.omx', 'notepad.md'),
        intendedUse: 'supplement',
      },
      {
        sourcePath: path.join(config.cwd, '.omx', 'logs', 'events.jsonl'),
        intendedUse: 'primary',
      },
    ],
    {
      strictMode: config.strictMode,
      cwd: config.cwd,
      memoryRoot: config.memoryRoot,
    }
  );

  const diagnostics = [
    ...(formalContext.diagnostics ?? []),
    ...(projectMemoryView.diagnostics ?? []),
    ...legacySourcePolicy
      .filter((entry) => entry.decision === 'block')
      .map((entry) => ({
        kind: 'legacy-memory-source-blocked',
        sourceType: entry.sourceType,
        sourcePath: entry.sourcePath,
        message: entry.reason,
      })),
  ];

  return {
    config,
    role,
    workspace: formalContext.workspace,
    overlay,
    projectMemoryView,
    legacySourcePolicy,
    diagnostics,
    text: overlay.text,
  };
}
