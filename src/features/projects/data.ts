export interface Project {
  title: string;
  description: string;
  tech_stack: string[];
  github_url?: string;
  live_url?: string;
}

export const projects: Project[] = [
  {
    title: "ScoutQL",
    description:
      "Personal job listing aggregator that scrapes career pages from multiple companies, stores them in a centralized database, and provides AI-powered analysis to match jobs against my CV. Features JWT auth, site configuration management, and a responsive dashboard.",
    tech_stack: ["React", "TypeScript", "FastAPI", "SQLAlchemy", "Turso", "Tailwind CSS", "Docker"],
    github_url: "https://github.com/MalfiRG/ScoutQL",
  },
  {
    title: "The Digital Matrix",
    description:
      "This blog. A Matrix-themed portfolio and technical blog built as a React SPA with a voice-first content pipeline. Features digital rain animations, dark/reading mode toggle, Mermaid diagram rendering, and file-explorer-style navigation.",
    tech_stack: ["React", "TypeScript", "Vite", "Tailwind CSS", "Framer Motion", "Markdown"],
    github_url: "https://github.com/MalfiRG/the-digital-matrix",
    live_url: "https://the-digital-matrix.vercel.app",
  },
  {
    title: "Whispr Local",
    description:
      "Audio transcription pipeline using faster-whisper with speaker diarization. Runs on Google Colab with T4 GPU for fast processing of voice recordings into timestamped, speaker-labeled transcripts that feed into the blog's content pipeline.",
    tech_stack: ["Python", "faster-whisper", "Google Colab", "CUDA", "Jupyter"],
    github_url: "https://github.com/MalfiRG/whispr-local",
  },
];
