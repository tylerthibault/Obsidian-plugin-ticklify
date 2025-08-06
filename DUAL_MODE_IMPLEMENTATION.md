# Dual-Mode Implementation Guide: Edit Mode Source ↔ Read Mode Interactive Elements

This document explains how the Togglify plugin implements interactive elements that work seamlessly between Obsidian's edit mode (source text) and read mode (rendered view).

## 🎯 Core Concept

The plugin creates a **bidirectional synchronization system** where:
- **Edit Mode**: Users see and edit plain text markdown syntax
- **Read Mode**: Users see and interact with visual HTML elements
- **Synchronization**: Changes in either mode automatically update the other

## 📋 Implementation Architecture

### 1. Markdown Syntax Design

**Define Custom Syntax Patterns:**
```markdown
# Inline Syntax (works in tables, lists, etc.)
{{toggle:toggle-123:My Toggle:false}}
{{multistate:ms-456:Status:0:Todo,In Progress,Done}}
{{userdropdown:ud-789:Assigned:John Doe}}

# Block Syntax (standalone elements)
```togglify
id: toggle-123
label: My Toggle  
state: false
```

```multistate
id: ms-456
label: Status
state: 0
states: Todo,In Progress,Done
```
```

**Key Design Principles:**
- **Unique IDs**: Each element has a unique identifier for source updates
- **Human Readable**: Syntax is clear even in source view
- **State Embedded**: Current state is stored in the syntax itself
- **Flexible**: Support both inline and block formats

### 2. Plugin Registration & Processors

**Register Markdown Processors in `onload()`:**
```javascript
// Register block processors for code blocks
this.registerMarkdownCodeBlockProcessor('togglify', (source, el, ctx) => {
    this.processTogglifyBlock(source, el, ctx);
});

this.registerMarkdownCodeBlockProcessor('multistate', (source, el, ctx) => {
    this.processMultiStateBlock(source, el, ctx);
});

// Register post processor for inline syntax
this.registerMarkdownPostProcessor((el, ctx) => {
    this.processInlineToggles(el, ctx);
    this.processInlineMultiStates(el, ctx);
    this.processInlineUserDropdowns(el, ctx);
});

// Handle content changes and view switches
this.registerEvent(this.app.workspace.on('layout-change', () => {
    setTimeout(() => this.processAllInlineToggles(), 100);
}));
```

### 3. Pattern Recognition & Element Creation

**Step 1: Parse Source Content**
```javascript
processInlineToggles(el, ctx) {
    // Find all text nodes containing toggle syntax
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
    
    // Process each text node
    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const togglePattern = /\{\{toggle:([^:]+):([^:]*):([^}]+)\}\}/g;
        
        // Replace each match with interactive element
        let match;
        while ((match = togglePattern.exec(text)) !== null) {
            const [fullMatch, toggleId, toggleLabel, state] = match;
            const isActive = state === 'true';
            
            // Create interactive toggle element
            const toggleElement = this.createToggleElement(toggleId, toggleLabel, isActive);
            
            // Replace text with element
            this.replaceTextWithElement(textNode, fullMatch, toggleElement);
        }
    });
}
```

**Step 2: Create Interactive Elements**
```javascript
createToggleElement(toggleId, toggleLabel, isActive) {
    // Create container
    const container = document.createElement('div');
    container.className = 'togglify-container';
    
    // Create toggle switch
    const toggle = document.createElement('button');
    toggle.className = `togglify-toggle ${isActive ? 'togglify-on' : 'togglify-off'}`;
    toggle.setAttribute('data-toggle-id', toggleId);
    
    // Add click handler with source synchronization
    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const isOn = !toggle.classList.contains('togglify-on');
        
        // Update visual state
        toggle.classList.toggle('togglify-on', isOn);
        toggle.classList.toggle('togglify-off', !isOn);
        
        // ⭐ KEY: Update source markdown
        this.updateToggleInSource(toggleId, isOn);
        
        // User feedback
        new Notice(`Toggle "${toggleLabel}": ${isOn ? 'ON' : 'OFF'}`);
    });
    
    container.appendChild(toggle);
    return container;
}
```

### 4. Bidirectional Synchronization

**The Critical Source Update Function:**
```javascript
updateToggleInSource(toggleId, newState) {
    this.debug('Updating toggle in source', { toggleId, newState });
    
    // Get current editor instance
    const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
    if (!activeView || !activeView.editor) return;

    const editor = activeView.editor;
    const content = editor.getValue();
    
    // Escape special regex characters in ID
    const escapedId = toggleId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Update inline syntax: {{toggle:id:label:state}}
    const inlinePattern = new RegExp(`(\\{\\{toggle:${escapedId}:[^:]*?:)(true|false)(\\}\\})`, 'g');
    let updatedContent = content.replace(inlinePattern, `$1${newState}$3`);
    
    // Update block syntax in code blocks
    const blockPattern = new RegExp(
        `(\`\`\`togglify[\\s\\S]*?\\bid:\\s*${escapedId}\\b[\\s\\S]*?\\bstate:\\s*)(true|false)(\\b[\\s\\S]*?\`\`\`)`,
        'g'
    );
    updatedContent = updatedContent.replace(blockPattern, `$1${newState}$3`);
    
    // Apply changes to editor (triggers re-render)
    if (updatedContent !== content) {
        editor.setValue(updatedContent);
        this.debug('Source updated successfully');
    }
}
```

**Multi-State Example:**
```javascript
updateMultiStateInSource(multiStateId, newState) {
    // Similar pattern but for state index updates
    const inlinePattern = new RegExp(`(\\{\\{multistate:${escapedId}:[^:]*?:)(\\d+)(:([^}]+)\\}\\})`, 'g');
    let updatedContent = content.replace(inlinePattern, `$1${newState}$3`);
    
    // Block pattern for code blocks
    const blockPattern = new RegExp(
        `(\`\`\`multistate[\\s\\S]*?\\bid:\\s*${escapedId}\\b[\\s\\S]*?\\bstate:\\s*)(\\d+)(\\b[\\s\\S]*?\`\`\`)`,
        'g'
    );
    updatedContent = updatedContent.replace(blockPattern, `$1${newState}$3`);
    
    editor.setValue(updatedContent);
}
```

### 5. Command-Based Element Insertion

**Edit Mode Commands:**
```javascript
// Add commands for inserting elements in edit mode
this.addCommand({
    id: 'insert-toggle',
    name: 'Insert Toggle',
    editorCallback: (editor, view) => {
        this.insertSmartToggle(editor);
    }
});

insertSmartToggle(editor, label) {
    const cursor = editor.getCursor();
    const useInlineFormat = this.shouldUseInlineFormat(editor, cursor);
    
    if (useInlineFormat) {
        this.insertInlineToggleAtCursor(editor, label);
    } else {
        this.insertToggleAtCursor(editor, label);
    }
}

insertInlineToggleAtCursor(editor, label) {
    const cursor = editor.getCursor();
    const toggleId = `toggle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toggleLabel = label || 'Toggle';
    const defaultState = this.settings.defaultToggleState;
    
    // Insert syntax at cursor
    const toggleSyntax = `{{toggle:${toggleId}:${toggleLabel}:${defaultState}}}`;
    editor.replaceRange(toggleSyntax, cursor);
}
```

### 6. Context Detection for Smart Insertion

**Determine Inline vs Block Format:**
```javascript
shouldUseInlineFormat(editor, cursor) {
    const currentLine = editor.getLine(cursor.line);
    const beforeCursor = currentLine.substring(0, cursor.ch);
    const afterCursor = currentLine.substring(cursor.ch);
    
    // Check various contexts
    const isInTableRow = currentLine.includes('|');
    const isInMiddleOfText = beforeCursor.trim().length > 0 && afterCursor.trim().length > 0;
    const isInListItem = /^\s*[-*+]\s/.test(currentLine) || /^\s*\d+\.\s/.test(currentLine);
    const isShortLine = currentLine.trim().length < 50;
    
    return isInTableRow || isInMiddleOfText || isInListItem || isShortLine;
}
```

### 7. Event Handling & Re-processing

**Handle View Changes:**
```javascript
// Re-process when switching between views
this.registerEvent(this.app.workspace.on('layout-change', () => {
    setTimeout(() => this.processAllInlineToggles(), 100);
}));

this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
    setTimeout(() => this.processAllInlineToggles(), 100);
}));

processAllInlineToggles() {
    const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
    if (activeView && activeView.previewMode && activeView.previewMode.containerEl) {
        this.processInlineToggles(activeView.previewMode.containerEl, {});
        this.processInlineMultiStates(activeView.previewMode.containerEl, {});
        this.processInlineUserDropdowns(activeView.previewMode.containerEl, {});
    }
}
```

## 🔄 Complete Flow Diagram

```
Edit Mode (Source View)
         ↓
[User types/edits syntax]
         ↓
{{toggle:id:label:state}}
         ↓
[Switch to Read Mode]
         ↓
[Plugin processors scan content]
         ↓
[Pattern recognition & parsing]
         ↓
[Create interactive HTML elements]
         ↓
[Replace text with elements]
         ↓
[User clicks interactive element]
         ↓
[Update visual state]
         ↓
[Update source markdown via regex]
         ↓
[Changes persist in file]
         ↓
[Switch back to Edit Mode]
         ↓
[Updated syntax visible in source]
```

## 🛠️ Implementation Steps

### Step 1: Define Your Syntax
- Choose a unique, readable syntax pattern
- Include unique IDs for each element
- Embed state information in the syntax

### Step 2: Register Processors
- Use `registerMarkdownCodeBlockProcessor` for block syntax
- Use `registerMarkdownPostProcessor` for inline syntax
- Register view change events for re-processing

### Step 3: Pattern Recognition
- Use regex patterns to find your syntax
- Parse out IDs, labels, and state information
- Handle multiple instances per document

### Step 4: Element Creation
- Create interactive HTML elements
- Add appropriate CSS classes and styles
- Attach event handlers for user interactions

### Step 5: Source Synchronization
- Build regex patterns for state updates
- Use editor.setValue() to update source content
- Handle both inline and block syntax variants

### Step 6: Context Detection
- Determine when to use inline vs block format
- Consider table cells, list items, and text flow
- Provide smart defaults for different contexts

## ⚠️ Important Considerations

**Performance:**
- Use efficient DOM querying and text processing
- Debounce re-processing events
- Cache compiled regex patterns

**Robustness:**
- Escape special characters in IDs for regex
- Handle malformed syntax gracefully
- Validate state values before applying

**User Experience:**
- Provide immediate visual feedback
- Show helpful error messages
- Maintain cursor position when possible

**Compatibility:**
- Test with various Obsidian themes
- Ensure mobile compatibility
- Handle plugin conflicts gracefully

## 🎯 Key Success Factors

1. **Unique Identifiers**: Essential for reliable source updates
2. **Robust Regex Patterns**: Must handle edge cases and special characters
3. **Event Management**: Proper cleanup and re-processing on view changes
4. **Error Handling**: Graceful degradation when things go wrong
5. **Performance**: Efficient processing for large documents

This architecture provides a seamless dual-mode experience where users can work with plain text in edit mode while enjoying rich interactivity in read mode, with all changes automatically synchronized between both views.
