/*---------------------------------------------------------------------------------------------
 *  Onboarding modal — REUSE IDialogService (custom window mat kholo).
 *  First-run: gettingStarted override nahi, storage flag cybercodex.onboarded check karo.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { URI } from '../../../../base/common/uri.js';
import { ICyberCodeXService } from '../cybercodexService.js';

export class CyberCodeXOnboarding extends Disposable {
	constructor(
		@IDialogService private readonly dialogService: IDialogService,
		@IOpenerService private readonly openerService: IOpenerService,
		@ICyberCodeXService private readonly cybercodexService: ICyberCodeXService,
	) {
		super();
	}

	async openIfNeeded(force = false): Promise<void> {
		if (!force && this.cybercodexService.isOnboarded()) {
			return;
		}
		const { confirmed, checkboxChecked } = await this.dialogService.confirm({
			type: 'info',
			message: 'Welcome to CyberCodeX',
			detail: 'Dark Zinc theme, Cmd+K inline chat, agent sidebar. Mock mode me backend localhost:3001 par chalta hai.',
			primaryButton: 'Sign in with Google',
			cancelButton: 'Skip for now',
			checkbox: { label: 'Open Agent view after setup' },
		});
		if (confirmed) {
			await this.openerService.open(URI.parse(`${this.cybercodexService.getAuthUrl()}/login?provider=google`));
		}
		if (checkboxChecked) {
			// command id stable: cybercodex.openAgent (contribution me registered)
			void this.openerService.open(URI.parse('command:cybercodex.openAgent'));
		}
		this.cybercodexService.setOnboarded();
	}
}
