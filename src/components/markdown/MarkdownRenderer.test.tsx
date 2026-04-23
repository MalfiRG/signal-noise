import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MarkdownRenderer, customSlugify } from "./MarkdownRenderer";

describe("MarkdownRenderer inline code", () => {
  it("applies bg-secondary class to inline code (not code blocks)", () => {
    const { container } = render(
      <MarkdownRenderer content={"This is `inline code` here"} />
    );
    const inlineCode = container.querySelector("code:not(pre code)");
    // Fix L2: type-narrow before chaining .className so the test is strict-mode safe.
    expect(inlineCode, "inline code element not found").not.toBeNull();
    if (!inlineCode) throw new Error("unreachable");
    expect(inlineCode.className).toContain("bg-secondary");
  });
});

describe("customSlugify (anchor-link resolution helper)", () => {
  // customSlugify is the fallback slug generator used by findElementId for
  // in-page anchor links. Heading IDs themselves come from rehype-slug
  // (github-slugger), which preserves Unicode letters — so the heading
  // for "Książka i ćwiczenia" renders with id "książka-i-ćwiczenia".
  // customSlugify's \w-based character class DELETES diacritics, producing
  // a different slug. That asymmetry is a known gap between CLAUDE.md's
  // transliteration claim and the actual implementation; true transliteration
  // (ą→a, ć→c) is a deferred follow-up.

  it("strips Polish diacritics via the \\w character class", () => {
    // \w is [A-Za-z0-9_], so ą, ć, ż, ś, ź, ł, ó, ę, ń are DELETED.
    // książka → ksika; ćwiczenia → wiczenia.
    expect(customSlugify("Książka i ćwiczenia")).toBe("ksika-i-wiczenia");
  });

  it("lowercases and dash-joins ASCII input", () => {
    expect(customSlugify("Hello World Example")).toBe("hello-world-example");
  });

  it("honors explicit {#id} tags over auto-slugification", () => {
    expect(customSlugify("Some heading {#my-anchor}")).toBe("my-anchor");
  });

  it("collapses runs of dashes", () => {
    expect(customSlugify("a  b   c")).toBe("a-b-c");
  });
});
