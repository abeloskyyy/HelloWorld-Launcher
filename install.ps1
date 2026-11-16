# HelloWorld Launcher - PowerShell Installer
# Usage: iwr -useb https://raw.githubusercontent.com/Abeloskyyy/HelloWorld-Launcher/main/install.ps1 | iex

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  HelloWorld Launcher Installer" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Configuration (exact same paths as Setup)
$RepoOwner = "Abeloskyyy"
$RepoName = "HelloWorld-Launcher"
$AppName = "HelloWorld-Launcher"
$DisplayName = "HelloWorld Launcher"
$InstallDir = Join-Path $env:LOCALAPPDATA $AppName
$ConfigDir = Join-Path $env:APPDATA $AppName
$StateFile = Join-Path $ConfigDir "installer-state.json"
$TempDir = Join-Path $env:TEMP "HWLauncher-Install"
$GistUrl = "https://gist.githubusercontent.com/abeloskyyy/b50089b634ed09f48c921f9c8126a49f/raw/hwlauncher-info.json"

function Compare-SemVer {
    param([string]$A, [string]$B)
    $pa = ($A -replace '^[vV]', '').Split('.') | ForEach-Object { $n = 0; [void][int]::TryParse($_, [ref]$n); $n }
    $pb = ($B -replace '^[vV]', '').Split('.') | ForEach-Object { $n = 0; [void][int]::TryParse($_, [ref]$n); $n }
    for ($i = 0; $i -lt 3; $i++) {
        $va = if ($i -lt $pa.Count) { $pa[$i] } else { 0 }
        $vb = if ($i -lt $pb.Count) { $pb[$i] } else { 0 }
        if ($va -gt $vb) { return 1 }
        if ($va -lt $vb) { return -1 }
    }
    return 0
}

# Create temp directory
if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $TempDir | Out-Null

# 1. Resolve latest release from Gist + GitHub Releases API (prefer newest SemVer)
Write-Host "Fetching latest release info..." -ForegroundColor Yellow
$GistVersion = ""
$GistLauncherUrl = ""
$GistSetupUrl = ""

try {
    $GistTimestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $Config = Invoke-RestMethod -Uri "${GistUrl}?t=${GistTimestamp}" -UseBasicParsing
    if ($Config -and $Config.changelog) {
        $GistVersion = ($Config.changelog.latestVersion -replace '^[vV]', '')
        $Release = $Config.changelog.versions | Where-Object { $_.version -eq $GistVersion } | Select-Object -First 1
        if (-not $Release -and $Config.changelog.versions.Count -gt 0) {
            $Release = $Config.changelog.versions[0]
            $GistVersion = ($Release.version -replace '^[vV]', '')
        }
        if ($Release -and $Release.downloads -and $Release.downloads.windows) {
            $GistLauncherUrl = $Release.downloads.windows.zip
            $GistSetupUrl = $Release.downloads.windows.setup
        }
    }
}
catch {
    Write-Host "Notice: Could not fetch from Gist, checking GitHub API..." -ForegroundColor DarkGray
}

$GhVersion = ""
$GhLauncherUrl = ""
$GhSetupUrl = ""

try {
    $ReleaseUrl = "https://api.github.com/repos/$RepoOwner/$RepoName/releases/latest"
    $ReleaseInfo = Invoke-RestMethod -Uri $ReleaseUrl -UseBasicParsing
    if ($ReleaseInfo) {
        $GhVersion = ($ReleaseInfo.tag_name -replace '^[vV]', '')
        $ZipAsset = $ReleaseInfo.assets | Where-Object { $_.name -like "*.zip" -and $_.name -like "*win*" } | Select-Object -First 1
        if (-not $ZipAsset) {
            $ZipAsset = $ReleaseInfo.assets | Where-Object { $_.name -like "*.zip" -and $_.name -notlike "*mac*" -and $_.name -notlike "*linux*" } | Select-Object -First 1
        }
        if ($ZipAsset) { $GhLauncherUrl = $ZipAsset.browser_download_url }

        $SetupAsset = $ReleaseInfo.assets | Where-Object { $_.name -like "*Setup*.exe" } | Select-Object -First 1
        if (-not $SetupAsset) {
            $SetupAsset = $ReleaseInfo.assets | Where-Object { $_.name -like "*.exe" } | Select-Object -First 1
        }
        if ($SetupAsset) { $GhSetupUrl = $SetupAsset.browser_download_url }
    }
}
catch {
    if (-not $GistLauncherUrl) {
        Write-Host "Error fetching release info: $_" -ForegroundColor Red
        exit 1
    }
}

$UseGithub = $false
if ($GhLauncherUrl -and ((-not $GistLauncherUrl) -or ((Compare-SemVer $GhVersion $GistVersion) -gt 0))) {
    $UseGithub = $true
}

if ($UseGithub) {
    $Version = if ($GhVersion) { $GhVersion } else { $GistVersion }
    $DownloadUrl = $GhLauncherUrl
    $SetupUrl = if ($GhSetupUrl) { $GhSetupUrl } else { $GistSetupUrl }
} else {
    $Version = if ($GistVersion) { $GistVersion } else { $GhVersion }
    $DownloadUrl = if ($GistLauncherUrl) { $GistLauncherUrl } else { $GhLauncherUrl }
    $SetupUrl = if ($GistSetupUrl) { $GistSetupUrl } else { $GhSetupUrl }
}

if (-not $DownloadUrl) {
    Write-Host "Error: Could not resolve download URL for HelloWorld Launcher." -ForegroundColor Red
    exit 1
}

$FileName = Split-Path -Leaf ($DownloadUrl.Split('?')[0])
if (-not $FileName.Contains(".")) {
    $FileName = "helloworld-launcher-win.zip"
}

Write-Host "Found version: v$Version" -ForegroundColor Green
Write-Host "Downloading: $FileName" -ForegroundColor Yellow

# 2. Download launcher archive
$ZipPath = Join-Path $TempDir $FileName
try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ZipPath -UseBasicParsing
    Write-Host "Download completed!" -ForegroundColor Green
}
catch {
    Write-Host "Error downloading file: $_" -ForegroundColor Red
    exit 1
}

# 3. Stop running launcher if open (same as Setup killLauncher)
Get-Process -Name "HelloWorld-Launcher", "helloworld-launcher" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 1000

# 4. Extract to install directory (fast tar.exe path when available, Expand-Archive fallback)
Write-Host "Extracting files to $InstallDir..." -ForegroundColor Yellow
try {
    if ($ZipPath.EndsWith(".exe", [System.StringComparison]::OrdinalIgnoreCase)) {
        Write-Host "Launching installer..." -ForegroundColor Yellow
        Start-Process $ZipPath -Wait
        Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Installation completed!" -ForegroundColor Green
        exit 0
    }

    if (Test-Path $InstallDir) {
        Write-Host "Removing old installation..." -ForegroundColor Yellow
        Remove-Item $InstallDir -Recurse -Force
    }

    New-Item -ItemType Directory -Path $InstallDir | Out-Null
    $TarCmd = Get-Command tar.exe -ErrorAction SilentlyContinue
    if ($TarCmd) {
        & $TarCmd.Source -xf $ZipPath -C $InstallDir
        if ($LASTEXITCODE -ne 0) {
            Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force
        }
    } else {
        Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force
    }
    Write-Host "Extraction completed!" -ForegroundColor Green
}
catch {
    Write-Host "Error extracting files: $_" -ForegroundColor Red
    exit 1
}

# 5. Download setup.exe into install directory for seamless in-app updates & Add/Remove Programs uninstall
$SetupDest = Join-Path $InstallDir "setup.exe"
if ($SetupUrl) {
    Write-Host "Installing local updater (setup.exe)..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $SetupUrl -OutFile $SetupDest -UseBasicParsing
    }
    catch {
        Write-Host "Notice: Could not download setup.exe: $_" -ForegroundColor DarkGray
    }
}

# 6. Ensure resources\app-update.yml exists for autoUpdater compatibility
try {
    $ResourcesDir = Join-Path $InstallDir "resources"
    if (-not (Test-Path $ResourcesDir)) {
        New-Item -ItemType Directory -Path $ResourcesDir -Force | Out-Null
    }
    $AppUpdatePath = Join-Path $ResourcesDir "app-update.yml"
    $AppUpdateContent = "owner: $RepoOwner`nrepo: $RepoName`nprovider: github`n"
    Set-Content -Path $AppUpdatePath -Value $AppUpdateContent -Encoding UTF8 -Force
}
catch {
    Write-Host "Notice: Could not write app-update.yml: $_" -ForegroundColor DarkGray
}

# 7. Find the main launcher executable
$ExeFile = Get-ChildItem $InstallDir -Filter "*.exe" | Where-Object { $_.Name -notlike "*unins*" -and $_.Name -notlike "*setup*" } | Select-Object -First 1
if (-not $ExeFile) {
    Write-Host "Error: Could not find launcher executable in $InstallDir" -ForegroundColor Red
    exit 1
}

# 8. Create shortcuts (Desktop and Start Menu, matching installer/src/shortcuts.js)
Write-Host "Creating shortcuts..." -ForegroundColor Yellow
try {
    $WshShell = New-Object -ComObject WScript.Shell

    # Desktop shortcut
    $DesktopShortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\HelloWorld Launcher.lnk")
    $DesktopShortcut.TargetPath = $ExeFile.FullName
    $DesktopShortcut.WorkingDirectory = $InstallDir
    $DesktopShortcut.Description = "HelloWorld Launcher - Play Minecraft for free"
    $DesktopShortcut.IconLocation = $ExeFile.FullName
    $DesktopShortcut.Save()

    # Start Menu shortcut
    $StartMenuDir = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
    if (Test-Path $StartMenuDir) {
        $StartShortcut = $WshShell.CreateShortcut("$StartMenuDir\HelloWorld Launcher.lnk")
        $StartShortcut.TargetPath = $ExeFile.FullName
        $StartShortcut.WorkingDirectory = $InstallDir
        $StartShortcut.Description = "HelloWorld Launcher - Play Minecraft for free"
        $StartShortcut.IconLocation = $ExeFile.FullName
        $StartShortcut.Save()
    }
    Write-Host "Shortcuts created successfully!" -ForegroundColor Green
}
catch {
    Write-Host "Warning: Could not create shortcuts: $_" -ForegroundColor Yellow
}

# 9. Register installation in Windows Registry & installer-state.json (matching installer/src/paths.js)
Write-Host "Registering installation..." -ForegroundColor Yellow
try {
    $AppRegPath = "HKCU:\Software\$AppName"
    New-Item -Path $AppRegPath -Force | Out-Null
    Set-ItemProperty -Path $AppRegPath -Name "InstallPath" -Value $InstallDir
    Set-ItemProperty -Path $AppRegPath -Name "Version" -Value $Version
    Set-ItemProperty -Path $AppRegPath -Name "InstallerPath" -Value $SetupDest

    $UninstallRegPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$AppName"
    New-Item -Path $UninstallRegPath -Force | Out-Null
    Set-ItemProperty -Path $UninstallRegPath -Name "DisplayName" -Value $DisplayName
    Set-ItemProperty -Path $UninstallRegPath -Name "UninstallString" -Value "`"$SetupDest`" uninstall"
    Set-ItemProperty -Path $UninstallRegPath -Name "InstallLocation" -Value $InstallDir
    Set-ItemProperty -Path $UninstallRegPath -Name "DisplayVersion" -Value $Version
    Set-ItemProperty -Path $UninstallRegPath -Name "Publisher" -Value "Abelosky"
    Set-ItemProperty -Path $UninstallRegPath -Name "URLInfoAbout" -Value "https://github.com/$RepoOwner/$RepoName"
    Set-ItemProperty -Path $UninstallRegPath -Name "NoModify" -Value 1 -Type DWord
    Set-ItemProperty -Path $UninstallRegPath -Name "NoRepair" -Value 1 -Type DWord

    if (-not (Test-Path $ConfigDir)) {
        New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
    }
    $StateObj = @{
        installPath   = $InstallDir
        version       = $Version
        installerPath = $SetupDest
        updatedAt     = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    }
    $StateObj | ConvertTo-Json | Set-Content -Path $StateFile -Encoding UTF8 -Force
}
catch {
    Write-Host "Warning: Could not register installation state: $_" -ForegroundColor Yellow
}

# 10. Clean up temp files
Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue

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

# 11. Ask if user wants to launch
$Launch = Read-Host "Launch the launcher now? (Y/N)"
if ($Launch -eq "Y" -or $Launch -eq "y") {
    Start-Process $ExeFile.FullName
    Write-Host "Launcher started!" -ForegroundColor Green
}
