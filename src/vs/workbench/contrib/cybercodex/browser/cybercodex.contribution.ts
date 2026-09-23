/*---------------------------------------------------------------------------------------------
 *  CyberCodeX contribution — single entry point (CYBERCODEX isolation).
 *  Registers: sidebar ViewContainer + Agent View + Cmd+K / onboarding commands + keybindings.
 *  Reuse: extensions.contribution.ts:115 ViewContainer pattern, chat.view.contribution pattern.
 *--------------------------------------------------------------------------------------------*/

import './media/cybercodex.css';
import { localize2 } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { KeyMod, KeyCode } from '../../../../base/common/keyCodes.js';
import { KeybindingWeight } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import {
	ViewContainerLocation, Extensions as ViewContainerExtensions, IViewContainersRegistry, IViewsRegistry,
	Extensions as ViewExtensions,
} from '../../../common/views.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { CYBERCODEX_COMMANDS, CYBERCODEX_VIEW_IDS } from '../common/cybercodexTypes.js';
import { CyberCodeXAgentViewPane } from './components/agentSidebarPanel.js';
import { CyberCodeXInlineWidget } from './components/floatingChatWidget.js';
import { CyberCodeXOnboarding } from './components/onboardingModal.js';
import { registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';

const cybercodexIcon = registerIcon('cybercodex-view-icon', Codicon.sparkle, 'CyberCodeX view icon');

class CyberCodeXPaneContainer extends ViewPaneContainer {
	constructor(...args: ConstructorParameters<typeof ViewPaneContainer>) {
		super(...args);
	}
}

export const CYBERCODEX_VIEW_CONTAINER = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: CYBERCODEX_VIEW_IDS.container,
		title: localize2('cybercodex.container', 'CyberCodeX'),
		ctorDescriptor: new SyncDescriptor(CyberCodeXPaneContainer),
		icon: cybercodexIcon,
		order: 1,
		rejectAddedViews: false,
		alwaysUseContainerInfo: false,
	},
	ViewContainerLocation.Sidebar,
	{ doNotRegisterOpenCommand: false },
);

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews(
	[
		{
			id: CYBERCODEX_VIEW_IDS.agentView,
			name: localize2('cybercodex.agent', 'CyberCodeX Agent'),
			ctorDescriptor: new SyncDescriptor(CyberCodeXAgentViewPane as typeof ViewPane),
			canToggleVisibility: true,
			canMoveView: true,
			collapsed: false,
			order: 1,
		},
	],
	CYBERCODEX_VIEW_CONTAINER,
);

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: CYBERCODEX_COMMANDS.openAgent,
			title: localize2('cybercodex.openAgent', 'CyberCodeX: Open Agent'),
			category: Categories.Help,
			f1: true,
			keybinding: { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyL, weight: KeybindingWeight.WorkbenchContrib },
		});
	}
	override async run(accessor: ServicesAccessor): Promise<void> {
		accessor.get(IViewsService).openView(CYBERCODEX_VIEW_IDS.agentView, true);
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: CYBERCODEX_COMMANDS.openInlineChat,
			title: localize2('cybercodex.inline', 'CyberCodeX: Inline Chat (Cmd+K)'),
			category: Categories.Help,
			f1: true,
			keybinding: { primary: KeyMod.CtrlCmd | KeyCode.KeyK, weight: KeybindingWeight.WorkbenchContrib },
		});
	}
	override async run(accessor: ServicesAccessor): Promise<void> {
		accessor.get(IInstantiationService).createInstance(CyberCodeXInlineWidget).open();
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: CYBERCODEX_COMMANDS.openOnboarding,
			title: localize2('cybercodex.onboarding', 'CyberCodeX: Show Onboarding'),
			category: Categories.Help,
			f1: true,
		});
	}
	override async run(accessor: ServicesAccessor): Promise<void> {
		await accessor.get(IInstantiationService).createInstance(CyberCodeXOnboarding).openIfNeeded(true);
	}
});

class CyberCodeXStartup extends Disposable {
	constructor(@IInstantiationService instantiationService: IInstantiationService) {
		super();
		// First-run onboarding (gettingStarted override nahi — flag check)
		void instantiationService.createInstance(CyberCodeXOnboarding).openIfNeeded(false);
	}
}

registerWorkbenchContribution2('workbench.contrib.cybercodex.startup', CyberCodeXStartup, WorkbenchPhase.AfterRestored);
