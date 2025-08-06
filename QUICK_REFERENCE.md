# Quick Reference: Implementing Dual-Mode Interactive Elements

## 🚀 Essential Code Patterns

### 1. Basic Plugin Setup
```javascript
class YourPlugin extends Plugin {
    async onload() {
        // Register processors
        this.registerMarkdownCodeBlockProcessor('yourblock', (source, el, ctx) => {
            this.processYourBlock(source, el, ctx);
        });
        
        this.registerMarkdownPostProcessor((el, ctx) => {
            this.processInlineElements(el, ctx);
        });
        
        // Handle view changes
        this.registerEvent(this.app.workspace.on('layout-change', () => {
            setTimeout(() => this.reprocessAll(), 100);
        }));
    }
}
```

### 2. Syntax Pattern Design
```javascript
// Choose your syntax patterns
const INLINE_PATTERN = /\{\{yourtype:([^:]+):([^:]*):([^}]+)\}\}/g;
const BLOCK_PATTERN = /```yourblock\nid:\s*(.+)\nlabel:\s*(.+)\nstate:\s*(.+)\n```/g;

// Example syntax:
// Inline: {{toggle:id123:My Toggle:true}}
// Block:  ```toggle
//         id: id123
//         label: My Toggle
//         state: true
//         ```
```

### 3. Pattern Recognition & Replacement
```javascript
processInlineElements(el, ctx) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    
    let node;
    while (node = walker.nextNode()) {
        if (node.textContent.includes('{{yourtype:')) {
            textNodes.push(node);
        }
    }
    
    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const pattern = /\{\{yourtype:([^:]+):([^:]*):([^}]+)\}\}/g;
        
        let lastIndex = 0;
        let match;
        const fragments = [];
        
        while ((match = pattern.exec(text)) !== null) {
            // Add text before match
            if (match.index > lastIndex) {
                fragments.push(document.createTextNode(text.slice(lastIndex, match.index)));
            }
            
            // Create interactive element
            const [, id, label, state] = match;
            const element = this.createElement(id, label, state);
            fragments.push(element);
            
            lastIndex = pattern.lastIndex;
        }
        
        // Add remaining text
        if (lastIndex < text.length) {
            fragments.push(document.createTextNode(text.slice(lastIndex)));
        }
        
        // Replace original text node
        const parent = textNode.parentNode;
        fragments.forEach(fragment => parent.insertBefore(fragment, textNode));
        parent.removeChild(textNode);
    });
}
```

### 4. Interactive Element Creation
```javascript
createElement(id, label, state) {
    const container = document.createElement('div');
    container.className = 'your-element-container';
    
    const button = document.createElement('button');
    button.className = `your-element ${state}`;
    button.textContent = label;
    button.setAttribute('data-id', id);
    
    // THE KEY: Add click handler with source update
    button.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Update visual state
        const newState = this.toggleState(button, state);
        
        // Update source markdown
        this.updateSource(id, newState);
        
        // Optional: User feedback
        new Notice(`${label}: ${newState}`);
    });
    
    container.appendChild(button);
    return container;
}
```

### 5. Source Update (The Magic!)
```javascript
updateSource(elementId, newState) {
    const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
    if (!activeView?.editor) return;
    
    const editor = activeView.editor;
    const content = editor.getValue();
    const escapedId = elementId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Update inline syntax
    const inlinePattern = new RegExp(
        `(\\{\\{yourtype:${escapedId}:[^:]*?:)([^}]+)(\\}\\})`, 
        'g'
    );
    let updated = content.replace(inlinePattern, `$1${newState}$3`);
    
    // Update block syntax  
    const blockPattern = new RegExp(
        `(\`\`\`yourblock[\\s\\S]*?\\bid:\\s*${escapedId}\\b[\\s\\S]*?\\bstate:\\s*)([^\\n]+)(\\b[\\s\\S]*?\`\`\`)`,
        'g'
    );
    updated = updated.replace(blockPattern, `$1${newState}$3`);
    
    // Apply changes
    if (updated !== content) {
        editor.setValue(updated);
    }
}
```

### 6. Command for Edit Mode Insertion
```javascript
this.addCommand({
    id: 'insert-your-element',
    name: 'Insert Your Element',
    editorCallback: (editor) => {
        const cursor = editor.getCursor();
        const id = `elem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const syntax = `{{yourtype:${id}:Label:defaultState}}`;
        editor.replaceRange(syntax, cursor);
    }
});
```

## 🎯 Key Patterns Summary

| Step | Purpose | Code Pattern |
|------|---------|--------------|
| **1. Register** | Hook into Obsidian's rendering | `registerMarkdownPostProcessor()` |
| **2. Scan** | Find your syntax patterns | `document.createTreeWalker()` + regex |
| **3. Parse** | Extract IDs, labels, states | `regex.exec()` with capture groups |
| **4. Create** | Build interactive elements | `document.createElement()` + event listeners |
| **5. Replace** | Swap text with elements | `parent.insertBefore()` + `removeChild()` |
| **6. Sync** | Update source on interaction | `editor.setValue()` with regex replacement |

## ⚡ Pro Tips

### Unique IDs
```javascript
// Always generate unique IDs
const uniqueId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

### Regex Escaping
```javascript
// Escape special characters for regex
const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

### Performance
```javascript
// Debounce re-processing
let timeout;
this.registerEvent(this.app.workspace.on('layout-change', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => this.reprocessAll(), 100);
}));
```

### Error Handling
```javascript
try {
    const updated = content.replace(pattern, replacement);
    editor.setValue(updated);
} catch (error) {
    console.error('Failed to update source:', error);
    new Notice('Failed to update element state');
}
```

## 🔄 Testing Your Implementation

1. **Create element in edit mode** → Check syntax appears correctly
2. **Switch to read mode** → Verify interactive element renders
3. **Click/interact** → Confirm visual state changes
4. **Switch back to edit mode** → Validate source was updated
5. **Save and reload** → Ensure state persists

## 🎨 Common Element Types

### Toggle Switch
```javascript
// State: true/false
{{toggle:id:label:true}}
```

### Multi-State Button  
```javascript
// State: index into states array
{{multistate:id:label:2:Todo,Progress,Done}}
```

### Dropdown/Select
```javascript
// State: selected option
{{dropdown:id:label:Option2:Opt1,Opt2,Opt3}}
```

### Counter/Numeric
```javascript
// State: numeric value
{{counter:id:label:5}}
```

This dual-mode pattern works for any type of interactive element you want to create!
