import fs from 'node:fs';
import path from 'node:path';

import { buildFormalMemorySummary, readFormalMemoryContext } from './external-memory.js';

function readLocalProjectMemory(omxRoot) {
  const projectMemoryPath = path.join(omxRoot, 'project-memory.json');
  try {
    const raw = fs.readFileSync(projectMemoryPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      path: projectMemoryPath,
      exists: true,
      raw,
      parsed,
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return {
        path: projectMemoryPath,
        exists: false,
        raw: null,
        parsed: null,
      };
    }
    throw error;
  }
}

export function readProjectMemoryView({
  cwd = process.cwd(),
  memoryRoot,
  strictMode = false,
  omxRoot = path.join(cwd, '.omx'),
} = {}) {
  const formalContext = readFormalMemoryContext({ cwd, memoryRoot });
  const formalSummary = buildFormalMemorySummary(formalContext);
  const localProjectMemory = readLocalProjectMemory(omxRoot);

  if (strictMode || !localProjectMemory.exists) {
    return {
      mode: strictMode ? 'strict-formal-memory' : 'formal-memory-fallback',
      source: 'formal-memory',
      workspace: formalSummary.workspace,
      sections: formalSummary.sections,
      text: formalSummary.text,
      localProjectMemory,
      diagnostics: [
        ...(formalContext.diagnostics ?? []),
        ...(strictMode
          ? [
              {
                kind: 'local-project-memory-ignored',
                message:
                  'Strict integration mode ignores .omx/project-memory.json and uses the formal workspace memory summary.',
              },
            ]
          : []),
      ],
    };
  }

  return {
    mode: 'local-project-memory',
    source: 'local-project-memory',
    workspace: formalSummary.workspace,
    sections: [
      {
        source: 'local-project-memory',
        path: localProjectMemory.path,
        content: JSON.stringify(localProjectMemory.parsed, null, 2),
      },
    ],
    text: JSON.stringify(localProjectMemory.parsed, null, 2),
    localProjectMemory,
    diagnostics: formalContext.diagnostics ?? [],
  };
}
