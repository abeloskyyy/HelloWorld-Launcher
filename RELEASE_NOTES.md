# RELEASE 3.0.0

## Added

- **Native Linux RPM Package**: Official `.rpm` packaging for Fedora, Red Hat Enterprise Linux (RHEL), CentOS, Rocky Linux, AlmaLinux, and openSUSE with automatic package manager integration.
- **Universal Linux Portable ZIP Package**: Pure native Linux binary distribution (`.zip`) that runs out-of-the-box on any Linux distribution (Arch, Manjaro, Debian, Ubuntu, Fedora) without requiring FUSE (`libfuse2`) or root (`sudo`) permissions.
- **Universal Linux Setup Bootstrapper**: `HelloWorld-Launcher-Setup-Linux.bin` graphical installer providing an identical user experience to Windows Setup, automatically creating desktop shortcuts, registering application menu entries, and managing local updates.
- **Interactive 1:1 Image Cropper**: Dedicated modal with smooth zoom and pan controls for profile pictures, custom installation icons, and workshop modpacks.
- **Client-Side Image Optimization**: Automatically optimizes uploads to crisp 512x512 while strictly preserving native dimensions for retro pixel art (32x32, 64x64).
- **Edge Backend Architecture**: High-performance, globally distributed API powered by Cloudflare Workers, Cloudflare D1 SQL database, and Cloudflare R2 object storage.
- **Dynamic Remote Configuration**: Instant endpoint and maintenance synchronization via remote Gist with automatic client-side cache busting.

## Changed

- Replaced legacy Linux AppImage packages with universal portable `.zip` archives and native `.rpm`/`.deb` packages for optimal performance and compatibility across all distributions.
- 100% decoupled all client database queries from legacy Cloud Firestore, establishing Cloudflare D1 as the single source of truth for social, chat, presence, workshop, and user profiles.
- Automated GitHub Actions build matrix with fast bootstrapper reuse to conserve runner time.

## Fixed

- **All Badges Display**: Fixed an issue where only the primary badge appeared on the user button; all earned badges (Premium, Moderator, Creator) now reliably load and render in both compact and full profile views.
- **Offline / Corrupted Storage Hang**: Fixed initial launcher loading screen hang during local storage verification.
- **Direct Update Pipeline**: Fixed Linux background update flow to seamlessly extract portable `.zip` updates into user directory without requiring terminal commands or administrator privileges.
- **False-Positive Game Detection**: Fixed an issue where external applications with "minecraft" in their window title or channel name (such as Discord voice channels or browser tabs) falsely triggered the "Playing" state. Process detection now strictly verifies that the process executable is genuinely Java/Javaw and that the window title matches authentic Minecraft title conventions.
