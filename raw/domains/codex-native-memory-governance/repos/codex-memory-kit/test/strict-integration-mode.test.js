import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseBooleanFlag,
  resolveStrictIntegrationConfig,
} from '../src/contracts/strict-integration-mode.js';

test('parseBooleanFlag parses supported truthy and falsy values', () => {
  assert.equal(parseBooleanFlag('1'), true);
  assert.equal(parseBooleanFlag('TRUE'), true);
  assert.equal(parseBooleanFlag('0'), false);
  assert.equal(parseBooleanFlag('off'), false);
  assert.equal(parseBooleanFlag('maybe'), null);
});

test('resolveStrictIntegrationConfig respects env overrides', () => {
  const config = resolveStrictIntegrationConfig({
    cwd: '/tmp/example',
    env: {
      OMX_STRICT_MEMORY_MODE: '1',
      OMX_EXTERNAL_MEMORY_ROOT: '/tmp/memory-root',
    },
  });

  assert.equal(config.strictMode, true);
  assert.equal(config.cwd, '/tmp/example');
  assert.equal(config.memoryRoot, '/tmp/memory-root');
});
