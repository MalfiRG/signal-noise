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
    "What I actually did: build a PowerShell orchestrator that rotates dozens of VMs through snapshot, update, and remote-script cycles — runs daily. Build a Pester regression suite that cuts the manual testing cycle by ~50%. Build MetaOrchestrator, a fully agentic, self-autonomous workspace with three-tier memory and a routing harness that has its own regression tests. Build ScoutQL on the side — full-stack scrape → LLM-score → review.",
    "For me, QA is the lens, not the ceiling. I test systems that think for themselves, harden the infrastructure they run on, and write about what breaks here.",
  ],
};

export const toolCategories: ToolCategory[] = [
  {
    name: "Test Automation",
    tools: [
      { name: "Pytest", version: null },
      { name: "Pester", version: null },
      { name: "Playwright", version: null },
      { name: "FastAPI", version: null },
      { name: "Postman", version: null },
    ],
  },
  {
    name: "Languages",
    tools: [
      { name: "Python", version: "3.13" },
      { name: "PowerShell", version: "7.x" },
      { name: "TypeScript", version: "5.x" },
      { name: "Bash", version: null },
      { name: "C#", version: "12" },
      { name: "SQL", version: null },
    ],
  },
  {
    name: "CI/CD & DevOps",
    tools: [
      { name: "GitLab CI", version: null },
      { name: "Jenkins", version: null },
      { name: "GitHub Actions", version: null },
    ],
  },
  {
    name: "Cloud & Virtualization",
    tools: [
      { name: "Docker", version: null },
      { name: "Vmware vSphere", version: null },
      { name: "Hyper-V", version: null },
      { name: "AWS", version: null },
      { name: "Azure", version: null },
      { name: "GCP", version: null },
      { name: "On-prem virualization", version: null },
    ],
  },
  {
    name: "Test Management",
    tools: [
      { name: "JIRA", version: null },
      { name: "TestRail", version: null },
      { name: "Confluence", version: null },
    ],
  },
  {
    name: "AI & Tooling",
    tools: [
      { name: "Claude Code", version: null },
      { name: "Anthropic SDK", version: null },
      { name: "MCP Protocol", version: null },
      { name: "GitHub Copilot", version: null },
      { name: "n8n", version: null },
      { name: "DevTools", version: null },
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
