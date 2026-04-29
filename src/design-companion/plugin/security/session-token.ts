// __DESIGN_COMPANION_DEV_ONLY__
import { randomBytes } from 'node:crypto';

interface TokenRecord {
  ip: string;
  lastSeenMs: number;
}

export interface TokenStoreOptions {
  idleTtlMs?: number;
}

const DEFAULT_IDLE_TTL_MS = 30 * 60 * 1000; // [H14] 30-minute idle TTL

export class TokenStore {
  private active = new Map<string, TokenRecord>();
  private readonly idleTtlMs: number;

  constructor(opts: TokenStoreOptions = {}) {
    this.idleTtlMs = opts.idleTtlMs ?? DEFAULT_IDLE_TTL_MS;
  }

  issue(remoteIp: string): string {
    const t = randomBytes(32).toString('hex');
    this.active.set(t, { ip: remoteIp, lastSeenMs: Date.now() });
    return t;
  }

  validate(t: string, remoteIp: string): boolean {
    if (typeof t !== 'string' || t.length !== 64) return false;
    const rec = this.active.get(t);
    if (!rec) return false;
    // [H14] IP binding: token must come from the IP that issued it.
    if (rec.ip !== remoteIp) return false;
    // [H14] Idle TTL: expire tokens unused for > idleTtlMs.
    if (Date.now() - rec.lastSeenMs > this.idleTtlMs) {
      this.active.delete(t);
      return false;
    }
    rec.lastSeenMs = Date.now();
    return true;
  }

  revoke(t: string): void { this.active.delete(t); }
}
