import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function runGit(cwd, args) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(' ')} failed`);
  }
  return result;
}

export function createWorkspaceFixture() {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mult-agent-workspace-'));
  const memoryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mult-agent-memory-'));
  const workspaceKey = 'workspace-123';
  const workspaceMemoryHome = path.join(memoryRoot, 'workspaces', workspaceKey);

  writeText(
    path.join(memoryRoot, 'workspaces', 'index.json'),
    JSON.stringify(
      {
        version: 1,
        workspaces: {
          [workspaceRoot.toLowerCase()]: {
            key: workspaceKey,
            path: workspaceRoot,
          },
        },
      },
      null,
      2
    )
  );

  writeText(path.join(memoryRoot, 'instructions', 'company', 'GUIDE.md'), '# Company Guide\n\nCompany rules');
  writeText(path.join(memoryRoot, 'instructions', 'user', 'GUIDE.md'), '# User Guide\n\nUser rules');
  writeText(path.join(memoryRoot, 'instructions', 'local', 'GUIDE.md'), '# Local Guide\n\nLocal rules');

  writeText(path.join(workspaceMemoryHome, 'instructions', 'repo', 'GUIDE.md'), '# Repo Guide\n\nRepo rules');
  writeText(path.join(workspaceMemoryHome, 'memories', 'MEMORY.md'), '# MEMORY\n\nWorkspace memory');
  writeText(
    path.join(workspaceMemoryHome, 'runtime', 'active_context.md'),
    '# Compressed Context\n\nCurrent task context'
  );

  writeText(path.join(workspaceRoot, '.omx', 'state', 'ralph-state.json'), '{"mode":"team"}\n');
  writeText(
    path.join(workspaceRoot, '.omx', 'notepad.md'),
    '# Notepad\n\n## PRIORITY\n\nKeep the hottest context here.\n\n## WORKING MEMORY\n\nScratch.\n'
  );
  writeText(path.join(workspaceRoot, '.omx', 'project-memory.json'), '{"should":"be ignored"}\n');
  writeText(path.join(workspaceRoot, '.omx', 'logs', 'events.jsonl'), '{"kind":"telemetry"}\n');

  return {
    memoryRoot,
    workspaceRoot,
    workspaceKey,
    workspaceMemoryHome,
  };
}

export function createSkillsFixture() {
  const skillsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mult-agent-skills-'));
  writeText(
    path.join(skillsRoot, 'planner', 'SKILL.md'),
    '# Planner\n\nPlan the work before implementation.\n'
  );
  writeText(
    path.join(skillsRoot, '.system', 'reviewer', 'SKILL.md'),
    '# Reviewer\n\nReview changes for bugs and regressions.\n'
  );

  return {
    skillsRoot,
  };
}

export function createGitRepoFixture() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mult-agent-git-repo-'));
  writeText(path.join(repoRoot, 'README.md'), '# Test Repo\n');
  runGit(repoRoot, ['init']);
  runGit(repoRoot, ['config', 'user.name', 'Test User']);
  runGit(repoRoot, ['config', 'user.email', 'test@example.com']);
  runGit(repoRoot, ['add', '.']);
  runGit(repoRoot, ['commit', '-m', 'Initial commit']);

  return {
    repoRoot,
  };
}
