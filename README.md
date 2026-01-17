# Fix Unlinked Components - Figma Plugin

A Figma plugin that helps you fix component instances that have lost their connection to their main component.

## Features

- **Scan for unlinked instances**: Finds all component instances in your file that have lost their main component reference
- **Smart matching**: Automatically matches unlinked instances with existing components by exact name (case-insensitive)
- **Flexible scope**: Choose to scan just the current page or the entire document
- **Page grouping**: When scanning entire document, instances are grouped by page with sticky headers
- **Batch replacement**: Select which instances to relink and fix them all at once
- **Bulk selection**: Toggle all checkboxes at once with a single button
- **Missing components view**: Show/hide list of unique component names that couldn't be matched (when >2 missing)
- **Clear feedback**: Shows which instances have matches and provides context (page name, parent frame)
- **Progress tracking**: Real-time progress updates with current page name during scans
- **Performance optimized**: Batched processing (50 instances at a time) prevents UI freezing on large files
- **Dark mode support**: Full theme support using Figma CSS variables
- **Resizable window**: Custom drag handle at bottom-right corner (minimum 360×240px)
- **Navigate to instances**: Click icon to select and navigate to any instance in Figma

## Usage

1. Open a Figma file with unlinked component instances
2. Run the plugin from the menu: **Plugins → Development → Fix Unlinked Components**
3. Wait for the scan to complete (progress shown with spinner and page name)
4. Toggle between "Current page" and "Entire document" scanning using the switch
5. Review the list of unlinked instances:
   - **Entire document mode**: Instances are grouped by page with sticky headers showing page name and count
   - **Current page mode**: Flat list of instances on current page
   - ✓ Green checkmark = Match found (checkbox enabled and checked by default)
   - ✗ Red cross = No match found (checkbox disabled)
6. Use **Check all** / **Uncheck all** button to quickly toggle all selections
7. Click **Show missing** to view a list of unique component names that couldn't be matched (only shown if >2 missing)
8. Click individual checkboxes to select/deselect specific instances
9. Click the navigation icon next to any instance to select it in Figma
10. Click **Replace (X)** to fix all selected instances, where X is the count
11. The plugin will swap each instance to its matched component, re-scan, and show updated results
12. Click **Refresh** icon to re-scan at any time
13. Drag the bottom-right corner to resize the plugin window

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Build the plugin
pnpm run build

# Development mode (auto-rebuild on changes)
pnpm run dev
```

### Project Structure

```
figma-plugin-fix-unlinked-components/
├── src/
│   ├── plugin/
│   │   └── code.ts          # Plugin sandbox code (Figma API)
│   ├── ui/
│   │   ├── App.tsx          # React UI component
│   │   ├── App.css          # Styles
│   │   ├── main.tsx         # UI entry point
│   │   └── index.html       # HTML template
│   └── types.ts             # Shared TypeScript types
├── dist/                    # Built files
│   ├── code.js              # Compiled plugin code
│   └── ui.html              # Bundled UI
├── manifest.json            # Figma plugin manifest
├── package.json
├── tsconfig.json
├── vite.config.ts
└── biome.json
```

### Tech Stack

- **React 18**: UI framework with hooks
- **TypeScript 5**: Type safety with Figma plugin typings
- **Vite 6**: Build tool with vite-plugin-singlefile for single HTML output
- **Tailwind CSS 4**: Utility-first styling with Figma theme variables
- **Biome**: Fast linting and formatting
- **esbuild**: Fast plugin code bundling

### Commands

- `pnpm run build` - Build both plugin and UI
- `pnpm run build:plugin` - Build plugin code only
- `pnpm run build:ui` - Build UI only
- `pnpm run dev` - Development mode with auto-rebuild
- `pnpm run lint` - Lint code
- `pnpm run format` - Format code
- `pnpm run check` - Lint and format

## How It Works

### Detection

The plugin searches for all `INSTANCE` nodes where the main component has these properties:

- `mainComponent.parent === null` (deleted from file, but instance remains)
- `mainComponent.removed === false` (not an external library component)
- `mainComponent.remote === false` (not linked to external file)
- `mainComponent.type === 'COMPONENT'` (valid component type)

This identifies instances where the master component was deleted from the file, or instances that were copied from another file without proper linking.

### Batched Processing

To prevent UI freezing on large files, the plugin processes instances in batches of 50:

1. Scans 50 instances at a time
2. Sends progress update to UI (shows current count, total, and page name)
3. Yields with `setTimeout(0)` to allow UI updates
4. Continues to next batch

### Matching

For each unlinked instance, the plugin:

1. Uses the deleted component's name (if available) or instance name
2. Performs exact name matching (case-insensitive) against all `COMPONENT` nodes in the file
3. Returns the first match found
4. Auto-selects instances with matches for replacement

### Relinking

When you click Replace, the plugin:

1. Uses `instance.swapComponent(component)` to reconnect instances to their matched components
2. Preserves as many property overrides as possible using Figma's built-in heuristics
3. Automatically re-scans the file to show any remaining unlinked instances
4. Updates the UI with the new results (useful if multiple iterations are needed)

## Limitations

- Only performs exact name matching (no fuzzy matching or similarity algorithms)
- Cannot restore links to deleted library components from other files (external components are filtered out)
- Swapping may not preserve all property overrides perfectly (depends on Figma's built-in heuristics)
- Scans only component instances (not detached frames or other node types)
- Case-insensitive matching may connect to wrong component if multiple components have same name with different casing

## License

ISC
