// __DESIGN_COMPANION_DEV_ONLY__
import * as path from 'node:path';

export type SanitizeResult =
  | { ok: true; absolute: string }
  | { ok: false; reason: string };

const NAME_RE = /^[a-z0-9-]+$/;
// Filename matches the literal output of generateFilename: `YYYY-MM-DDTHHMMSS-<slug>-<nonce>.md`.
// Allow `T` (uppercase, separator), digits, lowercase, hyphens; reject everything else.
const FILENAME_RE = /^[0-9][0-9A-Za-z-]*\.md$/;

/* eslint-disable no-control-regex, no-irregular-whitespace -- security regex requires literal NULL byte + bidi/ZWSP codepoints */
const containsDangerousByte = (s: string): boolean =>
  /\x00/.test(s) ||
  /[​-‏‪-‮⁦-⁩]/.test(s) ||  // bidi-override + zero-width
  /[…]/.test(s) ||                                    // Unicode ellipsis NFC/NFKC fold guard
  /%2e%2e/i.test(s) ||
  /\\/.test(s) ||                                          // any backslash (Windows separator)
  /\//.test(s) ||                                          // any forward-slash (path separator in filename)
  /:/.test(s) ||                                           // NTFS stream syntax
  /[. ]$/.test(s) ||                                       // trailing dot or space
  s.includes('..');
/* eslint-enable no-control-regex, no-irregular-whitespace */

export const sanitizePendingPath = (
  pendingRoot: string,
  author: string,
  filename: string,
): SanitizeResult => {
  if (containsDangerousByte(author) || containsDangerousByte(filename)) {
    return { ok: false, reason: 'forbidden bytes' };
  }
  if (!NAME_RE.test(author)) return { ok: false, reason: 'author format' };
  if (!FILENAME_RE.test(filename)) return { ok: false, reason: 'filename format' };
  if (path.isAbsolute(filename)) return { ok: false, reason: 'absolute path' };
  const absolute = path.resolve(pendingRoot, author, filename);
  const expectedPrefix = path.resolve(pendingRoot) + path.sep;
  if (!absolute.startsWith(expectedPrefix)) {
    return { ok: false, reason: 'escape attempt' };
  }
  return { ok: true, absolute };
};
