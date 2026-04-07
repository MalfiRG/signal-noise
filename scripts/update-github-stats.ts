/**
 * Fetches current GitHub repo stats and updates data.ts.
 * Runs inline before vite build (see package.json "build" script).
 *
 * Usage: npx tsx scripts/update-github-stats.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, '../src/features/projects/data.ts');

const REPOS = [
  { owner: 'MalfiRG', repo: 'ScoutQL' },
  { owner: 'MalfiRG', repo: 'the-digital-matrix' },
  { owner: 'MalfiRG', repo: 'whispr-local' },
];

function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return String(n);
}

function formatDate(iso: string): string {
  return iso ? iso.slice(0, 10) : '';
}

interface RepoStats {
  stars: number;
  forks: number;
  language: string;
  pushedAt: string;
}

async function fetchStats(owner: string, repo: string): Promise<RepoStats | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'User-Agent': 'digital-matrix-build/1.0',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
    });
    if (!res.ok) {
      console.warn(`  Warning: GitHub API returned ${res.status} for ${owner}/${repo}`);
      return null;
    }
    const data = await res.json();
    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
      language: data.language || '',
      pushedAt: formatDate(data.pushed_at || ''),
    };
  } catch (err) {
    console.warn(`  Warning: GitHub fetch failed:`, (err as Error).message);
    return null;
  }
}

async function main() {
  console.log('Updating GitHub stats...\n');

  let dataFile = readFileSync(DATA_PATH, 'utf-8');
  let changed = false;

  for (const { owner, repo } of REPOS) {
    const stats = await fetchStats(owner, repo);
    if (!stats) {
      console.log(`  Skip ${owner}/${repo}: fetch failed`);
      continue;
    }

    const s = formatCount(stats.stars);
    const f = formatCount(stats.forks);
    const ownerRepo = `${owner}/${repo}`;

    const escapedRepo = ownerRepo.replace('/', '\\/');
    const blockRegex = new RegExp(
      `(github_owner_repo: "${escapedRepo}"[\\s\\S]*?)(stars: ")[^"]*(")(\\s*,\\s*\\n\\s*forks: ")[^"]*(")(\\s*,\\s*\\n\\s*language: ")[^"]*(")(\\s*,\\s*\\n\\s*pushedAt: ")[^"]*(")`,
    );

    const newData = dataFile.replace(
      blockRegex,
      `$1$2${s}$3$4${f}$5$6${stats.language}$7$8${stats.pushedAt}$9`,
    );

    if (newData !== dataFile) {
      dataFile = newData;
      changed = true;
      console.log(`  OK ${ownerRepo}: ${s} stars, ${f} forks, ${stats.language}, last push ${stats.pushedAt}`);
    } else {
      console.log(`  Skip ${ownerRepo}: no changes (${s} stars, ${f} forks)`);
    }
  }

  if (changed) {
    writeFileSync(DATA_PATH, dataFile, 'utf-8');
    console.log('\ndata.ts updated');
  } else {
    console.log('\nNo changes needed');
  }
}

main();
