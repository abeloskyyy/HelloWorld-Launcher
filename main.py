import webview
import minecraft_launcher_lib as mll
import messagebox
import uuid
import subprocess
import json
import os
import shutil
import base64
import io
import threading
import time
import psutil
import pygetwindow as gw
from PIL import Image
from datetime import datetime



"""
- actualizador
- reseñas
- microsoft login



"""





# ============================================
# SPLASH SCREEN - Native Tkinter (INSTANT startup)
# ============================================
import tkinter as tk
from PIL import Image, ImageTk

# Global splash window reference
splash_window = None
splash_thread = None

def create_splash():
    global splash_window
    
    splash_window = tk.Tk()
    splash_window.title("HelloWorld Launcher")
    splash_window.overrideredirect(True)  # Borderless
    
    # Make window transparent
    splash_window.attributes('-alpha', 1.0)  # Window opacity
    splash_window.attributes('-transparentcolor', '#1a1a2e')  # Make this color transparent
    
    # Get screen dimensions
    screen_width = splash_window.winfo_screenwidth()
    screen_height = splash_window.winfo_screenheight()
    
    # Splash size (just for the image)
    splash_width = 820
    splash_height = 460
    
    # Center position
    x = (screen_width - splash_width) // 2
    y = (screen_height - splash_height) // 2
    
    splash_window.geometry(f"{splash_width}x{splash_height}+{x}+{y}")
    
    # Background color (will be transparent)
    splash_window.configure(bg="#1a1a2e")
    
    # Load and display icon
    try:
        icon_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "img", "splash.png")
        img = Image.open(icon_path)
        
        # Resize to fit window
        img = img.resize((splash_width, splash_height), Image.Resampling.LANCZOS)
        photo = ImageTk.PhotoImage(img)
        
        label = tk.Label(splash_window, image=photo, bg="#1a1a2e", borderwidth=0)
        label.image = photo  # Keep reference
        label.pack(fill='both', expand=True)
    except Exception as e:
        # Fallback: just show text
        label = tk.Label(splash_window, text="HelloWorld Launcher", 
                        font=("Segoe UI", 20, "bold"), 
                        fg="#5cb85c", bg="#1a1a2e")
        label.pack(expand=True) 
    
    splash_window.attributes('-topmost', True)
    
    # Run Tkinter event loop in this thread
    splash_window.mainloop()

def close_splash():
    global splash_window
    if splash_window:
        try:
            splash_window.quit()  # Stop mainloop
            splash_window.destroy()
        except:
            pass
        splash_window = None

def start_splash_thread():
    global splash_thread
    splash_thread = threading.Thread(target=create_splash, daemon=True)
    splash_thread.start()

# Create splash in separate thread immediately
start_splash_thread()
# Give it a moment to appear
import time
time.sleep(0.1)

# ============================================
# UPDATER - Check for updates before launching
# ============================================
try:
    from updater import run_updater_check
    print("Verificando actualizaciones...")
    should_restart = run_updater_check()
    if should_restart:
        # Si se aplicó una actualización, el updater reiniciará el launcher
        import sys
        sys.exit(0)
except Exception as e:
    print(f"Error en updater (continuando): {e}")
# ============================================



# ------------- DIRECTORIOS -------------
APPDATA = os.getenv("APPDATA")
default_mc_dir = os.path.join(APPDATA, ".minecraft")
mc_dir = None
launcher_dir = None

# Archivos de configuración (se definirán después de inicializar launcher_dir)
USER_FILE = None
PROFILES_FILE = None

# Minecraft process tracking
minecraft_process = None
# ---------------------------------------


# ------------- ENCRYPTION -------------
from cryptography.fernet import Fernet
import ctypes

# Global encryption key (will be loaded after launcher_dir is initialized)
encryption_key = None

def get_or_create_encryption_key():
    """Get existing encryption key or create a new one"""
    global encryption_key
    
    if launcher_dir is None:
        raise Exception("launcher_dir must be initialized before encryption key")
    
    key_file = os.path.join(launcher_dir, ".hwl_key")
    
    if os.path.exists(key_file):
        # Load existing key
        with open(key_file, "rb") as f:
            encryption_key = f.read()
    else:
        # Generate new key
        encryption_key = Fernet.generate_key()
        with open(key_file, "wb") as f:
            f.write(encryption_key)
        
        # Hide file on Windows
        try:
            ctypes.windll.kernel32.SetFileAttributesW(key_file, 2)  # FILE_ATTRIBUTE_HIDDEN
        except:
            pass  # Ignore if not on Windows or fails
    
    return encryption_key

def encrypt_sensitive_data(data: dict) -> str:
    """Encrypt sensitive data dictionary to string"""
    try:
        cipher = Fernet(encryption_key)
        json_str = json.dumps(data)
        encrypted = cipher.encrypt(json_str.encode())
        return encrypted.decode()
    except Exception as e:
        print(f"Encryption error: {e}")
        return ""

def decrypt_sensitive_data(encrypted_str: str) -> dict:
    """Decrypt sensitive data string to dictionary"""
    try:
        cipher = Fernet(encryption_key)
        decrypted = cipher.decrypt(encrypted_str.encode())
        return json.loads(decrypted.decode())
    except Exception as e:
        print(f"Decryption error (data may be tampered): {e}")
        return {}  # Return empty dict if decryption fails (tampered data)
# ---------------------------------------




# ------- GUARDAR Y CARGAR ARCHIVOS -------
def save_user_data(data: dict):
    """Save user data with encryption for sensitive fields"""
    # Separate sensitive and non-sensitive data
    sensitive_fields = {
        "account_type": data.get("account_type", "offline"),  # Default to offline
    }
    
    # Non-sensitive fields - preserve all other fields
    non_sensitive_fields = {}
    for key, value in data.items():
        if key not in ["account_type", "encrypted_data"]:  # Skip sensitive fields
            non_sensitive_fields[key] = value
    
    # Encrypt sensitive data
    if encryption_key:
        non_sensitive_fields["encrypted_data"] = encrypt_sensitive_data(sensitive_fields)
    else:
        # Fallback if encryption not initialized (shouldn't happen)
        non_sensitive_fields.update(sensitive_fields)
    
    with open(USER_FILE, "w", encoding="utf-8") as f:
        json.dump(non_sensitive_fields, f, indent=4)

def load_user_data():
    """Load user data with decryption for sensitive fields"""
    if not os.path.exists(USER_FILE):
        with open(USER_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f, indent=4)
        return {}
    
    try:
        with open(USER_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        # Si el archivo está corrupto o vacío, lo reseteamos
        with open(USER_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f, indent=4)
        return {}
    
    # Decrypt sensitive data if present
    if "encrypted_data" in data and encryption_key:
        sensitive_data = decrypt_sensitive_data(data["encrypted_data"])
        # Merge decrypted data
        data.update(sensitive_data)
        # Remove encrypted field from returned data
        del data["encrypted_data"]
    
    return data
    



def load_profiles():
    if not os.path.exists(PROFILES_FILE):
        with open(PROFILES_FILE, "w", encoding="utf-8") as f:
            json.dump({"profiles": {}}, f, indent=4)
        return {"profiles": {}}

    try:
        with open(PROFILES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        # Si el archivo está corrupto o vacío, lo reseteamos
        with open(PROFILES_FILE, "w", encoding="utf-8") as f:
            json.dump({"profiles": {}}, f, indent=4)
        return {"profiles": {}}
    
def save_profiles(data):
    with open(PROFILES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)
# ----------------------------------------



# --------------- PERFILES ---------------
def add_profile(profile_id, name, version, icon, directory, jvm_args):
    profiles = load_profiles()

    profiles["profiles"][profile_id] = {
        "name": name,
        "version": version,
        "icon": icon,
        "directory": directory,
        "jvm_args": jvm_args
    }

    save_profiles(profiles)



def edit_profile(profile_id, updated_data):
    profiles = load_profiles()

    if profile_id not in profiles["profiles"]:
        return False  # no existe

    profiles["profiles"][profile_id].update(updated_data)
    save_profiles(profiles)
    return True



def delete_profile(profile_id):
    profiles = load_profiles()

    if profile_id in profiles["profiles"]:
        del profiles["profiles"][profile_id]
        save_profiles(profiles)

        try:
            image_path = os.path.join(launcher_dir, "profiles-img", f"{profile_id}.png")
            if os.path.exists(image_path):
                os.remove(image_path)
        except Exception as e:
            print(f"Error al eliminar imagen del perfil: {e}")
        return True
        
    
    return False
# ----------------------------------------



# ------------ API WEBVIEW ------------
class Api:
    def __init__(self):
        self.download_cancelled = False
        self.current_download_thread = None
        self.current_downloading_version = None
    
    def confirm(self, mensaje: str) -> bool:
        respuesta = messagebox.askokcancel("Confirmar", mensaje)
        return respuesta

    def error(self, mensaje: str):
        messagebox.showerror("Error", mensaje)

    def info(self, mensaje: str):
        messagebox.showinfo("Información", mensaje)

    def warning(self, mensaje: str):
        messagebox.showwarning("Advertencia", mensaje)


    def get_profile_icon(self, filename):
        # path absoluto dentro del directorio real
        icon_path = os.path.join(launcher_dir, "profiles-img", filename)
        
        if os.path.exists(icon_path):
            try:
                with open(icon_path, "rb") as f:
                    encoded = base64.b64encode(f.read()).decode('utf-8')
                    
                ext = os.path.splitext(filename)[1].lower().replace('.', '')
                if ext == "jpg":
                    ext = "jpeg"
                
                return f"data:image/{ext};base64,{encoded}"
            except Exception as e:
                print(f"Error leyendo icono: {e}")
                return ""
        return ""

    def get_profile_images(self):
        """
        Retorna una lista de todas las imágenes disponibles en el directorio profiles-img.
        Primero devuelve default.png, luego todas las demás ordenadas alfabéticamente.
        """
        profiles_img_path = os.path.join(launcher_dir, "profiles-img")
        if not os.path.exists(profiles_img_path):
            return []
        
        all_images = []
        image_extensions = ['.png', '.jpg', '.jpeg', '.gif']
        
        try:
            for filename in os.listdir(profiles_img_path):
                file_path = os.path.join(profiles_img_path, filename)
                if os.path.isfile(file_path):
                    ext = os.path.splitext(filename)[1].lower()
                    if ext in image_extensions:
                        all_images.append(filename)
            
            # Ordenar: default.png primero, luego el resto alfabéticamente
            all_images.sort()
            if 'default.png' in all_images:
                all_images.remove('default.png')
                all_images.insert(0, 'default.png')
            
            return all_images
        except Exception as e:
            print(f"Error listando imágenes de perfil: {e}")
            return []


    def get_versions(self):
        versions = mll.utils.get_installed_versions(mc_dir)
        version_ids = [v["id"] for v in versions]
        print(version_ids)
        return version_ids

    def get_available_versions(self):
        """
        Retorna solo las versiones INSTALADAS para el modal de crear perfil.
        """
        result = {
            "installed": [],
        }
        
        try:
            # Versiones Instaladas
            installed_versions = mll.utils.get_installed_versions(mc_dir)
            result["installed"] = [v["id"] for v in installed_versions]
                            
        except Exception as e:
            print(f"Error obteniendo versiones instaladas: {e}")
            self.error(f"Error obteniendo versiones instaladas: {e}")
        
        return result

    def get_vanilla_versions(self):
        """Retorna lista de versiones vanilla (releases)"""
        try:
            all_versions = mll.utils.get_version_list()
            vanilla_versions = []
            for v in all_versions:
                if v["type"] == "release":
                    vanilla_versions.append(v["id"])
            return vanilla_versions
        except Exception as e:
            print(f"Error getting vanilla versions: {e}")
            return []

    def get_fabric_mc_versions(self):
        """Retorna versiones de MC soportadas por Fabric"""
        try:
            if hasattr(mll, 'fabric'):
                # Obtener todas las versiones soportadas
                return mll.fabric.get_stable_minecraft_versions()
            return []
        except Exception as e:
            print(f"Error getting fabric mc versions: {e}")
            return []

    def get_forge_mc_versions(self):
        """Retorna versiones de MC soportadas por Forge"""
        try:
            if hasattr(mll, 'forge'):
                # Esto es más complejo en mll, pero podemos obtener la lista completa y extraer las versiones de MC
                forge_versions = mll.forge.list_forge_versions()
                mc_versions = set()
                for fv in forge_versions:
                    # Formato usual: MC-Forge
                    parts = fv.split('-')
                    if len(parts) >= 2:
                        mc_versions.add(parts[0])
                
                # Ordenar versiones (simple sort no funciona bien con versiones semánticas, pero es un inicio)
                # Para un ordenamiento correcto se necesitaría 'packaging.version'
                try:
                    from packaging import version
                    return sorted(list(mc_versions), key=lambda v: version.parse(v), reverse=True)
                except ImportError:
                    return sorted(list(mc_versions), reverse=True)
            return []
        except Exception as e:
            print(f"Error getting forge mc versions: {e}")
            return []

    def get_loader_versions(self, loader_type, mc_version):
        """Retorna versiones del loader para una versión de MC específica"""
        try:
            if loader_type == 'fabric':
                if hasattr(mll, 'fabric'):
                    loaders = mll.fabric.get_all_loader_versions()
                    # Fabric loader es independiente de la versión de MC, pero devolvemos los loaders disponibles
                    # O mejor, devolvemos una lista construida de versiones instalables
                    return [l["version"] for l in loaders]
            
            elif loader_type == 'forge':
                if hasattr(mll, 'forge'):
                    # Filtrar versiones de forge para esta versión de MC
                    all_forge = mll.forge.list_forge_versions()
                    filtered = [v for v in all_forge if v.startswith(f"{mc_version}-")]
                    return filtered
            
            return []
        except Exception as e:
            print(f"Error getting loader versions: {e}")
            return []
    
    def install_version(self, version_id, callback_id=None):
        """
        Instala una versión de Minecraft (Vanilla, Fabric o Forge) en un thread separado.
        """
        # Reset cancellation flag
        self.download_cancelled = False
        self.current_downloading_version = version_id
        
        result = {"success": False, "message": "Download not started", "cancelled": False}
        
        def download_thread():
            nonlocal result
            try:
                # Variables para calcular progreso
                max_value = 1
                current_status = ""
                
                # Callbacks
                def set_status(status):
                    nonlocal current_status
                    current_status = status
                    print(f"[Install] {status}")
                
                def set_progress(progress):
                    # Check for cancellation
                    if self.download_cancelled:
                        raise Exception("Download cancelled by user")
                    
                    # LOGGING FOR DEBUG
                    print(f"DEBUG PROGRESS: {progress} / {max_value}")
                    
                    percentage = int((progress / max_value) * 100) if max_value > 0 else 0
                    percentage = min(100, max(0, percentage))
                    
                    # Ensure we send at least 1 update occasionally or if percentage changes?
                    # For now just trust the calculation.
                    
                    try:
                        webview.windows[0].evaluate_js(
                            f"if(window.updateInstallProgress) window.updateInstallProgress('{version_id}', {percentage}, '{current_status}')"
                        )
                    except Exception:
                        pass
                
                def set_max(new_max):
                    nonlocal max_value
                    print(f"DEBUG MAX: {new_max}")
                    max_value = new_max
                
                callback = {
                    "setStatus": set_status,
                    "setProgress": set_progress,
                    "setMax": set_max
                }
                
                print(f"Instalando: {version_id}")
                set_status("Iniciando instalación...")
                
                # Determinar tipo de instalación
                if version_id.startswith("fabric-"):
                    # Instalación de Fabric
                    mc_version = version_id.replace("fabric-", "")
                    set_status(f"Instalando Fabric para {mc_version}...")
                    mll.fabric.install_fabric(mc_version, mc_dir, callback=callback)
                    
                elif version_id.startswith("forge-"):
                    # Instalación de Forge
                    forge_version = version_id.replace("forge-", "")
                    set_status(f"Instalando Forge {forge_version}...")
                    mll.forge.install_forge_version(forge_version, mc_dir, callback=callback)
                    
                else:
                    # Instalación Vanilla
                    set_status(f"Descargando Vanilla {version_id}...")
                    mll.install.install_minecraft_version(version_id, mc_dir, callback=callback)
                
                if self.download_cancelled:
                    result = {"success": False, "message": "Download cancelled", "cancelled": True}
                    self.cleanup_partial_download(version_id)
                else:
                    print(f"Instalación completada: {version_id}")
                    result = {"success": True, "message": f"Versión {version_id} instalada correctamente", "cancelled": False}
                    # Notify frontend of completion
                    try:
                        webview.windows[0].evaluate_js(
                            f"if(window.onDownloadComplete) window.onDownloadComplete('{version_id}')"
                        )
                    except Exception:
                        pass
                
            except Exception as e:
                error_msg = str(e)
                print(f"Error instalando {version_id}: {error_msg}")
                # self.error(f"Error instalando {version_id}: {error_msg}")  <-- REMOVED UNCONDITIONAL CALL
                
                if "cancelled" in error_msg.lower() or self.download_cancelled:
                    result = {"success": False, "message": "Download cancelled", "cancelled": True}
                    self.cleanup_partial_download(version_id)
                    # Notify frontend of cancellation (if not already handled)
                    try:
                        webview.windows[0].evaluate_js("if(window.onDownloadError) window.onDownloadError('Cancelled')")
                    except Exception:
                        pass
                else:
                    self.error(f"Error instalando {version_id}: {error_msg}") # <-- MOVED HERE
                    result = {"success": False, "message": error_msg, "cancelled": False}
                    self.cleanup_partial_download(version_id)
                    # Notify frontend of error
                    try:
                        webview.windows[0].evaluate_js(f"if(window.onDownloadError) window.onDownloadError('{error_msg.replace(chr(39), chr(34))}')")
                    except Exception:
                        pass
            finally:
                self.current_downloading_version = None
                self.current_download_thread = None
        
        # Start download in separate thread
        self.current_download_thread = threading.Thread(target=download_thread, daemon=True)
        self.current_download_thread.start()
        
        # Return immediately (non-blocking)
        return {"success": True, "message": "Download started", "downloading": True}
    
    def cancel_download(self):
        """
        Cancela la descarga actual.
        """
        if self.current_downloading_version:
            print(f"Cancelando descarga de {self.current_downloading_version}")
            self.download_cancelled = True
            
            # Wait for thread to finish (with timeout)
            if self.current_download_thread and self.current_download_thread.is_alive():
                self.current_download_thread.join(timeout=5.0)
            
            return {"success": True, "message": "Download cancelled"}
        else:
            return {"success": False, "message": "No active download"}
    
    def cleanup_partial_download(self, version_id):
        """
        Elimina archivos de descarga parcial.
        """
        try:
            version_path = os.path.join(mc_dir, "versions", version_id)
            if os.path.exists(version_path):
                print(f"Eliminando descarga parcial: {version_path}")
                shutil.rmtree(version_path)
                print(f"Descarga parcial eliminada: {version_id}")
        except Exception as e:
            print(f"Error eliminando descarga parcial de {version_id}: {e}")
    
    def start_game(self, profile_id, nickname):
        print(f"Iniciando perfil ID: {profile_id}")
        print(f"Nickname: {nickname}")

        if not nickname:
            messagebox.showerror("Error", "No has introducido tu nickname")
            return
        
        # Cargar perfiles para obtener datos del perfil seleccionado
        profiles_data = load_profiles()
        if profile_id not in profiles_data["profiles"]:
             messagebox.showerror("Error", "Perfil no encontrado")
             return

        profile = profiles_data["profiles"][profile_id]
        version = profile["version"]
        profile_directory = profile.get("directory", mc_dir)  # Usar directorio del perfil o mc_dir por defecto
        jvm_args = profile.get("jvm_args", "")  # Obtener argumentos JVM del perfil

        print(f"Versión del perfil: {version}")
        print(f"Directorio del perfil: {profile_directory}")

        if not version:
            messagebox.showerror("Error", "El perfil no tiene una versión de Minecraft seleccionada.")
            return

        # Actualizar last_played
        profile["last_played"] = datetime.now().isoformat()
        save_profiles(profiles_data)


        player_uuid = str(uuid.uuid3(uuid.NAMESPACE_DNS, nickname))

        # Procesar argumentos JVM
        jvm_arguments_list = []
        if jvm_args and jvm_args.strip():
            # Dividir por espacios para obtener argumentos individuales
            jvm_arguments_list = jvm_args.strip().split()

        options = {
        'username': nickname,
        'uuid': player_uuid,
        'token': '',
        'jvmArguments': jvm_arguments_list
        }

        try:
            # Generar el comando usando mc_dir (donde están las versiones)
            minecraft_command = mll.command.get_minecraft_command(
                version, 
                mc_dir,  # Usar mc_dir para que encuentre las versiones
                options
            )
            
            # Si el perfil tiene un directorio personalizado, modificar el comando
            # para usar ese directorio como --gameDir
            if profile_directory and profile_directory != mc_dir:
                # Buscar el índice de --gameDir en el comando
                try:
                    game_dir_index = minecraft_command.index('--gameDir')
                    # Reemplazar el valor siguiente (que sería mc_dir) con profile_directory
                    minecraft_command[game_dir_index + 1] = profile_directory
                    print(f"Usando directorio personalizado: {profile_directory}")
                except ValueError:
                    # Si no hay --gameDir, agregarlo
                    minecraft_command.extend(['--gameDir', profile_directory])
                    print(f"Agregando directorio personalizado: {profile_directory}")
            
            print(f"Comando de Minecraft: {' '.join(minecraft_command)}")
            
            # Usar Popen para no bloquear la UI
            subprocess.Popen(minecraft_command)
        except Exception as e:
             print(f"Error al lanzar Minecraft: {e}")
             messagebox.showerror("Error", f"Error al lanzar Minecraft: {e}")
    
    def save_user_json(self, username, mcdir, account_type="offline"):
        data = load_user_data()
        data["username"] = username
        data["mcdir"] = mcdir
        data["account_type"] = account_type

        save_user_data(data)
        return data
    
    
    def get_user_json(self):
        return load_user_data()
    
    def logout_user(self):
        """Clear username and account_type to logout"""
        data = load_user_data()
        data["username"] = ""
        data["account_type"] = ""
        save_user_data(data)
        return data
    
    def get_profiles(self):
        return load_profiles()



    def add_profile(self, name, version, icon, directory, jvm_args):
        profile_id = str(uuid.uuid4())
        
        # Verificar si la versión está instalada
        installed_versions = mll.utils.get_installed_versions(mc_dir)
        installed_version_ids = [v["id"] for v in installed_versions]
        
        if version not in installed_version_ids:
            print(f"Versión {version} no instalada. Instalando...")
            # Instalar la versión
            result = self.install_version(version, callback_id=profile_id)
            if not result["success"]:
                messagebox.showerror("Error", f"No se pudo instalar la versión {version}: {result['message']}")
                return {"success": False, "message": result["message"]}
        
        # Guardar imagen si viene en base64
        if isinstance(icon, dict) and "base64" in icon and icon["base64"]:
            try:
                # Decodificar base64
                header, encoded = icon["base64"].split(",", 1)
                data = base64.b64decode(encoded)
                
                # Determinar extensión
                ext = "png"
                
                # Nombre de archivo: UUID.ext
                filename = f"{profile_id}.{ext}"
                filepath = os.path.join(launcher_dir, "profiles-img", filename)
                
                # Procesar imagen con Pillow
                image = Image.open(io.BytesIO(data))
                
                # Recorte 1:1 (Center Crop)
                width, height = image.size
                new_size = min(width, height)
                
                left = (width - new_size) / 2
                top = (height - new_size) / 2
                right = (width + new_size) / 2
                bottom = (height + new_size) / 2
                
                image = image.crop((left, top, right, bottom))
                
                # Guardar imagen recortada
                image.save(filepath)
                
                # Actualizar el campo icon para guardar solo el nombre de archivo
                icon = filename
                print(f"Imagen guardada en: {filepath}")
            except Exception as e:
                print(f"Error al guardar imagen: {e}")
                # Si falla, usar default.png
                icon = "default.png"
        elif isinstance(icon, str) and icon:
            # Si es un string (nombre de archivo existente), usarlo directamente
            print(f"Usando imagen existente: {icon}")
        else:
            # Si no se proporciona imagen o es None, usar default.png
            icon = "default.png"

        add_profile(profile_id, name, version, icon, directory, jvm_args)
        return {"success": True, "profile_id": profile_id}

    def edit_profile(self, profile_id, updated_data):
        # Procesar el icono si está en updated_data
        if "icon" in updated_data:
            icon = updated_data["icon"]
            
            # Si es un objeto base64, guardar la imagen
            if isinstance(icon, dict) and "base64" in icon and icon["base64"]:
                try:
                    # Decodificar base64
                    header, encoded = icon["base64"].split(",", 1)
                    data = base64.b64decode(encoded)
                    
                    # Determinar extensión
                    ext = "png"
                    
                    # Nombre de archivo: profileID.ext
                    filename = f"{profile_id}.{ext}"
                    filepath = os.path.join(launcher_dir, "profiles-img", filename)
                    
                    # Procesar imagen con Pillow
                    image = Image.open(io.BytesIO(data))
                    
                    # Recorte 1:1 (Center Crop)
                    width, height = image.size
                    new_size = min(width, height)
                    
                    left = (width - new_size) / 2
                    top = (height - new_size) / 2
                    right = (width + new_size) / 2
                    bottom = (height + new_size) / 2
                    
                    image = image.crop((left, top, right, bottom))
                    
                    # Guardar imagen recortada
                    image.save(filepath)
                    
                    # Actualizar el campo icon para guardar solo el nombre de archivo
                    updated_data["icon"] = filename
                    print(f"Imagen guardada en: {filepath}")
                except Exception as e:
                    print(f"Error al guardar imagen: {e}")
                    # Si falla, mantener el icono anterior (no modificar)
                    if "icon" in updated_data:
                        del updated_data["icon"]
            elif isinstance(icon, str) and icon:
                # Si es un string (nombre de archivo existente), usarlo directamente
                print(f"Usando imagen existente: {icon}")
                updated_data["icon"] = icon
            else:
                # Si es None o vacío, no modificar el icono
                if "icon" in updated_data:
                    del updated_data["icon"]
        
        edit_profile(profile_id, updated_data)
        return True

    def delete_profile(self, profile_id):
        delete_profile(profile_id)
    
    def select_folder(self, initial_directory=None):
        """Open folder selection dialog and return selected path"""
        try:
            # Si initial_directory es None o vacío, usar el directorio por defecto (mc_dir)
            if not initial_directory:
                initial_directory = mc_dir
                
            result = webview.windows[0].create_file_dialog(
                webview.FOLDER_DIALOG,
                directory=initial_directory
            )
            
            if result and len(result) > 0:
                return result[0]
            return None
        except Exception as e:
            print(f"Error opening folder dialog: {e}")
            return None
    
    def start_game(self, profile_id, nickname, force=False):
        """Launch Minecraft with process monitoring"""
        global minecraft_process
        
        # Check if Minecraft is already running
        if not force and minecraft_process and minecraft_process.poll() is None:
            return {"status": "already_running"}
        
        # Get profile data
        profiles_data = load_profiles()
        profile = profiles_data.get("profiles", {}).get(profile_id)
        
        if not profile:
            self.error("Perfil no encontrado")
            return {"status": "error", "message": "Perfil no encontrado"}
        
        # Get Minecraft directory and profile settings
        profile_dir = profile.get("directory", mc_dir)
        version = profile.get("version")
        jvm_args = profile.get("jvm_args", "")
        
        # Generate UUID from nickname
        player_uuid = str(uuid.uuid3(uuid.NAMESPACE_DNS, nickname))
        
        # Get launch command
        options = {
            "username": nickname,
            "uuid": player_uuid,
            "token": "",
            "gameDirectory": profile_dir,
            "jvmArguments": jvm_args.split() if jvm_args else []
        }
        
        try:
            # Use mc_dir for version lookup, profile_dir for game directory
            minecraft_command = mll.command.get_minecraft_command(version, mc_dir, options)
            
            print(f"Launching Minecraft with command: {' '.join(minecraft_command[:3])}...")
            
            # Launch Minecraft
            minecraft_process = subprocess.Popen(minecraft_command, cwd=profile_dir)
            
            print(f"Minecraft process started with PID: {minecraft_process.pid}")
            
            # Monitor process in separate thread
            monitor_thread = threading.Thread(target=self._monitor_minecraft_process, args=(minecraft_process,), daemon=True)
            monitor_thread.start()
            print("Monitoring thread started")
            
            return {"status": "launching"}
        except Exception as e:
            print(f"Error launching Minecraft: {e}")
            import traceback
            traceback.print_exc()
            self.error(f"Error al iniciar Minecraft: {e}")
            return {"status": "error", "message": str(e)}
    
    def _monitor_minecraft_process(self, process):
        """Monitor Minecraft process and notify frontend when window appears"""
        try:
            global minecraft_process
            
            # Poll until Minecraft window appears
            window_found = False
            max_wait = 180  # Maximum 3 minutes
            start_time = time.time()
            
            print(f"Monitoring Minecraft process (PID: {process.pid})...")
            
            while not window_found and time.time() - start_time < max_wait:
                if process.poll() is not None:
                    # Process ended before window appeared
                    print("Minecraft process ended prematurely")
                    break
                
                # Search for Minecraft window by title and verify it's a Java process
                try:
                    # Get all windows with "Minecraft" in title
                    all_windows = gw.getWindowsWithTitle("Minecraft")
                    
                    for window in all_windows:
                        if not window.title.strip():
                            continue
                        
                        # Try to get the window's process
                        try:
                            import win32process
                            import win32gui
                            
                            # Get window handle
                            hwnd = window._hWnd
                            
                            # Get process ID from window
                            _, window_pid = win32process.GetWindowThreadProcessId(hwnd)
                            
                            # Get process name
                            try:
                                proc = psutil.Process(window_pid)
                                proc_name = proc.name().lower()
                                
                                # Check if it's a Java process
                                if proc_name in ['javaw.exe', 'java.exe']:
                                    # Verify it's our launched process or a child of it
                                    if window_pid == process.pid or self._is_child_process(window_pid, process.pid):
                                        window_found = True
                                        elapsed = time.time() - start_time
                                        print(f"Minecraft window detected after {elapsed:.1f}s")
                                        print(f"  Window title: '{window.title}'")
                                        print(f"  Process: {proc_name} (PID: {window_pid})")
                                        break
                            except:
                                pass
                        except ImportError:
                            # Fallback if win32process not available
                            # Just check if title contains Minecraft
                            if "Minecraft" in window.title:
                                window_found = True
                                elapsed = time.time() - start_time
                                print(f"Minecraft window detected after {elapsed:.1f}s (Window title: '{window.title}')")
                                break
                        except Exception as e:
                            pass
                            
                except Exception as e:
                    print(f"Error checking windows: {e}")
                    pass
                
                time.sleep(0.5)  # Check every 0.5 seconds
            
            if window_found:
                # Notify frontend that Minecraft is ready
                try:
                    print("Notifying frontend: Minecraft ready")
                    webview.windows[0].evaluate_js("if (typeof onMinecraftReady === 'function') onMinecraftReady();")
                except Exception as e:
                    print(f"Error notifying frontend: {e}")
            else:
                print("Minecraft window detection timed out or process ended")
            
            # Wait for process to end
            print("Waiting for Minecraft to close...")
            process.wait()
            print("Minecraft closed")
            
            # Notify frontend that Minecraft closed
            try:
                print("Notifying frontend: Minecraft closed")
                webview.windows[0].evaluate_js("if (typeof onMinecraftClosed === 'function') onMinecraftClosed();")
            except Exception as e:
                print(f"Error notifying frontend: {e}")
            
            # Clear global process
            minecraft_process = None
        except Exception as e:
            print(f"CRITICAL ERROR in monitor thread: {e}")
            import traceback
            traceback.print_exc()
    
    def _is_child_process(self, child_pid, parent_pid):
        """Check if child_pid is a child of parent_pid"""
        try:
            child = psutil.Process(child_pid)
            while child.pid != 0:
                if child.ppid() == parent_pid:
                    return True
                child = psutil.Process(child.ppid())
        except:
            pass
        return False
    
    # ============================================
    # MOD MANAGEMENT METHODS
    # ============================================
    
    def is_profile_moddable(self, profile):
        """Detecta si un perfil soporta mods (Forge/Fabric)"""
        try:
            version = profile.get('version', '').lower()
            
            # Método 1: Verificar campo 'type' si existe
            if 'type' in profile:
                profile_type = profile['type'].lower()
                if profile_type in ['forge', 'fabric']:
                    return True
                # Si es explícitamente vanilla, no es moddable
                if profile_type == 'vanilla':
                    return False
            
            # Método 2: Analizar nombre de versión (más confiable)
            # Si contiene forge o fabric, es moddable
            if 'forge' in version or 'fabric' in version:
                return True
            
            # Si la versión parece vanilla (solo números y puntos), no es moddable
            # incluso si tiene carpeta mods
            if version and not ('forge' in version or 'fabric' in version):
                # Es vanilla, no moddable
                return False
            
            # Método 3: Verificar si existe carpeta mods (solo como último recurso)
            # Este método solo se usa si no pudimos determinar por la versión
            profile_dir = profile.get('directory', mc_dir)
            mods_dir = os.path.join(profile_dir, 'mods')
            if os.path.exists(mods_dir):
                # Solo considerar moddable si NO es el directorio por defecto
                # o si ya determinamos que no es vanilla
                if profile_dir != mc_dir:
                    return True
            
            return False
        except Exception as e:
            print(f"Error checking if profile is moddable: {e}")
            return False
    
    def get_moddable_profiles(self):
        """Retorna solo perfiles Forge/Fabric"""
        try:
            profiles_data = load_profiles()
            profiles = profiles_data.get('profiles', {})
            
            moddable = {}
            for profile_id, profile in profiles.items():
                if self.is_profile_moddable(profile):
                    # Detectar tipo específico
                    version = profile.get('version', '').lower()
                    if 'forge' in version:
                        profile['type'] = 'forge'
                    elif 'fabric' in version:
                        profile['type'] = 'fabric'
                    else:
                        profile['type'] = 'modded'
                    
                    moddable[profile_id] = profile
            
            return {'profiles': moddable}
        except Exception as e:
            print(f"Error getting moddable profiles: {e}")
            return {'profiles': {}}
    
    def search_modrinth_mods(self, query='', filters=None):
        """Busca mods en Modrinth API"""
        try:
            import requests
            
            # Base URL
            url = 'https://api.modrinth.com/v2/search'
            
            # Parámetros de búsqueda
            params = {
                'query': query,
                'limit': 20,
                'facets': '[[\"project_type:mod\"]]'
            }
            
            # Aplicar filtros si existen
            if filters:
                facets = [["project_type:mod"]]
                
                # Filtro de categorías
                if 'categories' in filters and filters['categories']:
                    for category in filters['categories']:
                        facets.append([f"categories:{category}"])
                
                # Filtro de versión de Minecraft
                if 'game_version' in filters and filters['game_version']:
                    facets.append([f"versions:{filters['game_version']}"])
                
                # Filtro de loader
                if 'loader' in filters and filters['loader']:
                    facets.append([f"categories:{filters['loader']}"])
                
                params['facets'] = json.dumps(facets)
            
            # Realizar petición
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Formatear resultados
            results = []
            for hit in data.get('hits', []):
                results.append({
                    'id': hit.get('project_id'),
                    'slug': hit.get('slug'),
                    'title': hit.get('title'),
                    'description': hit.get('description'),
                    'author': hit.get('author'),
                    'icon_url': hit.get('icon_url'),
                    'downloads': hit.get('downloads', 0),
                    'categories': hit.get('categories', []),
                    'versions': hit.get('versions', []),
                    'date_modified': hit.get('date_modified')
                })
            
            return {'success': True, 'results': results}
        except Exception as e:
            print(f"Error searching Modrinth mods: {e}")
            return {'success': False, 'error': str(e), 'results': []}
    
    def get_mod_versions(self, project_id, game_version=None, loader=None):
        """Obtiene las versiones disponibles de un mod"""
        try:
            import requests
            
            url = f'https://api.modrinth.com/v2/project/{project_id}/version'
            
            # Parámetros opcionales
            params = {}
            if game_version:
                params['game_versions'] = f'["{game_version}"]'
            if loader:
                params['loaders'] = f'["{loader}"]'
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            versions = response.json()
            
            # Formatear versiones
            formatted_versions = []
            for version in versions:
                formatted_versions.append({
                    'id': version.get('id'),
                    'name': version.get('name'),
                    'version_number': version.get('version_number'),
                    'game_versions': version.get('game_versions', []),
                    'loaders': version.get('loaders', []),
                    'files': version.get('files', []),
                    'date_published': version.get('date_published')
                })
            
            return {'success': True, 'versions': formatted_versions}
        except Exception as e:
            print(f"Error getting mod versions: {e}")
            return {'success': False, 'error': str(e), 'versions': []}
    
    def download_mod(self, project_id, version_id, profile_id):
        """Descarga un mod al directorio del perfil en segundo plano con progreso"""
        
        # Check active download (simple lock)
        if hasattr(self, 'current_mod_download') and self.current_mod_download:
             return {'success': False, 'error': 'Ya hay una descarga en curso'}

        def download_thread():
            self.current_mod_download = project_id
            try:
                import requests
                
                # Obtener información del perfil
                profiles_data = load_profiles()
                profile = profiles_data.get('profiles', {}).get(profile_id)
                
                if not profile:
                    self._send_mod_error(project_id, 'Perfil no encontrado')
                    return
                
                if not self.is_profile_moddable(profile):
                    self._send_mod_error(project_id, 'Este perfil no soporta mods')
                    return
                
                # Obtener directorio de mods
                profile_dir = profile.get('directory', mc_dir)
                mods_dir = os.path.join(profile_dir, 'mods')
                os.makedirs(mods_dir, exist_ok=True)
                
                # Obtener información de la versión
                version_url = f'https://api.modrinth.com/v2/version/{version_id}'
                
                # Reportar inicio
                self._send_mod_progress(project_id, 0, "Iniciando...")
                
                version_response = requests.get(version_url, timeout=10)
                version_response.raise_for_status()
                version_data = version_response.json()
                
                # Obtener archivo principal
                files = version_data.get('files', [])
                if not files:
                    self._send_mod_error(project_id, 'No se encontró archivo para descargar')
                    return
                
                # Buscar archivo principal
                primary_file = None
                for file in files:
                    if file.get('primary', False):
                        primary_file = file
                        break
                
                if not primary_file:
                    primary_file = files[0]
                
                # Descargar archivo
                download_url = primary_file.get('url')
                filename = primary_file.get('filename')
                
                if not download_url or not filename:
                    self._send_mod_error(project_id, 'URL de descarga no válida')
                    return
                
                # Verificar si ya existe
                file_path = os.path.join(mods_dir, filename)
                if os.path.exists(file_path):
                    self._send_mod_error(project_id, 'Este mod ya está instalado')
                    return
                
                # Descargar con streaming
                print(f"Descargando mod: {filename}")
                self._send_mod_progress(project_id, 5, "Conectando...")
                
                response = requests.get(download_url, stream=True, timeout=60)
                response.raise_for_status()
                
                total_size = int(response.headers.get('content-length', 0))
                block_size = 8192
                downloaded = 0
                
                with open(file_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=block_size):
                        if chunk:
                            f.write(chunk)
                            downloaded += len(chunk)
                            if total_size > 0:
                                percent = int((downloaded / total_size) * 100)
                                # Cap at 99 until finished
                                percent = min(99, percent)
                                self._send_mod_progress(project_id, percent, "Descargando...")
                
                print(f"Mod descargado: {file_path}")
                self._send_mod_progress(project_id, 100, "Completado")
                
                # Notify success
                try:
                    webview.windows[0].evaluate_js(
                        f"if(window.onModDownloadComplete) window.onModDownloadComplete('{project_id}', '{filename}')"
                    )
                except:
                    pass
                
            except Exception as e:
                print(f"Error downloading mod: {e}")
                import traceback
                traceback.print_exc()
                self._send_mod_error(project_id, str(e))
            finally:
                self.current_mod_download = None

        # Start thread
        threading.Thread(target=download_thread, daemon=True).start()
        
        # Return immediately indicating started
        return {'success': True, 'status': 'started'}

    def _send_mod_progress(self, project_id, percentage, status):
        try:
            webview.windows[0].evaluate_js(
                f"if(window.onModDownloadProgress) window.onModDownloadProgress('{project_id}', {percentage}, '{status}')"
            )
        except:
            pass

    def _send_mod_error(self, project_id, error_msg):
        try:
            webview.windows[0].evaluate_js(
                f"if(window.onModDownloadError) window.onModDownloadError('{project_id}', '{error_msg.replace(chr(39), chr(34))}')"
            )
        except:
            pass
    
    def get_installed_mods(self, profile_id):
        """Lista mods instalados en un perfil"""
        try:
            # Obtener información del perfil
            profiles_data = load_profiles()
            profile = profiles_data.get('profiles', {}).get(profile_id)
            
            if not profile:
                return {'success': False, 'error': 'Perfil no encontrado', 'mods': []}
            
            # Obtener directorio de mods
            profile_dir = profile.get('directory', mc_dir)
            mods_dir = os.path.join(profile_dir, 'mods')
            
            if not os.path.exists(mods_dir):
                return {'success': True, 'mods': []}
            
            # Listar archivos .jar
            mods = []
            for filename in os.listdir(mods_dir):
                file_path = os.path.join(mods_dir, filename)
                
                # Solo archivos .jar o .jar.disabled
                if filename.endswith('.jar') or filename.endswith('.jar.disabled'):
                    enabled = filename.endswith('.jar')
                    display_name = filename.replace('.jar.disabled', '').replace('.jar', '')
                    
                    # Obtener tamaño del archivo
                    size = os.path.getsize(file_path)
                    size_mb = size / (1024 * 1024)
                    
                    mods.append({
                        'filename': filename,
                        'display_name': display_name,
                        'enabled': enabled,
                        'size': size,
                        'size_mb': round(size_mb, 2)
                    })
            
            # Ordenar por nombre
            mods.sort(key=lambda x: x['display_name'].lower())
            
            return {'success': True, 'mods': mods}
        except Exception as e:
            print(f"Error getting installed mods: {e}")
            return {'success': False, 'error': str(e), 'mods': []}
    
    def toggle_mod(self, profile_id, filename, enabled):
        """Habilita o deshabilita un mod"""
        try:
            # Obtener información del perfil
            profiles_data = load_profiles()
            profile = profiles_data.get('profiles', {}).get(profile_id)
            
            if not profile:
                return {'success': False, 'error': 'Perfil no encontrado'}
            
            # Obtener directorio de mods
            profile_dir = profile.get('directory', mc_dir)
            mods_dir = os.path.join(profile_dir, 'mods')
            
            old_path = os.path.join(mods_dir, filename)
            
            if not os.path.exists(old_path):
                return {'success': False, 'error': 'Archivo no encontrado'}
            
            # Determinar nuevo nombre
            if enabled:
                # Habilitar: remover .disabled
                if filename.endswith('.jar.disabled'):
                    new_filename = filename.replace('.jar.disabled', '.jar')
                else:
                    return {'success': False, 'error': 'El mod ya está habilitado'}
            else:
                # Deshabilitar: añadir .disabled
                if filename.endswith('.jar'):
                    new_filename = filename + '.disabled'
                else:
                    return {'success': False, 'error': 'El mod ya está deshabilitado'}
            
            new_path = os.path.join(mods_dir, new_filename)
            
            # Renombrar archivo
            os.rename(old_path, new_path)
            
            return {'success': True, 'new_filename': new_filename}
        except Exception as e:
            print(f"Error toggling mod: {e}")
            return {'success': False, 'error': str(e)}
    
    def delete_mod(self, profile_id, filename):
        """Elimina un mod"""
        try:
            # Obtener información del perfil
            profiles_data = load_profiles()
            profile = profiles_data.get('profiles', {}).get(profile_id)
            
            if not profile:
                return {'success': False, 'error': 'Perfil no encontrado'}
            
            # Obtener directorio de mods
            profile_dir = profile.get('directory', mc_dir)
            mods_dir = os.path.join(profile_dir, 'mods')
            
            file_path = os.path.join(mods_dir, filename)
            
            if not os.path.exists(file_path):
                return {'success': False, 'error': 'Archivo no encontrado'}
            
            # Eliminar archivo
            os.remove(file_path)
            
            print(f"Mod eliminado: {file_path}")
            
            return {'success': True}
        except Exception as e:
            print(f"Error deleting mod: {e}")
            return {'success': False, 'error': str(e)}
# ---------------------------------------






if __name__ == '__main__':
    # ============================================
    # INITIALIZATION - Load config and setup
    # ============================================
    
    
    # Definir rutas temporales para cargar configuración inicial
    temp_user_file = "user.json"
    temp_profiles_file = "profiles.json"
    
    # Función temporal para cargar user.json desde la raíz
    def load_temp_user_data():
        if not os.path.exists(temp_user_file):
            return {}
        try:
            with open(temp_user_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {}
    
    # 1. Cargar los datos ANTES de usar la API
    user_data = load_temp_user_data()

    if "mcdir" in user_data and user_data["mcdir"] != "":
        mc_dir = user_data["mcdir"]
    else:
        mc_dir = default_mc_dir
        user_data["mcdir"] = mc_dir

    # 2. Inicializar launcher_dir
    launcher_dir = os.path.join(mc_dir, ".HWLauncher")
    os.makedirs(launcher_dir, exist_ok=True)
    
    # 2.5. Initialize encryption key
    get_or_create_encryption_key()
    print("Encryption key initialized")
    
    # 3. Definir rutas de archivos de configuración en launcher_dir
    USER_FILE = os.path.join(launcher_dir, "user.json")
    PROFILES_FILE = os.path.join(launcher_dir, "profiles.json")
    
    # 4. Migrar archivos si existen en la raíz
    if os.path.exists(temp_user_file) and not os.path.exists(USER_FILE):
        shutil.copy2(temp_user_file, USER_FILE)
        print(f"Migrado {temp_user_file} a {USER_FILE}")
    
    if os.path.exists(temp_profiles_file) and not os.path.exists(PROFILES_FILE):
        shutil.copy2(temp_profiles_file, PROFILES_FILE)
        print(f"Migrado {temp_profiles_file} a {PROFILES_FILE}")
    
    # 5. Guardar user_data en la nueva ubicación (Merge con datos existentes)
    if os.path.exists(USER_FILE):
        try:
            with open(USER_FILE, "r", encoding="utf-8") as f:
                persistent_data = json.load(f)
            
            # Actualizar persistent_data con user_data (bootstrap) solo si hay valores nuevos/diferentes que no sean vacíos
            # Esto previene que un bootstrap vacío sobrescriba el nickname guardado
            for key, value in user_data.items():
                if value: # Solo sobrescribir si el bootstrap tiene un valor real
                    persistent_data[key] = value
            
            user_data = persistent_data
        except Exception as e:
            print(f"Error merging user data: {e}")

    save_user_data(user_data)

    # 6. Crear carpeta profiles-img y copiar iconos iniciales
    profiles_img_dir = os.path.join(launcher_dir, "profiles-img")
    os.makedirs(profiles_img_dir, exist_ok=True)

    import shutil
    source_dir = os.path.join(os.path.dirname(__file__), "img", "profiles")

    if os.path.exists(source_dir):
        for filename in os.listdir(source_dir):
            src = os.path.join(source_dir, filename)
            dst = os.path.join(profiles_img_dir, filename)

            if os.path.isfile(src):
                # Optional: Check if file exists to avoid overwriting user changes, 
                # or use copy2 to overwrite. Here we overwrite to ensure defaults exist.
                shutil.copy2(src, dst)

        print("Iconos de perfiles copiados a profiles-img")
    else:
        print("WARNING: No existe ./img/profiles, no se copiaron iconos.")

    # ============================================
    # MAIN WINDOW - Create hidden, show when ready
    # ============================================

    api = Api()
    
    # Create main window
    window = webview.create_window(
        'HelloWorld Launcher',
        'ui/index.html',
        maximized=True,
        js_api=api,
        background_color="#1a1a1a"
    )
    
    # Close splash when window is shown (in separate thread to avoid blocking)
    def close_splash_delayed():
        def callback():
            import time
            time.sleep(0.5)  # Wait for window to be fully visible
            close_splash()
        threading.Thread(target=callback, daemon=True).start()
    
    # Attach to shown event
    window.events.shown += close_splash_delayed
    
    webview.start(debug=True)


