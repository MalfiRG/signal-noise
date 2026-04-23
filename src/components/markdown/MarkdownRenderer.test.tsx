import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MarkdownRenderer } from "./MarkdownRenderer";

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

describe("MarkdownRenderer Polish slugify", () => {
  it("strips Polish diacritics from heading IDs (current behavior — see follow-up)", () => {
    const { container } = render(
      <MarkdownRenderer content={"# Książka i ćwiczenia\n\nbody"} />
    );
    const heading = container.querySelector("h1");
    expect(heading, "h1 not found").not.toBeNull();
    if (!heading) throw new Error("unreachable");
    const id = heading.getAttribute("id");
    // customSlugify uses .replace(/[^\w-]/g, "") — \w is [A-Za-z0-9_] so
    // Polish diacritics (ą, ć, ż, ś, ź, ł, ó, ę, ń) are DELETED, not
    // transliterated. książka → ksika; ćwiczenia → wiczenia.
    // True transliteration table is a separate spec — track outside this migration.
    expect(id).toMatch(/^[a-z0-9-]+$/);
    expect(id).toBe("ksika-i-wiczenia");
  });
});
