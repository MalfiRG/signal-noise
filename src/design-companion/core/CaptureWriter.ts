// __DESIGN_COMPANION_DEV_ONLY__
import * as path from 'node:path';
import { atomicWrite } from '../plugin/atomic-write';
import type { DesignIntentFile } from '../types';

export const generateFilename = (when: Date, page: string, nonce: string): string => {
  const isoDate = when.toISOString().slice(0, 10);
  const isoTime = when.toISOString().slice(11, 19).replace(/:/g, '');
  const slug = page.replace(/^\//, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${isoDate}T${isoTime}-${slug}-${nonce}.md`;
};

const yamlFrontmatter = (intent: DesignIntentFile): string => {
  const lines = ['---', `session_id: ${intent.session_id}`, `project: ${intent.project}`,
    `page: ${intent.page}`, `timestamp: ${intent.timestamp}`,
    `panel_layout: ${intent.panel_layout}`, `status: ${intent.status}`, 'edits:'];
  for (const e of intent.edits) {
    lines.push(`  - type: ${e.type}`);
    lines.push(`    component: ${e.component}`);
    lines.push(`    file: ${e.file}`);
    lines.push(`    instance_id: ${e.instance_id}`);
    if (e._legacy_position) lines.push(`    _legacy_position: ${e._legacy_position}`);
    lines.push(`    source_hash: ${e.source_hash}`);
    if (e.type === 'css') {
      lines.push(`    selector: "${e.selector}"`);
      lines.push('    changes:');
      for (const [k, v] of Object.entries(e.changes)) {
        lines.push(`      ${k}: "${v}"`);
      }
    } else {
      lines.push(`    prop: ${e.prop}`);
      lines.push(`    from: "${e.from}"`);
      lines.push(`    to: "${e.to}"`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
};

export class CaptureWriter {
  constructor(private repoRoot: string) {}
  async save(
    author: string,
    intent: DesignIntentFile,
    body: { rationale: string; notes?: string },
  ): Promise<{ path: string }> {
    const date = new Date(intent.timestamp);
    const dateStr = date.toISOString().slice(0, 16).replace('T', ' ');
    const md = [
      yamlFrontmatter(intent),
      `# Design Intent — ${dateStr}`,
      '',
      `**Page:** ${intent.page}`,
      '',
      '## Rationale',
      '',
      body.rationale,
      '',
      ...(body.notes ? ['## Notes for human reviewer', '', body.notes, ''] : []),
    ].join('\n');
    const nonce = intent.session_id.split('-').pop() ?? 'noncenull';
    const filename = generateFilename(date, intent.page, nonce);
    const target = path.resolve(this.repoRoot, 'pending', author, filename);
    await atomicWrite(target, md);
    return { path: target };
  }
}
