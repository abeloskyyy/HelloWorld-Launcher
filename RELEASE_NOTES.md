# RELEASE 3.2.0

## Added

- **Cloud Installations Sync**: Sync your installations across devices using your HelloWorld or verified Microsoft account, including profile metadata, icons, hardware-aware RAM adjustment, and Modrinth addons (mods, resource packs, and shaders) with automatic background syncing, offline editing support, external addon warnings, and up to 35 cloud installations per account.
- **Open Folder & Duplicate Installation Actions**: Added quick-action buttons on installation cards to open a profile's folder directly in one click or duplicate an existing installation (preserving settings, icon, and addons) with automatic `_Duplicated` naming.
- **One-Click Restart Dialog on Settings Changes**: When saving settings that require a restart (such as Developer Mode or Hardware Acceleration), the system dialog now lets you choose between restarting the launcher immediately or later, performing a clean full restart.
- **Minimize to System Tray on Game Open**: Added a new optional setting (disabled by default) that automatically minimizes the launcher to the system tray once Minecraft opens and is detected as running.
- **Opt-In Telemetry & Diagnostic System**: Added a fully optional diagnostic and crash reporting system powered by Cloudflare. When enabled, it captures crash reports, system specs, terminal and JavaScript console logs, and scans for unmanaged mods or custom files to help troubleshoot launch issues. Disabled by default in Settings.

## Fixed

- **Game Open Detection on Wayland & Modern Minecraft**: Improved window and log-based detection so the launcher immediately recognizes when Minecraft opens (including native Wayland sessions and modern versions) instead of waiting for the 60-second fallback timeout.
- **Onboarding Account Switcher**: The "Change Account" button in the welcome onboarding setup now opens the official account switcher modal directly instead of resetting to the inline form, allowing seamless account selection and management without nickname glitches.
- **Interactive 1:1 Image Cropper for Installations**: Connected, styled, and fully translated the interactive 1:1 image cropper modal across all 23 languages when selecting custom icons for installations.
