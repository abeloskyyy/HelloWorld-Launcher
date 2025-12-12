import webview
import requests
import json
import os
import time
import threading
from packaging import version
from datetime import datetime

# Configuración
TIMEOUT_INTERNET = 5
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
        threading.Thread(target=check_and_update, args=(self.window, self), daemon=True).start()
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
                "version": "0.1.0",
                "last_check": None,
                "update_channel": "stable",
                "repo_url": "https://api.github.com/repos/Abeloskyyy/HelloWorld-Launcher"
            }
            save_version_config(default_config)
            return default_config
    except Exception as e:
        print(f"Error cargando version.json: {e}")
        return {
            "version": "0.1.0",
            "last_check": None,
            "update_channel": "stable",
            "repo_url": "https://api.github.com/repos/Abeloskyyy/HelloWorld-Launcher"
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
    except Exception as e:
        print(f"Internet check failed: {e}")
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
    except Exception as e:
        print(f"Version comparison error: {e}")
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


def check_and_update(window, api):
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
    download_success = download_file_with_progress(
        remote_data["download_url"],
        "update_temp.zip",
        window,
        api  # Pasar la API correctamente
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
    
    # Aplicar actualización
    try:
        apply_update("update_temp.zip", remote_data["download_url"])
    except Exception as e:
        print(f"Error aplicando actualización: {e}")
    
    # Programar cierre de ventana en un thread separado
    def close_window():
        time.sleep(1)
        try:
            window.destroy()
        except:
            pass
    
    threading.Thread(target=close_window, daemon=True).start()
    
    return True


def apply_update(downloaded_file, download_url):
    """
    Aplica la actualización descargada.
    Soporta archivos .zip y .exe
    """
    import zipfile
    import shutil
    import sys
    import subprocess
    
    # Determinar si es .zip o .exe por la URL o nombre
    is_zip = downloaded_file.endswith('.zip') or download_url.endswith('.zip')
    
    # Obtener ruta del ejecutable actual
    if getattr(sys, 'frozen', False):
        # Ejecutando como .exe empaquetado
        current_exe = sys.executable
    else:
        # Ejecutando como script Python (modo desarrollo)
        print("Modo desarrollo detectado, no se aplicará actualización")
        return
    
    current_dir = os.path.dirname(current_exe)
    exe_name = os.path.basename(current_exe)
    
    if is_zip:
        # Extraer el .zip
        extract_dir = os.path.join(current_dir, "update_temp")
        
        try:
            # Crear directorio temporal
            if os.path.exists(extract_dir):
                shutil.rmtree(extract_dir)
            os.makedirs(extract_dir)
            
            # Extraer contenido
            with zipfile.ZipFile(downloaded_file, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            
            # Buscar el nuevo .exe en el directorio extraído
            new_exe = None
            for root, dirs, files in os.walk(extract_dir):
                for file in files:
                    if file.endswith('.exe'):
                        new_exe = os.path.join(root, file)
                        break
                if new_exe:
                    break
            
            if not new_exe:
                raise Exception("No se encontró .exe en el archivo descargado")
            
        except Exception as e:
            print(f"Error extrayendo actualización: {e}")
            raise
    else:
        # Es un .exe directo
        new_exe = downloaded_file
        extract_dir = None
    
    # Crear script de actualización (batch file para Windows)
    update_script = os.path.join(current_dir, "update.bat")
    
    with open(update_script, 'w') as f:
        f.write('@echo off\n')
        f.write('echo Aplicando actualizacion...\n')
        f.write('timeout /t 2 /nobreak >nul\n')  # Esperar 2 segundos
        f.write(f'move /y "{new_exe}" "{current_exe}"\n')  # Reemplazar ejecutable
        
        # Limpiar archivos temporales
        if is_zip and extract_dir:
            f.write(f'rmdir /s /q "{extract_dir}"\n')
        f.write(f'del "{downloaded_file}"\n')
        f.write(f'del "%~f0"\n')  # Eliminar el propio script
        
        # Reiniciar el launcher
        f.write(f'start "" "{current_exe}"\n')
    
    # Ejecutar el script y cerrar el launcher actual
    subprocess.Popen(['cmd', '/c', update_script], 
                     creationflags=subprocess.CREATE_NO_WINDOW)
    
    # NO hacer sys.exit aquí, dejar que el updater se cierre normalmente
    print("Actualización programada")


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
    
    # Crear API
    api = UpdaterAPI(None)  # Window will be set after creation
    
    # Obtener dimensiones de pantalla usando tkinter
    import tkinter as tk
    root = tk.Tk()
    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()
    root.destroy()  # Cerrar la ventana temporal de tkinter
    
    # Dimensiones de la ventana del updater
    window_width = 920
    window_height = 550
    
    # Calcular posición centrada
    x = (screen_width - window_width) // 2
    y = (screen_height - window_height) // 2
    
    # Crear ventana con API expuesta
    window = webview.create_window(
        'HelloWorld Launcher - Actualizador',
        html_path,
        width=window_width,
        height=window_height,
        resizable=False,
        frameless=True,
        easy_drag=True,
        x=x,
        y=y,
        on_top=True,  # Aparecer por encima del splash
        js_api=api  # Exponer API usando js_api parameter
    )
    
    # Actualizar referencia a window en API
    api.window = window
    
    # Iniciar proceso de actualización cuando la ventana esté lista
    def start_update():
        # Iniciar verificación
        check_and_update(window, api)
    
    # Usar evento shown en lugar de polling window.loaded
    window.events.shown += start_update
    
    # Mostrar ventana (bloqueante)
    webview.start()
    
    return False  # Por ahora siempre continuar


if __name__ == "__main__":
    # Prueba standalone
    run_updater_check()
