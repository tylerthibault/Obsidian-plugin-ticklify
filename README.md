# Togglify

An Obsidian plugin that creates beautiful, interactive toggle switches that slide from left to right.

## Features

- **Visual Toggle Switches**: Create smooth, animated toggle switches that slide from left to right
- **Multi-State Buttons**: Create buttons that cycle through multiple states (e.g., Not Started → In Progress → Complete)
- **User Dropdowns with Avatars**: Create user selection dropdowns with beautiful circular avatars showing user initials
- **Customizable Labels**: Add custom labels to your toggles and multi-state buttons
- **Easy Insertion**: Insert toggles via ribbon icon or command palette
- **Configurable Defaults**: Set default toggle state and label in settings
- **Interactive**: Click toggles to see smooth left-to-right animation, click multi-state buttons to cycle through states

## Plugin Settings

Access settings via: Settings → Community Plugins → Togglify → Options

- **Use No Label by Default**: When enabled, toggles inserted via commands or ribbon will have no label text. When disabled, you'll be prompted to enter a label.
- **User Management**: Manage the list of available users for user dropdown elements. Add or remove users as needed for your workflows.

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
   - `Ctrl/Cmd + P` → "Insert User Dropdown" (creates a user selection dropdown)
   - `Ctrl/Cmd + P` → "Insert User Dropdown with Label" (prompts for custom label)

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

**User dropdown block format**:
```userdropdown
id: userdropdown-1234567890
label: Assigned to
selected: John Doe
```

**User dropdown inline format**:
```
{{userdropdown:userdropdown-1234567890:Assigned to:John Doe}}
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
- **User Dropdowns**: Click to open a dropdown and select from available users configured in settings
  - Users are displayed with circular avatars showing their initials
  - Each user gets a unique, consistent color based on their name
  - "Unassigned" appears with gray color and "UN" initials
- The toggle will change color from gray (off) to green (on)
- Multi-state buttons change color based on their current state with a rich color palette:
  - **State 0**: Red (Not Started, Critical, etc.)
  - **State 1**: Orange (In Progress, Warning, etc.)
  - **State 2**: Green (Complete, Success, etc.)
  - **State 3**: Blue (Review, Info, etc.)
  - **State 4**: Purple (Testing, Special, etc.)
  - **State 5**: Blue-Grey (Pending, Neutral, etc.)
  - **State 6**: Brown (Archived, Old, etc.)
  - **State 7**: Deep Orange (Urgent, Priority, etc.)
  - **State 8**: Teal (Active, Current, etc.)
  - **State 9**: Deep Purple (Final, Premium, etc.)
- **State is automatically saved** - the values in your markdown are updated when you click
- Each toggle and multi-state button maintains its own state permanently
- **Both formats work everywhere** - inside tables, outside tables, in lists, anywhere!

### Using Toggles in Tables

Toggles and multi-state buttons work perfectly in Obsidian tables! Use the inline format:

| Task | Status | Complete | Priority | Progress | Assigned |
|------|--------|----------|----------|----------|----------|
| Write docs | In Progress | {{toggle:task1:Done:false}} | {{toggle:urgent1::true}} | {{multistate:prog1::1:Not Started,In Progress,Complete}} | {{userdropdown:assign1::John Doe}} |
| Test feature | Done | {{toggle:task2:Finished:true}} | {{toggle:urgent2::false}} | {{multistate:prog2::2:Not Started,In Progress,Complete}} | {{userdropdown:assign2::Jane Smith}} |
| Deploy | Pending | {{toggle:task3:Ready:false}} | {{toggle:urgent3::false}} | {{multistate:prog3::0:Not Started,In Progress,Complete}} | {{userdropdown:assign3::Alex Johnson}} |

### Using Toggles Outside Tables

Both toggles and multi-state buttons work great outside of tables too:

**Inline toggles in regular text:**
Here's my progress: {{toggle:progress1:Task Complete:false}} - Still working on it!

**Multi-state buttons for status tracking:**
Project status: {{multistate:project1:Current Phase:1:Planning,Development,Testing,Deployment}}

**Multi-state with more options:**
Task priority: {{multistate:priority1:Priority Level:2:Low,Medium,High,Critical,Urgent}}

**User assignment for tasks:**
Task assigned to: {{userdropdown:taskowner1:Owner:John Doe}}

**Multiple user assignments:**
Project team: Lead {{userdropdown:lead1::Jane Smith}} | Developer {{userdropdown:dev1::Alex Johnson}} | Tester {{userdropdown:test1::John Doe}}

**Complex workflow tracking:**
Review process: {{multistate:review1:Review Stage:0:Submitted,Under Review,Changes Requested,Approved,Published,Archived}}

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

**Advanced workflow with 8 states:**
```multistate
id: ticket-status
label: Support Ticket Status
state: 1
states: New,Assigned,In Progress,Waiting Customer,Escalated,Testing,Resolved,Closed
```

**Quality control with 5 levels:**
```multistate
id: quality-check
label: Quality Level
state: 3
states: Failed,Poor,Acceptable,Good,Excellent
```

**User assignment block format:**
```userdropdown
id: project-manager
label: Project Manager
selected: Jane Smith
```

**Team member assignment:**
```userdropdown
id: team-lead
label: Team Lead
selected: Alex Johnson
```

### User Avatar System

User dropdowns feature a beautiful avatar system:

- **Circular Avatars**: Each user gets a circular avatar with their initials
- **Consistent Colors**: Users are assigned consistent, pleasant colors based on their name
- **Smart Initials**: 
  - Single names use first 2 characters (e.g., "Sarah" → "SA")
  - Multiple names use first letter of first 2 words (e.g., "John Doe" → "JD")
  - "Unassigned" shows gray "UN" avatar
- **16 Unique Colors**: Automatic color assignment from a curated palette of 16 distinct colors
- **Dropdown Interface**: Click to expand and see all users with their avatars

## Settings

Access plugin settings via: Settings → Community Plugins → Togglify

- **Default Toggle State**: Choose whether new toggles start as on or off
- **Default Toggle Label**: Set the default text that appears next to toggles
- **Use No Label by Default**: When enabled, new elements will have no label by default
- **User Management**: Add, edit, and remove users for dropdown selection
  - Add new users to make them available in user dropdowns
  - Delete users that are no longer needed
  - Users are displayed in a table for easy management

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
