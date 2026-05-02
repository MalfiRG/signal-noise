import { describe, it, expect } from 'vitest';
import { sanitizePendingPath } from '../security/path-sanitize';

const ROOT = '/repo/design-intents/pending';

describe('sanitizePendingPath', () => {
  it.each([
    ['malfi', '2026-04-28T120000-home-7c1a.md', true],
    ['malfi', '../escape.md', false],
    ['../etc', 'passwd', false],
    ['malfi', 'home%2e%2e/escape.md', false],
    ['malfi', 'home‮.md', false],
    ['malfi', 'home\x00.md', false],
    // [M4] Extended negative cases:
    ['malfi', '/etc/passwd', false],                              // absolute path
    ['malfi', 'C:\\Windows\\System32\\drivers\\etc\\hosts', false], // Windows absolute
    ['malfi', 'home\\..\\escape.md', false],                      // Windows backslashes
    ['malfi', 'home.md:hidden', false],                           // NTFS streams
    ['malfi', 'home.md.', false],                                 // trailing dot
    ['malfi', 'home.md ', false],                                 // trailing space
    ['malfi', 'h…me.md', false],                             // Unicode ellipsis vs ASCII dots
    ['malfi', '\\\\?\\C:\\evil', false],                          // Windows long-path device prefix
  ])('sanitize(%j, %j) → safe=%j', (author, file, expected) => {
    const r = sanitizePendingPath(ROOT, author, file);
    expect(r.ok).toBe(expected);
  });
});
