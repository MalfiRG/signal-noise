import { describe, it, expect, vi } from 'vitest';
import { TokenStore } from '../security/session-token';

describe('TokenStore', () => {
  it('issues 32-byte hex tokens', () => {
    const store = new TokenStore();
    const t = store.issue('127.0.0.1');
    expect(t).toMatch(/^[a-f0-9]{64}$/);
  });
  it('validates a known token from the same IP', () => {
    const store = new TokenStore();
    const t = store.issue('127.0.0.1');
    expect(store.validate(t, '127.0.0.1')).toBe(true);
  });
  it('rejects unknown tokens', () => {
    const store = new TokenStore();
    expect(store.validate('a'.repeat(64), '127.0.0.1')).toBe(false);
  });
  it('rejects revoked tokens', () => {
    const store = new TokenStore();
    const t = store.issue('127.0.0.1');
    store.revoke(t);
    expect(store.validate(t, '127.0.0.1')).toBe(false);
  });
  it('[H14] rejects tokens from a different remote IP', () => {
    const store = new TokenStore();
    const t = store.issue('127.0.0.1');
    expect(store.validate(t, '10.0.0.5')).toBe(false);
  });
  it('[H14] expires tokens after the idle TTL', () => {
    vi.useFakeTimers();
    const store = new TokenStore({ idleTtlMs: 1000 });
    const t = store.issue('127.0.0.1');
    vi.advanceTimersByTime(1500);
    expect(store.validate(t, '127.0.0.1')).toBe(false);
    vi.useRealTimers();
  });
});
