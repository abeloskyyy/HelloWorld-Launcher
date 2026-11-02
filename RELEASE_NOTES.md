# RELEASE 2.3.0

## Added

- Visual RAM slider in installation settings to easily adjust allocated memory with smart recommendations
- Automatic mod loader updates (Fabric, Forge, NeoForge) to keep installations up to date
- Option to install shaders even when not officially marked compatible with the installation's Minecraft version
- Seamless background update downloads with a circular progress badge in the dock and one-click instant restart
- Faster update installation that reuses the local installer without redundant re-downloads
- Option to automatically launch HelloWorld Launcher on system startup (disabled by default)
- Comprehensive Presence & Activity (RPC) customization suite: toggle Discord Rich Presence, toggle in-launcher social visibility (Invisible mode), control singleplayer world name visibility, and toggle version, installation, or player IGN details

## Fixed

- Fixed startup crash when launching Forge and NeoForge installations
- Fixed launch crashes caused by damaged game files and libraries, automatically detecting and removing corrupted files with clear on-screen notifications
- Fixed Linux `.deb` updates freezing or failing to install in Ubuntu Software Center
- Automated macOS updates, eliminating manual `.dmg` mounting and drag-and-drop replacement
- Fixed player avatars not displaying immediately for newly added Microsoft accounts
- Eliminated layout shifts and flickering in the Workshop and Social panels with smooth loading placeholders
