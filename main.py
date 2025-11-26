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
EXPLICAME como hago para que al iniciar la app mientras carga la interfaz, que el fonfo sea del color que yo quiera y haya una circular destas de carga
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
        return True
    
    return False
# ----------------------------------------



# ------------ API WEBVIEW ------------
class Api:
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
        Retorna un diccionario con versiones instaladas y disponibles para descargar.
        """
        result = {
            "installed": [],
            "available": []
        }
        
        # 1. Obtener versiones instaladas
        try:
            installed_versions = mll.utils.get_installed_versions(mc_dir)
            result["installed"] = [v["id"] for v in installed_versions]
        except Exception as e:
            print(f"Error obteniendo versiones instaladas: {e}")
        
        # 2. Obtener versiones vanilla disponibles
        try:
            all_versions = mll.utils.get_version_list()
            # Filtrar solo versiones release (vanilla)
            vanilla_versions = [v["id"] for v in all_versions if v["type"] == "release"]
            result["available"] = vanilla_versions
        except Exception as e:
            print(f"Error obteniendo versiones disponibles: {e}")
        
        return result
    
    def install_version(self, version, callback_id=None):
        """
        Instala una versión de Minecraft.
        callback_id se usa para identificar el callback en el frontend.
        """
        try:
            # Variables para calcular progreso
            max_value = 1
            current_status = ""
            
            # Callback para reportar progreso
            def set_status(status):
                nonlocal current_status
                current_status = status
                print(f"[Install] {status}")
            
            def set_progress(progress):
                # Calcular porcentaje basado en max_value
                percentage = int((progress / max_value) * 100) if max_value > 0 else 0
                # Limitar entre 0 y 100
                percentage = min(100, max(0, percentage))
                print(f"[Install Progress] {percentage}%")
                # Enviar progreso al frontend
                if callback_id:
                    try:
                        webview.windows[0].evaluate_js(
                            f"if(window.updateInstallProgress) window.updateInstallProgress('{version}', {percentage}, '{current_status}')"
                        )
                    except Exception as e:
                        print(f"Error enviando progreso al frontend: {e}")
            
            def set_max(new_max):
                nonlocal max_value
                max_value = new_max
                print(f"[Install Max] {max_value}")
            
            # Crear callback
            callback = {
                "setStatus": set_status,
                "setProgress": set_progress,
                "setMax": set_max
            }
            
            print(f"Instalando versión: {version}")
            set_status(f"Descargando {version}...")
            
            # Instalar la versión
            mll.install.install_minecraft_version(version, mc_dir, callback=callback)
            
            print(f"Versión {version} instalada correctamente")
            return {"success": True, "message": f"Versión {version} instalada"}
            
        except Exception as e:
            print(f"Error instalando versión {version}: {e}")
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
    
    def save_user_json(self, username, mcdir):
        data = load_user_data()
        data["username"] = username
        data["mcdir"] = mcdir

        save_user_data(data)
        return data
    
    def get_user_json(self):
        return load_user_data()
    
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
        return True
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
    
    # 5. Guardar user_data en la nueva ubicación
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
        js_api=api
        )
    webview.start(debug=True)

