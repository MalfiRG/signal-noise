import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { CaptureWriter, generateFilename } from '../CaptureWriter';
import type { DesignIntentFile } from '../../types';

let root: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'cw-'));
  await mkdir(path.join(root, 'pending', 'malfi'), { recursive: true });
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('generateFilename', () => {
  it('formats <timestamp>-<slug>-<nonce>.md', () => {
    const f = generateFilename(new Date('2026-04-28T16:20:47Z'), '/blog/some-post', '7c1af4e2');
    expect(f).toBe('2026-04-28T162047-blog-some-post-7c1af4e2.md');
  });
  it('strips disallowed slug chars', () => {
    const f = generateFilename(new Date('2026-04-28T16:20:47Z'), '/Blog/My_Post!', 'abcd1234');
    expect(f).toMatch(/^2026-04-28T162047-blog-my-post-abcd1234\.md$/);
  });
});

describe('CaptureWriter', () => {
  it('serializes a design intent file with frontmatter + body', async () => {
    const writer = new CaptureWriter(root);
    const intent: DesignIntentFile = {
      session_id: '2026-04-28T162047-7c1af4e2',
      project: 'blog',
      page: '/blog/some-post',
      timestamp: '2026-04-28T16:20:47Z',
      panel_layout: 'right-sidebar',
      status: 'pending',
      edits: [{
        type: 'css',
        component: 'PostHeader',
        file: 'src/components/PostHeader.tsx',
        instance_id: 'PostHeader::App>Layout::0::a3f8c91b',
        source_hash: '9f4e8d2c',
        selector: '.post-title',
        changes: { padding: '1.5rem 2rem' },
      }],
    };
    const out = await writer.save('malfi', intent, { rationale: 'Bumped padding for breathing room.' });
    const body = await readFile(out.path, 'utf8');
    expect(body).toMatch(/^---\nsession_id: 2026-04-28T162047-7c1af4e2/);
    expect(body).toMatch(/^# Design Intent — 2026-04-28 16:20$/m);
    expect(body).toMatch(/Bumped padding/);
  });
});
