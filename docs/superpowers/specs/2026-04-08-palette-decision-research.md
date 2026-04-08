---
name: Palette Decision Research — Violet + Amber + CP2077
date: 2026-04-08
author: ux-research-agent
---

# Palette Decision Research

## 1. UX Case for 2 vs 3 vs 4 Themes

**Scope note:** This section concerns *user-selectable* themes — the dots in `ThemeSelector.tsx`. The codebase also contains `.theme-reading` (a separate light-mode visual state automatically applied on `/blog/:slug` and `/how-i-do-it/:slug` routes via `App.tsx:22`), but reading mode is not in the picker. It's a context theme, not a choice theme, so it sits outside the cognitive-load analysis below.

Hick's Law (Hick & Hyman, 1952) gives a logarithmic decision-time model for homogeneous menu choices: `RT = a + b × log₂(n+1)`. Theme dots aren't strictly that — they're categorical visual stimuli, which activate parallel feature detection rather than serial evaluation, so the formula is a heuristic framing rather than a quantitative law. With that caveat, the qualitative direction holds: more options = more friction at the picker, and a theme switcher is a personality signal, not a product feature. Visitors don't come to pick themes; they come to read your work.

Laws of UX cites Hick's Law to recommend reducing decision latency when first-impression speed matters and highlighting a single intentional default. For a theme picker, "highlighting a recommended option" maps to having a clearly chosen default — which violet now is.

Developer portfolio comparisons: Brittany Chiang's v4 (brittanychiang.com) uses a single palette (teal/navy) with zero switching. Josh Comeau (joshwcomery.com) added a light/dark toggle — 2 options, zero overhead. Cassie Evans's portfolio uses a pastel system that shifts slightly by section, but still no explicit picker. The pattern in these specific portfolios is zero or one switch. Note the citation works in one direction only: these are senior developers whose portfolios succeed on content authority — the same evidence could equally argue for *one* theme rather than *two*. The two-theme position is a judgment call about personality signal vs friction, not a finding from the cited examples.

**Verdict:** 2 themes (violet + amber) is the UX-optimal configuration for this site. 3 themes (add CP2077) is acceptable if CP2077 is sufficiently distinct from violet and adds brand value that justifies the extra dot. The research below evaluates whether it does.

---

## 2. Cyberpunk 2077 Canonical Palette

### Source Colors

CP2077's visual identity is built around a small, hot palette. Sources: color-hex.com's "Cyberpunk 2077 UI Colors" palette (community-extracted from game assets), ColorsWall palette #154112 (from marketing materials), and Adobe Color CP2077 community theme #14418458.

| Role | Hex | Source |
|---|---|---|
| **Primary yellow** | `#f3e600` / `#f2e900` | UI palette (color-hex #1041326); marketing (colorswall #154112) |
| **Cyan / electric blue** | `#55ead4` / `#02d7f2` | UI palette; marketing |
| **Deep red / alert** | `#c5003c` | UI palette (health/danger states) |
| **Dark background** | `#000000` / `#00060e` | Title card base; near-black with blue tint |
| **Secondary yellow** | `#9a9f17` | Title card (desaturated variant) |

The canonical CP2077 signature is: **electric yellow (`#f3e600`) + teal-cyan (`#55ead4`) on near-black.** Magenta/hot-pink doesn't appear in the UI palette itself — that's a fan art and third-party interpretation. The actual game UI is yellow + cyan + red-alert on black, not the magenta-heavy aesthetic people often assume.

### HSL Adaptation

Before designing the block, I read both `.theme-violet` (lines 221–259) and `.theme-amber` (lines 269–307). Each theme block defines 39 CSS variables. The pattern is consistent: background and card at H 10% L 5–8%, foreground at H 100% L 85%, primary at H 100% L 50–65%, accent at a complementary hue, matrix-rain-color matching primary, hero-orb vars with alpha fractions.

CP2077's primary yellow in HSL: `#f3e600` → H≈57°, S=100%, L≈48%. In CSS: `57 100% 48%`.
Cyan `#55ead4` → H≈171°, S≈77%, L≈63%`. In CSS: `171 77% 63%`.

```css
/* ========== THEME: CYBERPUNK 2077 — Night City neon ========== */
.theme-cyberpunk {
  /* Background: near-black with a faint blue cast (Night City darkness) */
  --background: 222 15% 5%;
  /* Foreground: warm cream-yellow text — distinguishable from primary */
  --foreground: 57 80% 82%;

  /* Cards slightly lighter than background with same hue family */
  --card: 222 15% 8%;
  --card-foreground: 57 80% 82%;

  --popover: 222 15% 8%;
  --popover-foreground: 57 80% 82%;

  /* PRIMARY: CP2077 signature yellow — #f3e600 equivalent */
  --primary: 57 100% 48%;
  --primary-foreground: 222 15% 5%;

  /* SECONDARY: muted dark surface for UI chrome */
  --secondary: 222 20% 14%;
  --secondary-foreground: 57 80% 82%;

  /* MUTED: subtle dark panel */
  --muted: 222 15% 15%;
  --muted-foreground: 222 30% 55%;

  /* ACCENT: teal-cyan (#55ead4 family) — the counter-signature color */
  --accent: 171 77% 60%;
  --accent-foreground: 222 15% 5%;

  /* Destructive stays universal red */
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;

  /* Borders: very subtle dark with blue cast */
  --border: 222 30% 16%;
  --input: 222 30% 16%;
  --ring: 57 100% 48%;

  /* Sidebar mirrors main surface */
  --sidebar-background: 222 15% 6%;
  --sidebar-foreground: 57 80% 82%;
  --sidebar-primary: 57 100% 48%;
  --sidebar-primary-foreground: 222 15% 5%;
  --sidebar-accent: 222 20% 14%;
  --sidebar-accent-foreground: 57 80% 82%;
  --sidebar-border: 222 30% 16%;
  --sidebar-ring: 57 100% 48%;

  /* Glow: yellow matrix glow, not purple or green */
  --matrix-glow: 0 0 20px hsl(57 100% 48% / 0.5), 0 0 40px hsl(57 100% 48% / 0.2);
  --matrix-text-glow: 0 0 10px hsl(57 100% 48% / 0.8);

  /* Rain falls in CP2077 yellow */
  --matrix-rain-color: 57 100% 48%;
  --scrollbar-thumb: 222 30% 22%;

  /* Prose: warm readable yellow for body, brighter for headings */
  --prose-body: 57 50% 68%;
  --prose-heading-2: 57 100% 75%;
  --prose-heading-3: 57 80% 65%;
  --prose-quote: 171 50% 55%;

  /* Hero orbs: primary yellow bloom + cyan counter-bloom */
  --hero-orb-primary: 57 100% 48% / 0.18;
  --hero-orb-accent: 171 77% 60% / 0.14;
}

@media (max-width: 640px) {
  .theme-cyberpunk {
    --matrix-text-glow: 0 0 6px hsl(57 100% 48% / 0.4);
    --matrix-glow: 0 0 12px hsl(57 100% 48% / 0.3);
  }
}
```

**Color choice justifications:**

- `--background: 222 15% 5%` — Night City's signature look is a slightly blue-tinted darkness, not pure black. The 222° hue (cool blue-navy family) adds depth and differentiates it from amber's warm-neutral black.
- `--foreground: 57 80% 82%` — Body text can't be the same yellow as the primary button. Desaturated + lightened to 82% gives readable warm cream that's clearly "of the same family" as the primary without competing with it. Contrast vs background: ~9:1, WCAG AAA.
- `--primary: 57 100% 48%` — Direct HSL transcription of #f3e600. Full saturation, slightly sub-50% lightness keeps it vivid without washing out. Contrast vs background: ~15:1, exceptional.
- `--accent: 171 77% 60%` — CP2077's teal-cyan (#55ead4). Used for accent states, quote marks, orb secondary. Creates electric tension against yellow — this is the core visual identity of the game's UI.
- `--muted-foreground: 222 30% 55%` — Steel-blue muted text reads as "system UI" tone, consistent with a Night City HUD aesthetic.
- `--prose-quote: 171 50% 55%` — Quote blocks in teal make them feel like terminal output or intel intercepts, which fits the CP2077 aesthetic and is distinct from heading hierarchy.

---

## 3. The MatrixRain Identity Question

This is the hardest call in the document, so I'll state my position upfront: **drop the rain entirely (option c).**

Here's why.

The rain was never really about Katakana. It was about vibe density — the sense that the page is alive, pulsing with data. That job is now being done by the ambient orbs added in the portfolio polish pass. The orbs react to the theme color via CSS vars, they're hardware-accelerated via `mix-blend-mode: screen` and Framer Motion's rAF-backed animation (60fps cap), and they don't hammer the GPU every 50ms the way the canvas interval loop does. The applicable accessibility criterion for the rain is **WCAG 2.2.2 (Pause, Stop, Hide, Level A)** — moving content that auto-starts and lasts longer than 5 seconds must offer a mechanism to pause or hide it. The rain provides no such control. It does NOT trigger WCAG 2.3.1 (Three Flashes — the rain scrolls continuously, doesn't flash) and 2.1.1 (Keyboard) is unrelated to ambient animation.

**Scope clarification:** Both the rain AND the orbs are scoped to the home page only — `MatrixRain` is imported in `Index.tsx` (not in App-level layout), and the orbs render inside the Index hero section. The "orbs replace the rain" argument is therefore an *in-place* swap on the home page, not a sitewide simplification. The other pages (projects, skills, blog, how-i-do-it) currently have neither rain nor orbs as ambient effects, and that doesn't change.

The dissonance argument is also real but secondary. Violet rain is not actually "wrong" — Tron, Ghost in the Shell, and half of actual cyberpunk media uses colored data rain that isn't green. The problem isn't brand confusion, it's that the rain is now redundant. You have two visual interest systems competing in the hero area on the same page.

**Option (a) — recolor and keep:** Viable as a short-term hold, but you're paying GPU/battery cost and 2.2.2 accessibility surface area to maintain an effect that no longer has a clear semantic reason to exist.

**Option (b) — replace Katakana with neutral chars:** Adds implementation complexity for no UX gain. "Code rain" with Latin chars/symbols reads as generic hackerman aesthetic, not as a specific identity statement. Weak signal vs high maintenance.

**Option (c) — remove:** Clean. Accessible. Lets the orbs breathe in the hero. Saves 79 lines of canvas logic. The `--matrix-rain-color` and `--matrix-glow` CSS variables can stay in the token set for forward compatibility (future themes may reference them; removing a variable other code points to is a breaking change).

**Does the formal blog NAME need to change?** No. "The Digital Matrix" doesn't belong to the film's rain effect — it belongs to the metaphor of interconnected digital systems, data meshes, the invisible infrastructure under modern computing. Piotr's actual content domain (QA engineering, AI pipelines, devops) is precisely "the matrix" in the infrastructural sense. **Note on the two-name system:** the navbar displays `>_ SDET_PORTFOLIO` (`Navbar.tsx:48`) as the casual terminal-handle visual brand; "The Digital Matrix" is the formal title in `<title>`, OpenGraph metadata, the GitHub repo name, and the projects-list self-entry. Both names coexist intentionally, like a callsign vs a legal name. Dropping the rain doesn't affect either.

---

## 4. Decision Matrix: 2 vs 3 Themes

WCAG contrast ratios calculated from CSS HSL values using WCAG 2.1 relative luminance formula (sRGB linearization). "Body text" = foreground vs background. "Primary" = primary vs background. **Scores below assume the violet primary lightness fix described in the Accessibility row (L=60% → L=65%) is applied; without that fix, both configurations lose 1 accessibility point.**

| Dimension | 2 Themes (violet + amber) | 3 Themes (+ CP2077) | Notes |
|---|---|---|---|
| **Cognitive load** | **5** — Two dots: minimal friction. | **4** — Three dots: still well within tolerance. Hick's Law gives a heuristic direction (more options = more friction) but doesn't apply quantitatively to categorical visual stimuli — picker dots activate parallel feature detection, not serial menu evaluation. | Direction is real, magnitude is hand-wavy |
| **Identity coherence** | **4** — Violet = Tron/synthwave, amber = retro terminal. Two distinct aesthetic universes. | **3** — Adding CP2077 yellow risks visual overlap: violet already covers "dark neon game aesthetic." At full-screen scale the flavors are distinct (amber = warm vintage incandescent, CP2077 = cold electric neon), but at picker-dot scale (~12px circle) the disambiguation is weaker than ideal. | Stronger anti-CP2077 argument: violet already occupies the "neon game" register |
| **Maintenance cost** | **5** — Two theme blocks, 39 tokens each = 78 tokens total. | **4** — Three theme blocks = 117 tokens. Adding any new CSS variable in the future means editing 3 blocks instead of 2 — linear, not exponential. The cost is real but small per token. | One extra block of additive cost |
| **Accessibility** | **5*** (with violet primary fix) — Violet body: 11.0:1 (AAA). Amber body: 12.2:1 (AAA). Amber primary on bg: 8.85:1 (AAA). Violet primary on bg AT CURRENT L=60%: **3.98:1 (FAILS WCAG AA, 4.5:1 needed)** — and `text-primary` IS used as readable text in `Navbar.tsx:39` (active nav links: HOME/PROJECTS/SKILLS/BLOG) and `Index.tsx:43` (VIEW PROJECTS CTA). **Required fix:** bump `--primary` for violet from `270 100% 60%` to `270 100% 65%`, raising contrast to ~5.5:1 (AA pass). With the fix applied, both themes are AAA on body text and AA on primary text. | **4*** (with the same violet fix) — CP2077 body text: 17.0:1 (AAA). CP2077 primary on bg: 15.4:1 (AAA). All three themes accessible after the violet fix. | Decorative glow elements exempt from WCAG 1.4.3; the issue is `text-primary` being a real readable text color, not just glow |
| **Differentiation value** | **4** — Amber and violet are strongly differentiated visually and emotionally. | **3** — CP2077 adds a third aesthetic register, but it overlaps with violet on "neon-on-black game aesthetic" enough that the personality gain is incremental rather than categorical. | Marginal personality gain at full maintenance cost |

**Composite (with violet primary L=65% fix applied):**

| Configuration | Total | Average |
|---|---|---|
| 2 themes | 23/25 | 4.6 |
| 3 themes | 18/25 | 3.6 |

The 2-theme configuration still wins clearly. The fix recalibration narrows the gap by 0.2 (3 themes goes from 3.4 to 3.6 because the maintenance cost penalty was inflated), but the conclusion is unchanged.

---

## 5. Final Recommendation

**Ship 2 themes. Bump violet primary lightness to 65%. Drop the rain. Keep both names.**

Violet as default is the right call — it's the strongest visual identity in the set, differentiated from every other QA engineer's portfolio, and reads as intentional rather than nostalgic. **Required pre-ship fix:** the violet primary at the current `270 100% 60%` produces 3.98:1 contrast against the violet background, which fails WCAG AA for the navbar's active links and the home page CTA (both render `text-primary` as readable text). Bump to `270 100% 65%` raises contrast to ~5.5:1 (AA pass) without changing the perceived hue — still violet, just slightly brighter.

Amber as the alternative gives visitors something genuinely different (warm vs cold, retro vs synthetic) without adding decision overhead. CP2077 yellow is a beautiful color with exceptional contrast characteristics (15.4:1 primary, 17.0:1 body text), and the complete `.theme-cyberpunk` block in Section 2 is implementation-ready if the decision reverses later. The reason to leave it on the bench is that violet already covers the "neon-on-black game aesthetic" register, and the marginal personality gain from a third theme doesn't justify the maintenance tax of carrying three blocks forward.

The MatrixRain canvas has done its job — it established the aesthetic DNA of the site at launch — but the ambient orbs now carry that job in the same hero area more efficiently and more accessibly. Remove the rain. Keep the `--matrix-rain-color` and `--matrix-glow` CSS variables in the token set for forward compatibility (future themes may reference them).

The two-name system stays as-is: `>_ SDET_PORTFOLIO` is the casual terminal-handle in the navbar, "The Digital Matrix" is the formal title in browser tabs, OpenGraph metadata, GitHub repo name, and the projects-list self-entry. They coexist intentionally — a callsign and a legal name. Neither needs to change for the palette refactor.

---

*Research compiled by ux-research-agent | 2026-04-08*
*Sources: [Hick's Law — Laws of UX](https://lawsofux.com/hicks-law/) · [Cyberpunk 2077 UI Colors (color-hex)](https://www.color-hex.com/color-palette/1041326) · [CP2077 marketing palette (ColorsWall)](https://colorswall.com/palette/154112) · [WCAG 2.1 Contrast — WebAIM](https://webaim.org/articles/contrast/) · [Hick's Law — Dovetail](https://dovetail.com/ux/hicks-law/)*
