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
    ARCH="amd64"
elif [ "$ARCH_RAW" = "aarch64" ] || [ "$ARCH_RAW" = "arm64" ]; then
    ARCH="arm64"
else
    echo "Error: Unsupported architecture $ARCH_RAW"
    exit 1
fi

echo -e "\e[33mFetching latest release info from Gist...\e[0m"

# 2. Fetch Gist changelog info
FETCH_CMD=""
if command -v curl >/dev/null 2>&1; then
    FETCH_CMD="curl -sL"
elif command -v wget >/dev/null 2>&1; then
    FETCH_CMD="wget -qO-"
else
    echo "Error: curl or wget is required"
    exit 1
fi

GIST_DATA=$($FETCH_CMD "$GIST_URL?t=$(date +%s)" 2>/dev/null || true)
DOWNLOAD_URL=""
VERSION=""

if [ -n "$GIST_DATA" ]; then
    # Try parsing via python3 or jq
    if command -v python3 >/dev/null 2>&1; then
        PARSED=$(echo "$GIST_DATA" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    ch = d.get('changelog', {})
    v = ch.get('latestVersion', '')
    versions = ch.get('versions', [])
    rel = next((item for item in versions if item.get('version') == v), versions[0] if versions else {})
    dl = rel.get('downloads', {}).get('linux', {}).get('$ARCH', {}).get('deb', '')
    if not dl:
        dl = rel.get('downloads', {}).get('linux', {}).get('amd64', {}).get('deb', '')
    print(v)
    print(dl)
except Exception:
    pass
" 2>/dev/null || true)
        VERSION=$(echo "$PARSED" | sed -n '1p')
        DOWNLOAD_URL=$(echo "$PARSED" | sed -n '2p')
    elif command -v jq >/dev/null 2>&1; then
        VERSION=$(echo "$GIST_DATA" | jq -r '.changelog.latestVersion // empty')
        DOWNLOAD_URL=$(echo "$GIST_DATA" | jq -r --arg arch "$ARCH" '.changelog.versions[0].downloads.linux[$arch].deb // .changelog.versions[0].downloads.linux.amd64.deb // empty')
    fi
fi

# Fallback to GitHub Releases API if Gist could not be parsed or did not provide URL
if [ -z "$DOWNLOAD_URL" ]; then
    echo -e "\e[33mFalling back to GitHub Releases API...\e[0m"
    API_URL="https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/latest"
    RELEASE_DATA=$($FETCH_CMD "$API_URL" 2>/dev/null || true)
    
    if [ -n "$RELEASE_DATA" ]; then
        VERSION=$(echo "$RELEASE_DATA" | grep '"tag_name":' | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/' | sed 's/^v//')
        DOWNLOAD_URL=$(echo "$RELEASE_DATA" | grep "browser_download_url" | grep -i "\.deb" | grep "$ARCH" | head -n 1 | cut -d '"' -f 4)
        if [ -z "$DOWNLOAD_URL" ]; then
            DOWNLOAD_URL=$(echo "$RELEASE_DATA" | grep "browser_download_url" | grep -i "\.deb" | head -n 1 | cut -d '"' -f 4)
        fi
    fi
fi

if [ -z "$DOWNLOAD_URL" ]; then
    echo "Error: Could not resolve download URL for Linux ($ARCH)."
    exit 1
fi

FILE_NAME=$(basename "$DOWNLOAD_URL")
echo -e "\e[32mFound version: v$VERSION\e[0m"
echo -e "\e[33mDownloading: $FILE_NAME...\e[0m"

DEB_FILE="$TEMP_DIR/$FILE_NAME"
if command -v curl >/dev/null 2>&1; then
    curl -L --progress-bar "$DOWNLOAD_URL" -o "$DEB_FILE"
else
    wget -q --show-progress "$DOWNLOAD_URL" -O "$DEB_FILE"
fi

echo -e "\e[32mDownload completed!\e[0m"

# 3. Installation
echo -e "\e[33mInstalling package...\e[0m"

INSTALLED=false

if command -v dpkg >/dev/null 2>&1; then
    if [ "$EUID" -eq 0 ]; then
        dpkg -i "$DEB_FILE" || apt-get install -f -y
        INSTALLED=true
    elif command -v sudo >/dev/null 2>&1; then
        echo -e "\e[33mRequesting sudo permissions to install .deb package...\e[0m"
        sudo dpkg -i "$DEB_FILE" || sudo apt-get install -f -y
        INSTALLED=true
    fi
fi

# Fallback non-root extraction if dpkg/sudo not available or for non-Debian distributions
if [ "$INSTALLED" = false ]; then
    echo -e "\e[33mExtracting to user directory ($HOME/.local)...\e[0m"
    mkdir -p "$HOME/.local"
    if command -v dpkg-deb >/dev/null 2>&1; then
        dpkg-deb -x "$DEB_FILE" "$HOME/.local"
        INSTALLED=true
    elif command -v ar >/dev/null 2>&1; then
        cd "$TEMP_DIR"
        ar x "$DEB_FILE"
        tar -xf data.tar.* -C "$HOME/.local"
        INSTALLED=true
    fi
fi

if [ "$INSTALLED" = false ]; then
    echo -e "\e[31mError: Could not install .deb package. Please install $DEB_FILE manually with: sudo dpkg -i $DEB_FILE\e[0m"
    exit 1
fi

echo -e "\n========================================"
echo -e "\e[32m  Installation completed successfully!\e[0m"
echo -e "========================================\n"
echo -e "HelloWorld Launcher v$VERSION is now installed."
echo -e "\nYou can now run the launcher from your application menu or terminal (helloworld-launcher)."
echo -e "\e[36mNote: Make sure you have Java 17+ installed.\e[0m\n"

# 4. Optional launch
if command -v helloworld-launcher >/dev/null 2>&1; then
    if [ -c /dev/tty ]; then
        read -p "Launch the launcher now? (Y/N) " -n 1 -r < /dev/tty
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            helloworld-launcher --no-sandbox &
            echo -e "\e[32mLauncher started!\e[0m"
        fi
    fi
fi
