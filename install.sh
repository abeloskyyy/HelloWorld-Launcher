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
        curl -fL --progress-bar "$url" -o "$dest"
    else
        wget -q --show-progress "$url" -O "$dest"
    fi
}

echo -e "\e[33mFetching latest release information...\e[0m"

SETUP_URL=""
LAUNCHER_URL=""
VERSION=""

GIST_DATA=$($FETCH_CMD "$GIST_URL?t=$(date +%s)" 2>/dev/null || true)
API_URL="https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/latest"
RELEASE_DATA=$($FETCH_CMD "$API_URL" 2>/dev/null || true)

# 2. Resolve latest release by comparing Gist and GitHub Releases (SemVer)
if command -v python3 >/dev/null 2>&1; then
    PARSED=$(GIST_JSON="$GIST_DATA" GH_JSON="$RELEASE_DATA" python3 -c "
import os, json, re

def parse_ver(v):
    nums = [int(x) for x in re.findall(r'\d+', str(v or '').lstrip('vV'))]
    while len(nums) < 3:
        nums.append(0)
    return tuple(nums[:3])

gist_ver, gist_setup, gist_launcher = '', '', ''
try:
    raw = os.environ.get('GIST_JSON', '').strip()
    if raw:
        d = json.loads(raw)
        ch = d.get('changelog', {})
        gist_ver = str(ch.get('latestVersion', '')).lstrip('vV')
        versions = ch.get('versions', [])
        rel = next((item for item in versions if item.get('version') == gist_ver), versions[0] if versions else {})
        dl = rel.get('downloads', {}).get('linux', {})
        gist_setup = dl.get('setup', '') or dl.get('bin', '')
        for k in ('$ARCH', '$ARCH_ALIAS'):
            obj = dl.get(k)
            if isinstance(obj, dict):
                gist_launcher = obj.get('zip', '') or obj.get('appimage', '') or obj.get('AppImage', '') or ''
                if not gist_setup:
                    gist_setup = obj.get('setup', '') or obj.get('bin', '')
                if gist_launcher:
                    break
except Exception:
    pass

gh_ver, gh_setup, gh_launcher = '', '', ''
try:
    raw = os.environ.get('GH_JSON', '').strip()
    if raw:
        r = json.loads(raw)
        gh_ver = str(r.get('tag_name', '')).lstrip('vV')
        assets = r.get('assets', [])
        if isinstance(assets, list):
            for a in assets:
                n = (a.get('name') or '').lower()
                u = a.get('browser_download_url') or ''
                if not u:
                    continue
                if 'setup' in n and 'linux' in n and n.endswith('.bin'):
                    gh_setup = u
                    break
            if not gh_setup:
                for a in assets:
                    n = (a.get('name') or '').lower()
                    u = a.get('browser_download_url') or ''
                    if u and 'setup' in n and 'linux' in n and n.endswith('.appimage'):
                        gh_setup = u
                        break
            for a in assets:
                n = (a.get('name') or '').lower()
                u = a.get('browser_download_url') or ''
                if not u or not n.endswith('.zip') or 'mac' in n or 'win' in n:
                    continue
                is_arm = ('arm' in n or 'aarch64' in n)
                if '$ARCH' == 'arm64' and is_arm:
                    gh_launcher = u
                    break
                if '$ARCH' == 'x64' and not is_arm:
                    gh_launcher = u
                    break
            if not gh_launcher:
                for a in assets:
                    n = (a.get('name') or '').lower()
                    u = a.get('browser_download_url') or ''
                    if u and n.endswith('.appimage') and 'setup' not in n:
                        is_arm = ('arm' in n or 'aarch64' in n)
                        if ('$ARCH' == 'arm64' and is_arm) or ('$ARCH' == 'x64' and not is_arm):
                            gh_launcher = u
                            break
except Exception:
    pass

use_gh = False
if gh_launcher and (not gist_launcher or parse_ver(gh_ver) > parse_ver(gist_ver)):
    use_gh = True

if use_gh:
    ver = gh_ver or gist_ver
    setup = gh_setup or gist_setup
    launcher = gh_launcher
else:
    ver = gist_ver or gh_ver
    setup = gist_setup or gh_setup
    launcher = gist_launcher or gh_launcher

print(ver)
print(setup)
print(launcher)
" 2>/dev/null || true)
    VERSION=$(echo "$PARSED" | sed -n '1p')
    SETUP_URL=$(echo "$PARSED" | sed -n '2p')
    LAUNCHER_URL=$(echo "$PARSED" | sed -n '3p')
fi

# Pure shell fallback if python3 is unavailable
if [ -z "$LAUNCHER_URL" ] && [ -n "$RELEASE_DATA" ]; then
    VERSION=$(echo "$RELEASE_DATA" | grep '"tag_name":' | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/' | sed 's/^v//')
    SETUP_URL=$(echo "$RELEASE_DATA" | grep "browser_download_url" | grep -iE "setup.*linux.*\.bin" | head -n 1 | cut -d '"' -f 4 || true)
    if [ -z "$SETUP_URL" ]; then
        SETUP_URL=$(echo "$RELEASE_DATA" | grep "browser_download_url" | grep -iE "setup.*linux.*\.appimage" | head -n 1 | cut -d '"' -f 4 || true)
    fi
    LAUNCHER_URL=$(echo "$RELEASE_DATA" | grep "browser_download_url" | grep -iE "helloworld-launcher-linux.*($ARCH|$ARCH_ALIAS|x86_64).*\.zip" | head -n 1 | cut -d '"' -f 4 || true)
    if [ -z "$LAUNCHER_URL" ]; then
        LAUNCHER_URL=$(echo "$RELEASE_DATA" | grep "browser_download_url" | grep -iE "helloworld-launcher-linux.*($ARCH|$ARCH_ALIAS|x86_64).*\.appimage" | head -n 1 | cut -d '"' -f 4 || true)
    fi
fi

# Optional --gui flag if the user explicitly wants the graphical Setup bootstrapper
LAUNCH_GUI=false
for arg in "$@"; do
    if [ "$arg" = "--gui" ]; then
        LAUNCH_GUI=true
    fi
done

if [ "$LAUNCH_GUI" = true ] && [ -n "$SETUP_URL" ] && { [ -n "$DISPLAY" ] || [ -n "$WAYLAND_DISPLAY" ]; }; then
    echo -e "\e[32mFound Universal Graphical Installer: $(basename "$SETUP_URL")\e[0m"
    SETUP_BIN="$TEMP_DIR/HelloWorld-Launcher-Setup.bin"
    echo -e "\e[33mDownloading Setup installer...\e[0m"
    download_file "$SETUP_URL" "$SETUP_BIN"
    chmod +x "$SETUP_BIN"
    echo -e "\e[32mLaunching HelloWorld Launcher Setup GUI...\e[0m"
    "$SETUP_BIN" --no-sandbox "$@"
    exit 0
fi

# 3. Direct Universal Installation (Exact same paths & layout as Setup)
if [ -z "$LAUNCHER_URL" ]; then
    echo -e "\e[31mError: Could not resolve a Linux launcher package for $ARCH.\e[0m"
    exit 1
fi

INSTALL_DIR="$HOME/.local/share/HelloWorld-Launcher"
CONFIG_DIR="$HOME/.config/HelloWorld-Launcher"
STATE_FILE="$CONFIG_DIR/installer-state.json"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"

FILE_NAME=$(basename "${LAUNCHER_URL%%\?*}")
TEMP_DOWNLOAD="$TEMP_DIR/$FILE_NAME"

echo -e "\e[32mFound version: v${VERSION:-latest}\e[0m"
echo -e "\e[33mDownloading package ($FILE_NAME)...\e[0m"
download_file "$LAUNCHER_URL" "$TEMP_DOWNLOAD"

# Stop running launcher safely (never kill setup/installer processes)
if command -v ps >/dev/null 2>&1; then
    while read -r pid cmd; do
        [ -z "$pid" ] && continue
        [ "$pid" = "$$" ] && continue
        lower_cmd=$(echo "$cmd" | tr '[:upper:]' '[:lower:]')
        case "$lower_cmd" in
            *setup*|*installer*|*hwlauncher-install*) continue ;;
            *helloworld-launcher*|*helloworld_launcher*)
                kill -TERM "$pid" 2>/dev/null || true
                ;;
        esac
    done < <(ps -eo pid=,args= 2>/dev/null || true)
    sleep 1
fi

mkdir -p "$INSTALL_DIR"
mkdir -p "$CONFIG_DIR"
mkdir -p "$BIN_DIR"
mkdir -p "$DESKTOP_DIR"
mkdir -p "$ICON_DIR"

if [[ "$FILE_NAME" == *.zip ]]; then
    echo -e "\e[32mExtracting ZIP archive to $INSTALL_DIR...\e[0m"
    if command -v unzip >/dev/null 2>&1; then
        unzip -q -o "$TEMP_DOWNLOAD" -d "$INSTALL_DIR"
    elif command -v bsdtar >/dev/null 2>&1; then
        bsdtar -xf "$TEMP_DOWNLOAD" -C "$INSTALL_DIR"
    elif command -v python3 >/dev/null 2>&1; then
        python3 -c "import zipfile; zipfile.ZipFile('$TEMP_DOWNLOAD').extractall('$INSTALL_DIR')"
    else
        echo -e "\e[31mError: unzip, bsdtar or python3 is required to extract ZIP archives.\e[0m"
        exit 1
    fi
    if [ -d "$INSTALL_DIR/linux-unpacked" ]; then
        cp -rf "$INSTALL_DIR/linux-unpacked/"* "$INSTALL_DIR/" 2>/dev/null || true
        rm -rf "$INSTALL_DIR/linux-unpacked"
    fi
    TARGET_EXEC="$INSTALL_DIR/helloworld-launcher"
    chmod +x "$TARGET_EXEC"
else
    TARGET_EXEC="$INSTALL_DIR/helloworld-launcher.AppImage"
    cp -f "$TEMP_DOWNLOAD" "$TARGET_EXEC"
    chmod +x "$TARGET_EXEC"
fi

# Download setup.bin into install directory for seamless in-app updates & repair/uninstall
SETUP_DEST="$INSTALL_DIR/setup.bin"
if [ -n "$SETUP_URL" ]; then
    echo -e "\e[33mInstalling local updater (setup.bin)...\e[0m"
    download_file "$SETUP_URL" "$SETUP_DEST" 2>/dev/null || true
    if [ -f "$SETUP_DEST" ]; then
        chmod +x "$SETUP_DEST" 2>/dev/null || true
    fi
fi

# Ensure resources/app-update.yml exists
if [ -d "$INSTALL_DIR/resources" ] && [ ! -f "$INSTALL_DIR/resources/app-update.yml" ]; then
    cat << EOF > "$INSTALL_DIR/resources/app-update.yml"
owner: $REPO_OWNER
repo: $REPO_NAME
provider: github
EOF
fi

# Create terminal command symlink
ln -sf "$TARGET_EXEC" "$BIN_DIR/helloworld-launcher"

# Install fonts (Segoe UI) into user fonts directory if bundled unpacked
USER_FONTS_DIR="$HOME/.local/share/fonts"
if [ -d "$INSTALL_DIR/resources/app/ui/fonts" ]; then
    mkdir -p "$USER_FONTS_DIR"
    cp -n "$INSTALL_DIR/resources/app/ui/fonts"/segoeui*.ttf "$USER_FONTS_DIR/" 2>/dev/null || true
    fc-cache -f "$USER_FONTS_DIR" >/dev/null 2>&1 || true
fi

# Setup Application Icon & Desktop Entry (matching installer/src/shortcuts.js)
ICON_PATH="$INSTALL_DIR/icon.png"
for candidate in \
    "$INSTALL_DIR/resources/app/build/icon.png" \
    "$INSTALL_DIR/resources/app/ui/icon.png" \
    "$INSTALL_DIR/resources/icon.png"; do
    if [ -f "$candidate" ]; then
        cp -f "$candidate" "$ICON_PATH" 2>/dev/null || true
        break
    fi
done
if [ ! -f "$ICON_PATH" ]; then
    if command -v curl >/dev/null 2>&1; then
        curl -fsL "https://raw.githubusercontent.com/$REPO_OWNER/$REPO_NAME/main/app/build/icon.png" -o "$ICON_PATH" 2>/dev/null || true
    elif command -v wget >/dev/null 2>&1; then
        wget -q "https://raw.githubusercontent.com/$REPO_OWNER/$REPO_NAME/main/app/build/icon.png" -O "$ICON_PATH" 2>/dev/null || true
    fi
fi
if [ -f "$ICON_PATH" ]; then
    cp -f "$ICON_PATH" "$ICON_DIR/helloworld-launcher.png" 2>/dev/null || true
fi

DESKTOP_FILE="$DESKTOP_DIR/helloworld-launcher.desktop"
cat << EOF > "$DESKTOP_FILE"
[Desktop Entry]
Name=HelloWorld Launcher
Comment=Play Minecraft for free
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

# Write installer-state.json (matching installer/src/paths.js)
UPDATED_AT=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")
cat << EOF > "$STATE_FILE"
{
  "installPath": "$INSTALL_DIR",
  "version": "${VERSION:-0.0.0}",
  "installerPath": "$SETUP_DEST",
  "updatedAt": "$UPDATED_AT"
}
EOF

echo -e "\n========================================"
echo -e "\e[32m  Installation completed successfully!\e[0m"
echo -e "========================================\n"
echo -e "HelloWorld Launcher v${VERSION:-latest} is now installed in:"
echo -e "  \e[36m$INSTALL_DIR\e[0m"
echo -e "\nIt has been integrated into your application menu and command line (\e[33mhelloworld-launcher\e[0m)."
echo -e "\e[36mNote: Make sure you have Java 17+ installed.\e[0m\n"

# Optional launch
if [ -c /dev/tty ]; then
    read -p "Launch HelloWorld Launcher now? (Y/N) " -n 1 -r < /dev/tty
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        nohup "$TARGET_EXEC" --no-sandbox >/dev/null 2>&1 &
        echo -e "\e[32mLauncher started!\e[0m"
    fi
fi
