/*---------------------------------------------------------------------------------------------
 *  Agent sidebar — REUSE ViewPane (nayi chat UI framework mat likho, CSS skin lagao).
 *  Styling: browser/media/cybercodex.css (.cybercodex-agent).
 *--------------------------------------------------------------------------------------------*/

import { append, $, escape } from '../../../../base/browser/dom.js';
import { ViewPane, IViewPaneOptions } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ICyberCodeXService } from '../cybercodexService.js';

export class CyberCodeXAgentViewPane extends ViewPane {
	static readonly ID = 'workbench.view.cybercodex.agent';

	private input!: HTMLTextAreaElement;
	private log!: HTMLElement;
	private sendBtn!: HTMLButtonElement;

	constructor(
		options: IViewPaneOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
		@ICyberCodeXService private readonly cybercodexService: ICyberCodeXService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		const root = append(container, $('.cybercodex-agent'));
		this.log = append(root, $('.cybercodex-log', { role: 'log', 'aria-live': 'polite' }));
		const row = append(root, $('.cybercodex-row'));
		this.input = append(row, $('textarea.cybercodex-input')) as HTMLTextAreaElement;
		this.input.placeholder = 'Ask CyberCodeX… (Enter to send)';
		this.input.rows = 3;
		this.sendBtn = append(row, $('button.cybercodex-send')) as HTMLButtonElement;
		this.sendBtn.textContent = 'Send';
		this._register(this.onDidFocus(() => this.input.focus()));

		const send = () => void this.doSend();
		this._register({ dispose: () => undefined });
		this.sendBtn.onclick = send;
		this.input.onkeydown = (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				send();
			}
		};
		this.appendLine('Welcome to CyberCodeX (mock). Sign in from onboarding, then ask anything.');
	}

	private appendLine(text: string, cls = ''): HTMLElement {
		const div = append(this.log, $(`div.cybercodex-msg${cls ? '.' + cls : ''}`));
		div.textContent = text;
		div.scrollIntoView({ block: 'end' });
		return div;
	}

	private async doSend(): Promise<void> {
		const prompt = this.input.value.trim();
		if (!prompt) {
			return;
		}
		this.input.value = '';
		this.appendLine(`You: ${prompt}`, 'user');
		const bubble = this.appendLine('CyberCodeX: …', 'assistant');
		let full = '';
		try {
			await this.cybercodexService.chatStream(
				{ prompt, contextFiles: [] },
				(delta) => {
					full += delta;
					bubble.textContent = `CyberCodeX: ${full}`;
					bubble.scrollIntoView({ block: 'end' });
				},
			);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			bubble.textContent = `CyberCodeX error: ${escape(msg)} (is cybercodex-server running on :3001?)`;
		}
	}

	override focus(): void {
		super.focus();
		this.input?.focus();
	}
}
