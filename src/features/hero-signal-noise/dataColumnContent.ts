export const DC_SEED = "dc-seed-v1";
export const DC_LINE_COUNT = 120;
const ALPHABET = "0123456789ABCDEF.-/#*";

// xfnv1a string hash → 32-bit uint, used as Mulberry32 seed.
function xfnv1a(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Mulberry32 — small, fast, deterministic 32-bit PRNG.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let memo: string | null = null;

export function generateDataColumnContent(): string {
  if (memo !== null) return memo;
  const rng = mulberry32(xfnv1a(DC_SEED));
  const lines: string[] = [];
  for (let i = 0; i < DC_LINE_COUNT; i++) {
    lines.push(ALPHABET[Math.floor(rng() * ALPHABET.length)]);
  }
  // Doubled for seamless infinite-scroll seam (CSS animates -50% translateY).
  memo = [...lines, ...lines].join("\n");
  return memo;
}
