/*---------------------------------------------------------------------------------------------
 *  RLM Smart Context — ripgrep reuse (terminal me raw `rg` spawn mat karo).
 *  Reuse: src/vs/base/node/ripgrep.ts -> rgDiskPath,
 *  src/vs/workbench/services/search/node/ripgrepTextSearchEngine.ts:24 RipgrepTextSearchEngine.
 *  NOTE: node-side file hai; browser se ICyberCodeXService.chatStream ko contextFiles[] bhejta hai.
 *  Full codebase LLM ko mat bhejo — sirf top 15-20 lines + filepath.
 *--------------------------------------------------------------------------------------------*/

import { rgDiskPath } from '../../../../base/node/ripgrep.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface RlmHit {
	readonly path: string;
	readonly line: number;
	readonly snippet: string;
}

function keywordsFromPrompt(prompt: string): string[] {
	return prompt
		.split(/[^a-zA-Z0-9_]+/)
		.map(w => w.trim())
		.filter(w => w.length >= 3)
		.filter((w, i, arr) => arr.indexOf(w) === i)
		.slice(0, 5);
}

export async function rlmSearch(workspaceRoot: string, prompt: string, maxHits = 5): Promise<RlmHit[]> {
	const keywords = keywordsFromPrompt(prompt);
	if (keywords.length === 0) {
		return [];
	}
	const pattern = keywords.join('|');
	try {
		const { stdout } = await execFileAsync(rgDiskPath, [
			pattern, workspaceRoot,
			'--json', '--max-count', String(maxHits),
			'--max-columns', '300',
			'-g', '!node_modules', '-g', '!out', '-g', '!.git',
		], { maxBuffer: 4 * 1024 * 1024 });
		const hits: RlmHit[] = [];
		for (const line of stdout.split('\n')) {
			if (!line.trim()) {
				continue;
			}
			try {
				const evt = JSON.parse(line) as { type?: string; data?: { path?: { text?: string }; line_number?: number; lines?: { text?: string } } };
				if (evt.type === 'match' && evt.data?.path?.text) {
					hits.push({
						path: evt.data.path.text,
						line: evt.data.line_number ?? 1,
						snippet: (evt.data.lines?.text ?? '').slice(0, 600),
					});
					if (hits.length >= 20) {
						break;
					}
				}
			} catch {
				// skip malformed rg json line
			}
		}
		return hits;
	} catch {
		// rg exit code 1 = no match, treat as empty
		return [];
	}
}
