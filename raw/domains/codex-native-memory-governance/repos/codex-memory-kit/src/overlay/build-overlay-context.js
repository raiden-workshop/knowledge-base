import fs from 'node:fs';
import path from 'node:path';

import {
  buildFormalMemorySummary,
  readFormalMemoryContext,
} from '../integration/external-memory.js';

function readTextFileIfPresent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

function listStateFiles(omxRoot) {
  const stateDir = path.join(omxRoot, 'state');
  try {
    return fs
      .readdirSync(stateDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('-state.json'))
      .map((entry) => path.join(stateDir, entry.name))
      .sort();
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  }
}

function extractMarkdownSection(markdown, headingName) {
  if (!markdown) return null;

  const lines = markdown.split('\n');
  const normalizedHeading = headingName.trim().toLowerCase();
  let capture = false;
  const collected = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const currentHeading = headingMatch[2].trim().toLowerCase();
      if (capture) break;
      if (currentHeading === normalizedHeading) {
        capture = true;
      }
      continue;
    }

    if (capture) {
      collected.push(line);
    }
  }

  const section = collected.join('\n').trim();
  return section || null;
}

function readNotepadPriority(omxRoot) {
  const notepadPath = path.join(omxRoot, 'notepad.md');
  const markdown = readTextFileIfPresent(notepadPath);
  const content = extractMarkdownSection(markdown, 'PRIORITY');
  if (!content) return null;

  return {
    source: 'notepad-priority',
    path: notepadPath,
    content,
  };
}

export function buildOverlaySections({
  cwd = process.cwd(),
  memoryRoot,
  omxRoot = path.join(cwd, '.omx'),
}) {
  const sections = [];

  for (const stateFile of listStateFiles(omxRoot)) {
    const content = readTextFileIfPresent(stateFile);
    if (!content) continue;
    sections.push({
      source: 'omx-state',
      path: stateFile,
      content,
    });
  }

  const formalMemoryContext = readFormalMemoryContext({ cwd, memoryRoot });
  const formalSummary = buildFormalMemorySummary(formalMemoryContext);
  sections.push(...formalSummary.sections);

  const notepadPriority = readNotepadPriority(omxRoot);
  if (notepadPriority) sections.push(notepadPriority);

  return sections;
}

export function renderOverlayContext(sections) {
  return sections
    .map((section) => `## ${section.source}\n\n${section.content.trim()}`)
    .join('\n\n');
}

export function buildOverlayContext(options) {
  const sections = buildOverlaySections(options);
  return {
    sections,
    text: renderOverlayContext(sections),
  };
}
