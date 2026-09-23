/*---------------------------------------------------------------------------------------------
 *  CyberCodeX service — backend proxy (IDE never holds LLM keys).
 *  Flow: IDE -> http://localhost:3001/api/chat/* (SSE) -> sidebar typewriter.
 *  Auth token: ISecretStorageService (secrets.ts:86) me OS keychain me save.
 *  Reuse: IProductService.cybercodexApiUrl, IRequestService pattern, ISecretStorageService.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { CYBERCODEX_STORAGE_KEYS, type CyberCodeXChatRequest, type CyberCodeXSession } from '../common/cybercodexTypes.js';

export const ICyberCodeXService = createDecorator<ICyberCodeXService>('cybercodexService');

export interface ICyberCodeXService {
	readonly _serviceBrand: undefined;
	getApiUrl(): string;
	getAuthUrl(): string;
	getSession(): Promise<CyberCodeXSession | undefined>;
	setSession(session: CyberCodeXSession): Promise<void>;
	clearSession(): Promise<void>;
	isOnboarded(): boolean;
	setOnboarded(): void;
	chatComplete(request: CyberCodeXChatRequest): Promise<string>;
	chatStream(request: CyberCodeXChatRequest, onDelta: (delta: string) => void, signal?: AbortSignal): Promise<void>;
}

export class CyberCodeXService extends Disposable implements ICyberCodeXService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@IProductService private readonly productService: IProductService,
		@ISecretStorageService private readonly secretStorage: ISecretStorageService,
		@IStorageService private readonly storageService: IStorageService,
	) {
		super();
	}

	getApiUrl(): string {
		const custom = (this.productService as unknown as { cybercodexApiUrl?: string }).cybercodexApiUrl;
		return custom || 'http://localhost:3001';
	}

	getAuthUrl(): string {
		const custom = (this.productService as unknown as { cybercodexAuthUrl?: string }).cybercodexAuthUrl;
		return custom || 'http://localhost:3001/auth';
	}

	async getSession(): Promise<CyberCodeXSession | undefined> {
		const token = await this.secretStorage.get(CYBERCODEX_STORAGE_KEYS.sessionToken);
		if (!token) {
			return undefined;
		}
		return { token, provider: 'mock' };
	}

	async setSession(session: CyberCodeXSession): Promise<void> {
		await this.secretStorage.set(CYBERCODEX_STORAGE_KEYS.sessionToken, session.token);
	}

	async clearSession(): Promise<void> {
		await this.secretStorage.delete(CYBERCODEX_STORAGE_KEYS.sessionToken);
	}

	isOnboarded(): boolean {
		return this.storageService.get(CYBERCODEX_STORAGE_KEYS.onboarded, StorageScope.PROFILE) === 'true';
	}

	setOnboarded(): void {
		this.storageService.store(CYBERCODEX_STORAGE_KEYS.onboarded, 'true', StorageScope.PROFILE, StorageTarget.USER);
	}

	private async authHeaders(): Promise<HeadersInit> {
		const session = await this.getSession();
		return session ? { 'Authorization': `Bearer ${session.token}` } : {};
	}

	async chatComplete(request: CyberCodeXChatRequest): Promise<string> {
		const res = await fetch(`${this.getApiUrl()}/api/chat/complete`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...(await this.authHeaders()) },
			body: JSON.stringify({ prompt: request.prompt, contextFiles: request.contextFiles, model: request.model ?? 'mock-coder' }),
		});
		if (!res.ok) {
			throw new Error(`chat/complete failed: ${res.status}`);
		}
		const data = await res.json() as { text?: string; error?: string };
		if (data.error) {
			throw new Error(data.error);
		}
		return data.text ?? '';
	}

	async chatStream(request: CyberCodeXChatRequest, onDelta: (delta: string) => void, signal?: AbortSignal): Promise<void> {
		const res = await fetch(`${this.getApiUrl()}/api/chat/stream`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...(await this.authHeaders()) },
			body: JSON.stringify({ prompt: request.prompt, contextFiles: request.contextFiles, model: request.model ?? 'mock-coder' }),
			signal,
		});
		if (!res.ok || !res.body) {
			throw new Error(`chat/stream failed: ${res.status}`);
		}
		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		for (;;) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}
			buffer += decoder.decode(value, { stream: true });
			const parts = buffer.split('\n\n');
			buffer = parts.pop() ?? '';
			for (const part of parts) {
				const line = part.trim();
				if (!line.startsWith('data:')) {
					continue;
				}
				const payload = line.slice('data:'.length).trim();
				if (payload === '[DONE]') {
					return;
				}
				try {
					const json = JSON.parse(payload) as { delta?: string };
					if (json.delta) {
						onDelta(json.delta);
					}
				} catch {
					// ignore partial JSON
				}
			}
		}
	}
}

registerSingleton(ICyberCodeXService, CyberCodeXService, InstantiationType.Delayed);
