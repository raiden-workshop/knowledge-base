import { DEFAULT_MEMORY_ROOT } from '../constants.js';
import {
  RuntimeArtifactWriteError,
  guardWritePath,
} from '../policy/path-guard.js';

export const TEAM_ROLE_LEADER = 'leader';
export const TEAM_ROLE_WORKER = 'worker';
export const TEAM_ROLE_MAIN = 'main';

export function canTriggerFormalMemoryRefresh(role) {
  return role === TEAM_ROLE_LEADER || role === TEAM_ROLE_MAIN;
}

export function assertFormalMemoryRefreshAuthority(role) {
  if (!canTriggerFormalMemoryRefresh(role)) {
    throw new Error(`Role "${role}" cannot trigger formal memory refresh.`);
  }
}

export function assertTeamWriteAccess({
  role,
  targetPath,
  cwd = process.cwd(),
  memoryRoot = DEFAULT_MEMORY_ROOT,
}) {
  if (!role) {
    throw new Error('A team role is required to validate write access.');
  }

  const result = {
    role,
    ...guardWritePath(targetPath, { cwd, memoryRoot }),
  };

  if (role === TEAM_ROLE_WORKER && !['worker-run', 'telemetry'].includes(result.classification)) {
    throw new RuntimeArtifactWriteError(targetPath, role);
  }

  return result;
}
