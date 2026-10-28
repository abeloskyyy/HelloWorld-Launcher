# RELEASE 2.3.0

## Added

- Visual RAM slider in installation settings to easily adjust allocated memory with smart recommendations
- Automatic mod loader updates (Fabric, Forge, NeoForge) to keep installation loaders up to date
- Option to install shaders even when not officially marked compatible with the installation's Minecraft version
- Standalone Linux AppImage packaging for zero-root (no sudo required) user-level installation and updates
- Automated background relay updater for Linux and macOS that performs silent/assisted bundle updates and automatically restarts the launcher

## Fixed

- Fixed Forge and NeoForge startup crash caused by argument deduplication stripping required repeatable flags (`--add-opens`, `--add-exports`)
- Added automatic integrity verification and self-healing for Minecraft libraries and version JARs, automatically detecting and repairing corrupted, truncated, or HTML-blocked files from restrictive networks
- Fixed Linux `.deb` updates freezing or failing to install in Ubuntu Software Center / App Center by migrating to an automated relay installer script using native PolicyKit (`pkexec`) elevation
- Eliminated manual `.dmg` mounting and drag-and-drop friction on macOS by automating background bundle replacement and automatic relaunch