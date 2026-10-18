# RELEASE 2.2.0

## Added

- Mantenance system to prevent bugs or problems during manteinance.
- New featured servers tab.
- New announcements system in the top bar of the app.
- Support for datapack dependencies, including required mods and datapack libraries.
- Automatic addon updating at the starting of the game.
- MacOS full support.

## Changed

- Clicking an installation in the installations list selects it.

## Fixed

- Bad Minecraft process status detecting.
- Fixed Windows toast notifications displaying installation shortcut name and icon instead of HelloWorld Launcher.
- Fixed profile completion progress bar blocking clicks by making it pass-through.
- Fixed mod dependency resolution detecting already installed dependencies so they don't appear in the install list and omitting the modal when all dependencies are satisfied.
- Fixed mod reinstall/update leaving old jar files in the mods folder when file names changed.
- Fixed datapacks being misidentified as mods, ensuring proper world save installation and .zip format resolution.
- Fixed datapack lists and states mixing across different worlds and causing phantom missing file errors.
