# Sidebar Images — HelloWorld Launcher Setup

This folder contains the images displayed in the left panel of the installer.

## Where to place images

Place your Minecraft images **directly in this folder** (`installer/ui/assets/sidebar/`).

## Supported formats

- `.jpg` / `.jpeg`
- `.png`
- `.webp`

## Recommended dimensions

- **Width**: 600–1200 px (the panel is 290 px wide, so wider is always fine)
- **Height**: 900–1400 px (covers the full 560 px window height, with Ken Burns zoom)
- **Aspect ratio**: Portrait (taller than wide) or square works best

## How images are loaded

The installer reads this folder automatically at startup. There is no configuration needed — just drop the files here and rebuild (or run in dev mode).

- In **development** (`npm start`): reads from `installer/ui/assets/sidebar/`
- In **production** (packaged): reads from the `resources/sidebar/` folder inside the installed setup executable

## Slideshow behavior

- Images rotate every **6 seconds** with a crossfade + Ken Burns (slow pan & zoom) effect
- Click the dots at the bottom of the panel to jump to a specific image
- If this folder is empty, the panel shows a dark gradient background

## Tips

- Use high-quality screenshots of Minecraft gameplay, builds, or landscapes
- Darker images work better since the bottom gradient overlay needs some contrast
- 3–6 images is the recommended number for a smooth, non-repetitive experience
