#!/bin/bash
set -e

echo -e "\n========================================"
echo -e "  HelloWorld Launcher Installer (Linux)"
echo -e "========================================\n"

REPO_OWNER="Abeloskyyy"
REPO_NAME="HelloWorld-Launcher"
INSTALL_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    ASSET_ARCH="x64"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    ASSET_ARCH="arm64"
else
    echo "Error: Unsupported architecture $ARCH"
    exit 1
fi

echo -e "\e[33mFetching latest release...\e[0m"
API_URL="https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/latest"

# Use curl or wget
if command -v curl >/dev/null 2>&1; then
    RELEASE_DATA=$(curl -sL "$API_URL")
elif command -v wget >/dev/null 2>&1; then
    RELEASE_DATA=$(wget -qO- "$API_URL")
else
    echo "Error: curl or wget is required"
    exit 1
fi

# Parse version
VERSION=$(echo "$RELEASE_DATA" | grep '"tag_name":' | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$VERSION" ]; then
    echo "Error: Could not determine latest version"
    exit 1
fi

# Find AppImage URL for the corresponding architecture
DOWNLOAD_URL=$(echo "$RELEASE_DATA" | grep "browser_download_url" | grep -i "\.AppImage" | grep "$ASSET_ARCH" | head -n 1 | cut -d '"' -f 4)

if [ -z "$DOWNLOAD_URL" ]; then
    # Fallback to any AppImage without strict architecture checking in the name if missing
    DOWNLOAD_URL=$(echo "$RELEASE_DATA" | grep "browser_download_url" | grep -i "\.AppImage" | head -n 1 | cut -d '"' -f 4)
fi

if [ -z "$DOWNLOAD_URL" ]; then
    echo "Error: Could not find AppImage in release"
    exit 1
fi

FILE_NAME=$(basename "$DOWNLOAD_URL")
echo -e "\e[32mFound version: $VERSION\e[0m"
echo -e "\e[33mDownloading: $FILE_NAME...\e[0m"

mkdir -p "$INSTALL_DIR"

if command -v curl >/dev/null 2>&1; then
    curl -L --progress-bar "$DOWNLOAD_URL" -o "$INSTALL_DIR/$FILE_NAME"
else
    wget -q --show-progress "$DOWNLOAD_URL" -O "$INSTALL_DIR/$FILE_NAME"
fi

chmod +x "$INSTALL_DIR/$FILE_NAME"
APP_EXEC="$INSTALL_DIR/$FILE_NAME"

echo -e "\e[32mDownload completed!\e[0m"

# Create Desktop entry
echo -e "\e[33mCreating desktop shortcut...\e[0m"
mkdir -p "$DESKTOP_DIR"
DESKTOP_FILE="$DESKTOP_DIR/HelloWorldLauncher.desktop"

cat <<EOF > "$DESKTOP_FILE"
[Desktop Entry]
Name=HelloWorld Launcher
Comment=Minecraft Launcher
Exec="$APP_EXEC" --no-sandbox
Terminal=false
Type=Application
Categories=Game;
EOF

chmod +x "$DESKTOP_FILE"

echo -e "\n========================================"
echo -e "\e[32m  Installation completed successfully!\e[0m"
echo -e "========================================\n"
echo -e "Location: $INSTALL_DIR"
echo -e "Executable: $FILE_NAME"
echo -e "\nYou can now run the launcher from your application menu or terminal."
echo -e "\e[36mNote: Make sure you have Java 17+ installed.\e[0m\n"

# Ask if user wants to launch
if [ -c /dev/tty ]; then
    read -p "Launch the launcher now? (Y/N) " -n 1 -r < /dev/tty
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        "$APP_EXEC" --no-sandbox &
        echo -e "\e[32mLauncher started!\e[0m"
    fi
else
    echo -e "\n\e[33mTo start the launcher, run: $APP_EXEC\e[0m"
fi
