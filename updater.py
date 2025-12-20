import webview
import requests
import json
import os
import sys
import time
import threading
from packaging import version
from datetime import datetime

# Configuración
TIMEOUT_INTERNET = 5
TIMEOUT_API = 5
VERSION_FILE = "version.json"


class UpdaterAPI:
    def __init__(self):
        self.cancelled = False
        self.update_applied = False
        
    def cancel_download(self):
        """Cancels the current download"""
        self.cancelled = True
        print("Download cancelled by user")
        return True
    
    def retry_update(self):
        """Restarts the update process"""
        self.cancelled = False
        if webview.windows:
            threading.Thread(target=check_and_update, args=(webview.windows[0], self), daemon=True).start()
        return True
    
    def continue_anyway(self):
        """Continues without updating"""
        if webview.windows:
            webview.windows[0].destroy()
        return True


def load_version_config():
    """Loads version configuration from version.json"""
    try:
        if os.path.exists(VERSION_FILE):
            with open(VERSION_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            # Create default file
            default_config = {
                "version": "0.1.0",
                "last_check": None,
                "update_channel": "stable",
                "repo_url": "https://api.github.com/repos/Abeloskyyy/HelloWorld-Launcher"
            }
            save_version_config(default_config)
            return default_config
    except Exception as e:
        print(f"Error loading version.json: {e}")
        return {
            "version": "0.1.0",
            "last_check": None,
            "update_channel": "stable",
            "repo_url": "https://api.github.com/repos/Abeloskyyy/HelloWorld-Launcher"
        }


def save_version_config(config):
    """Saves the version configuration"""
    try:
        with open(VERSION_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=4)
    except Exception as e:
        print(f"Error saving version.json: {e}")


def check_internet(timeout=TIMEOUT_INTERNET):
    """Verifies if there is an internet connection"""
    try:
        response = requests.get("https://api.github.com", timeout=timeout)
        return response.status_code == 200
    except Exception as e:
        print(f"Internet check failed: {e}")
        return False


def get_remote_version(repo_url, timeout=TIMEOUT_API):
    """Retrieves the most recent version from GitHub"""
    try:
        response = requests.get(
            f"{repo_url}/releases/latest",
            timeout=timeout
        )
        if response.status_code == 200:
            data = response.json()
            remote_version = data["tag_name"].lstrip("v")
            download_url = None
            
            # Find the .exe asset
            for asset in data.get("assets", []):
                if asset["name"].endswith(".exe"):
                    download_url = asset["browser_download_url"]
                    break
            
            return {
                "version": remote_version,
                "download_url": download_url,
                "release_notes": data.get("body", "")
            }
        return None
    except Exception as e:
        print(f"Error getting remote version: {e}")
        return None


def is_newer_version(remote_ver, local_ver):
    """Compares versions using semantic versioning"""
    try:
        return version.parse(remote_ver) > version.parse(local_ver)
    except Exception as e:
        print(f"Version comparison error: {e}")
        return False


def download_file_with_progress(url, filename, window, api):
    """Downloads a file showing progress"""
    try:
        response = requests.get(url, stream=True, timeout=30)
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        start_time = time.time()
        
        with open(filename, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if api.cancelled:
                    f.close()
                    os.remove(filename)
                    return False
                
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    
                    # Calculate progress
                    percentage = int((downloaded / total_size) * 100) if total_size > 0 else 0
                    elapsed = time.time() - start_time
                    speed = (downloaded / (1024 * 1024)) / elapsed if elapsed > 0 else 0
                    downloaded_mb = downloaded / (1024 * 1024)
                    total_mb = total_size / (1024 * 1024)
                    
                    # Update UI
                    window.evaluate_js(
                        f"window.updaterAPI.setDownloadProgress({percentage}, "
                        f"{downloaded_mb:.1f}, {total_mb:.1f}, {speed:.1f})"
                    )
        
        return True
    except Exception as e:
        print(f"Error downloading file: {e}")
        return False


def check_and_update(window, api):
    """Main verification and update process"""
    config = load_version_config()
    local_version = config["version"]
    repo_url = config["repo_url"]
    
    # Show current version
    window.evaluate_js(f"window.updaterAPI.setVersion('{local_version}')")
    
    # State: Checking
    window.evaluate_js("window.updaterAPI.setState('checking')")
    time.sleep(1)  # Give time for animation to be seen
    
    # Check internet
    if not check_internet():
        print("No internet connection")
        window.evaluate_js("window.updaterAPI.setState('no-internet')")
        time.sleep(2)
        window.destroy()
        return False
    
    # Get remote version
    remote_data = get_remote_version(repo_url)
    
    if not remote_data or not remote_data["download_url"]:
        print("Could not retrieve update information")
        window.destroy()
        return False
    
    remote_version = remote_data["version"]
    
    # Compare versions
    if not is_newer_version(remote_version, local_version):
        print(f"You are already on the latest version ({local_version})")
        window.destroy()
        return False
    
    print(f"New version available: {remote_version} (current: {local_version})")
    
    # State: Downloading
    window.evaluate_js("window.updaterAPI.setState('downloading')")
    window.evaluate_js(f"window.updaterAPI.setVersionUpdate('{local_version}', '{remote_version}')")
    
    # Use the same directory as the executable for the temporary file
    if getattr(sys, 'frozen', False):
        exec_dir = os.path.dirname(sys.executable)
    else:
        exec_dir = os.getcwd()
    
    update_temp_path = os.path.normpath(os.path.join(exec_dir, "update_temp.exe"))

    # Download update
    download_success = download_file_with_progress(
        remote_data["download_url"],
        update_temp_path,
        window,
        api
    )
    
    if not download_success:
        print("Download error")
        window.evaluate_js("window.updaterAPI.setState('error')")
        window.evaluate_js("window.updaterAPI.setError('Could not download update')")
        return False
    
    # State: Success
    window.evaluate_js("window.updaterAPI.setState('success')")
    window.evaluate_js(f"window.updaterAPI.setVersionUpdate('{local_version}', '{remote_version}')")
    
    # Update version.json
    config["version"] = remote_version
    config["last_check"] = datetime.now().isoformat()
    save_version_config(config)
    
    time.sleep(2)
    
    # Apply update
    try:
        api.update_applied = True
        apply_update(update_temp_path, remote_version)
    except Exception as e:
        print(f"Error applying update: {e}")
    
    # Schedule window close in separate thread
    def close_window():
        time.sleep(1)
        try:
            window.destroy()
        except:
            pass
    
    threading.Thread(target=close_window, daemon=True).start()
    
    return True


def apply_update(downloaded_file, remote_version):
    """
    Applies the downloaded update (.exe only).
    """
    import shutil
    import sys
    import subprocess
    
    # Obtener ruta del ejecutable actual
    if getattr(sys, 'frozen', False):
        # Running as packaged .exe
        current_exe = sys.executable
    else:
        # Running as Python script (development mode)
        print("Development mode detected, update will not be applied")
        return
    
    current_dir = os.path.dirname(current_exe)
    
    # Direct .exe
    new_exe = os.path.abspath(downloaded_file)
    extract_dir = None
    
    # Determine name of new executable
    # If the user wants to have the version in the name:
    # Example: HelloWorldLauncher_v1.0.0.exe
    # Use the base name of current exe but with new version
    
    base_name = os.path.splitext(os.path.basename(current_exe))[0]
    # If current name already has version (ex: Launcher_v1.0), attempt to clean it
    if "_v" in base_name:
        base_name = base_name.split("_v")[0]
        
    target_name = f"{base_name}_v{remote_version}.exe"
    target_path = os.path.abspath(os.path.join(current_dir, target_name))
    
    # Normalizar para comparación
    current_exe_norm = os.path.normpath(current_exe).lower()
    target_path_norm = os.path.normpath(target_path).lower()
    
    # Create update script (batch file for Windows, sh for Linux)
    if sys.platform.startswith('win'):
        update_script = os.path.join(current_dir, "update.bat")
        
        with open(update_script, 'w') as f:
            f.write('@echo off\n')
            f.write('echo Applying update...\n')
            f.write('timeout /t 3 /nobreak >nul\n')  # Wait 3 seconds to ensure exit starts
            
            # 1. Rename the current EXE so we can free up its name immediately
            # Rename in Windows works even if the file is in use!
            f.write(f'move /y "{current_exe}" "{current_exe}.old" >nul 2>&1\n')
            
            # 2. Move/Rename the new update to the target name
            f.write(f'move /y "{new_exe}" "{target_path}"\n')
            
            # 3. Restart launcher (the new one)
            f.write(f'start "" "{target_path}"\n')
            
            # 4. Wait a few more seconds to ensure the old process finally died, then clean up
            f.write('timeout /t 5 /nobreak >nul\n')
            f.write(f'del /f /q "{current_exe}.old" >nul 2>&1\n')
            f.write(f'del "%~f0" >nul 2>&1\n')
        
        # Execute script and close current launcher
        subprocess.Popen(['cmd', '/c', update_script], 
                        cwd=current_dir,
                        creationflags=subprocess.CREATE_NO_WINDOW)
                        
    else:
        # Linux / MacOS
        update_script = os.path.join(current_dir, "update.sh")
        
        with open(update_script, 'w') as f:
            f.write('#!/bin/sh\n')
            f.write('echo "Applying update..."\n')
            f.write('sleep 2\n')
            f.write(f'mv -f "{new_exe}" "{current_exe}"\n')
            f.write(f'chmod +x "{current_exe}"\n')
            

            f.write(f'rm -f "{downloaded_file}"\n')
            f.write(f'rm -f "{update_script}"\n')
            
            # Restart launcher
            f.write(f'./"{os.path.basename(current_exe)}" &\n')
        
        # Give execution permissions to the script
        os.chmod(update_script, 0o755)
        
        # Execute
        subprocess.Popen(['/bin/sh', update_script])

    # DO NOT use sys.exit here, let the updater close normally
    print("Update scheduled")


def run_updater_check():
    """
    Main function that runs the updater.
    Returns True if the launcher should restart, False otherwise.
    """
    # Load configuration
    config = load_version_config()
    
    # Quickly check internet
    if not check_internet(timeout=2):
        print("No internet, skipping update")
        return False
    
    # Create updater window
    html_path = os.path.join(os.path.dirname(__file__), "ui", "updater.html")
    
    if not os.path.exists(html_path):
        print(f"updater.html not found in {html_path}")
        return False
    
    # Create API
    api = UpdaterAPI()
    
    # Get screen dimensions using tkinter
    import tkinter as tk
    root = tk.Tk()
    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()
    root.destroy()  # Close temporary tkinter window
    
    # Dimensions of the updater window
    window_width = 920
    window_height = 550
    
    # Calculate centered position
    x = (screen_width - window_width) // 2
    y = (screen_height - window_height) // 2
    
    # Create window with exposed API
    window = webview.create_window(
        'HelloWorld Launcher - Updater',
        html_path,
        width=window_width,
        height=window_height,
        resizable=False,
        frameless=True,
        easy_drag=True,
        x=x,
        y=y,
        on_top=True,  # Appear above the splash
        js_api=api  # Expose API using js_api parameter
    )
    
    # API is already set in js_api parameter
    
    # Start update process when window is ready
    def start_update():
        # Start verification
        check_and_update(window, api)
    
    # Use shown event instead of polling window.loaded
    window.events.shown += start_update
    
    # Show window (blocking)
    webview.start()
    
    return api.update_applied


if __name__ == "__main__":
    # Standalone test
    run_updater_check()
