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

# Create temp directory
if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Get latest release info
Write-Host "Fetching latest release..." -ForegroundColor Yellow
try {
    $ReleaseUrl = "https://api.github.com/repos/$RepoOwner/$RepoName/releases/latest"
    $ReleaseInfo = Invoke-RestMethod -Uri $ReleaseUrl -UseBasicParsing
    $Version = $ReleaseInfo.tag_name
    
    # Determine the system architecture (default to x64 if not ARM64)
    $Arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x64" }
    
    # First try to find a portable zip matching the architecture
    $Asset = $ReleaseInfo.assets | Where-Object { $_.name -like "*.zip" -and $_.name -like "*portable*" -and $_.name -like "*$Arch*" } | Select-Object -First 1
    
    # Next try to find any zip matching the architecture
    if (-not $Asset) {
        $Asset = $ReleaseInfo.assets | Where-Object { $_.name -like "*.zip" -and $_.name -like "*$Arch*" } | Select-Object -First 1
    }
    
    # Fallback to any portable zip
    if (-not $Asset) {
        $Asset = $ReleaseInfo.assets | Where-Object { $_.name -like "*.zip" -and $_.name -like "*portable*" } | Select-Object -First 1
    }
    
    # Fallback to any zip
    if (-not $Asset) {
        $Asset = $ReleaseInfo.assets | Where-Object { $_.name -like "*.zip" } | Select-Object -First 1
    }
    
    if (-not $Asset) {
        throw "No portable zip found in release"
    }
    
    $DownloadUrl = $Asset.browser_download_url
    $FileName = $Asset.name
    Write-Host "Found version: $Version" -ForegroundColor Green
    Write-Host "Downloading: $FileName" -ForegroundColor Yellow
}
catch {
    Write-Host "Error fetching release info: $_" -ForegroundColor Red
    exit 1
}

# Download the zip
try {
    $ZipPath = Join-Path $TempDir $FileName
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ZipPath -UseBasicParsing
    Write-Host "Download completed!" -ForegroundColor Green
}
catch {
    Write-Host "Error downloading file: $_" -ForegroundColor Red
    exit 1
}

# Extract to install directory
Write-Host "Extracting files..." -ForegroundColor Yellow
try {
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

# Find the executable
$ExeFile = Get-ChildItem $InstallDir -Filter "*.exe" | Where-Object { $_.Name -notlike "*unins*" } | Select-Object -First 1
if (-not $ExeFile) {
    Write-Host "Error: Could not find launcher executable" -ForegroundColor Red
    exit 1
}

# Create desktop shortcut
Write-Host "Creating desktop shortcut..." -ForegroundColor Yellow
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\HelloWorld Launcher.lnk")
    $Shortcut.TargetPath = $ExeFile.FullName
    $Shortcut.WorkingDirectory = $InstallDir
    $Shortcut.Description = "HelloWorld Launcher - Minecraft Launcher"
    $Shortcut.Save()
    Write-Host "Shortcut created!" -ForegroundColor Green
}
catch {
    Write-Host "Warning: Could not create desktop shortcut: $_" -ForegroundColor Yellow
}

# Clean up temp files
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

# Ask if user wants to launch
$Launch = Read-Host "Launch the launcher now? (Y/N)"
if ($Launch -eq "Y" -or $Launch -eq "y") {
    Start-Process $ExeFile.FullName
    Write-Host "Launcher started!" -ForegroundColor Green
}
