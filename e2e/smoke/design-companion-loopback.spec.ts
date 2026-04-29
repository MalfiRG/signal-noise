import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';

test.describe.configure({ mode: 'serial' });

test('non-loopback connect to listener is refused at TCP level [C7]', async ({ request }) => {
  // Discover the LAN IP (drifts across reboots — see workspace rule
  // brainstorm-server-network.md / fix-wsl-portproxy.ps1).
  const lanIp = execSync('hostname -I', { encoding: 'utf8' }).trim().split(/\s+/)[0];
  if (!lanIp || lanIp === '127.0.0.1') {
    test.skip(true, 'no LAN IP — only loopback is reachable');
    return;
  }
  let connRefused = false;
  try {
    await request.get(`http://${lanIp}:8081/__design`, { timeout: 2000 });
  } catch (e) {
    connRefused = /ECONNREFUSED|ETIMEDOUT|ENETUNREACH/.test((e as Error).message);
  }
  expect(connRefused).toBe(true);
});
