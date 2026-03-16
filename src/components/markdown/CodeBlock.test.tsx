import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CodeBlock } from "./CodeBlock";

// userEvent.setup() installs its own Clipboard stub on navigator.clipboard.
// We spy on the stub's writeText AFTER setup() is called so our spy wraps the stub.
describe("CodeBlock", () => {
  it("renders children inside a code-block-wrapper", () => {
    render(
      <CodeBlock language="typescript">
        <code>const x = 1;</code>
      </CodeBlock>
    );
    const wrapper = document.querySelector(".code-block-wrapper");
    expect(wrapper).toBeTruthy();
    expect(screen.getByText("const x = 1;")).toBeTruthy();
  });

  it("shows language badge when language is provided", () => {
    render(
      <CodeBlock language="python">
        <code>print("hello")</code>
      </CodeBlock>
    );
    expect(screen.getByText("python")).toBeTruthy();
  });

  it("hides language badge when language is empty", () => {
    render(
      <CodeBlock language="">
        <code>some code</code>
      </CodeBlock>
    );
    const badge = document.querySelector(".code-lang-badge");
    expect(badge).toBeNull();
  });

  it("has a copy button with aria-label", () => {
    render(
      <CodeBlock language="js">
        <code>let a = 1;</code>
      </CodeBlock>
    );
    const btn = screen.getByRole("button", { name: "Copy code" });
    expect(btn).toBeTruthy();
  });

  it("copies code text to clipboard on click", async () => {
    const user = userEvent.setup();
    // Spy AFTER setup() so we wrap the clipboard stub userEvent just installed
    const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText");
    render(
      <CodeBlock language="js">
        <code>let a = 1;</code>
      </CodeBlock>
    );
    const btn = screen.getByRole("button", { name: "Copy code" });
    await user.click(btn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("let a = 1;");
  });

  it("shows Copied! feedback after clicking copy", async () => {
    const user = userEvent.setup();
    render(
      <CodeBlock language="js">
        <code>let a = 1;</code>
      </CodeBlock>
    );
    const btn = screen.getByRole("button", { name: "Copy code" });
    await user.click(btn);
    expect(screen.getByText("Copied!")).toBeTruthy();
  });

  it("has overflow-x-auto on the scroll container", () => {
    render(
      <CodeBlock language="js">
        <code>code</code>
      </CodeBlock>
    );
    const scrollContainer = document.querySelector(".code-scroll-container");
    expect(scrollContainer).toBeTruthy();
    expect(scrollContainer!.classList.contains("overflow-x-auto")).toBe(true);
  });
});
