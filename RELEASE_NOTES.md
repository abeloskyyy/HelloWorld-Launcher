# RELEASE 2.3.0

## Added

- Visual RAM slider in installation settings to easily adjust allocated memory with smart recommendations
- Automatic mod loader updates (Fabric, Forge, NeoForge) to keep installation loaders up to date
- Option to install shaders even when not officially marked compatible with the installation's Minecraft version
- Standalone Linux AppImage packaging for zero-root (no sudo required) user-level installation and updates
- Silent background update download into protected app storage with a sleek bottom dock badge featuring real-time circular progress outline
- Attention-grabbing ready indicator with checkmark and breathing pulse, enabling one-click instant restart and setup execution
- Direct setup relay with pre-downloaded launcher package arguments (`--update-file`), performing unattended extraction and automatically terminating setup once the launcher opens
- Smart local `setup.exe` reuse from the launcher directory with cryptographic hash verification against remote releases to avoid redundant installer downloads
- Interactive update flow testing button in Developer Mode (Settings) to preview the dock badge, circular progress, and relay execution in development
- Immediate automated restart for mandatory updates as soon as background download finishes

## Fixed

- Fixed Forge and NeoForge startup crash caused by argument deduplication stripping required repeatable flags (`--add-opens`, `--add-exports`)
- Added automatic integrity verification and self-healing for Minecraft libraries and version JARs, automatically detecting and repairing corrupted, truncated, or HTML-blocked files from restrictive networks
- Fixed Linux `.deb` updates freezing or failing to install in Ubuntu Software Center / App Center by migrating to an automated relay installer script using native PolicyKit (`pkexec`) elevation
- Eliminated manual `.dmg` mounting and drag-and-drop friction on macOS by automating background bundle replacement and automatic relaunch