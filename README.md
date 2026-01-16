# Fix Unlinked Components - Figma Plugin

A Figma plugin that helps you fix component instances that have lost their connection to their main component.

## Features

- **Scan for unlinked instances**: Finds all component instances in your file that have lost their main component reference
- **Smart matching**: Automatically matches unlinked instances with existing components by exact name (case-insensitive)
- **Flexible scope**: Choose to scan just the current page or the entire document
- **Batch replacement**: Select which instances to relink and fix them all at once
- **Clear feedback**: Shows which instances have matches and provides context (page name, parent frame)

## Usage

1. Open a Figma file with unlinked component instances
2. Run the plugin from the menu: **Plugins → Development → Fix Unlinked Components**
3. Toggle between "Current page" and "Entire document" scanning
4. Review the list of unlinked instances:
   - ✓ Green checkmark = Match found (checkbox enabled by default)
   - ✗ Red cross = No match found (checkbox disabled)
5. Uncheck any instances you don't want to relink
6. Click **Replace** to fix all selected instances
7. The plugin will swap each instance to its matched component and close

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

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite 6**: Build tool
- **Tailwind CSS 4**: Styling
- **Biome**: Linting and formatting
- **@create-figma-plugin/ui**: Figma design system components

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

The plugin searches for all `INSTANCE` nodes where `mainComponent === null`, indicating a broken link to the main component.

### Matching

For each unlinked instance, the plugin:

1. Gets all `COMPONENT` nodes in the file
2. Performs exact name matching (case-insensitive)
3. Returns the first match found

### Relinking

When you click Replace, the plugin uses `instance.swapComponent(component)` to reconnect instances to their matched components. This preserves as many property overrides as possible using Figma's built-in heuristics.

## Limitations

- Only performs exact name matching (no fuzzy matching)
- Cannot restore links to deleted library components from other files
- Swapping may not preserve all property overrides perfectly
- Scans only component instances (not detached frames)

## License

ISC
