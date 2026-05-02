import { describe, it, expect, beforeEach } from 'vitest';
import { saveUnsavedBuffer, restoreUnsavedBuffer, clearUnsavedBuffer } from '../sessionStore';

describe('sessionStore', () => {
  beforeEach(() => sessionStorage.clear());
  it('round-trips buffer per instance_id', () => {
    saveUnsavedBuffer('A', { color: 'red' });
    expect(restoreUnsavedBuffer('A')).toEqual({ color: 'red' });
  });
  it('clearUnsavedBuffer removes the entry', () => {
    saveUnsavedBuffer('A', { color: 'red' });
    clearUnsavedBuffer('A');
    expect(restoreUnsavedBuffer('A')).toBeNull();
  });
});
