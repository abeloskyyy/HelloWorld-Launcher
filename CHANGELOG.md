# RELEASE v1.0.0

## Added
- **Complete rewrite from Python to Electron (Node.js)**: The launcher now runs natively as a desktop app, providing better performance, stability, and cross-platform support.
- **Auto-Updater**: The launcher can now update itself automatically via GitHub Releases using `electron-updater`.
- **Background Version Updates**: The launcher silently downloads and keeps the latest Minecraft release and snapshot up to date in the background.
- **Smart Java Runtime Manager**: Automatically downloads and manages the exact Java version required for each Minecraft version, without any user setup.
- **Discord Rich Presence**: Shows your current launcher status and Minecraft session to friends on Discord.
- **Profile System**: Create multiple Minecraft profiles with custom directories, icons, JVM arguments, and Java executable paths.
- **Skin Pack Manager**: Create and manage local skin packs, applied directly to your Microsoft account.
- **Modrinth Integration**: Browse and install mods, resource packs, shader packs, and data packs from Modrinth.
- **Version Manager**: View and manage installed Minecraft versions, including the ability to delete them.

## Fixed
- **Play button state**: Fixed the "Play" button getting stuck in "Starting..." if the game crashed or closed unexpectedly.
- **Session data leak on logout**: Microsoft tokens, UUIDs, and skin data are now fully cleared on logout.
- **Download progress display**: Fixed download progress disappearing or stalling during background version updates.
- **Custom Java path not respected on launch**: Profiles that had a custom Java executable set were incorrectly using the auto-detected runtime instead.
