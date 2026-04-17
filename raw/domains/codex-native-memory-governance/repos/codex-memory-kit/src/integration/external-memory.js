import fs from 'node:fs';
import path from 'node:path';

import { SHARED_GUIDE_RELATIVE_PATHS } from '../constants.js';
import { resolveWorkspaceNode } from './workspace-resolver.js';

function readTextFileIfPresent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

function buildFileRecord(kind, filePath) {
  const content = readTextFileIfPresent(filePath);
  return {
    kind,
    path: filePath,
    content,
    exists: content != null,
  };
}

export function readSharedGuides(memoryRoot) {
  return SHARED_GUIDE_RELATIVE_PATHS.map(([kind, relativePath]) =>
    buildFileRecord(kind, path.join(memoryRoot, relativePath))
  );
}

export function readFormalMemoryContext({ cwd = process.cwd(), memoryRoot }) {
  const sharedGuides = readSharedGuides(memoryRoot);
  const diagnostics = [];
  const workspace = resolveWorkspaceNode({ cwd, memoryRoot });

  if (!workspace) {
    diagnostics.push({
      kind: 'workspace-memory-unavailable',
      message:
        'Workspace memory node could not be resolved. Falling back to shared guides and runtime-only context.',
    });
  }

  if (!workspace) {
    return {
      workspace: null,
      sharedGuides,
      repoGuide: null,
      memoryIndex: null,
      activeContext: null,
      diagnostics,
    };
  }

  return {
    workspace,
    sharedGuides,
    repoGuide: buildFileRecord('repo-guide', workspace.repoGuidePath),
    memoryIndex: buildFileRecord('memory-index', workspace.memoryIndexPath),
    activeContext: buildFileRecord('active-context', workspace.activeContextPath),
    diagnostics,
  };
}

export function buildFormalMemorySummary(context) {
  const sections = [];

  if (context.activeContext?.content) {
    sections.push({
      source: 'active-context',
      path: context.activeContext.path,
      content: context.activeContext.content,
    });
  }

  if (context.memoryIndex?.content) {
    sections.push({
      source: 'memory-index',
      path: context.memoryIndex.path,
      content: context.memoryIndex.content,
    });
  }

  if (context.repoGuide?.content) {
    sections.push({
      source: 'repo-guide',
      path: context.repoGuide.path,
      content: context.repoGuide.content,
    });
  }

  for (const guide of context.sharedGuides ?? []) {
    if (!guide.content) continue;
    sections.push({
      source: `shared-guide:${guide.kind}`,
      path: guide.path,
      content: guide.content,
    });
  }

  return {
    workspace: context.workspace,
    sections,
    text: sections
      .map((section) => `## ${section.source}\n\n${section.content.trim()}`)
      .join('\n\n'),
  };
}
