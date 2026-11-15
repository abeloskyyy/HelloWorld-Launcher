#!/bin/bash
set -e

echo -e "\n========================================"
echo -e "  HelloWorld Launcher Installer (Linux)"
echo -e "========================================\n"

REPO_OWNER="Abeloskyyy"
REPO_NAME="HelloWorld-Launcher"
GIST_URL="https://gist.githubusercontent.com/abeloskyyy/b50089b634ed09f48c921f9c8126a49f/raw/hwlauncher-info.json"
TEMP_DIR="/tmp/hwlauncher-install-$$"

cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

mkdir -p "$TEMP_DIR"

# 1. Detect architecture
ARCH_RAW=$(uname -m)
if [ "$ARCH_RAW" = "x86_64" ]; then
    ARCH="x64"
    ARCH_ALIAS="amd64"
elif [ "$ARCH_RAW" = "aarch64" ] || [ "$ARCH_RAW" = "arm64" ]; then
    ARCH="arm64"
    ARCH_ALIAS="arm64"
else
    echo "Error: Unsupported architecture $ARCH_RAW"
    exit 1
fi

# Check download tool
FETCH_CMD=""
if command -v curl >/dev/null 2>&1; then
    FETCH_CMD="curl -sL"
elif command -v wget >/dev/null 2>&1; then
    FETCH_CMD="wget -qO-"
else
    echo "Error: curl or wget is required"
    exit 1
fi

download_file() {
    local url="$1"
    local dest="$2"
    if command -v curl >/dev/null 2>&1; then
        curl -L --progress-bar "$url" -o "$dest"
    else
        wget -q --show-progress "$url" -O "$dest"
    fi
}

echo -e "\e[33mFetching latest release information...\e[0m"

SETUP_URL=""
LAUNCHER_URL=""
VERSION=""

# 2. Try Gist first
GIST_DATA=$($FETCH_CMD "$GIST_URL?t=$(date +%s)" 2>/dev/null || true)
if [ -n "$GIST_DATA" ]; then
    if command -v python3 >/dev/null 2>&1; then
        PARSED=$(echo "$GIST_DATA" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    ch = d.get('changelog', {})
    v = ch.get('latestVersion', '')
    versions = ch.get('versions', [])
    rel = next((item for item in versions if item.get('version') == v), versions[0] if versions else {})
    dl = rel.get('downloads', {}).get('linux', {})
    
    # Setup installer (.bin / .AppImage)
    setup = dl.get('setup', '') or dl.get('bin', '')
    
    # Launcher ZIP or AppImage
    launcher = ''
    if isinstance(dl.get('$ARCH'), dict):
        launcher = dl.get('$ARCH', {}).get('zip', '') or dl.get('$ARCH', {}).get('appimage', '') or dl.get('$ARCH', {}).get('AppImage', '') or dl.get('$ARCH', {}).get('deb', '')
    elif isinstance(dl.get('$ARCH_ALIAS'), dict):
        launcher = dl.get('$ARCH_ALIAS', {}).get('zip', '') or dl.get('$ARCH_ALIAS', {}).get('appimage', '') or dl.get('$ARCH_ALIAS', {}).get('AppImage', '') or dl.get('$ARCH_ALIAS', {}).get('deb', '')
        
    print(v)
    print(setup)
    print(launcher)
except Exception:
    pass
" 2>/dev/null || true)
        VERSION=$(echo "$PARSED" | sed -n '1p')
        SETUP_URL=$(echo "$PARSED" | sed -n '2p')
        LAUNCHER_URL=$(echo "$PARSED" | sed -n '3p')
    fi
fi

# 3. Fallback to GitHub Releases API
if [ -z "$SETUP_URL" ] || [ -z "$LAUNCHER_URL" ]; then
    echo -e "\e[33mChecking GitHub Releases API for universal Linux installers...\e[0m"
    API_URL="https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/latest"
    RELEASE_DATA=$($FETCH_CMD "$API_URL" 2>/dev/null || true)
    
    if [ -n "$RELEASE_DATA" ]; then
        if [ -z "$VERSION" ]; then
            VERSION=$(echo "$RELEASE_DATA" | grep '"tag_name":' | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/' | sed 's/^v//')
        fi
        
        # Look for HelloWorld-Launcher-Setup-Linux.bin or .AppImage
        if [ -z "$SETUP_URL" ]; then
            SETUP_URL=$(echo "$RELEASE_DATA" | grep "browser_download_url" | grep -iE "setup.*linux.*\.(bin|appimage)" | head -n 1 | cut -d '"' -f 4 || true)
        fi
        
        # Look for launcher ZIP or AppImage
        if [ -z "$LAUNCHER_URL" ]; then
            LAUNCHER_URL=$(echo "$RELEASE_DATA" | grep "browser_download_url" | grep -iE "helloworld-launcher-linux.*($ARCH|$ARCH_ALIAS|x86_64).*\.zip" | head -n 1 | cut -d '"' -f 4 || true)
            if [ -z "$LAUNCHER_URL" ]; then
                LAUNCHER_URL=$(echo "$RELEASE_DATA" | grep "browser_download_url" | grep -iE "helloworld-launcher-linux.*($ARCH|$ARCH_ALIAS|x86_64).*\.appimage" | head -n 1 | cut -d '"' -f 4 || true)
            fi
            if [ -z "$LAUNCHER_URL" ]; then
                LAUNCHER_URL=$(echo "$RELEASE_DATA" | grep "browser_download_url" | grep -iE "\.(zip|appimage)" | head -n 1 | cut -d '"' -f 4 || true)
            fi
        fi
    fi
fi

# 4. Check whether to launch GUI Setup or perform direct unattended installation
HAS_DISPLAY=false
if [ -n "$DISPLAY" ] || [ -n "$WAYLAND_DISPLAY" ]; then
    HAS_DISPLAY=true
fi

# If --cli or --headless is passed, force direct installation
FORCE_CLI=false
for arg in "$@"; do
    if [ "$arg" = "--cli" ] || [ "$arg" = "--headless" ] || [ "$arg" = "-s" ] || [ "$arg" = "--silent" ]; then
        FORCE_CLI=true
    fi
done

if [ -n "$SETUP_URL" ] && [ "$HAS_DISPLAY" = true ] && [ "$FORCE_CLI" = false ]; then
    echo -e "\e[32mFound Universal Graphical Installer: $(basename "$SETUP_URL")\e[0m"
    SETUP_BIN="$TEMP_DIR/HelloWorld-Launcher-Setup.bin"
    echo -e "\e[33mDownloading Setup installer...\e[0m"
    download_file "$SETUP_URL" "$SETUP_BIN"
    chmod +x "$SETUP_BIN"
    
    echo -e "\e[32mLaunching HelloWorld Launcher Setup GUI...\e[0m"
    "$SETUP_BIN" --no-sandbox "$@"
    exit 0
fi

# 5. Direct Universal Installation - Works on ALL distros (Fedora, Ubuntu, Arch, etc.)
if [ -z "$LAUNCHER_URL" ]; then
    echo -e "\e[31mError: Could not resolve a universal Linux installer for $ARCH.\e[0m"
    exit 1
fi

FILE_NAME=$(basename "$LAUNCHER_URL")
TEMP_DOWNLOAD="$TEMP_DIR/$FILE_NAME"

echo -e "\e[32mDownloading HelloWorld Launcher (v$VERSION)...\e[0m"
echo -e "\e[33mAsset: $FILE_NAME\e[0m"
download_file "$LAUNCHER_URL" "$TEMP_DOWNLOAD"

INSTALL_DIR="$HOME/.local/share/HelloWorld-Launcher"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"

mkdir -p "$INSTALL_DIR"
mkdir -p "$BIN_DIR"
mkdir -p "$DESKTOP_DIR"
mkdir -p "$ICON_DIR"

if [[ "$FILE_NAME" == *.zip ]]; then
    echo -e "\e[32mExtracting ZIP archive to $INSTALL_DIR...\e[0m"
    if command -v unzip >/dev/null 2>&1; then
        unzip -q -o "$TEMP_DOWNLOAD" -d "$INSTALL_DIR"
    else
        tar -xf "$TEMP_DOWNLOAD" -C "$INSTALL_DIR"
    fi
    if [ -d "$INSTALL_DIR/linux-unpacked" ]; then
        cp -r "$INSTALL_DIR/linux-unpacked/"* "$INSTALL_DIR/" 2>/dev/null || true
        rm -rf "$INSTALL_DIR/linux-unpacked"
    fi
    TARGET_EXEC="$INSTALL_DIR/helloworld-launcher"
    chmod +x "$TARGET_EXEC"
else
    TARGET_EXEC="$INSTALL_DIR/helloworld-launcher.AppImage"
    cp -f "$TEMP_DOWNLOAD" "$TARGET_EXEC"
    chmod +x "$TARGET_EXEC"
fi

# Download or place setup.bin for in-app background updates
if [ -n "$SETUP_URL" ]; then
    echo -e "\e[33mSetting up local updater (setup.bin)...\e[0m"
    download_file "$SETUP_URL" "$INSTALL_DIR/setup.bin" 2>/dev/null || true
    chmod +x "$INSTALL_DIR/setup.bin" 2>/dev/null || true
fi

# Create terminal command symlink
ln -sf "$TARGET_EXEC" "$BIN_DIR/helloworld-launcher"

# Install fonts (Segoe UI) into user fonts directory
USER_FONTS_DIR="$HOME/.local/share/fonts"
if [ -d "$INSTALL_DIR/resources/app/ui/fonts" ]; then
    mkdir -p "$USER_FONTS_DIR"
    cp -n "$INSTALL_DIR/resources/app/ui/fonts"/segoeui*.ttf "$USER_FONTS_DIR/" 2>/dev/null || true
    fc-cache -f "$USER_FONTS_DIR" >/dev/null 2>&1 || true
fi

# Setup Desktop Entry
ICON_PATH="$INSTALL_DIR/icon.png"
if [ ! -f "$ICON_PATH" ]; then
    # Try downloading raw icon from repository
    if command -v curl >/dev/null 2>&1; then
        curl -sL "https://raw.githubusercontent.com/$REPO_OWNER/$REPO_NAME/main/app/ui/img/icon.png" -o "$ICON_PATH" 2>/dev/null || true
    fi
fi
if [ -f "$ICON_PATH" ]; then
    cp -f "$ICON_PATH" "$ICON_DIR/helloworld-launcher.png" 2>/dev/null || true
fi

DESKTOP_FILE="$DESKTOP_DIR/helloworld-launcher.desktop"
cat << EOF > "$DESKTOP_FILE"
[Desktop Entry]
Name=HelloWorld Launcher
Comment=Play Minecraft with the HelloWorld community
Exec="$TARGET_EXEC" --no-sandbox %U
Icon=${ICON_PATH}
Terminal=false
Type=Application
Categories=Game;ActionGame;AdventureGame;
StartupWMClass=HelloWorld-Launcher
StartupNotify=true
EOF

chmod +x "$DESKTOP_FILE"

# Copy to Desktop if directory exists
if [ -d "$HOME/Desktop" ]; then
    cp -f "$DESKTOP_FILE" "$HOME/Desktop/helloworld-launcher.desktop" 2>/dev/null || true
    chmod +x "$HOME/Desktop/helloworld-launcher.desktop" 2>/dev/null || true
    gio set "$HOME/Desktop/helloworld-launcher.desktop" metadata::trusted true 2>/dev/null || true
elif [ -d "$HOME/Escritorio" ]; then
    cp -f "$DESKTOP_FILE" "$HOME/Escritorio/helloworld-launcher.desktop" 2>/dev/null || true
    chmod +x "$HOME/Escritorio/helloworld-launcher.desktop" 2>/dev/null || true
    gio set "$HOME/Escritorio/helloworld-launcher.desktop" metadata::trusted true 2>/dev/null || true
fi

# Refresh desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

echo -e "\n========================================"
echo -e "\e[32m  Installation completed successfully!\e[0m"
echo -e "========================================\n"
echo -e "HelloWorld Launcher v$VERSION is now installed in:"
echo -e "  \e[36m$TARGET_EXEC\e[0m"
echo -e "\nIt has been integrated into your application menu and command line (\e[33mhelloworld-launcher\e[0m)."
echo -e "\e[36mNote: Make sure you have Java 17+ installed.\e[0m\n"

# Optional launch
if [ -c /dev/tty ]; then
    read -p "Launch HelloWorld Launcher now? (Y/N) " -n 1 -r < /dev/tty
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        "$TARGET_EXEC" --no-sandbox &
        echo -e "\e[32mLauncher started!\e[0m"
    fi
fi
