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
