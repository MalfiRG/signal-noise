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
    "ISTQB-certified QA Engineer at Veeam Software, specializing in test automation for enterprise backup & recovery solutions.",
    "I build robust test frameworks with Pytest and PowerShell/Pester, integrate them into CI/CD pipelines, and leverage AI to accelerate QA workflows.",
    "Outside of work, I explore full-stack development, contribute to open-source testing tools, and write about software quality on this blog.",
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
