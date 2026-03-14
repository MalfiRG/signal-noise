export interface Project {
  title: string;
  description: string;
  tech_stack: string[];
  github_url?: string;
  live_url?: string;
}

export const projects: Project[] = [];
