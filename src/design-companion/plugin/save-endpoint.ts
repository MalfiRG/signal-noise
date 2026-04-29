// __DESIGN_COMPANION_DEV_ONLY__
import * as path from 'node:path';
import type { DesignIntentFile, CssEdit } from '../types';
import { CaptureWriter, generateFilename } from '../core/CaptureWriter';
import { atomicWrite } from './atomic-write';
import { isSameOrigin } from './security/origin-referer-check';
import { isSafeSelector } from './security/selector-regex';
import { isSafeCssValue } from './security/value-allowlist';
import { sanitizePendingPath } from './security/path-sanitize';
import type { TokenStore } from './security/session-token';

// [C7] Endpoint runs on the loopback listener at port 8081 — same origin checks accept that origin.
// Port 8080 is the Vite SPA host; Phase 1 Task 1.0c registers the editor route at port 8080,
// and the SPA fetches the listener on 8081 (cross-origin from the listener's perspective). Both ports are loopback-only.
const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export interface SaveRequest {
  headers: Record<string, string | undefined>;
  body: { author: string; intent: DesignIntentFile; rationale: string; notes?: string };
  remoteAddress: string;
  designIntentsRoot: string;
  tokenStore: TokenStore;
  // [H3] Registry allowlist — Set of `edit.file` paths discovered via discoverDesignableSpecs.
  allowedFiles: Set<string>;
}
export interface SaveResponse {
  status: number;
  body: { ok?: true; path?: string; error?: string; detail?: string };
}

const reject = (status: number, error: string, detail: string): SaveResponse =>
  ({ status, body: { error, detail } });

export const handleSaveRequest = async (req: SaveRequest): Promise<SaveResponse> => {
  // 1. Loopback gate (defense-in-depth; the loopback listener already enforces this at TCP).
  if (!LOOPBACK.has(req.remoteAddress)) return reject(403, 'AUTH', 'non-loopback');
  // 2. Token (IP-bound).
  const token = req.headers['x-design-token'];
  if (!token || !req.tokenStore.validate(token, req.remoteAddress)) return reject(401, 'AUTH', 'token');
  // 3. Origin/Referer (with Referer fallback per M3).
  if (!isSameOrigin(
    ALLOWED_ORIGINS,
    req.headers.origin,
    req.headers.referer,
    req.headers['sec-fetch-site'],
    req.headers['content-type'],
  )) return reject(403, 'AUTH', 'origin');

  const { author, intent, rationale } = req.body;

  // [C6 inverted] 4. Validate author as a name BEFORE constructing any path.
  // Plus compute filename + run sanitizer BEFORE writing.
  const date = new Date(intent.timestamp);
  const nonce = intent.session_id.split('-').pop() ?? 'noncenull';
  const filename = generateFilename(date, intent.page, nonce);
  const sanity = sanitizePendingPath(
    path.resolve(req.designIntentsRoot, 'pending'),
    author,
    filename,
  );
  if (!sanity.ok) return reject(400, 'SCHEMA', sanity.reason);

  // 5. Per-edit schema + registry-allowlist + value-allowlist.
  for (const edit of intent.edits) {
    // [H3] Reject edits whose `file:` is not in the registry-allowlist.
    if (!req.allowedFiles.has(edit.file)) return reject(400, 'SCHEMA', 'file:not-in-registry');
    if (edit.type === 'css') {
      const css = edit as CssEdit;
      if (!isSafeSelector(css.selector)) return reject(400, 'SCHEMA', 'selector');
      for (const [k, v] of Object.entries(css.changes)) {
        if (!isSafeCssValue(k, v)) return reject(400, 'SCHEMA', `value:${k}`);
      }
    }
  }

  // 6. Atomic-write to the pre-validated path. `CaptureWriter.save` accepts the absolute
  // path so it bypasses internal path construction (per C6).
  const writer = new CaptureWriter(req.designIntentsRoot);
  try {
    const out = await writer.save(author, intent, { rationale }, { absolutePath: sanity.absolute });
    return { status: 200, body: { ok: true, path: out.path } };
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? 'UNKNOWN';
    if (code === 'ENOSPC') return reject(507, 'ENOSPC', 'disk full');
    if (code === 'EACCES') return reject(403, 'EACCES', 'permission');
    if (code === 'EBUSY') return reject(409, 'EBUSY', 'file locked');
    return reject(500, 'SCHEMA', String((e as Error).message));
  }
};
