export interface ToolCategory {
  name: string;
  tools: string[];
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
    "QA engineer who started in molecular biology — I don't remember 95% of the science and the lab training didn't stick, but the mental model and methodology did: hypothesis, experiment, multi-level validation.",
    "Now it runs on Pytest, Playwright, and CI/CD, with a pinch of DevOps and Agent-Driven development.",
    "Speaking of the Wolf — testing systems that think for themselves and writing about what I find on this blog.",
  ],
};

export const toolCategories: ToolCategory[] = [
  {
    name: "Test Automation",
    tools: ["Pytest", "Pester", "Playwright", "Selenium"],
  },
  {
    name: "Languages",
    tools: ["Python", "PowerShell", "TypeScript", "C#"],
  },
  {
    name: "CI/CD & DevOps",
    tools: ["GitLab CI", "Jenkins", "GitHub Actions", "Docker"],
  },
  {
    name: "Test Management",
    tools: ["JIRA", "TestRail", "Confluence", "ClickUp"],
  },
  {
    name: "AI & Tooling",
    tools: ["Claude", "GitHub Copilot", "n8n", "Qdrant"],
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
