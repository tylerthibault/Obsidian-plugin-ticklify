const { Plugin, Modal, PluginSettingTab, Setting, Notice } = require('obsidian');

const DEFAULT_SETTINGS = {
	defaultToggleState: false,
	toggleLabel: 'Toggle',
	useNoLabel: false,
	users: ['John Doe', 'Jane Smith', 'Alex Johnson'],
	debugMode: false, // Add debug mode setting
	stateColorMappings: {
		// Default color mappings for common state names (lowercase keys)
		'todo': '#f44336',        // Red
		'in progress': '#ff9800', // Orange  
		'done': '#4caf50',        // Green
		'blocked': '#9c27b0',     // Purple
		'review': '#2196f3',      // Blue
		'waiting': '#607d8b',     // Blue Gray
		'cancelled': '#795548',   // Brown
		'urgent': '#ff5722'       // Deep Orange
	},
	stateOrderTemplates: {
		// Predefined state order templates
		'task-workflow': ['todo', 'in progress', 'review', 'done'],
		'project-status': ['planning', 'active', 'testing', 'complete', 'cancelled'],
		'priority-levels': ['low', 'medium', 'high', 'urgent'],
		'approval-process': ['draft', 'submitted', 'under review', 'approved', 'rejected']
	}
};

class TogglifyPlugin extends Plugin {
	// Debug logging method
	debug(message, data = null) {
		if (this.settings.debugMode) {
			const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
			if (data) {
				console.log(`[Togglify Debug ${timestamp}] ${message}`, data);
			} else {
				console.log(`[Togglify Debug ${timestamp}] ${message}`);
			}
		}
	}

	async onload() {
		await this.loadSettings();
		this.debug('Plugin loaded with settings', this.settings);

		// Add CSS for the toggle component
		this.addToggleStyles();
		this.debug('Toggle styles added');

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('toggle-left', 'Insert Toggle', (evt) => {
			this.debug('Ribbon icon clicked');
			this.insertSmartToggleFromRibbon();
		});
		ribbonIconEl.addClass('togglify-ribbon-class');

		// This adds a status bar item to the bottom of the app.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Togglify Ready');

		// Smart command that automatically detects context and inserts appropriate toggle format
		this.addCommand({
			id: 'insert-toggle',
			name: 'Insert Toggle',
			editorCallback: (editor, view) => {
				this.insertSmartToggle(editor);
			}
		});

		// Command to insert a toggle with custom label
		this.addCommand({
			id: 'insert-toggle-with-label',
			name: 'Insert Toggle with Label',
			editorCallback: (editor, view) => {
				new ToggleLabelModal(this.app, (label) => {
					this.insertSmartToggle(editor, label);
				}).open();
			}
		});

		// Command to insert a multi-state button
		this.addCommand({
			id: 'insert-multistate',
			name: 'Insert Multi-State Button',
			editorCallback: (editor, view) => {
				this.insertSmartMultiState(editor);
			}
		});

		// Command to insert a multi-state button with custom label
		this.addCommand({
			id: 'insert-multistate-with-label',
			name: 'Insert Multi-State Button with Label',
			editorCallback: (editor, view) => {
				new ToggleLabelModal(this.app, (label) => {
					this.insertSmartMultiState(editor, label);
				}).open();
			}
		});

		// Command to insert a user dropdown
		this.addCommand({
			id: 'insert-user-dropdown',
			name: 'Insert User Dropdown',
			editorCallback: (editor, view) => {
				this.insertSmartUserDropdown(editor);
			}
		});

		// Command to insert a user dropdown with custom label
		this.addCommand({
			id: 'insert-user-dropdown-with-label',
			name: 'Insert User Dropdown with Label',
			editorCallback: (editor, view) => {
				new ToggleLabelModal(this.app, (label) => {
					this.insertSmartUserDropdown(editor, label);
				}).open();
			}
		});

		// This adds a settings tab
		this.addSettingTab(new TogglifySettingTab(this.app, this));

		// Register markdown post processor for togglify code blocks
		this.registerMarkdownCodeBlockProcessor('togglify', (source, el, ctx) => {
			this.processTogglifyBlock(source, el, ctx);
		});

		// Register markdown post processor for multistate code blocks
		this.registerMarkdownCodeBlockProcessor('multistate', (source, el, ctx) => {
			this.processMultiStateBlock(source, el, ctx);
		});

		// Register markdown post processor for userdropdown code blocks
		this.registerMarkdownCodeBlockProcessor('userdropdown', (source, el, ctx) => {
			this.processUserDropdownBlock(source, el, ctx);
		});

		// Register markdown post processor for inline toggles (works better in tables)
		this.registerMarkdownPostProcessor((el, ctx) => {
			this.processInlineToggles(el, ctx);
			this.processInlineMultiStates(el, ctx);
			this.processInlineUserDropdowns(el, ctx);
		});

		// Additional processing for when content changes
		this.registerEvent(this.app.workspace.on('layout-change', () => {
			setTimeout(() => this.processAllInlineToggles(), 100);
		}));

		this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
			setTimeout(() => this.processAllInlineToggles(), 100);
		}));
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
			
			/* Multi-state button styles */
			.togglify-multistate {
				display: inline-flex;
				align-items: center;
				gap: 6px;
				padding: 4px 8px;
				border-radius: 6px;
				cursor: pointer;
				transition: all 0.3s ease;
				border: 2px solid;
				font-size: 12px;
				font-weight: bold;
				text-transform: uppercase;
				min-width: 60px;
				justify-content: center;
				user-select: none;
			}
			
			.togglify-multistate.state-0 {
				background-color: #f44336;
				border-color: #d32f2f;
				color: white;
			}
			
			.togglify-multistate.state-1 {
				background-color: #ff9800;
				border-color: #f57c00;
				color: white;
			}
			
			.togglify-multistate.state-2 {
				background-color: #4caf50;
				border-color: #388e3c;
				color: white;
			}
			
			.togglify-multistate.state-3 {
				background-color: #2196f3;
				border-color: #1976d2;
				color: white;
			}
			
			.togglify-multistate.state-4 {
				background-color: #9c27b0;
				border-color: #7b1fa2;
				color: white;
			}
			
			.togglify-multistate.state-5 {
				background-color: #607d8b;
				border-color: #455a64;
				color: white;
			}
			
			.togglify-multistate.state-6 {
				background-color: #795548;
				border-color: #5d4037;
				color: white;
			}
			
			.togglify-multistate.state-7 {
				background-color: #ff5722;
				border-color: #d84315;
				color: white;
			}
			
			.togglify-multistate.state-8 {
				background-color: #009688;
				border-color: #00695c;
				color: white;
			}
			
			.togglify-multistate.state-9 {
				background-color: #673ab7;
				border-color: #512da8;
				color: white;
			}
			
			/* Fallback for states beyond 9 - cycles through colors */
			.togglify-multistate:not(.state-0):not(.state-1):not(.state-2):not(.state-3):not(.state-4):not(.state-5):not(.state-6):not(.state-7):not(.state-8):not(.state-9) {
				background-color: #607d8b;
				border-color: #455a64;
				color: white;
			}
			
			.togglify-multistate:hover {
				transform: scale(1.05);
				box-shadow: 0 2px 8px rgba(0,0,0,0.2);
			}
			
			/* User dropdown styles */
			.togglify-user-dropdown {
				display: inline-flex;
				align-items: center;
				gap: 6px;
				margin: 4px 0;
				user-select: none;
				-webkit-user-select: none;
				-moz-user-select: none;
				-ms-user-select: none;
			}
			
			.togglify-user-select {
				padding: 4px 8px;
				border: 2px solid #ddd;
				border-radius: 4px;
				background-color: white;
				font-size: 14px;
				cursor: pointer;
				transition: all 0.3s ease;
				min-width: 120px;
				user-select: none;
				-webkit-user-select: none;
				-moz-user-select: none;
				-ms-user-select: none;
			}
			
			.togglify-user-select:hover {
				border-color: #2196f3;
				box-shadow: 0 2px 4px rgba(0,0,0,0.1);
			}
			
			.togglify-user-select:focus {
				outline: none;
				border-color: #2196f3;
				box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
			}

			/* User Management Table Styles */
			.togglify-user-table-container {
				margin-top: 10px;
			}

			.togglify-user-table {
				width: 100%;
				border-collapse: collapse;
				margin-top: 10px;
				border: 1px solid var(--background-modifier-border);
				border-radius: 6px;
				overflow: hidden;
			}

			.togglify-user-table th,
			.togglify-user-table td {
				padding: 8px 12px;
				text-align: left;
				border-bottom: 1px solid var(--background-modifier-border);
			}

			.togglify-user-table th {
				background-color: var(--background-modifier-form-field);
				font-weight: 600;
				color: var(--text-normal);
			}

			.togglify-user-table tr:hover {
				background-color: var(--background-modifier-hover);
			}

			.togglify-user-table tr:last-child td {
				border-bottom: none;
			}

			.togglify-user-table button {
				padding: 4px 8px;
				border: 1px solid var(--interactive-accent);
				border-radius: 4px;
				background: var(--interactive-accent);
				color: var(--text-on-accent);
				cursor: pointer;
				font-size: 12px;
				transition: all 0.2s ease;
			}

			.togglify-user-table button:hover {
				background: var(--interactive-accent-hover);
				transform: translateY(-1px);
			}

			.togglify-user-table button.mod-warning {
				background: var(--text-error);
				border-color: var(--text-error);
			}

			.togglify-user-table button.mod-warning:hover {
				background: #d32f2f;
				border-color: #d32f2f;
			}

			/* User Avatar Styles */
			.togglify-user-avatar {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				width: 28px;
				height: 28px;
				border-radius: 50%;
				font-size: 11px;
				font-weight: 600;
				text-transform: uppercase;
				margin-right: 8px;
				flex-shrink: 0;
				border: 2px solid var(--background-modifier-border);
				box-shadow: 0 1px 3px rgba(0,0,0,0.1);
			}

			.togglify-user-dropdown {
				position: relative;
				display: inline-block;
				min-width: 120px;
			}

			.togglify-user-display {
				display: flex;
				align-items: center;
				padding: 6px 10px;
				border-radius: 4px;
				background: var(--background-primary-alt);
				border: 1px solid var(--background-modifier-border);
				min-height: 32px;
				cursor: pointer;
				transition: all 0.2s ease;
				user-select: none;
			}

			.togglify-user-display:hover {
				background: var(--background-modifier-hover);
				border-color: var(--interactive-accent);
				box-shadow: 0 2px 4px rgba(0,0,0,0.1);
			}

			.togglify-user-display::after {
				content: '▼';
				margin-left: auto;
				font-size: 10px;
				color: var(--text-muted);
				transition: transform 0.2s ease;
			}

			.togglify-user-dropdown.expanded .togglify-user-display::after {
				transform: rotate(180deg);
			}

			.togglify-user-name {
				font-size: 13px;
				color: var(--text-normal);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				flex: 1;
			}

			.togglify-user-dropdown.expanded .togglify-user-display {
				border-bottom-left-radius: 0;
				border-bottom-right-radius: 0;
				border-bottom-color: var(--interactive-accent);
				background: var(--background-modifier-hover);
			}

			.togglify-user-options {
				position: fixed;
				background: var(--background-primary);
				border: 1px solid var(--interactive-accent);
				border-radius: 6px;
				box-shadow: 0 8px 24px rgba(0,0,0,0.2);
				z-index: 9999;
				max-height: 200px;
				overflow-y: auto;
				display: none;
				animation: slideDown 0.2s ease;
				min-width: 120px;
			}

			@keyframes slideDown {
				from {
					opacity: 0;
					transform: translateY(-5px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}

			.togglify-user-dropdown.expanded .togglify-user-options {
				display: block !important;
				visibility: visible !important;
				opacity: 1 !important;
			}

			.togglify-user-option {
				display: flex;
				align-items: center;
				padding: 8px 12px;
				cursor: pointer;
				transition: all 0.2s ease;
				border-bottom: 1px solid var(--background-modifier-border-hover);
			}

			.togglify-user-option:last-child {
				border-bottom: none;
				border-radius: 0 0 6px 6px;
			}

			.togglify-user-option:hover {
				background: var(--background-modifier-hover);
				transform: translateX(2px);
			}

			.togglify-user-option.selected {
				background: var(--interactive-accent);
				color: var(--text-on-accent);
			}

			.togglify-user-option.selected:hover {
				background: var(--interactive-accent-hover);
			}

			.togglify-user-option .togglify-user-avatar {
				margin-right: 10px;
			}

			.togglify-user-option span {
				font-size: 13px;
				font-weight: 500;
			}

			/* Color table styles */
			.togglify-color-table-container {
				margin-top: 10px;
				margin-bottom: 20px;
			}

			.togglify-color-table {
				width: 100%;
				border-collapse: collapse;
				margin-top: 10px;
				background: var(--background-secondary);
				border-radius: 6px;
				overflow: hidden;
			}

			.togglify-color-table th,
			.togglify-color-table td {
				padding: 8px 12px;
				text-align: left;
				border-bottom: 1px solid var(--background-modifier-border);
			}

			.togglify-color-table th {
				background: var(--background-modifier-border);
				font-weight: 600;
				color: var(--text-normal);
			}

			.togglify-color-table tr:hover {
				background: var(--background-modifier-hover);
			}

			.togglify-color-table tr:last-child td {
				border-bottom: none;
			}

			.togglify-color-table button {
				padding: 4px 12px;
				border: 1px solid var(--background-modifier-border);
				border-radius: 4px;
				background: var(--interactive-normal);
				color: var(--text-normal);
				cursor: pointer;
				font-size: 12px;
				transition: all 0.2s ease;
			}

			.togglify-color-table button:hover {
				background: var(--interactive-hover);
			}

			.togglify-color-table button.mod-warning {
				background: var(--background-modifier-error);
				color: var(--text-on-accent);
				border-color: var(--background-modifier-error);
			}

			.togglify-color-table button.mod-warning:hover {
				background: var(--background-modifier-error-hover);
			}

			/* Color picker styles */
			.color-picker-container {
				display: flex;
				align-items: center;
				gap: 8px;
				padding: 4px;
			}

			.color-picker-input {
				width: 40px;
				height: 30px;
				border: 1px solid var(--background-modifier-border);
				border-radius: 4px;
				cursor: pointer;
				background: none;
				padding: 0;
			}

			.color-picker-input::-webkit-color-swatch-wrapper {
				padding: 0;
				border: none;
				border-radius: 3px;
			}

			.color-picker-input::-webkit-color-swatch {
				border: none;
				border-radius: 3px;
			}

			.hex-input {
				width: 80px;
				padding: 4px 8px;
				border: 1px solid var(--background-modifier-border);
				border-radius: 4px;
				background: var(--background-primary);
				color: var(--text-normal);
				font-family: var(--font-monospace);
				font-size: 12px;
			}

			.hex-input:focus {
				outline: none;
				border-color: var(--interactive-accent);
			}

			/* Template table styles */
			.togglify-template-table-container {
				margin-top: 10px;
				margin-bottom: 20px;
			}

			.togglify-template-table {
				width: 100%;
				border-collapse: collapse;
				margin-top: 10px;
				background: var(--background-secondary);
				border-radius: 6px;
				overflow: hidden;
			}

			.togglify-template-table th,
			.togglify-template-table td {
				padding: 8px 12px;
				text-align: left;
				border-bottom: 1px solid var(--background-modifier-border);
			}

			.togglify-template-table th {
				background: var(--background-modifier-border);
				font-weight: 600;
				color: var(--text-normal);
			}

			.togglify-template-table tr:hover {
				background: var(--background-modifier-hover);
			}

			.togglify-template-table tr:last-child td {
				border-bottom: none;
			}

			.states-order-container {
				display: flex;
				flex-direction: column;
				gap: 4px;
				max-width: 300px;
			}

			.state-item {
				display: flex;
				align-items: center;
				gap: 6px;
				padding: 2px 4px;
				border-radius: 3px;
				background: var(--background-primary);
			}

			.move-btn {
				width: 20px;
				height: 20px;
				border: 1px solid var(--background-modifier-border);
				border-radius: 3px;
				background: var(--interactive-normal);
				color: var(--text-normal);
				cursor: pointer;
				font-size: 10px;
				display: flex;
				align-items: center;
				justify-content: center;
				padding: 0;
			}

			.move-btn:hover {
				background: var(--interactive-hover);
			}

			.state-text {
				font-size: 12px;
				flex: 1;
			}

			/* Template selection modal styles */
			.template-selection-container {
				display: flex;
				flex-direction: column;
				gap: 8px;
				margin: 10px 0;
			}

			.template-button {
				padding: 8px 12px;
				border: 1px solid var(--background-modifier-border);
				border-radius: 6px;
				background: var(--interactive-normal);
				color: var(--text-normal);
				cursor: pointer;
				text-align: left;
				transition: all 0.2s ease;
			}

			.template-button:hover {
				background: var(--interactive-hover);
				border-color: var(--interactive-accent);
			}

			.template-button:active {
				background: var(--interactive-accent);
				color: var(--text-on-accent);
			}
		`;
		document.head.appendChild(style);
	}

	insertToggle() {
		const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
		if (activeView) {
			const editor = activeView.editor;
			this.insertToggleAtCursor(editor);
		} else {
			new Notice('No active markdown view found');
		}
	}

	insertSmartToggleFromRibbon() {
		const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
		if (activeView) {
			const editor = activeView.editor;
			this.insertSmartToggle(editor);
		} else {
			new Notice('No active markdown view found');
		}
	}

	insertToggleAtCursor(editor, label) {
		const cursor = editor.getCursor();
		// Use setting to determine if label should be used
		const toggleLabel = label !== undefined ? label : (this.settings.useNoLabel ? '' : this.settings.toggleLabel);
		const toggleState = this.settings.defaultToggleState;
		
		// Create a unique ID for this toggle
		const toggleId = `toggle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		
		// Use block format for regular toggles
		const toggleBlock = `\`\`\`togglify
id: ${toggleId}
label: ${toggleLabel}
state: ${toggleState}
\`\`\``;

		editor.replaceRange(toggleBlock, cursor);
		const displayLabel = toggleLabel || 'unlabeled toggle';
		new Notice(`Toggle "${displayLabel}" inserted!`);
	}

	insertInlineToggleAtCursor(editor, label) {
		const cursor = editor.getCursor();
		// Use setting to determine if label should be used
		const toggleLabel = label !== undefined ? label : (this.settings.useNoLabel ? '' : this.settings.toggleLabel);
		const toggleState = this.settings.defaultToggleState;
		
		// Create a unique ID for this toggle
		const toggleId = `toggle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		
		// Use inline syntax that works better in tables and other contexts
		const toggleInline = `{{toggle:${toggleId}:${toggleLabel}:${toggleState}}}`;

		editor.replaceRange(toggleInline, cursor);
		const displayLabel = toggleLabel || 'unlabeled toggle';
		new Notice(`Inline toggle "${displayLabel}" inserted!`);
	}

	// Smart toggle insertion that detects context automatically
	insertSmartToggle(editor, label) {
		const cursor = editor.getCursor();
		const useInlineFormat = this.shouldUseInlineFormat(editor, cursor);
		
		if (useInlineFormat) {
			this.insertInlineToggleAtCursor(editor, label);
		} else {
			this.insertToggleAtCursor(editor, label);
		}
	}

	// Detect if cursor is in a context that requires inline format
	shouldUseInlineFormat(editor, cursor) {
		const currentLine = editor.getLine(cursor.line);
		const beforeCursor = currentLine.substring(0, cursor.ch);
		const afterCursor = currentLine.substring(cursor.ch);
		
		// Check if we're inside a table row (contains | characters)
		const isInTableRow = currentLine.includes('|');
		
		// Check if we're in the middle of existing text (not at start/end of line)
		const isInMiddleOfText = beforeCursor.trim().length > 0 && afterCursor.trim().length > 0;
		
		// Check if we're in a list item
		const isInListItem = /^\s*[-*+]\s/.test(currentLine) || /^\s*\d+\.\s/.test(currentLine);
		
		// Check if line is short (likely inline context)
		const isShortLine = currentLine.trim().length < 100;
		
		// Use inline format if:
		// 1. We're in a table row, OR
		// 2. We're in the middle of existing text, OR
		// 3. We're in a list item and the line is relatively short
		return isInTableRow || isInMiddleOfText || (isInListItem && isShortLine);
	}

	// Multi-state button insertion functions
	insertMultiStateAtCursor(editor, label, customStates = null) {
		const cursor = editor.getCursor();
		// Use setting to determine if label should be used
		const multiStateLabel = label !== undefined ? label : (this.settings.useNoLabel ? '' : 'State');
		const initialState = 0; // Start at first state
		
		// Create a unique ID for this multi-state button
		const multiStateId = `multistate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		
		// Use provided states or default
		const states = customStates || 'Not Started,In Progress,Complete';
		
		// Use block format for multi-state buttons
		const multiStateBlock = `\`\`\`multistate
id: ${multiStateId}
label: ${multiStateLabel}
state: ${initialState}
states: ${states}
\`\`\``;

		editor.replaceRange(multiStateBlock, cursor);
		const displayLabel = multiStateLabel || 'unlabeled multi-state';
		new Notice(`Multi-state button "${displayLabel}" inserted!`);
	}

	insertInlineMultiStateAtCursor(editor, label, customStates = null) {
		const cursor = editor.getCursor();
		// Use setting to determine if label should be used
		const multiStateLabel = label !== undefined ? label : (this.settings.useNoLabel ? '' : 'State');
		const initialState = 0; // Start at first state
		
		// Create a unique ID for this multi-state button
		const multiStateId = `multistate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		
		// Use provided states or default
		const states = customStates || 'Not Started,In Progress,Complete';
		
		// Use inline syntax for multi-state buttons
		const multiStateInline = `{{multistate:${multiStateId}:${multiStateLabel}:${initialState}:${states}}}`;

		editor.replaceRange(multiStateInline, cursor);
		const displayLabel = multiStateLabel || 'unlabeled multi-state';
		new Notice(`Inline multi-state button "${displayLabel}" inserted!`);
	}

	// Smart multi-state insertion that detects context automatically
	insertSmartMultiState(editor, label) {
		const cursor = editor.getCursor();
		const useInlineFormat = this.shouldUseInlineFormat(editor, cursor);
		
		// Show template selection modal
		const modal = new TemplateSelectionModal(this.app, this, (states) => {
			if (useInlineFormat) {
				this.insertInlineMultiStateAtCursor(editor, label, states);
			} else {
				this.insertMultiStateAtCursor(editor, label, states);
			}
		});
		modal.open();
	}

	// User dropdown insertion functions
	insertUserDropdownAtCursor(editor, label) {
		const cursor = editor.getCursor();
		// Use setting to determine if label should be used
		const dropdownLabel = label !== undefined ? label : (this.settings.useNoLabel ? '' : 'Assigned to');
		const defaultUser = this.settings.users.length > 0 ? this.settings.users[0] : 'Unassigned';
		
		// Create a unique ID for this user dropdown
		const dropdownId = `userdropdown-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		
		// Use block format for user dropdowns
		const dropdownBlock = `\`\`\`userdropdown
id: ${dropdownId}
label: ${dropdownLabel}
selected: ${defaultUser}
\`\`\``;

		editor.replaceRange(dropdownBlock, cursor);
		const displayLabel = dropdownLabel || 'unlabeled dropdown';
		new Notice(`User dropdown "${displayLabel}" inserted!`);
	}

	insertInlineUserDropdownAtCursor(editor, label) {
		const cursor = editor.getCursor();
		// Use setting to determine if label should be used
		const dropdownLabel = label !== undefined ? label : (this.settings.useNoLabel ? '' : 'Assigned to');
		const defaultUser = this.settings.users.length > 0 ? this.settings.users[0] : 'Unassigned';
		
		// Create a unique ID for this user dropdown
		const dropdownId = `userdropdown-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		
		// Use inline syntax for user dropdowns
		const dropdownInline = `{{userdropdown:${dropdownId}:${dropdownLabel}:${defaultUser}}}`;

		editor.replaceRange(dropdownInline, cursor);
		const displayLabel = dropdownLabel || 'unlabeled dropdown';
		new Notice(`Inline user dropdown "${displayLabel}" inserted!`);
	}

	// Smart user dropdown insertion that detects context automatically
	insertSmartUserDropdown(editor, label) {
		const cursor = editor.getCursor();
		const useInlineFormat = this.shouldUseInlineFormat(editor, cursor);
		
		if (useInlineFormat) {
			this.insertInlineUserDropdownAtCursor(editor, label);
		} else {
			this.insertUserDropdownAtCursor(editor, label);
		}
	}

	processTogglifyBlock(source, el, ctx) {
		// Parse the togglify block content
		const lines = source.trim().split('\n');
		const config = {};
		
		lines.forEach(line => {
			const [key, value] = line.split(':').map(s => s.trim());
			if (key && value !== undefined) {
				config[key] = value;
			}
		});
		
		const toggleId = config.id || `toggle-${Date.now()}`;
		const toggleLabel = config.label || '';  // Allow empty labels
		const isActive = config.state === 'true';
		
		// Clear the element and add our toggle
		el.empty();
		
		// Create the toggle element
		const toggleElement = this.createToggleElement(toggleId, toggleLabel, isActive);
		el.appendChild(toggleElement);
	}

	processUserDropdownBlock(source, el, ctx) {
		// Parse the userdropdown block content
		const lines = source.trim().split('\n');
		const config = {};
		
		lines.forEach(line => {
			const [key, value] = line.split(':').map(s => s.trim());
			if (key && value !== undefined) {
				config[key] = value;
			}
		});
		
		const dropdownId = config.id || `userdropdown-${Date.now()}`;
		const dropdownLabel = config.label || '';  // Allow empty labels
		const selectedUser = config.selected || (this.settings.users.length > 0 ? this.settings.users[0] : 'Unassigned');
		
		// Validate selected user exists in settings
		const validUser = (this.settings.users.includes(selectedUser) || selectedUser === 'Unassigned') ? selectedUser : 
			(this.settings.users.length > 0 ? this.settings.users[0] : 'Unassigned');
		
		// Clear the element and add our user dropdown
		el.empty();
		
		// Create the user dropdown element
		const userDropdownElement = this.createUserDropdownElement(dropdownId, dropdownLabel, validUser);
		el.appendChild(userDropdownElement);
	}

	processInlineToggles(el, ctx) {
		this.debug('Processing inline toggles in element', el);
		
		// Find all text nodes containing inline toggle syntax
		const walker = document.createTreeWalker(
			el,
			NodeFilter.SHOW_TEXT,
			null,
			false
		);

		const textNodes = [];
		let node;
		while (node = walker.nextNode()) {
			if (node.textContent.includes('{{toggle:')) {
				textNodes.push(node);
			}
		}

		this.debug(`Found ${textNodes.length} text nodes with toggle syntax`);

		textNodes.forEach(textNode => {
			const text = textNode.textContent;
			const togglePattern = /\{\{toggle:([^:]+):([^:]*?):(true|false)\}\}/;
			const match = text.match(togglePattern);

			if (match) {
				const [fullMatch, toggleId, toggleLabel, toggleState] = match;
				this.debug('Processing inline toggle', { toggleId, toggleLabel, toggleState });
				
				const beforeText = text.substring(0, text.indexOf(fullMatch));
				const afterText = text.substring(text.indexOf(fullMatch) + fullMatch.length);
				
				// Create the toggle element (toggleLabel can be empty string)
				const toggleElement = this.createToggleElement(
					toggleId,
					toggleLabel,
					toggleState === 'true'
				);
				
				// Replace the text node with the new structure
				const parent = textNode.parentNode;
				if (parent) {
					// Create document fragment for efficient DOM manipulation
					const fragment = document.createDocumentFragment();
					
					if (beforeText) {
						fragment.appendChild(document.createTextNode(beforeText));
					}
					
					fragment.appendChild(toggleElement);
					
					if (afterText) {
						fragment.appendChild(document.createTextNode(afterText));
					}
					
					parent.replaceChild(fragment, textNode);
				}
			}
		});
	}

	processAllInlineToggles() {
		const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
		if (activeView && activeView.previewMode) {
			const previewElement = activeView.previewMode.containerEl;
			if (previewElement) {
				this.processInlineToggles(previewElement, null);
				this.processInlineMultiStates(previewElement, null);
				this.processInlineUserDropdowns(previewElement, null);
			}
		}
	}

	createToggleElement(toggleId, toggleLabel, isActive) {
		this.debug('Creating toggle element', { toggleId, toggleLabel, isActive });
		
		// Create container
		const container = document.createElement('div');
		container.className = 'togglify-container';
		
		// Create toggle switch
		const toggleSwitch = document.createElement('button');
		toggleSwitch.className = `togglify-switch${isActive ? ' active' : ''}`;
		toggleSwitch.setAttribute('data-toggle-id', toggleId);
		
		// Create slider
		const slider = document.createElement('div');
		slider.className = 'togglify-slider';
		toggleSwitch.appendChild(slider);
		
		// Add click handler that updates the source
		toggleSwitch.addEventListener('click', (e) => {
			e.preventDefault();
			this.debug('Toggle clicked', { toggleId, currentState: toggleSwitch.classList.contains('active') });
			
			toggleSwitch.classList.toggle('active');
			const isOn = toggleSwitch.classList.contains('active');
			const labelText = toggleLabel || 'Toggle';
			
			this.debug('Toggle state changed', { toggleId, newState: isOn });
			
			// Update the source markdown
			this.updateToggleInSource(toggleId, isOn);
			
			new Notice(`Toggle "${labelText}" ${isOn ? 'ON' : 'OFF'} (ID: ${toggleId})`);
		});
		
		container.appendChild(toggleSwitch);
		
		// Only add label if it's not empty
		if (toggleLabel && toggleLabel.trim() !== '') {
			const label = document.createElement('span');
			label.className = 'togglify-label';
			label.textContent = toggleLabel;
			container.appendChild(label);
		}
		
		return container;
	}

	// Multi-state processing functions
	processMultiStateBlock(source, el, ctx) {
		// Parse the multistate block content
		const lines = source.trim().split('\n');
		const config = {};
		
		lines.forEach(line => {
			const [key, value] = line.split(':').map(s => s.trim());
			if (key && value !== undefined) {
				config[key] = value;
			}
		});
		
		const multiStateId = config.id || `multistate-${Date.now()}`;
		const multiStateLabel = config.label || '';
		const currentState = parseInt(config.state) || 0;
		const states = config.states ? config.states.split(',').map(s => s.trim()) : ['State 0', 'State 1', 'State 2'];
		
		// Clear the element and add our multi-state button
		el.empty();
		
		// Create the multi-state element
		const multiStateElement = this.createMultiStateElement(multiStateId, multiStateLabel, currentState, states);
		el.appendChild(multiStateElement);
	}

	processInlineMultiStates(el, ctx) {
		// Find all text nodes containing inline multi-state syntax
		const walker = document.createTreeWalker(
			el,
			NodeFilter.SHOW_TEXT,
			null,
			false
		);

		const textNodes = [];
		let node;
		while (node = walker.nextNode()) {
			if (node.textContent.includes('{{multistate:')) {
				textNodes.push(node);
			}
		}

		textNodes.forEach(textNode => {
			const text = textNode.textContent;
			const multiStatePattern = /\{\{multistate:([^:]+):([^:]*?):(\d+):([^}]+)\}\}/;
			const match = text.match(multiStatePattern);

			if (match) {
				const [fullMatch, multiStateId, multiStateLabel, currentState, statesStr] = match;
				const states = statesStr.split(',').map(s => s.trim());
				const beforeText = text.substring(0, text.indexOf(fullMatch));
				const afterText = text.substring(text.indexOf(fullMatch) + fullMatch.length);

				const multiStateElement = this.createMultiStateElement(
					multiStateId, 
					multiStateLabel, 
					parseInt(currentState), 
					states
				);

				// Replace the text node with our multi-state button
				const parent = textNode.parentNode;
				if (beforeText) {
					parent.insertBefore(document.createTextNode(beforeText), textNode);
				}
				parent.insertBefore(multiStateElement, textNode);
				if (afterText) {
					parent.insertBefore(document.createTextNode(afterText), textNode);
				}
				parent.removeChild(textNode);
			}
		});
	}

	processInlineUserDropdowns(el, ctx) {
		// Find all text nodes containing inline user dropdown syntax
		const walker = document.createTreeWalker(
			el,
			NodeFilter.SHOW_TEXT,
			null,
			false
		);

		const textNodes = [];
		let node;
		while (node = walker.nextNode()) {
			if (node.textContent.includes('{{userdropdown:')) {
				textNodes.push(node);
			}
		}

		textNodes.forEach(textNode => {
			const text = textNode.textContent;
			const userDropdownPattern = /\{\{userdropdown:([^:]+):([^:]*):([^}]+)\}\}/;
			const match = text.match(userDropdownPattern);

			if (match) {
				const [fullMatch, dropdownId, dropdownLabel, selectedUser] = match;
				const beforeText = text.substring(0, text.indexOf(fullMatch));
				const afterText = text.substring(text.indexOf(fullMatch) + fullMatch.length);

				// Validate selected user exists in settings
				const validUser = (this.settings.users.includes(selectedUser) || selectedUser === 'Unassigned') ? selectedUser : 
					(this.settings.users.length > 0 ? this.settings.users[0] : 'Unassigned');
				
				const userDropdownElement = this.createUserDropdownElement(
					dropdownId, 
					dropdownLabel, 
					validUser
				);

				// Replace the text node with our user dropdown
				const parent = textNode.parentNode;
				if (beforeText) {
					parent.insertBefore(document.createTextNode(beforeText), textNode);
				}
				parent.insertBefore(userDropdownElement, textNode);
				if (afterText) {
					parent.insertBefore(document.createTextNode(afterText), textNode);
				}
				parent.removeChild(textNode);
			}
		});
	}

	createMultiStateElement(multiStateId, multiStateLabel, currentState, states) {
		// Create container
		const container = document.createElement('div');
		container.className = 'togglify-container';
		
		// Create multi-state button
		const multiStateButton = document.createElement('button');
		multiStateButton.className = 'togglify-multistate';
		multiStateButton.setAttribute('data-multistate-id', multiStateId);
		multiStateButton.textContent = states[currentState] || `State ${currentState}`;
		
		// Apply color based on current state key
		const currentStateKey = states[currentState] || `State ${currentState}`;
		const stateColor = this.getStateColor(currentStateKey);
		this.applyMultiStateColor(multiStateButton, stateColor);
		
		this.debug('Creating multi-state element', { multiStateId, multiStateLabel, currentState, currentStateKey, stateColor });
		
		// Add click handler that cycles through states
		multiStateButton.addEventListener('click', (e) => {
			e.preventDefault();
			this.debug('Multi-state button clicked', { multiStateId, currentState, totalStates: states.length });
			
			const nextState = (currentState + 1) % states.length;
			const nextStateKey = states[nextState] || `State ${nextState}`;
			const nextStateColor = this.getStateColor(nextStateKey);
			
			this.debug('Multi-state cycling', { multiStateId, fromState: currentState, toState: nextState, newStateText: nextStateKey, newColor: nextStateColor });
			
			// Update visual state with dynamic color
			multiStateButton.textContent = nextStateKey;
			this.applyMultiStateColor(multiStateButton, nextStateColor);
			
			// Update the source markdown
			this.updateMultiStateInSource(multiStateId, nextState);
			
			const labelText = multiStateLabel || 'Multi-state';
			new Notice(`${labelText}: ${nextStateKey} (ID: ${multiStateId})`);
			
			// Update current state for next click
			currentState = nextState;
		});
		
		container.appendChild(multiStateButton);
		
		// Only add label if it's not empty
		if (multiStateLabel && multiStateLabel.trim() !== '') {
			const label = document.createElement('span');
			label.className = 'togglify-label';
			label.textContent = multiStateLabel;
			container.appendChild(label);
		}
		
		return container;
	}

	// Helper function to apply color styling to multistate button
	applyMultiStateColor(button, color) {
		// Generate border color (darker version of background)
		const borderColor = this.darkenColor(color, 20);
		
		button.style.backgroundColor = color;
		button.style.borderColor = borderColor;
		button.style.color = this.getContrastColor(color);
	}

	// Helper function to darken a color by a percentage
	darkenColor(color, percent) {
		const hex = color.replace('#', '');
		const r = parseInt(hex.substr(0, 2), 16);
		const g = parseInt(hex.substr(2, 2), 16);
		const b = parseInt(hex.substr(4, 2), 16);
		
		const newR = Math.round(r * (100 - percent) / 100);
		const newG = Math.round(g * (100 - percent) / 100);
		const newB = Math.round(b * (100 - percent) / 100);
		
		return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
	}

	// Helper function to determine if white or black text is better on a background color
	getContrastColor(backgroundColor) {
		const hex = backgroundColor.replace('#', '');
		const r = parseInt(hex.substr(0, 2), 16);
		const g = parseInt(hex.substr(2, 2), 16);
		const b = parseInt(hex.substr(4, 2), 16);
		
		// Calculate luminance
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
		
		// Return white for dark backgrounds, black for light backgrounds
		return luminance > 0.5 ? '#000000' : '#ffffff';
	}

	// Helper function to get user initials
	getUserInitials(userName) {
		if (!userName || userName === 'Unassigned') return 'UN';
		
		const words = userName.trim().split(/\s+/);
		if (words.length === 1) {
			// Single word - take first two characters
			return words[0].substring(0, 2).toUpperCase();
		} else {
			// Multiple words - take first letter of first two words
			return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
		}
	}

	// Helper function to generate consistent color for user
	getUserColor(userName) {
		if (!userName || userName === 'Unassigned') {
			return { bg: '#9e9e9e', text: '#ffffff' }; // Gray for unassigned
		}
		
		// Generate a consistent color based on username
		let hash = 0;
		for (let i = 0; i < userName.length; i++) {
			hash = userName.charCodeAt(i) + ((hash << 5) - hash);
		}
		
		// Use the hash to pick from a predefined set of pleasant colors
		const colors = [
			{ bg: '#f44336', text: '#ffffff' }, // Red
			{ bg: '#e91e63', text: '#ffffff' }, // Pink
			{ bg: '#9c27b0', text: '#ffffff' }, // Purple
			{ bg: '#673ab7', text: '#ffffff' }, // Deep Purple
			{ bg: '#3f51b5', text: '#ffffff' }, // Indigo
			{ bg: '#2196f3', text: '#ffffff' }, // Blue
			{ bg: '#03a9f4', text: '#ffffff' }, // Light Blue
			{ bg: '#00bcd4', text: '#ffffff' }, // Cyan
			{ bg: '#009688', text: '#ffffff' }, // Teal
			{ bg: '#4caf50', text: '#ffffff' }, // Green
			{ bg: '#8bc34a', text: '#ffffff' }, // Light Green
			{ bg: '#cddc39', text: '#000000' }, // Lime
			{ bg: '#ffeb3b', text: '#000000' }, // Yellow
			{ bg: '#ffc107', text: '#000000' }, // Amber
			{ bg: '#ff9800', text: '#ffffff' }, // Orange
			{ bg: '#ff5722', text: '#ffffff' }  // Deep Orange
		];
		
		const colorIndex = Math.abs(hash) % colors.length;
		return colors[colorIndex];
	}

	// Helper function to get color for multistate button based on state key
	getStateColor(stateKey) {
		if (!stateKey) return '#607d8b'; // Default gray color
		
		const lowerKey = stateKey.toLowerCase().trim();
		
		// Check if we have a custom mapping for this state
		if (this.settings.stateColorMappings && this.settings.stateColorMappings[lowerKey]) {
			return this.settings.stateColorMappings[lowerKey];
		}
		
		// Fallback to generating a consistent color based on the key
		let hash = 0;
		for (let i = 0; i < lowerKey.length; i++) {
			hash = lowerKey.charCodeAt(i) + ((hash << 5) - hash);
		}
		
		// Use hash to pick from a predefined color palette
		const defaultColors = [
			'#f44336', // Red
			'#ff9800', // Orange
			'#4caf50', // Green  
			'#2196f3', // Blue
			'#9c27b0', // Purple
			'#607d8b', // Blue Gray
			'#795548', // Brown
			'#ff5722', // Deep Orange
			'#e91e63', // Pink
			'#673ab7', // Deep Purple
			'#3f51b5', // Indigo
			'#00bcd4'  // Cyan
		];
		
		const colorIndex = Math.abs(hash) % defaultColors.length;
		return defaultColors[colorIndex];
	}

	createUserDropdownElement(dropdownId, dropdownLabel, selectedUser) {
		this.debug('Creating user dropdown element', { dropdownId, dropdownLabel, selectedUser });
		
		// Create container
		const container = document.createElement('div');
		container.className = 'togglify-user-dropdown';
		container.setAttribute('data-dropdown-id', dropdownId);
		container.style.position = 'relative';
		
		// Create display element (what shows when dropdown is closed)
		const displayElement = document.createElement('div');
		displayElement.className = 'togglify-user-display';
		
		// Create user avatar
		const avatar = document.createElement('div');
		avatar.className = 'togglify-user-avatar';
		const initials = this.getUserInitials(selectedUser);
		const colors = this.getUserColor(selectedUser);
		avatar.textContent = initials;
		avatar.style.backgroundColor = colors.bg;
		avatar.style.color = colors.text;
		
		// Create user name display
		const nameDisplay = document.createElement('span');
		nameDisplay.className = 'togglify-user-name';
		nameDisplay.textContent = selectedUser;
		
		displayElement.appendChild(avatar);
		displayElement.appendChild(nameDisplay);
		
		// Create dropdown options container
		const optionsContainer = document.createElement('div');
		optionsContainer.className = 'togglify-user-options';
		optionsContainer.style.display = 'none'; // Start hidden
		
		// Populate with users from settings
		this.settings.users.forEach(user => {
			const option = document.createElement('div');
			option.className = 'togglify-user-option';
			if (user === selectedUser) {
				option.classList.add('selected');
			}
			
			// Create avatar for option
			const optionAvatar = document.createElement('div');
			optionAvatar.className = 'togglify-user-avatar';
			const optionInitials = this.getUserInitials(user);
			const optionColors = this.getUserColor(user);
			optionAvatar.textContent = optionInitials;
			optionAvatar.style.backgroundColor = optionColors.bg;
			optionAvatar.style.color = optionColors.text;
			
			// Create name for option
			const optionName = document.createElement('span');
			optionName.textContent = user;
			
			option.appendChild(optionAvatar);
			option.appendChild(optionName);
			
			// Add click handler for option
			option.addEventListener('click', (e) => {
				e.stopPropagation();
				this.debug('User option clicked', { dropdownId, selectedUser: user, previousUser: selectedUser });
				
				// Update display
				avatar.textContent = optionInitials;
				avatar.style.backgroundColor = optionColors.bg;
				avatar.style.color = optionColors.text;
				nameDisplay.textContent = user;
				
				// Update selected state
				optionsContainer.querySelectorAll('.togglify-user-option').forEach(opt => {
					opt.classList.remove('selected');
				});
				option.classList.add('selected');
				
				// Close dropdown
				container.classList.remove('expanded');
				optionsContainer.style.display = 'none';
				
				// Update the source markdown
				this.updateUserDropdownInSource(dropdownId, user);
				
				const labelText = dropdownLabel || 'User dropdown';
				new Notice(`${labelText}: ${user} (ID: ${dropdownId})`);
			});
			
			optionsContainer.appendChild(option);
		});
		
		// Add an "Unassigned" option if not already present
		if (!this.settings.users.includes('Unassigned')) {
			const unassignedOption = document.createElement('div');
			unassignedOption.className = 'togglify-user-option';
			if (selectedUser === 'Unassigned') {
				unassignedOption.classList.add('selected');
			}
			
			const unassignedAvatar = document.createElement('div');
			unassignedAvatar.className = 'togglify-user-avatar';
			const unassignedColors = this.getUserColor('Unassigned');
			unassignedAvatar.textContent = 'UN';
			unassignedAvatar.style.backgroundColor = unassignedColors.bg;
			unassignedAvatar.style.color = unassignedColors.text;
			
			const unassignedName = document.createElement('span');
			unassignedName.textContent = 'Unassigned';
			
			unassignedOption.appendChild(unassignedAvatar);
			unassignedOption.appendChild(unassignedName);
			
			unassignedOption.addEventListener('click', (e) => {
				e.stopPropagation();
				
				// Update display
				avatar.textContent = 'UN';
				avatar.style.backgroundColor = unassignedColors.bg;
				avatar.style.color = unassignedColors.text;
				nameDisplay.textContent = 'Unassigned';
				
				// Update selected state
				optionsContainer.querySelectorAll('.togglify-user-option').forEach(opt => {
					opt.classList.remove('selected');
				});
				unassignedOption.classList.add('selected');
				
				// Close dropdown
				container.classList.remove('expanded');
				optionsContainer.style.display = 'none';
				
				// Update the source markdown
				this.updateUserDropdownInSource(dropdownId, 'Unassigned');
				
				const labelText = dropdownLabel || 'User dropdown';
				new Notice(`${labelText}: Unassigned (ID: ${dropdownId})`);
			});
			
			optionsContainer.appendChild(unassignedOption);
		}

		// Prevent the entire container from triggering editor events
		container.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
		});
		
		container.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
		});
		
		// Prevent options container clicks from bubbling up
		optionsContainer.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
		});
		
		optionsContainer.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
		});
		
		// Add click handler for display element to toggle dropdown
		displayElement.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			
			const isExpanded = container.classList.contains('expanded');
			this.debug('Dropdown display clicked', { dropdownId, currentlyExpanded: isExpanded });
			
			// Close other dropdowns first
			document.querySelectorAll('.togglify-user-dropdown.expanded').forEach(dropdown => {
				if (dropdown !== container) {
					dropdown.classList.remove('expanded');
					const otherOptions = dropdown.querySelector('.user-dropdown-options');
					if (otherOptions) {
						otherOptions.style.display = 'none';
					}
				}
			});
			
			if (isExpanded) {
				// Close this dropdown
				container.classList.remove('expanded');
				optionsContainer.style.display = 'none';
			} else {
				// Open this dropdown
				container.classList.add('expanded');
				
				// Position the dropdown using fixed positioning
				const rect = displayElement.getBoundingClientRect();
				
				optionsContainer.style.top = `${rect.bottom + 2}px`;
				optionsContainer.style.left = `${rect.left}px`;
				optionsContainer.style.width = `${Math.max(rect.width, 120)}px`;
				optionsContainer.style.display = 'block';
				optionsContainer.style.visibility = 'visible';
				optionsContainer.style.opacity = '1';
			}
		});
		
		// Add mousedown handler to prevent editor activation
		displayElement.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
		});
		
		// Prevent focus events that might trigger editor mode
		displayElement.addEventListener('focus', (e) => {
			e.preventDefault();
			displayElement.blur();
		});
		
		container.addEventListener('focus', (e) => {
			e.preventDefault();
			container.blur();
		});
		
		// Close dropdown when clicking outside
		const closeDropdown = (e) => {
			if (!container.contains(e.target) && !optionsContainer.contains(e.target)) {
				if (container.classList.contains('expanded')) {
					container.classList.remove('expanded');
					optionsContainer.style.display = 'none';
				}
			}
		};
		
		// Handle window events that might require repositioning or closing
		const repositionDropdown = () => {
			if (container.classList.contains('expanded')) {
				const rect = displayElement.getBoundingClientRect();
				optionsContainer.style.top = `${rect.bottom + 2}px`;
				optionsContainer.style.left = `${rect.left}px`;
				optionsContainer.style.width = `${Math.max(rect.width, 120)}px`;
			}
		};
		
		// Close dropdown on escape key
		const handleKeyDown = (e) => {
			if (e.key === 'Escape' && container.classList.contains('expanded')) {
				container.classList.remove('expanded');
				optionsContainer.style.display = 'none';
			}
		};
		
		// Add event listeners with proper options
		document.addEventListener('click', closeDropdown, true); // Use capture phase
		document.addEventListener('keydown', handleKeyDown);
		window.addEventListener('scroll', repositionDropdown, true);
		window.addEventListener('resize', repositionDropdown);
		window.addEventListener('blur', () => {
			// Close dropdown if window loses focus
			if (container.classList.contains('expanded')) {
				container.classList.remove('expanded');
				optionsContainer.style.display = 'none';
			}
		});
		
		// Store the cleanup function for later removal
		container._cleanupEventListener = () => {
			document.removeEventListener('click', closeDropdown, true);
			document.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('scroll', repositionDropdown, true);
			window.removeEventListener('resize', repositionDropdown);
			if (optionsContainer.parentNode === document.body) {
				document.body.removeChild(optionsContainer);
			}
		};
		
		container.appendChild(displayElement);
		// Append options to body to avoid overflow issues
		document.body.appendChild(optionsContainer);
		
		// Only add label if it's not empty
		if (dropdownLabel && dropdownLabel.trim() !== '') {
			const label = document.createElement('span');
			label.className = 'togglify-label';
			label.textContent = dropdownLabel;
			container.appendChild(label);
		}
		
		return container;
	}

	updateToggleInSource(toggleId, newState) {
		this.debug('Updating toggle in source', { toggleId, newState });
		
		const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
		if (!activeView || !activeView.editor) {
			this.debug('No active markdown view or editor found');
			return;
		}

		const editor = activeView.editor;
		const content = editor.getValue();
		
		// Escape the toggle ID for regex
		const escapedId = toggleId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		
		// Update inline toggles: {{toggle:id:label:state}}
		const inlinePattern = new RegExp(`(\\{\\{toggle:${escapedId}:[^:]*?:)(true|false)(\\}\\})`, 'g');
		let updatedContent = content.replace(inlinePattern, `$1${newState}$3`);
		
		// Update block toggles - more robust pattern
		const blockPattern = new RegExp(
			`(\`\`\`togglify[\\s\\S]*?\\bid:\\s*${escapedId}\\b[\\s\\S]*?\\bstate:\\s*)(true|false)(\\b[\\s\\S]*?\`\`\`)`,
			'g'
		);
		updatedContent = updatedContent.replace(blockPattern, `$1${newState}$3`);
		
		// Only update if content actually changed
		if (updatedContent !== content) {
			this.debug('Content changed, updating editor', { toggleId, contentLength: content.length, updatedLength: updatedContent.length });
			// Update the content
			editor.setValue(updatedContent);
		} else {
			this.debug('No content changes detected for toggle', { toggleId });
		}
	}

	updateMultiStateInSource(multiStateId, newState) {
		this.debug('Updating multi-state in source', { multiStateId, newState });
		
		const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
		if (!activeView || !activeView.editor) {
			this.debug('No active markdown view or editor found');
			return;
		}

		const editor = activeView.editor;
		const content = editor.getValue();
		
		// Escape the multi-state ID for regex
		const escapedId = multiStateId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		
		// Update inline multi-states: {{multistate:id:label:state:states}}
		const inlinePattern = new RegExp(`(\\{\\{multistate:${escapedId}:[^:]*?:)(\\d+)(:([^}]+)\\}\\})`, 'g');
		let updatedContent = content.replace(inlinePattern, `$1${newState}$3`);
		
		// Update block multi-states - more robust pattern
		const blockPattern = new RegExp(
			`(\`\`\`multistate[\\s\\S]*?\\bid:\\s*${escapedId}\\b[\\s\\S]*?\\bstate:\\s*)(\\d+)(\\b[\\s\\S]*?\`\`\`)`,
			'g'
		);
		updatedContent = updatedContent.replace(blockPattern, `$1${newState}$3`);
		
		// Only update if content actually changed
		if (updatedContent !== content) {
			// Update the content
			editor.setValue(updatedContent);
		}
	}

	updateUserDropdownInSource(dropdownId, newUser) {
		const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
		if (!activeView || !activeView.editor) return;

		const editor = activeView.editor;
		const content = editor.getValue();
		
		// Escape the dropdown ID for regex
		const escapedId = dropdownId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		
		// Update inline user dropdowns: {{userdropdown:id:label:selectedUser}}
		const inlinePattern = new RegExp(`(\\{\\{userdropdown:${escapedId}:[^:]*:)([^}]+)(\\}\\})`, 'g');
		let updatedContent = content.replace(inlinePattern, `$1${newUser}$3`);
		
		// Update block user dropdowns - more robust pattern
		const blockPattern = new RegExp(
			`(\`\`\`userdropdown[\\s\\S]*?\\bid:\\s*${escapedId}\\b[\\s\\S]*?\\bselected:\\s*)([^\\r\\n]+)(\\b[\\s\\S]*?\`\`\`)`,
			'g'
		);
		updatedContent = updatedContent.replace(blockPattern, `$1${newUser}$3`);
		
		// Only update if content actually changed
		if (updatedContent !== content) {
			// Update the content
			editor.setValue(updatedContent);
		}
	}

	onunload() {
		// Remove styles when plugin is disabled
		const styleElements = document.querySelectorAll('style');
		styleElements.forEach(style => {
			if (style.textContent && style.textContent.includes('togglify-')) {
				style.remove();
			}
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.debug('Settings loaded', this.settings);
	}

	async saveSettings() {
		this.debug('Saving settings', this.settings);
		await this.saveData(this.settings);
	}
}

class ToggleLabelModal extends Modal {
	constructor(app, onSubmit) {
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

class TemplateSelectionModal extends Modal {
	constructor(app, plugin, onSubmit) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h3', { text: 'Select State Template or Create Custom' });
		
		// Template selection section
		if (this.plugin.settings.stateOrderTemplates && Object.keys(this.plugin.settings.stateOrderTemplates).length > 0) {
			contentEl.createEl('h4', { text: 'Use Existing Template:' });
			
			const templateContainer = contentEl.createDiv({ cls: 'template-selection-container' });
			
			Object.entries(this.plugin.settings.stateOrderTemplates).forEach(([templateName, states]) => {
				const templateButton = templateContainer.createEl('button', {
					text: `${templateName} (${states.join(' → ')})`,
					cls: 'template-button'
				});
				
				templateButton.addEventListener('click', () => {
					this.onSubmit(states.join(','));
					this.close();
				});
			});
			
			contentEl.createEl('hr');
		}
		
		// Custom states section
		contentEl.createEl('h4', { text: 'Or Create Custom States:' });
		
		const customContainer = contentEl.createDiv();
		
		const inputEl = customContainer.createEl('textarea', {
			placeholder: 'Enter states separated by commas:\nNot Started, In Progress, Complete\n\nOr one per line:\nNot Started\nIn Progress\nComplete',
			value: 'Not Started,In Progress,Complete'
		});
		inputEl.rows = 6;
		inputEl.style.width = '100%';
		inputEl.style.marginBottom = '10px';
		
		const buttonContainer = customContainer.createDiv();
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '10px';
		
		const submitBtn = buttonContainer.createEl('button', { text: 'Use Custom States' });
		submitBtn.setCssProps({ flex: '1' });
		
		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.setCssProps({ flex: '1' });
		
		const submit = () => {
			let states = inputEl.value.trim();
			if (states) {
				// Handle both comma-separated and line-separated input
				if (states.includes('\n')) {
					states = states.split('\n').map(s => s.trim()).filter(s => s.length > 0).join(',');
				}
				this.onSubmit(states);
				this.close();
			}
		};
		
		submitBtn.addEventListener('click', submit);
		cancelBtn.addEventListener('click', () => this.close());
		inputEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && e.ctrlKey) submit();
			if (e.key === 'Escape') this.close();
		});
		
		inputEl.focus();
		inputEl.select();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class TogglifySettingTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
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

		new Setting(containerEl)
			.setName('Use No Label by Default')
			.setDesc('When enabled, new toggles will have no label by default (just the switch)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useNoLabel)
				.onChange(async (value) => {
					this.plugin.settings.useNoLabel = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Debug Mode')
			.setDesc('Enable debug logging to console for development and troubleshooting')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debugMode)
				.onChange(async (value) => {
					this.plugin.settings.debugMode = value;
					await this.plugin.saveSettings();
					if (value) {
						new Notice('Debug mode enabled - check console for detailed logs');
					} else {
						new Notice('Debug mode disabled');
					}
				}));

		// State Color Mappings Section
		containerEl.createEl('h3', { text: 'Multi-State Button Colors', cls: 'setting-item-heading' });
		
		const colorDesc = containerEl.createEl('div', { 
			text: 'Customize colors for multi-state button states. Colors are assigned based on the lowercase state name, so "Todo" and "TODO" will use the same color.',
			cls: 'setting-item-description'
		});

		// Add new color mapping setting
		new Setting(containerEl)
			.setName('Add Color Mapping')
			.setDesc('Add a custom color for a specific state name')
			.addText(text => {
				text.setPlaceholder('State name (e.g., "todo", "in progress")');
				this.newStateInput = text;
			})
			.addExtraButton(button => {
				// Create color picker container
				const colorContainer = button.extraSettingsEl.createDiv({ cls: 'color-picker-container' });
				
				// Create color input (HTML5 color picker)
				const colorInput = colorContainer.createEl('input', {
					type: 'color',
					value: '#ff0000',
					cls: 'color-picker-input'
				});
				
				// Create hex display/input
				const hexInput = colorContainer.createEl('input', {
					type: 'text',
					placeholder: '#ff0000',
					value: '#ff0000',
					cls: 'hex-input'
				});
				
				// Sync color picker with hex input
				colorInput.addEventListener('input', (e) => {
					hexInput.value = e.target.value;
				});
				
				// Sync hex input with color picker (with validation)
				hexInput.addEventListener('input', (e) => {
					const value = e.target.value;
					if (value.match(/^#[0-9A-Fa-f]{6}$/)) {
						colorInput.value = value;
					}
				});
				
				// Store references for later use
				this.newColorInput = { 
					getValue: () => hexInput.value,
					setValue: (value) => {
						hexInput.value = value;
						colorInput.value = value;
					}
				};
				
				return button;
			})
			.addButton(button => button
				.setButtonText('Add Mapping')
				.setCta()
				.onClick(async () => {
					const stateName = this.newStateInput.getValue().trim().toLowerCase();
					const color = this.newColorInput.getValue().trim();
					
					if (stateName && color) {
						// Validate color format (basic check)
						if (color.match(/^#[0-9A-Fa-f]{6}$/) || color.match(/^[a-zA-Z]+$/)) {
							if (!this.plugin.settings.stateColorMappings) {
								this.plugin.settings.stateColorMappings = {};
							}
							this.plugin.settings.stateColorMappings[stateName] = color;
							await this.plugin.saveSettings();
							this.newStateInput.setValue('');
							this.newColorInput.setValue('#ff0000');
							this.refreshColorTable();
							new Notice(`Color mapping added: ${stateName} → ${color}`);
						} else {
							new Notice('Please enter a valid color (hex format like #ff0000 or color name)');
						}
					} else {
						new Notice('Please enter both state name and color!');
					}
				}));

		// Color mappings table container
		this.colorTableContainer = containerEl.createDiv({ cls: 'togglify-color-table-container' });
		this.createColorTable();

		// State Order Templates Section
		containerEl.createEl('h3', { text: 'State Order Templates', cls: 'setting-item-heading' });
		
		const orderDesc = containerEl.createEl('div', { 
			text: 'Create templates with predefined state orders for consistent multi-state button behavior. The order determines the sequence when clicking through states.',
			cls: 'setting-item-description'
		});

		// Add new template setting
		new Setting(containerEl)
			.setName('Add State Order Template')
			.setDesc('Create a template with a name and ordered list of states')
			.addText(text => {
				text.setPlaceholder('Template name (e.g., "task-workflow")');
				this.newTemplateNameInput = text;
			})
			.addTextArea(textArea => {
				textArea.setPlaceholder('States in order, one per line:\ntodo\nin progress\nreview\ndone');
				textArea.inputEl.rows = 4;
				this.newTemplateStatesInput = textArea;
			})
			.addButton(button => button
				.setButtonText('Add Template')
				.setCta()
				.onClick(async () => {
					const templateName = this.newTemplateNameInput.getValue().trim().toLowerCase();
					const statesText = this.newTemplateStatesInput.getValue().trim();
					
					if (templateName && statesText) {
						const states = statesText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
						
						if (states.length >= 2) {
							if (!this.plugin.settings.stateOrderTemplates) {
								this.plugin.settings.stateOrderTemplates = {};
							}
							this.plugin.settings.stateOrderTemplates[templateName] = states;
							await this.plugin.saveSettings();
							this.newTemplateNameInput.setValue('');
							this.newTemplateStatesInput.setValue('');
							this.refreshTemplateTable();
							new Notice(`Template added: ${templateName} with ${states.length} states`);
						} else {
							new Notice('Please enter at least 2 states for the template!');
						}
					} else {
						new Notice('Please enter both template name and states!');
					}
				}));

		// Templates table container
		this.templateTableContainer = containerEl.createDiv({ cls: 'togglify-template-table-container' });
		this.createTemplateTable();

		// User Management Section
		containerEl.createEl('h3', { text: 'User Management', cls: 'setting-item-heading' });
		
		const userDesc = containerEl.createEl('div', { 
			text: 'Manage users for dropdown selection. Users can be assigned to tasks or other elements.',
			cls: 'setting-item-description'
		});

		// Add new user setting
		new Setting(containerEl)
			.setName('Add New User')
			.setDesc('Add a new user to the available users list')
			.addText(text => {
				text.setPlaceholder('Enter user name');
				this.newUserInput = text;
			})
			.addButton(button => button
				.setButtonText('Add User')
				.setCta()
				.onClick(async () => {
					const newUser = this.newUserInput.getValue().trim();
					if (newUser && !this.plugin.settings.users.includes(newUser)) {
						this.plugin.settings.users.push(newUser);
						await this.plugin.saveSettings();
						this.newUserInput.setValue('');
						this.refreshUserTable();
					} else if (this.plugin.settings.users.includes(newUser)) {
						new Notice('User already exists!');
					} else {
						new Notice('Please enter a valid user name!');
					}
				}));

		// Users table container
		this.userTableContainer = containerEl.createDiv({ cls: 'togglify-user-table-container' });
		this.createUserTable();
	}

	createUserTable() {
		if (!this.userTableContainer) return;
		
		this.userTableContainer.empty();
		
		if (this.plugin.settings.users.length === 0) {
			this.userTableContainer.createEl('p', { 
				text: 'No users added yet. Add users above to enable user dropdown functionality.',
				cls: 'setting-item-description'
			});
			return;
		}

		const table = this.userTableContainer.createEl('table', { cls: 'togglify-user-table' });
		
		// Header
		const headerRow = table.createEl('tr');
		headerRow.createEl('th', { text: 'User Name' });
		headerRow.createEl('th', { text: 'Actions' });

		// User rows
		this.plugin.settings.users.forEach((user, index) => {
			const row = table.createEl('tr');
			row.createEl('td', { text: user });
			
			const actionsCell = row.createEl('td');
			const deleteButton = actionsCell.createEl('button', {
				text: 'Delete',
				cls: 'mod-warning'
			});
			
			deleteButton.addEventListener('click', async () => {
				this.plugin.settings.users.splice(index, 1);
				await this.plugin.saveSettings();
				this.refreshUserTable();
				new Notice(`User "${user}" removed`);
			});
		});
	}

	refreshUserTable() {
		this.createUserTable();
	}

	createColorTable() {
		if (!this.colorTableContainer) return;
		
		this.colorTableContainer.empty();
		
		if (!this.plugin.settings.stateColorMappings || Object.keys(this.plugin.settings.stateColorMappings).length === 0) {
			this.colorTableContainer.createEl('p', { 
				text: 'No custom color mappings added yet. Add mappings above to override default colors for specific state names.',
				cls: 'setting-item-description'
			});
			return;
		}

		const table = this.colorTableContainer.createEl('table', { cls: 'togglify-color-table' });
		
		// Header
		const headerRow = table.createEl('tr');
		headerRow.createEl('th', { text: 'State Name' });
		headerRow.createEl('th', { text: 'Color' });
		headerRow.createEl('th', { text: 'Preview' });
		headerRow.createEl('th', { text: 'Actions' });

		// Color mapping rows
		Object.entries(this.plugin.settings.stateColorMappings).forEach(([stateName, color]) => {
			const row = table.createEl('tr');
			row.createEl('td', { text: stateName });
			row.createEl('td', { text: color });
			
			// Color preview cell
			const previewCell = row.createEl('td');
			const preview = previewCell.createEl('div', {
				cls: 'color-preview'
			});
			preview.style.backgroundColor = color;
			preview.style.width = '30px';
			preview.style.height = '20px';
			preview.style.border = '1px solid #ccc';
			preview.style.borderRadius = '3px';
			preview.style.display = 'inline-block';
			
			const actionsCell = row.createEl('td');
			const deleteButton = actionsCell.createEl('button', {
				text: 'Delete',
				cls: 'mod-warning'
			});
			
			deleteButton.addEventListener('click', async () => {
				delete this.plugin.settings.stateColorMappings[stateName];
				await this.plugin.saveSettings();
				this.refreshColorTable();
				new Notice(`Color mapping removed: ${stateName}`);
			});
		});
	}

	refreshColorTable() {
		this.createColorTable();
	}

	createTemplateTable() {
		if (!this.templateTableContainer) return;
		
		this.templateTableContainer.empty();
		
		if (!this.plugin.settings.stateOrderTemplates || Object.keys(this.plugin.settings.stateOrderTemplates).length === 0) {
			this.templateTableContainer.createEl('p', { 
				text: 'No state order templates created yet. Add templates above to define consistent state orders for your workflows.',
				cls: 'setting-item-description'
			});
			return;
		}

		const table = this.templateTableContainer.createEl('table', { cls: 'togglify-template-table' });
		
		// Header
		const headerRow = table.createEl('tr');
		headerRow.createEl('th', { text: 'Template Name' });
		headerRow.createEl('th', { text: 'State Order' });
		headerRow.createEl('th', { text: 'Actions' });

		// Template rows
		Object.entries(this.plugin.settings.stateOrderTemplates).forEach(([templateName, states]) => {
			const row = table.createEl('tr');
			row.createEl('td', { text: templateName });
			
			// States cell with editable order
			const statesCell = row.createEl('td');
			const statesContainer = statesCell.createDiv({ cls: 'states-order-container' });
			
			states.forEach((state, index) => {
				const stateItem = statesContainer.createDiv({ cls: 'state-item' });
				
				// Move up button (not for first item)
				if (index > 0) {
					const upBtn = stateItem.createEl('button', { text: '↑', cls: 'move-btn' });
					upBtn.addEventListener('click', async () => {
						const newStates = [...states];
						[newStates[index], newStates[index - 1]] = [newStates[index - 1], newStates[index]];
						this.plugin.settings.stateOrderTemplates[templateName] = newStates;
						await this.plugin.saveSettings();
						this.refreshTemplateTable();
					});
				}
				
				// Move down button (not for last item)
				if (index < states.length - 1) {
					const downBtn = stateItem.createEl('button', { text: '↓', cls: 'move-btn' });
					downBtn.addEventListener('click', async () => {
						const newStates = [...states];
						[newStates[index], newStates[index + 1]] = [newStates[index + 1], newStates[index]];
						this.plugin.settings.stateOrderTemplates[templateName] = newStates;
						await this.plugin.saveSettings();
						this.refreshTemplateTable();
					});
				}
				
				const stateText = stateItem.createEl('span', { text: `${index + 1}. ${state}`, cls: 'state-text' });
			});
			
			const actionsCell = row.createEl('td');
			const deleteButton = actionsCell.createEl('button', {
				text: 'Delete',
				cls: 'mod-warning'
			});
			
			deleteButton.addEventListener('click', async () => {
				delete this.plugin.settings.stateOrderTemplates[templateName];
				await this.plugin.saveSettings();
				this.refreshTemplateTable();
				new Notice(`Template removed: ${templateName}`);
			});
		});
	}

	refreshTemplateTable() {
		this.createTemplateTable();
	}
}

module.exports = TogglifyPlugin;
