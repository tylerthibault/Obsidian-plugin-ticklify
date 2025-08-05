# Togglify

An Obsidian plugin that creates beautiful, interactive toggle switches that slide from left to right.

## Features

- **Visual Toggle Switches**: Create smooth, animated toggle switches that slide from left to right
- **Multi-State Buttons**: Create buttons that cycle through multiple states (e.g., Not Started → In Progress → Complete)
- **Customizable Labels**: Add custom labels to your toggles and multi-state buttons
- **Easy Insertion**: Insert toggles via ribbon icon or command palette
- **Configurable Defaults**: Set default toggle state and label in settings
- **Interactive**: Click toggles to see smooth left-to-right animation, click multi-state buttons to cycle through states

## Plugin Settings

Access settings via: Settings → Community Plugins → Togglify → Options

- **Use No Label by Default**: When enabled, toggles inserted via commands or ribbon will have no label text. When disabled, you'll be prompted to enter a label.

## Smart Format Detection

The plugin automatically chooses the best format for your toggle based on where you're inserting it:

- **Inline Format** (`{{toggle:...}}`) is used when:
  - You're inside a table row (contains `|` characters)
  - You're in the middle of existing text on a line
  - You're in a list item with a short line

- **Block Format** (```togglify code block) is used when:
  - You're at the beginning or end of a line
  - You're on a standalone line
  - The context doesn't require inline formatting

This means you only need to remember one command - the plugin handles the formatting automatically!

## Usage Examples

### Insert a Toggle

1. **Via Ribbon Icon**: Click the toggle icon in the left ribbon (automatically detects context)
2. **Via Command Palette**: 
   - `Ctrl/Cmd + P` → "Insert Toggle" (automatically chooses inline or block format)
   - `Ctrl/Cmd + P` → "Insert Toggle with Label" (prompts for custom label)
   - `Ctrl/Cmd + P` → "Insert Multi-State Button" (creates a 3-state button)
   - `Ctrl/Cmd + P` → "Insert Multi-State Button with Label" (prompts for custom label)

**Block format** (standalone toggles):
```togglify
id: toggle-1234567890
label: Your Label
state: false
```

**Multi-state block format**:
```multistate
id: multistate-1234567890
label: Task Status
state: 0
states: Not Started,In Progress,Complete
```

**Inline format** (works in tables, lists, anywhere):
```
{{toggle:toggle-1234567890:Your Label:false}}
```

**Multi-state inline format**:
```
{{multistate:multistate-1234567890:Task Status:0:Not Started,In Progress,Complete}}
```

**No label format** (just the toggle switch):
```
{{toggle:toggle-1234567890::false}}
```
or
```togglify
id: toggle-1234567890
label: 
state: false
```

### Toggle Interaction

- **Toggles**: Click any toggle to see it smoothly slide from left to right (or right to left)
- **Multi-State Buttons**: Click to cycle through all states (e.g., Not Started → In Progress → Complete → Not Started...)
- The toggle will change color from gray (off) to green (on)
- Multi-state buttons change color based on their current state (red → orange → green for the default 3-state)
- **State is automatically saved** - the values in your markdown are updated when you click
- Each toggle and multi-state button maintains its own state permanently
- **Both formats work everywhere** - inside tables, outside tables, in lists, anywhere!

### Using Toggles in Tables

Toggles and multi-state buttons work perfectly in Obsidian tables! Use the inline format:

| Task | Status | Complete | Priority | Progress |
|------|--------|----------|----------|----------|
| Write docs | In Progress | {{toggle:task1:Done:false}} | {{toggle:urgent1::true}} | {{multistate:prog1::1:Not Started,In Progress,Complete}} |
| Test feature | Done | {{toggle:task2:Finished:true}} | {{toggle:urgent2::false}} | {{multistate:prog2::2:Not Started,In Progress,Complete}} |
| Deploy | Pending | {{toggle:task3:Ready:false}} | {{toggle:urgent3::false}} | {{multistate:prog3::0:Not Started,In Progress,Complete}} |

### Using Toggles Outside Tables

Both toggles and multi-state buttons work great outside of tables too:

**Inline toggles in regular text:**
Here's my progress: {{toggle:progress1:Task Complete:false}} - Still working on it!

**Multi-state buttons for status tracking:**
Project status: {{multistate:project1:Current Phase:1:Planning,Development,Testing,Deployment}}

**Label-less toggles for compact use:**
Quick settings: Dark mode {{toggle:dark::true}} | Notifications {{toggle:notif::false}} | Auto-save {{toggle:save::true}}

**Block toggles for standalone use:**
```togglify
id: standalone-toggle
label: Project Complete
state: false
```

**Block multi-state for detailed tracking:**
```multistate
id: project-status
label: Development Phase
state: 2
states: Planning,Design,Development,Testing,Review,Complete
```

## Settings

Access plugin settings via: Settings → Community Plugins → Togglify

- **Default Toggle State**: Choose whether new toggles start as on or off
- **Default Toggle Label**: Set the default text that appears next to toggles

## Development

### Prerequisites

- Node.js (optional, only needed if you want to modify dependencies)

### Setup

1. Clone this repository or copy the files to your Obsidian vault's plugins folder:
   ```
   .obsidian/plugins/togglify/
   ```

2. The plugin is written in JavaScript and doesn't require compilation!

### Development Workflow

- The plugin is ready to use as-is with the `main.js` file
- No build process required since it's pure JavaScript
- Simply copy `main.js` and `manifest.json` to your test vault

### Testing

1. Copy the files (`main.js`, `manifest.json`) to your test vault's plugins folder
2. Enable the plugin in Obsidian's Community Plugins settings
3. Test the functionality

## Plugin Structure

- `main.js` - Main plugin code (JavaScript)
- `manifest.json` - Plugin metadata
- No build process required!

## API Documentation

This plugin uses the [Obsidian API](https://github.com/obsidianmd/obsidian-api).

## License

MIT
