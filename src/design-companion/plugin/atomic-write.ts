// __DESIGN_COMPANION_DEV_ONLY__
import { open, rename, unlink, lstat, realpath, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { randomBytes } from 'node:crypto';
import * as path from 'node:path';

// Linux/macOS: O_NOFOLLOW is 0x100000. Windows: not supported (fall back to lstat-only).
const O_NOFOLLOW = (constants as { O_NOFOLLOW?: number }).O_NOFOLLOW ?? 0x100000;

export const atomicWrite = async (target: string, content: string): Promise<void> => {
  // [F-ADV-29] Ensure parent dir exists before opening tmp.
  const dir = path.dirname(target);
  await mkdir(dir, { recursive: true });

  // [C8] Realpath the parent directory to defeat parent-symlink chains.
  let dirReal: string;
  try {
    dirReal = await realpath(dir);
  } catch (e) {
    throw new Error(`refusing: parent dir realpath failed (${dir}): ${(e as Error).message}`);
  }
  if (dirReal !== dir) {
    throw new Error(`refusing: parent dir is a symlink chain (${dir} → ${dirReal})`);
  }

  // Existing target: must not be a symlink.
  try {
    const lst = await lstat(target);
    if (lst.isSymbolicLink()) throw new Error(`refusing to follow symlink: ${target}`);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }

  const tmpName = `.tmp-${randomBytes(8).toString('hex')}`;
  const tmp = path.join(dir, tmpName);
  // [C8] O_NOFOLLOW closes the lstat-vs-open TOCTOU window.
  const fh = await open(
    tmp,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | O_NOFOLLOW,
  );
  try {
    await fh.writeFile(content, 'utf8');
    await fh.sync();
  } finally {
    await fh.close();
  }
  try {
    await rename(tmp, target);
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  }
};
