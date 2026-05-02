import { describe, it, expect } from 'vitest';
import { isSafeSelector } from '../security/selector-regex';

describe('isSafeSelector', () => {
  it.each([
    ['.post-title', true],
    ['#hero', true],
    ['div.foo[data-x="y"]:hover', true],
    ['.a > .b + .c', true],
    ['/* comment */', false],
    ['url(http://evil)', false],
    ['.x\nbreak', false],
    ['<script>', false],
    ['.x;color:red', false],
    ['.PostHeader', false], // [M8] uppercase rejected — no `i` flag in regex
  ])('isSafeSelector(%j) === %j', (input, expected) => {
    expect(isSafeSelector(input)).toBe(expected);
  });
});
