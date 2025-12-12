import webview
import requests
import json
import os
import time
import threading
from packaging import version
from datetime import datetime

# Configuración
TIMEOUT_INTERNET = 3
TIMEOUT_API = 5
VERSION_FILE = "version.json"


class UpdaterAPI:
    def __init__(self, window):
        self.window = window
        self.cancelled = False
        
    def cancel_download(self):
        """Cancela la descarga actual"""
        self.cancelled = True
        print("Descarga cancelada por el usuario")
        return True
    
    def retry_update(self):
        """Reinicia el proceso de actualización"""
        self.cancelled = False
        threading.Thread(target=check_and_update, args=(self.window,), daemon=True).start()
        return True
    
    def continue_anyway(self):
        """Continúa sin actualizar"""
        self.window.destroy()
        return True


def load_version_config():
    """Carga la configuración de versión desde version.json"""
    try:
        if os.path.exists(VERSION_FILE):
            with open(VERSION_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            # Crear archivo por defecto
            default_config = {
                "version": "1.0.0",
                "last_check": None,
                "update_channel": "stable",
                "repo_url": "https://api.github.com/repos/USUARIO/HelloWorld-Launcher"
            }
            save_version_config(default_config)
            return default_config
    except Exception as e:
        print(f"Error cargando version.json: {e}")
        return {
            "version": "1.0.0",
            "last_check": None,
            "update_channel": "stable",
            "repo_url": "https://api.github.com/repos/USUARIO/HelloWorld-Launcher"
        }


def save_version_config(config):
    """Guarda la configuración de versión"""
    try:
        with open(VERSION_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=4)
    except Exception as e:
        print(f"Error guardando version.json: {e}")


def check_internet(timeout=TIMEOUT_INTERNET):
    """Verifica si hay conexión a internet"""
    try:
        response = requests.get("https://api.github.com", timeout=timeout)
        return response.status_code == 200
    except:
        return False


def get_remote_version(repo_url, timeout=TIMEOUT_API):
    """Obtiene la versión más reciente desde GitHub"""
    try:
        response = requests.get(
            f"{repo_url}/releases/latest",
            timeout=timeout
        )
        if response.status_code == 200:
            data = response.json()
            remote_version = data["tag_name"].lstrip("v")
            download_url = None
            
            # Buscar el asset .exe o .zip
            for asset in data.get("assets", []):
                if asset["name"].endswith((".exe", ".zip")):
                    download_url = asset["browser_download_url"]
                    break
            
            return {
                "version": remote_version,
                "download_url": download_url,
                "release_notes": data.get("body", "")
            }
        return None
    except Exception as e:
        print(f"Error obteniendo versión remota: {e}")
        return None


def is_newer_version(remote_ver, local_ver):
    """Compara versiones usando semantic versioning"""
    try:
        return version.parse(remote_ver) > version.parse(local_ver)
    except:
        return False


def download_file_with_progress(url, filename, window, api):
    """Descarga un archivo mostrando progreso"""
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
                    
                    # Calcular progreso
                    percentage = int((downloaded / total_size) * 100) if total_size > 0 else 0
                    elapsed = time.time() - start_time
                    speed = (downloaded / (1024 * 1024)) / elapsed if elapsed > 0 else 0
                    downloaded_mb = downloaded / (1024 * 1024)
                    total_mb = total_size / (1024 * 1024)
                    
                    # Actualizar UI
                    window.evaluate_js(
                        f"window.updaterAPI.setDownloadProgress({percentage}, "
                        f"{downloaded_mb:.1f}, {total_mb:.1f}, {speed:.1f})"
                    )
        
        return True
    except Exception as e:
        print(f"Error descargando archivo: {e}")
        return False


def check_and_update(window):
    """Proceso principal de verificación y actualización"""
    config = load_version_config()
    local_version = config["version"]
    repo_url = config["repo_url"]
    
    # Mostrar versión actual
    window.evaluate_js(f"window.updaterAPI.setVersion('{local_version}')")
    
    # Estado: Verificando
    window.evaluate_js("window.updaterAPI.setState('checking')")
    time.sleep(1)  # Dar tiempo para que se vea la animación
    
    # Verificar internet
    if not check_internet():
        print("Sin conexión a internet")
        window.evaluate_js("window.updaterAPI.setState('no-internet')")
        time.sleep(2)
        window.destroy()
        return False
    
    # Obtener versión remota
    remote_data = get_remote_version(repo_url)
    
    if not remote_data or not remote_data["download_url"]:
        print("No se pudo obtener información de actualización")
        window.destroy()
        return False
    
    remote_version = remote_data["version"]
    
    # Comparar versiones
    if not is_newer_version(remote_version, local_version):
        print(f"Ya estás en la última versión ({local_version})")
        window.destroy()
        return False
    
    print(f"Nueva versión disponible: {remote_version} (actual: {local_version})")
    
    # Estado: Descargando
    window.evaluate_js("window.updaterAPI.setState('downloading')")
    window.evaluate_js(f"window.updaterAPI.setVersionUpdate('{local_version}', '{remote_version}')")
    
    # Descargar actualización
    api = window.get_elements('body')[0]  # Obtener referencia a la API
    download_success = download_file_with_progress(
        remote_data["download_url"],
        "update_temp.zip",
        window,
        window  # Pasar window como api para acceder a cancelled
    )
    
    if not download_success:
        print("Error en la descarga")
        window.evaluate_js("window.updaterAPI.setState('error')")
        window.evaluate_js("window.updaterAPI.setError('No se pudo descargar la actualización')")
        return False
    
    # Estado: Éxito
    window.evaluate_js("window.updaterAPI.setState('success')")
    window.evaluate_js(f"window.updaterAPI.setVersionUpdate('{local_version}', '{remote_version}')")
    
    # Actualizar version.json
    config["version"] = remote_version
    config["last_check"] = datetime.now().isoformat()
    save_version_config(config)
    
    time.sleep(2)
    
    # TODO: Aplicar actualización (extraer zip, reemplazar archivos, reiniciar)
    # Por ahora solo descargamos y mostramos éxito
    
    window.destroy()
    return True


def run_updater_check():
    """
    Función principal que ejecuta el updater.
    Retorna True si se debe reiniciar el launcher, False si continuar normalmente.
    """
    # Cargar configuración
    config = load_version_config()
    
    # Verificar internet rápidamente
    if not check_internet(timeout=2):
        print("Sin internet, saltando actualización")
        return False
    
    # Crear ventana del updater
    html_path = os.path.join(os.path.dirname(__file__), "ui", "updater.html")
    
    if not os.path.exists(html_path):
        print(f"No se encontró updater.html en {html_path}")
        return False
    
    # Crear ventana
    window = webview.create_window(
        'HelloWorld Launcher - Actualizador',
        html_path,
        width=500,
        height=600,
        resizable=False,
        frameless=True,
        easy_drag=True
    )
    
    # Crear API
    api = UpdaterAPI(window)
    window.expose(api)
    
    # Iniciar proceso de actualización en thread separado
    def start_update():
        # Esperar a que la ventana esté lista
        while not window.loaded:
            time.sleep(0.1)
        
        # Iniciar verificación
        check_and_update(window)
    
    threading.Thread(target=start_update, daemon=True).start()
    
    # Mostrar ventana (bloqueante)
    webview.start()
    
    return False  # Por ahora siempre continuar


if __name__ == "__main__":
    # Prueba standalone
    run_updater_check()
