# Linux Steam Vortex Helper

Adds Vortex support to Steam Proton games on Linux, to easy install nexus mod

## How it works

Scans installed Steam games, filters for Proton-compatible titles, and creates a non-Steam shortcut for a mod manager like Vortex linked to the selected game.

## Features

- Checks Steam is installed and not running
- Detects the currently logged-in Steam account
- Lists all installed Proton-enabled games
- Select games interactively in the terminal
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

Work in progress.

### Planned

- Modify launch command for modded games (e.g., replace `%command%` with `sfse_loader.exe`)
- Automatic detection and setup of Vortex / other mod managers

## License

MIT
