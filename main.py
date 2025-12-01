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
from PIL import Image
from datetime import datetime

"""
perfecto, pero he visto que las versiones de forge están mal ordenadas.



"""



# ------------- DIRECTORIOS -------------
APPDATA = os.getenv("APPDATA")
default_mc_dir = os.path.join(APPDATA, ".minecraft")
mc_dir = None
launcher_dir = None

# Archivos de configuración (se definirán después de inicializar launcher_dir)
USER_FILE = None
PROFILES_FILE = None
# ---------------------------------------




# ------- GUARDAR Y CARGAR ARCHIVOS -------
def save_user_data(data: dict):
    with open(USER_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

def load_user_data():
    if not os.path.exists(USER_FILE):
        with open(USER_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f, indent=4)
        return {}
    try:
        with open(USER_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        # Si el archivo está corrupto o vacío, lo reseteamos
        with open(USER_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f, indent=4)
        return {}
    



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
        Retorna un diccionario con versiones organizadas por categoría.
        """
        result = {
            "installed": [],
            "vanilla": [],
            "fabric": [],
            "forge": [],
            "snapshots": [],
            "old": []
        }
        
        try:
            # 1. Versiones Instaladas
            installed_versions = mll.utils.get_installed_versions(mc_dir)
            result["installed"] = [v["id"] for v in installed_versions]
            
            # 2. Vanilla (Release, Snapshot, Old)
            all_versions = mll.utils.get_version_list()
            
            for v in all_versions:
                if v["type"] == "release":
                    result["vanilla"].append(v["id"])
                elif v["type"] == "snapshot":
                    result["snapshots"].append(v["id"])
                else:
                    result["old"].append(v["id"])
            
            # 3. Fabric
            # Obtener versiones de MC soportadas por Fabric
            if hasattr(mll, 'fabric'):
                fabric_mc_versions = mll.fabric.get_stable_minecraft_versions()
                # Limitamos a las primeras 20 para no saturar, o todas si son importantes
                # Mostramos formato "Fabric <MC_Version>"
                for mc_ver in fabric_mc_versions:
                    result["fabric"].append({
                        "id": f"fabric-{mc_ver}",
                        "name": f"Fabric {mc_ver}",
                        "mc_version": mc_ver
                    })

            # 4. Forge
            # Obtener versiones de Forge
            if hasattr(mll, 'forge'):
                # Esto puede ser lento si hay muchas, vamos a intentar obtener las más recientes
                # list_forge_versions retorna una lista de versiones de forge (ej: 1.20.1-47.1.0)
                forge_versions_list = mll.forge.list_forge_versions()
                
                # Agrupar por versión de MC y tomar la última de cada una
                from packaging import version
                mc_versions_dict = {}
                
                for forge_ver in forge_versions_list:
                    # El formato suele ser MC-Forge o similar. mll lo maneja.
                    # Asumimos que list_forge_versions devuelve strings como "1.20.1-47.1.0"
                    parts = forge_ver.split('-')
                    if len(parts) >= 2:
                        mc_ver = parts[0]
                        # Guardar solo la primera versión de Forge para cada versión de MC
                        if mc_ver not in mc_versions_dict:
                            mc_versions_dict[mc_ver] = {
                                "id": f"forge-{forge_ver}",
                                "name": f"Forge {mc_ver} ({parts[1]})",
                                "forge_version": forge_ver
                            }
                
                # Ordenar las versiones de MC de más reciente a más antigua
                try:
                    sorted_mc_versions = sorted(
                        mc_versions_dict.keys(),
                        key=lambda v: version.parse(v),
                        reverse=True
                    )
                    # Agregar las versiones ordenadas al resultado
                    for mc_ver in sorted_mc_versions:
                        result["forge"].append(mc_versions_dict[mc_ver])
                except Exception as sort_error:
                    print(f"Error ordenando versiones de Forge: {sort_error}")
                    # Si falla el ordenamiento, agregar en el orden que estén
                    for mc_ver, forge_data in mc_versions_dict.items():
                        result["forge"].append(forge_data)
                            
        except Exception as e:
            print(f"Error obteniendo versiones: {e}")
            self.error(f"Error obteniendo versiones: {e}")
        
        return result
    
    def install_version(self, version_id, callback_id=None):
        """
        Instala una versión de Minecraft (Vanilla, Fabric o Forge).
        """
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
                percentage = int((progress / max_value) * 100) if max_value > 0 else 0
                percentage = min(100, max(0, percentage))
                if callback_id:
                    try:
                        webview.windows[0].evaluate_js(
                            f"if(window.updateInstallProgress) window.updateInstallProgress('{version_id}', {percentage}, '{current_status}')"
                        )
                    except Exception:
                        pass
            
            def set_max(new_max):
                nonlocal max_value
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
            
            print(f"Instalación completada: {version_id}")
            return {"success": True, "message": f"Versión {version_id} instalada correctamente"}
            
        except Exception as e:
            print(f"Error instalando {version_id}: {e}")
            return {"success": False, "message": str(e)}
    
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
# ---------------------------------------






if __name__ == '__main__':
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






    api = Api()
    window = webview.create_window(
        'HelloWorld Launcher',
        'ui/index.html',
        maximized=True,
        js_api=api,
        background_color="#1a1a1a"
        )
    webview.start(debug=True)

