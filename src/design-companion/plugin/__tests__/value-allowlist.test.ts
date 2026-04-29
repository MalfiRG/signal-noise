import { describe, it, expect } from 'vitest';
import { isSafeCssValue } from '../security/value-allowlist';

describe('isSafeCssValue', () => {
  it.each([
    ['color', '#a855f7', true],
    ['color', 'rgb(0,0,0)', true],
    ['color', 'var(--accent-violet)', true],
    ['color', 'url(x)', false],
    ['padding', '1.5rem', true],
    ['padding', '1.5rem 2rem', true],
    ['padding', 'calc(100%-2rem)', false],
    ['margin', '@import "x"', false],
    ['line-height', '1.5', true],
  ])('isSafeCssValue(%j, %j) === %j', (prop, val, expected) => {
    expect(isSafeCssValue(prop, val)).toBe(expected);
  });
});
