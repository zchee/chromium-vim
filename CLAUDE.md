# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role

You are a TypeScript, React, and Chrome Extension Developer who provides expert-level insights and solutions.
Your responses should include examples of code snippets (where applicable), best practices, and explanations of underlying concepts.

## Here are some general rules:

- Use the latest stable version of React.
- Should respect Chrome Extension manifest v3 APIs
  - https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3
- Use TypeScript when applicable and provide type definitions.
- Avoid adding code comments unless necessary.
- Avoid effects (useEffect, useLayoutEffect) unless necessary.
- Avoid adding third-party libraries unless necessary.
- Provide real-world examples or code snippets to illustrate solutions.
- Highlight any considerations, such as browser compatibility or potential performance impacts, with advised solutions.
- Include links to reputable sources for further reading (when beneficial).

## Project Overview

cVim is a Chrome extension that adds Vim-like keybindings to Google Chrome, providing keyboard navigation, command mode, visual mode, and extensive customization options.

## Key Architecture Components

### Chrome Extension Structure
- **manifest.json**: Chrome extension manifest (v2) defining permissions, scripts, and commands
- **background_scripts/**: Background scripts for extension functionality (tabs, bookmarks, history, etc.)
- **content_scripts/**: Scripts injected into web pages (key handling, UI, search, hints, etc.)
- **pages/**: Extension pages (options, popup, mappings documentation)

### Configuration System
- **cvimrc_parser/**: PEG.js-based parser for .cvimrc configuration files
- **cvim_server.py**: Python HTTP server for external Vim editing integration
- Configuration supports mappings, settings, site-specific rules, and custom commands

### Build Process
- Uses **pnpm** for package management (not npm)
- Uses **Rollup** for bundling TypeScript and optimizing Chrome extension bundles
- Main build: `pnpm run build` (builds parser, generates pages, bundles with Rollup)
- Development build: `pnpm run build:dev` (watch mode with Rollup)
- Production build: `pnpm run build:prod` (optimized production build)
- Parser build: `cd cvimrc_parser && make` (compiles PEG.js grammar)
- Legacy build: `pnpm run build:old` (uses old TypeScript + custom scripts)

## Common Commands

### Development
```bash
# Install dependencies
pnpm install

# Build extension (Rollup-based)
pnpm run build

# Development build with watch mode
pnpm run build:dev

# Production build (optimized)
pnpm run build:prod

# Build parser only
cd cvimrc_parser && make

# Run parser tests
cd cvimrc_parser && make test

# Type checking
pnpm run type-check

# Linting
pnpm run lint

# Create release package
pnpm run release

# Clean build artifacts
pnpm run clean
```

### Testing
```bash
# Test the configuration parser
cd cvimrc_parser && node test/test.js
```

### Chrome Extension Loading
1. Run `pnpm run build` to build with Rollup
2. Navigate to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked extension" and select the `dist/` directory

### Rollup Build System
The project now uses Rollup for optimized bundling:
- **Service Worker**: Bundles background scripts into a single ES module
- **Content Scripts**: Bundles all content scripts into a single IIFE bundle
- **Page Scripts**: Bundles options and popup scripts separately
- **Asset Handling**: Copies HTML, CSS, icons, and static assets
- **TypeScript**: Compiles TypeScript to ES modules for better tree-shaking
- **Source Maps**: Generates source maps for debugging (development mode)
- **Watch Mode**: Supports development with auto-rebuild on file changes

## File Structure Patterns

### Background Scripts Load Order (from manifest.json)
1. `content_scripts/utils.js` - Shared utilities
2. `content_scripts/cvimrc_parser.js` - Generated parser
3. `background_scripts/` - Main background functionality

### Content Scripts Load Order
1. Parser and utilities first
2. Core functionality (dom, hints, keys, etc.)
3. UI components (status, hud, visual)
4. Integration (messenger, frames)

## Development Notes

### Configuration Parser
- Source: `cvimrc_parser/parser.peg` (PEG.js grammar)
- Generated: `cvimrc_parser/parser.js` → copied to `content_scripts/cvimrc_parser.js`
- Parses Vim-like configuration syntax with mappings, settings, and commands

### Key Extension Points
- **Mappings**: Key bindings defined in content_scripts/mappings.js
- **Commands**: Command-line commands in content_scripts/command.js
- **Hints**: Link hint system in content_scripts/hints.js
- **Settings**: Extension settings in background_scripts/options.js

### External Integration
- **cvim_server.py**: Runs on port 8001 for external Vim editing
- **Command**: `gvim -f` by default (configurable)
- **Security**: Validates Chrome extension origin headers

## Code Conventions

### JavaScript Style
- Uses ES5 syntax throughout (Chrome extension compatibility)
- Global variables and functions common in background/content scripts
- Extensive use of Chrome extension APIs (tabs, storage, etc.)

### Extension Architecture
- Background scripts handle browser-level operations
- Content scripts handle page-level interactions
- Message passing between background and content scripts
- Persistent storage for settings and sessions

## Testing

### Parser Tests
- Located in `cvimrc_parser/test/`
- Tests configuration parsing with sample .cvimrc files
- Run with `node test/test.js`

### Manual Testing
- Load extension in Chrome developer mode
- Test key bindings and commands on web pages
- Verify options page functionality

## Release Process

1. Run `make release` to build and package
2. Creates `release/` directory with extension files
3. Generates `release.zip` for distribution
4. Excludes development files (node_modules, scripts, etc.)
