/*---------------------------------------------------------------------------------------------
 *  Cmd+K floating widget — REUSE IQuickInputService (custom overlay framework mat likho).
 *  Editor context: IEditorService se active line padhkar prompt me jodo (Phase-8).
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IQuickInputService, IQuickPickItem } from '../../../../platform/quickinput/common/quickInput.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ICyberCodeXService } from '../cybercodexService.js';

interface InlinePickItem extends IQuickPickItem {
	prompt: string;
}

export class CyberCodeXInlineWidget extends Disposable {
	constructor(
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IEditorService private readonly editorService: IEditorService,
		@ICyberCodeXService private readonly cybercodexService: ICyberCodeXService,
	) {
		super();
	}

	open(): void {
		const activeLine = this.readActiveLine();
		const qp = this.quickInputService.createQuickPick<InlinePickItem>();
		qp.placeholder = activeLine
			? `CyberCodeX inline (line: ${activeLine.slice(0, 60)}…) — type instruction, Enter for mock diff`
			: 'CyberCodeX inline — type instruction, Enter for mock diff';
		qp.items = [];
		qp.onDidChangeValue(() => {
			const v = qp.value.trim();
			qp.items = v ? [{ id: 'run', label: `$(sparkle) Run: ${v}`, prompt: v }] : [];
		});
		qp.onDidAccept(async () => {
			const item = qp.selectedItems[0];
			const prompt = item?.prompt ?? qp.value.trim();
			qp.busy = true;
			try {
				const text = await this.cybercodexService.chatComplete({ prompt, contextFiles: [] });
				qp.items = [{ id: 'done', label: '$(check) Mock result ready — open Agent view to apply', prompt, description: text.slice(0, 120) }];
			} catch (e) {
				const msg = e instanceof Error ? e.message : String(e);
				qp.items = [{ id: 'err', label: `$(error) ${msg}`, prompt }];
			} finally {
				qp.busy = false;
			}
		});
		qp.show();
	}

	private readActiveLine(): string {
		try {
			const control = this.editorService.activeTextEditorControl as unknown as {
				getPosition?: () => { lineNumber: number };
				getModel?: () => { getLineContent?: (n: number) => string } | null;
			} | undefined;
			const pos = control?.getPosition?.();
			const line = pos ? control?.getModel?.()?.getLineContent?.(pos.lineNumber) : undefined;
			return (line || '').trim();
		} catch {
			return '';
		}
	}
}
