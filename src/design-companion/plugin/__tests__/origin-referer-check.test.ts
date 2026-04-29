import { describe, it, expect } from 'vitest';
import { isSameOrigin } from '../security/origin-referer-check';

describe('isSameOrigin (Origin + Referer fallback)', () => {
  const allowed = ['http://127.0.0.1:8081', 'http://localhost:8081'];
  it.each([
    [{ origin: 'http://localhost:8081', referer: '', sfs: 'same-origin', ct: 'application/json' }, true],
    [{ origin: 'http://127.0.0.1:8081', referer: '', sfs: 'same-origin', ct: 'application/json' }, true],
    [{ origin: 'http://evil.example', referer: '', sfs: 'same-origin', ct: 'application/json' }, false],
    [{ origin: 'http://localhost:8081', referer: '', sfs: 'cross-site', ct: 'application/json' }, false],
    [{ origin: 'http://localhost:8081', referer: '', sfs: 'same-origin', ct: 'multipart/form-data' }, false],
    [{ origin: '', referer: '', sfs: 'same-origin', ct: 'application/json' }, false],
    // [M3] Referer fallback when Origin is absent (e.g., older browsers / strict referrer policy)
    [{ origin: '', referer: 'http://localhost:8081/__design', sfs: 'same-origin', ct: 'application/json' }, true],
    [{ origin: '', referer: 'http://evil.example/path', sfs: 'same-origin', ct: 'application/json' }, false],
  ])('isSameOrigin(%j) === %j', (req, expected) => {
    expect(isSameOrigin(allowed, req.origin, req.referer, req.sfs, req.ct)).toBe(expected);
  });
});
