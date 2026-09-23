/*---------------------------------------------------------------------------------------------
 *  CyberCodeX types — IDE <-> cybercodex-server contract (mock-first).
 *  Reuse: server docs/backend-api.md se sync rakho.
 *--------------------------------------------------------------------------------------------*/

export interface CyberCodeXContextFile {
	readonly path: string;
	readonly snippet: string;
}

export interface CyberCodeXChatRequest {
	readonly prompt: string;
	readonly contextFiles: readonly CyberCodeXContextFile[];
	readonly model?: string;
}

export interface CyberCodeXChatStreamDelta {
	readonly delta: string;
}

export interface CyberCodeXSession {
	readonly token: string;
	readonly provider: 'google' | 'github' | 'mock';
}

export const CYBERCODEX_STORAGE_KEYS = {
	/** CYBERCODEX-START: secret key for ISecretStorageService (secrets.ts:86 reuse) */
	sessionToken: 'cybercodex.session',
	onboarded: 'cybercodex.onboarded',
	/** CYBERCODEX-END */
} as const;

export const CYBERCODEX_VIEW_IDS = {
	container: 'workbench.view.cybercodex',
	agentView: 'workbench.view.cybercodex.agent',
} as const;

export const CYBERCODEX_COMMANDS = {
	openAgent: 'cybercodex.openAgent',
	openInlineChat: 'cybercodex.openInlineChat',
	openOnboarding: 'cybercodex.openOnboarding',
	acceptDiff: 'cybercodex.acceptDiff',
	rejectDiff: 'cybercodex.rejectDiff',
} as const;
