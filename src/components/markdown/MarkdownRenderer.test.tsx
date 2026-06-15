import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MarkdownRenderer, customSlugify } from "./MarkdownRenderer";

describe("MarkdownRenderer inline code", () => {
  it("applies bg-secondary class to inline code (not code blocks)", () => {
    const { container } = render(
      <MarkdownRenderer content={"This is `inline code` here"} />
    );
    const inlineCode = container.querySelector("code:not(pre code)");
    expect(inlineCode, "inline code element not found").not.toBeNull();
    if (!inlineCode) throw new Error("unreachable");
    expect(inlineCode.className).toContain("bg-secondary");
  });

  it("does not leak the react-markdown hast `node` prop onto the DOM", () => {
    const { container } = render(
      <MarkdownRenderer
        content={
          "Para with `code` and [link](#x).\n\n- item\n\n| a | b |\n|---|---|\n| 1 | 2 |"
        }
      />
    );
    expect(container.querySelector("[node]")).toBeNull();
  });
});

describe("customSlugify (anchor-link resolution helper)", () => {
  it("strips Polish diacritics via the \\w character class", () => {
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
