# RELEASE 3.1.0

## Added

- **Interactive Account Onboarding**: Full-screen account selection during first setup with support for Microsoft, HelloWorld, or Offline accounts, plus automatic detection of existing accounts.
- **Accurate Game Launch Verification**: Improved game startup checks across Windows, Linux, and macOS to verify Minecraft is fully open before updating status.

## Changed

- **Streamlined Setup Flow**: Simplified the onboarding process by removing the redundant login step in favor of the interactive first-run account screen.
- **High-Performance Cloud Backend**: Transitioned social features, messaging, player stats, and the community Workshop to a fast, dedicated cloud service.
- **Modernized Interface Styling**: Refined action buttons and modpack cards with modern translucent styling and improved spacing in the sidebar Add-ons menu.

## Fixed

- **Avatar and Profile Pictures**: Fixed avatar loading issues in the user badge and account switcher.
- **Account Join Dates & Stats Preservation**: Join dates and gameplay stats are now safely preserved and restored after app reinstalls.
- **Social & Community Access**: Resolved account restriction issues, ensuring friends, chat, and messaging work smoothly for all players.
- **Strict Account Isolation**: User badges and permissions are strictly isolated per account to prevent mixing between accounts sharing the same nickname.
- **Profile Badge Display**: Fixed a visual glitch where profile badges could appear clipped.
- **Windows Startup Protection**: Prevented false security prompts and launch blocks on Windows installations.
- **Community Workshop & Moderation**: Fixed modpack browsing, category filters, and moderation workflows for creators and staff.
- **Inbox Messaging Smoothness**: Eliminated screen flickering when refreshing or receiving inbox messages.
