import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { atomicWrite } from '../atomic-write';
import { mkdtemp, rm, readFile, writeFile, symlink, mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

let dir: string;
beforeEach(async () => { dir = await mkdtemp(path.join(tmpdir(), 'aw-')); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

describe('atomicWrite', () => {
  it('writes content and leaves no .tmp file', async () => {
    const target = path.join(dir, 'out.md');
    await atomicWrite(target, 'hello');
    expect(await readFile(target, 'utf8')).toBe('hello');
    const { readdir } = await import('node:fs/promises');
    const files = await readdir(dir);
    expect(files.filter(f => f.startsWith('.tmp-'))).toEqual([]);
  });
  it('refuses to follow symlinks (O_NOFOLLOW guard)', async () => {
    const real = path.join(dir, 'real.md');
    await writeFile(real, 'real');
    const link = path.join(dir, 'link.md');
    await symlink(real, link);
    await expect(atomicWrite(link, 'overwrite')).rejects.toThrow();
  });
  it('refuses when parent dir is a symlink chain [C8]', async () => {
    const realDir = path.join(dir, 'realdir');
    const linkDir = path.join(dir, 'linkdir');
    await mkdir(realDir);
    await symlink(realDir, linkDir);
    const target = path.join(linkDir, 'out.md');
    await expect(atomicWrite(target, 'hello')).rejects.toThrow(/symlink chain/);
  });
});
