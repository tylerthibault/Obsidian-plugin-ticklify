import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface TogglifySettings {
	defaultToggleState: boolean;
	toggleLabel: string;
}

const DEFAULT_SETTINGS: TogglifySettings = {
	defaultToggleState: false,
	toggleLabel: 'Toggle'
}

export default class TogglifyPlugin extends Plugin {
	settings: TogglifySettings;

	async onload() {
		await this.loadSettings();

		// Add CSS for the toggle component
		this.addToggleStyles();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('toggle-left', 'Insert Toggle', (evt: MouseEvent) => {
			this.insertToggle();
		});
		ribbonIconEl.addClass('togglify-ribbon-class');

		// This adds a status bar item to the bottom of the app.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Togglify Ready');

		// Command to insert a toggle at cursor position
		this.addCommand({
			id: 'insert-toggle',
			name: 'Insert Toggle',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.insertToggleAtCursor(editor);
			}
		});

		// Command to insert a toggle with custom label
		this.addCommand({
			id: 'insert-toggle-with-label',
			name: 'Insert Toggle with Label',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				new ToggleLabelModal(this.app, (label: string) => {
					this.insertToggleAtCursor(editor, label);
				}).open();
			}
		});

		// This adds a settings tab
		this.addSettingTab(new TogglifySettingTab(this.app, this));
	}

	addToggleStyles() {
		const style = document.createElement('style');
		style.textContent = `
			.togglify-container {
				display: inline-flex;
				align-items: center;
				gap: 8px;
				margin: 4px 0;
			}
			
			.togglify-switch {
				position: relative;
				width: 50px;
				height: 24px;
				background-color: #ccc;
				border-radius: 12px;
				cursor: pointer;
				transition: background-color 0.3s ease;
				border: none;
				outline: none;
			}
			
			.togglify-switch.active {
				background-color: #4CAF50;
			}
			
			.togglify-slider {
				position: absolute;
				top: 2px;
				left: 2px;
				width: 20px;
				height: 20px;
				background-color: white;
				border-radius: 50%;
				transition: transform 0.3s ease;
				box-shadow: 0 2px 4px rgba(0,0,0,0.2);
			}
			
			.togglify-switch.active .togglify-slider {
				transform: translateX(26px);
			}
			
			.togglify-label {
				font-size: 14px;
				user-select: none;
			}
		`;
		document.head.appendChild(style);
	}

	insertToggle() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			const editor = activeView.editor;
			this.insertToggleAtCursor(editor);
		} else {
			new Notice('No active markdown view found');
		}
	}

	insertToggleAtCursor(editor: Editor, label?: string) {
		const cursor = editor.getCursor();
		const toggleLabel = label || this.settings.toggleLabel;
		const toggleState = this.settings.defaultToggleState;
		
		// Create a unique ID for this toggle
		const toggleId = `toggle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		
		const toggleHtml = `<div class="togglify-container">
	<button class="togglify-switch${toggleState ? ' active' : ''}" data-toggle-id="${toggleId}" onclick="this.classList.toggle('active')">
		<div class="togglify-slider"></div>
	</button>
	<span class="togglify-label">${toggleLabel}</span>
</div>`;

		editor.replaceRange(toggleHtml, cursor);
		new Notice(`Toggle "${toggleLabel}" inserted!`);
	}

	onunload() {
		// Remove styles when plugin is disabled
		const styleElements = document.querySelectorAll('style');
		styleElements.forEach(style => {
			if (style.textContent?.includes('togglify-')) {
				style.remove();
			}
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ToggleLabelModal extends Modal {
	onSubmit: (label: string) => void;
	
	constructor(app: App, onSubmit: (label: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h3', { text: 'Enter Toggle Label' });
		
		const inputEl = contentEl.createEl('input', {
			type: 'text',
			placeholder: 'Toggle label...',
			value: 'Toggle'
		});
		inputEl.focus();
		inputEl.select();
		
		const buttonContainer = contentEl.createDiv();
		buttonContainer.style.marginTop = '10px';
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '10px';
		
		const submitBtn = buttonContainer.createEl('button', { text: 'Insert' });
		submitBtn.setCssProps({ flex: '1' });
		
		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.setCssProps({ flex: '1' });
		
		const submit = () => {
			const label = inputEl.value.trim() || 'Toggle';
			this.onSubmit(label);
			this.close();
		};
		
		submitBtn.addEventListener('click', submit);
		cancelBtn.addEventListener('click', () => this.close());
		inputEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') submit();
			if (e.key === 'Escape') this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class TogglifySettingTab extends PluginSettingTab {
	plugin: TogglifyPlugin;

	constructor(app: App, plugin: TogglifyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Togglify Settings' });

		new Setting(containerEl)
			.setName('Default Toggle State')
			.setDesc('The default state for new toggles (on/off)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.defaultToggleState)
				.onChange(async (value) => {
					this.plugin.settings.defaultToggleState = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default Toggle Label')
			.setDesc('The default label text for new toggles')
			.addText(text => text
				.setPlaceholder('Enter default label')
				.setValue(this.plugin.settings.toggleLabel)
				.onChange(async (value) => {
					this.plugin.settings.toggleLabel = value;
					await this.plugin.saveSettings();
				}));
	}
}
