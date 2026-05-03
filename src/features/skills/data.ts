export type Tier = "expert" | "strong" | "growing" | "exploring";

export interface SkillEntry {
  name: string;
  tier: Tier;
}

export interface SkillCategory {
  name: string;
  items: SkillEntry[];
}

export const tiers: Record<Tier, { label: string; description: string }> = {
  expert: { label: "EXPERT", description: "Daily driver, production-proven" },
  strong: { label: "STRONG", description: "Confident, ship independently" },
  growing: { label: "GROWING", description: "Active learning, building with it" },
  exploring: { label: "EXPLORING", description: "On the radar, early exposure" },
};

export const categories: SkillCategory[] = [
  {
    name: "Test Automation & QA",
    items: [
      { name: "Pytest", tier: "strong" },
      { name: "Pester", tier: "expert" },
      { name: "Playwright", tier: "growing" },
      { name: "Selenium", tier: "growing" },
      { name: "Postman / REST Testing", tier: "expert" },
      { name: "Robot Framework", tier: "exploring" },
      { name: "Appium", tier: "exploring" },
    ],
  },
  {
    name: "AI & Agentic Systems",
    items: [
      { name: "Claude Code", tier: "expert" },
      { name: "Multi-Agent Orchestration", tier: "expert" },
      { name: "MCP Protocol", tier: "expert" },
      { name: "Anthropic SDK", tier: "strong" },
      { name: "Prompt Engineering", tier: "expert" },
    ],
  },
  {
    name: "DevOps & Infrastructure",
    items: [
      { name: "Docker", tier: "strong" },
      { name: "CI/CD (Jenkins, GitLab, GH Actions)", tier: "strong" },
      { name: "Linux Administration", tier: "expert" },
      { name: "SSH & Networking", tier: "expert" },
      { name: "VMware vSphere", tier: "expert" },
      { name: "Observability (Grafana, Structured Logs)", tier: "strong" },
      { name: "Terraform / IaC", tier: "exploring" },
    ],
  },
  {
    name: "Languages",
    items: [
      { name: "Python", tier: "strong" },
      { name: "PowerShell", tier: "expert" },
      { name: "TypeScript", tier: "growing" },
      { name: "Bash", tier: "strong" },
      { name: "C#", tier: "growing" },
      { name: "SQL", tier: "strong" },
    ],
  },
  {
    name: "Web & API",
    items: [
      { name: "React", tier: "growing" },
      { name: "FastAPI", tier: "strong" },
      { name: "Tailwind CSS", tier: "growing" },
      { name: "Vite", tier: "growing" },
      { name: "Web Scraping (Crawlee)", tier: "strong" },
    ],
  },
  {
    name: "Methodology",
    items: [
      { name: "Research & Technical Writing", tier: "expert" },
      { name: "Cross-Team Collaboration", tier: "expert" },
      { name: "Security Testing (OWASP)", tier: "growing" },
    ],
  },
];
