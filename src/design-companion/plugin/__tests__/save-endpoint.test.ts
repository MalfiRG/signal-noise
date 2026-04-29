// src/design-companion/plugin/__tests__/save-endpoint.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, readdir } from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { handleSaveRequest } from '../save-endpoint';
import { TokenStore } from '../security/session-token';

let root: string;
let store: TokenStore;
let token: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'save-'));
  await mkdir(path.join(root, 'pending', 'malfi'), { recursive: true });
  store = new TokenStore();
  token = store.issue('127.0.0.1');  // [Corrected 2026-04-29: original Rev 2 said `store.issue()` — TokenStore.issue from Task 0.6 requires `remoteIp: string` for IP-binding (H14).]
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

const headers = (extra: Record<string, string> = {}) => ({
  'origin': 'http://localhost:8081',
  'sec-fetch-site': 'same-origin',
  'content-type': 'application/json',
  'x-design-token': token,
  ...extra,
});
const body = () => ({
  author: 'malfi',
  intent: {
    session_id: '2026-04-28T162047-7c1af4e2',
    project: 'blog',
    page: '/home',
    timestamp: '2026-04-28T16:20:47Z',
    panel_layout: 'right-sidebar' as const,
    status: 'pending' as const,
    edits: [{
      type: 'css' as const,
      component: 'Foo',
      file: 'src/components/Foo.tsx',
      instance_id: 'Foo::App::0::abc12345',
      source_hash: 'def67890',
      selector: '.foo',
      changes: { padding: '1rem' },
    }],
  },
  rationale: 'test',
});

describe('handleSaveRequest', () => {
  const allowedFiles = new Set(['src/components/Foo.tsx']);

  it('writes file on valid request', async () => {
    const r = await handleSaveRequest({
      headers: headers(), body: body(), remoteAddress: '127.0.0.1',
      designIntentsRoot: root, tokenStore: store, allowedFiles,
    });
    expect(r.status).toBe(200);
    const files = await readdir(path.join(root, 'pending', 'malfi'));
    expect(files.length).toBe(1);
  });
  it('rejects non-loopback remote', async () => {
    const r = await handleSaveRequest({
      headers: headers(), body: body(), remoteAddress: '10.0.0.5',
      designIntentsRoot: root, tokenStore: store, allowedFiles,
    });
    expect(r.status).toBe(403);
    expect(r.body.error).toBe('AUTH');
  });
  it('rejects missing token', async () => {
    const h = headers(); delete (h as Record<string, string>)['x-design-token'];
    const r = await handleSaveRequest({
      headers: h, body: body(), remoteAddress: '127.0.0.1',
      designIntentsRoot: root, tokenStore: store, allowedFiles,
    });
    expect(r.status).toBe(401);
  });
  it('rejects bad selector', async () => {
    const b = body();
    b.intent.edits[0].selector = '/* attack */';
    const r = await handleSaveRequest({
      headers: headers(), body: b, remoteAddress: '127.0.0.1',
      designIntentsRoot: root, tokenStore: store, allowedFiles,
    });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('SCHEMA');
  });
  it('rejects unsafe css value', async () => {
    const b = body();
    (b.intent.edits[0] as { changes: Record<string,string> }).changes = { padding: 'url(http://evil)' };
    const r = await handleSaveRequest({
      headers: headers(), body: b, remoteAddress: '127.0.0.1',
      designIntentsRoot: root, tokenStore: store, allowedFiles,
    });
    expect(r.status).toBe(400);
  });
  it('[C6 + F-ADV-03] rejects malicious author BEFORE writing any file', async () => {
    const b = body();
    b.author = '../etc';
    const r = await handleSaveRequest({
      headers: headers(), body: b, remoteAddress: '127.0.0.1',
      designIntentsRoot: root, tokenStore: store, allowedFiles,
    });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('SCHEMA');
    // Critical: no file leaked outside the pending root.
    const { readdir: rd } = await import('node:fs/promises');
    const files = await rd(path.join(root, 'pending', 'malfi'));
    expect(files.length).toBe(0);
  });
  it('[H3] rejects edit.file not in registry allowlist', async () => {
    const b = body();
    b.intent.edits[0].file = 'src/secrets/api-key.ts';
    const r = await handleSaveRequest({
      headers: headers(), body: b, remoteAddress: '127.0.0.1',
      designIntentsRoot: root, tokenStore: store, allowedFiles,
    });
    expect(r.status).toBe(400);
    expect(r.body.detail).toMatch(/file:not-in-registry/);
  });
});
