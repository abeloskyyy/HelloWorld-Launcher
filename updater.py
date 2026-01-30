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


def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))

    return os.path.join(base_path, relative_path)


class UpdaterAPI:
    def __init__(self):
        self.cancelled = False
        self.update_applied = False
        self.exit_after = False
        
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

    def open_download_page(self):
        """Opens the GitHub releases page in the browser"""
        import webbrowser
        config = load_version_config()
        # Open the general releases page as it identifies the latest version best
        url = config["repo_url"].replace("api.github.com/repos", "github.com") + "/releases/latest"
        webbrowser.open(url)
        # Usually when updating, you want to close the old app
        self.exit_after = True
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
            # Try to load from bundled resources (PyInstaller)
            bundled_path = resource_path(VERSION_FILE)
            if os.path.exists(bundled_path) and os.path.abspath(bundled_path) != os.path.abspath(VERSION_FILE):
                try:
                    with open(bundled_path, 'r', encoding='utf-8') as f:
                        config = json.load(f)
                    # Save it to the local directory so it can be updated later
                    save_version_config(config)
                    return config
                except Exception as e:
                    print(f"Error reading bundled version.json: {e}")

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
    
    # State: Update Available
    window.evaluate_js("window.updaterAPI.setState('available')")
    window.evaluate_js(f"window.updaterAPI.setAvailableVersion('{local_version}', '{remote_version}')")
    
    return True


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
    
    # Start update process when window is ready
    def start_update():
        # Bind buttons for the Available state
        window.evaluate_js("window.updaterAPI.onDownloadUpdate(() => window.pywebview.api.open_download_page())")
        
        # Start verification
        check_and_update(window, api)
    
    # Use shown event instead of polling window.loaded
    window.events.shown += start_update
    
    # Show window (blocking)
    webview.start()
    
    return api.exit_after


if __name__ == "__main__":
    # Standalone test
    run_updater_check()
