export interface ToolEntry {
  name: string;
  version: string | null;
}

export interface ToolCategory {
  name: string;
  tools: ToolEntry[];
}

export interface SocialLink {
  label: string;
  url: string;
  icon: "github" | "linkedin";
}

export const introText = {
  headline: "ABOUT ME",
  terminal: "> whoami",
  bio: [
    "QA engineer who started in molecular biology — I don't remember 95% of the science and the lab training didn't stick, but the mental model and methodology did: research, execute, certify.",
    "Now it runs on Pytest, Playwright, and CI/CD, with a pinch of DevOps and Agent-Driven development.",
    "Speaking of the Wolf — testing systems that think for themselves and writing about what I find on this blog.",
  ],
};

// TODO(piotr): refresh tool versions quarterly — see spec §11.2 for rationale.
// Tools without an explicit minor version (e.g. Pytest "v8.x") are intentional;
// bump quarterly during feature retrospectives.
export const toolCategories: ToolCategory[] = [
  {
    name: "Test Automation",
    tools: [
      { name: "Pytest", version: "v8.x" },
      { name: "Pester", version: "v5.x" },
      { name: "Playwright", version: "v1.58" },
      { name: "Selenium", version: "v4.x" },
    ],
  },
  {
    name: "Languages",
    tools: [
      { name: "Python", version: "3.13" },
      { name: "PowerShell", version: "7.x" },
      { name: "TypeScript", version: "5.x" },
      { name: "C#", version: "12" },
    ],
  },
  {
    name: "CI/CD & DevOps",
    tools: [
      { name: "GitLab CI", version: null },
      { name: "Jenkins", version: "LTS" },
      { name: "GitHub Actions", version: null },
      { name: "Docker", version: "27.x" },
    ],
  },
  {
    name: "Test Management",
    tools: [
      { name: "JIRA", version: null },
      { name: "TestRail", version: null },
      { name: "Confluence", version: null },
      { name: "ClickUp", version: null },
    ],
  },
  {
    name: "AI & Tooling",
    tools: [
      { name: "Claude", version: "sonnet-4.6" },
      { name: "GitHub Copilot", version: null },
      { name: "n8n", version: null },
      { name: "Qdrant", version: null },
    ],
  },
];

export const socialLinks: SocialLink[] = [
  {
    label: "GitHub",
    url: "https://github.com/MalfiRG",
    icon: "github",
  },
  {
    label: "LinkedIn",
    url: "https://www.linkedin.com/in/piotrtarach/",
    icon: "linkedin",
  },
];
