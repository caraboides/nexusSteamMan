# nexussteamman

Adds Nexus Mods support to Steam Proton games on Linux.

## How it works

The tool scans your installed Steam games, filters for Proton-compatible titles, and creates a non-Steam shortcut entry for a mod manager (e.g., Vortex) linked to the selected game.

## Features

- Checks that Steam is installed and not running
- Detects the currently logged-in Steam account
- Lists all installed Proton-enabled games
- Interactive selection via terminal prompts
- Adds a mod manager as a non-Steam shortcut (WIP)

## Prerequisites

- [Bun](https://bun.sh) v1.3.11 or newer
- Steam with Proton-configured games (Linux)

## Installation

```bash
bun install
```

## Usage

```bash
bun run index.ts
```

## Status

**Work in Progress** – This project is in an early stage.

### Planned

- Modify launch command for modded games (e.g., replace `%command%` with `sfse_loader.exe`)
- Full integration of `steam-shortcut-editor` to write `shortcuts.vdf`
- Automatic detection and setup of Vortex / other mod managers

## License

MIT
