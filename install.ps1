# HelloWorld Launcher - PowerShell Installer
# Usage: iwr -useb https://raw.githubusercontent.com/Abeloskyyy/HelloWorld-Launcher/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  HelloWorld Launcher Installer" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Configuration
$RepoOwner = "Abeloskyyy"
$RepoName = "HelloWorld-Launcher"
$InstallDir = "$env:LOCALAPPDATA\HelloWorld-Launcher"
$TempDir = "$env:TEMP\HWLauncher-Install"
$GistUrl = "https://gist.githubusercontent.com/abeloskyyy/b50089b634ed09f48c921f9c8126a49f/raw/hwlauncher-info.json"

# Create temp directory
if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $TempDir | Out-Null

# 1. Fetch latest release info from Gist (hwlauncher-info.json) with GitHub API fallback
Write-Host "Fetching latest release info..." -ForegroundColor Yellow
$Version = ""
$DownloadUrl = ""
$FileName = ""

try {
    $GistTimestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $Config = Invoke-RestMethod -Uri "$GistUrl?t=$GistTimestamp" -UseBasicParsing
    
    if ($Config -and $Config.changelog) {
        $Version = $Config.changelog.latestVersion
        $Release = $Config.changelog.versions | Where-Object { $_.version -eq $Version } | Select-Object -First 1
        if (-not $Release -and $Config.changelog.versions.Count -gt 0) {
            $Release = $Config.changelog.versions[0]
            $Version = $Release.version
        }
        
        if ($Release -and $Release.downloads -and $Release.downloads.windows) {
            $DownloadUrl = $Release.downloads.windows.zip
            if (-not $DownloadUrl) {
                $DownloadUrl = $Release.downloads.windows.setup
            }
        }
    }
}
catch {
    Write-Host "Notice: Could not fetch from Gist, falling back to GitHub API..." -ForegroundColor DarkGray
}

# Fallback to GitHub Releases API if Gist didn't provide a URL
if (-not $DownloadUrl) {
    try {
        $ReleaseUrl = "https://api.github.com/repos/$RepoOwner/$RepoName/releases/latest"
        $ReleaseInfo = Invoke-RestMethod -Uri $ReleaseUrl -UseBasicParsing
        $Version = $ReleaseInfo.tag_name -replace '^v',''
        
        $Asset = $ReleaseInfo.assets | Where-Object { $_.name -like "*.zip" -and $_.name -like "*win*" } | Select-Object -First 1
        if (-not $Asset) {
            $Asset = $ReleaseInfo.assets | Where-Object { $_.name -like "*.zip" } | Select-Object -First 1
        }
        if ($Asset) {
            $DownloadUrl = $Asset.browser_download_url
        }
    }
    catch {
        Write-Host "Error fetching release info: $_" -ForegroundColor Red
        exit 1
    }
}

if (-not $DownloadUrl) {
    Write-Host "Error: Could not resolve download URL for HelloWorld Launcher." -ForegroundColor Red
    exit 1
}

$FileName = Split-Path -Leaf $DownloadUrl
if (-not $FileName.Contains(".")) {
    $FileName = "helloworld-launcher-win.zip"
}

Write-Host "Found version: v$Version" -ForegroundColor Green
Write-Host "Downloading: $FileName" -ForegroundColor Yellow

# 2. Download archive
$ZipPath = Join-Path $TempDir $FileName
try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ZipPath -UseBasicParsing
    Write-Host "Download completed!" -ForegroundColor Green
}
catch {
    Write-Host "Error downloading file: $_" -ForegroundColor Red
    exit 1
}

# 3. Extract to install directory
Write-Host "Extracting files to $InstallDir..." -ForegroundColor Yellow
try {
    if ($ZipPath.EndsWith(".exe", [System.StringComparison]::OrdinalIgnoreCase)) {
        Write-Host "Launching installer..." -ForegroundColor Yellow
        Start-Process $ZipPath -Wait
        Remove-Item $TempDir -Recurse -Force
        Write-Host "Installation completed!" -ForegroundColor Green
        exit 0
    }

    if (Test-Path $InstallDir) {
        Write-Host "Removing old installation..." -ForegroundColor Yellow
        Remove-Item $InstallDir -Recurse -Force
    }
    
    New-Item -ItemType Directory -Path $InstallDir | Out-Null
    Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force
    Write-Host "Extraction completed!" -ForegroundColor Green
}
catch {
    Write-Host "Error extracting files: $_" -ForegroundColor Red
    exit 1
}

# 4. Critical: Ensure resources\app-update.yml exists for autoUpdater compatibility
try {
    $ResourcesDir = Join-Path $InstallDir "resources"
    if (-not (Test-Path $ResourcesDir)) {
        New-Item -ItemType Directory -Path $ResourcesDir -Force | Out-Null
    }
    $AppUpdatePath = Join-Path $ResourcesDir "app-update.yml"
    $AppUpdateContent = "owner: $RepoOwner`nrepo: $RepoName`nprovider: github`n"
    Set-Content -Path $AppUpdatePath -Value $AppUpdateContent -Encoding UTF8 -Force
    Write-Host "Configured auto-update metadata (resources\app-update.yml)" -ForegroundColor DarkGray
}
catch {
    Write-Host "Notice: Could not write app-update.yml: $_" -ForegroundColor DarkGray
}

# 5. Find the executable
$ExeFile = Get-ChildItem $InstallDir -Filter "*.exe" | Where-Object { $_.Name -notlike "*unins*" } | Select-Object -First 1
if (-not $ExeFile) {
    Write-Host "Error: Could not find launcher executable in $InstallDir" -ForegroundColor Red
    exit 1
}

# 6. Create shortcuts (Desktop and Start Menu)
Write-Host "Creating shortcuts..." -ForegroundColor Yellow
try {
    $WshShell = New-Object -ComObject WScript.Shell
    
    # Desktop shortcut
    $DesktopShortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\HelloWorld Launcher.lnk")
    $DesktopShortcut.TargetPath = $ExeFile.FullName
    $DesktopShortcut.WorkingDirectory = $InstallDir
    $DesktopShortcut.Description = "HelloWorld Launcher - Minecraft Launcher"
    $DesktopShortcut.Save()
    
    # Start Menu shortcut
    $StartMenuDir = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
    if (Test-Path $StartMenuDir) {
        $StartShortcut = $WshShell.CreateShortcut("$StartMenuDir\HelloWorld Launcher.lnk")
        $StartShortcut.TargetPath = $ExeFile.FullName
        $StartShortcut.WorkingDirectory = $InstallDir
        $StartShortcut.Description = "HelloWorld Launcher - Minecraft Launcher"
        $StartShortcut.Save()
    }
    Write-Host "Shortcuts created successfully!" -ForegroundColor Green
}
catch {
    Write-Host "Warning: Could not create shortcuts: $_" -ForegroundColor Yellow
}

# 7. Clean up temp files
Remove-Item $TempDir -Recurse -Force

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Installation completed successfully!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "Location: $InstallDir" -ForegroundColor White
Write-Host "Executable: $($ExeFile.Name)" -ForegroundColor White
Write-Host "`nYou can now run the launcher from:" -ForegroundColor White
Write-Host "  - Desktop shortcut" -ForegroundColor Yellow
Write-Host "  - Start Menu search" -ForegroundColor Yellow
Write-Host "  - Direct path: $($ExeFile.FullName)" -ForegroundColor Yellow
Write-Host "`nNote: Make sure you have Java 17+ installed.`n" -ForegroundColor Cyan

# 8. Ask if user wants to launch
$Launch = Read-Host "Launch the launcher now? (Y/N)"
if ($Launch -eq "Y" -or $Launch -eq "y") {
    Start-Process $ExeFile.FullName
    Write-Host "Launcher started!" -ForegroundColor Green
}
