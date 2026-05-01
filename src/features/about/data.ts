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
    "AI builder and DevOps practitioner who started in molecular biology — most of the science didn't stick, but the methodology did: research, execute, certify. Same axiom now runs on Claude Code agents, Pytest, and infrastructure I can rebuild from BIOS up.",
    "What I actually ~did: build a PowerShell orchestrator that rotates dozens of VMs through snapshot, update, and remote-script cycles — runs daily. Build a Pester regression suite that cuts the manual testing cycle by ~50%. Build MetaOrchestrator, a fully agentic, self-autonomous workspace with three-tier memory and a routing harness that has its own regression tests. Build ScoutQL on the side — full-stack scrape → LLM-score → review.",
    "QA is the lens, not the ceiling. I test systems that think for themselves, harden the infrastructure they run on, and write about what breaks here.",
  ],
};


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
      { name: "Confluence", version: null }
    ],
  },
  {
    name: "AI & Tooling",
    tools: [
      { name: "Claude", version: null },
      { name: "GitHub Copilot", version: null },
      { name: "n8n", version: null }
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
