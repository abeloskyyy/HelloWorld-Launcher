import webview
import minecraft_launcher_lib as mll
import messagebox
import uuid
import subprocess
import json
import os


# ------------- DIRECTORIOS -------------
USER_FILE = "user.json"
mc_dir = mll.utils.get_minecraft_directory()
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
    with open(USER_FILE, "r", encoding="utf-8") as f:
        return json.load(f)
# ----------------------------------------




# ------------ API WEBVIEW ------------
class Api:
    def get_versions(self):
        versions = mll.utils.get_installed_versions(mc_dir)
        version_ids = [v["id"] for v in versions]
        print(version_ids)
        return version_ids
    
    def start_game(self, version, nickname):
        print(f"Version seleccionada: {version}")
        print(f"Nickname: {nickname}")

        if not nickname:
            messagebox.showerror("Error", "No has introducido tu nickname")
            return
        

        player_uuid = str(uuid.uuid3(uuid.NAMESPACE_DNS, nickname))

        options = {
        'username': nickname,
        'uuid': player_uuid,
        'token': ''
        }

        minecraft_command = mll.command.get_minecraft_command(version, mc_dir, options)
        
        subprocess.run(minecraft_command)
    
    def save_user_json(self, username, ram):
        data = load_user_data()
        data["username"] = username
        data["ram"] = ram

        save_user_data(data)
        return data
    
    def get_user_json(self):
        return load_user_data()
# ---------------------------------------






if __name__ == '__main__':
    api = Api()
    window = webview.create_window(
        'HelloWorld Launcher',
        'ui/index.html',
        maximized=True,
        js_api=api
        )
    webview.start()







"""

# -----------------------------EJECUTAR MINECRAFT-----------------------------
def ejecutar_minecraft():
    mine_user = entry_nombre.get()
    ram = int(float(slider_ram.get()))

    if not mine_user:
        messagebox.showerror("Error", "No has introducido tu nickname")
        return
    
    if not ram:
        messagebox.showerror("Error", "No has introducido la cantidad de RAM para usar")
        return
    
    short_version = vers.get()

    if short_version == 'No hay versiones.':
        messagebox.showerror("Error", "No hay ninguna versión de Minecraft instalada.")
        return
    
    version = version_name_map.get(short_version, short_version)
   



    version_dir = os.path.join(minecraft_directory, "versions", version)
    version_id = get_minecraft_version_from_json(version_dir)
    print(f"Versión detectada: {version_id}")

    # Verificar no bug tlauncher

    

    uuid_fijo = str(uuid.uuid3(uuid.NAMESPACE_DNS, mine_user))

    # Usar el directorio de Minecraft como directorio de juego
    options = {
        'username': mine_user,
        'uuid': uuid_fijo,
        'token': '',
        'jvmArguments': [f"-Xmx{ram}G", f"-Xms{ram}G"],
        'game_directory': minecraft_directory,  # Usar el directorio configurado
    }


    def get_java_path(version):
        java_base = resource_path("java")
        if version.startswith("1.16") or version < "1.17":
            return os.path.join(java_base, "java8", "bin", "javaw.exe")
        elif version <= "1.20.1":
            return os.path.join(java_base, "java17", "bin", "javaw.exe")
        else:
            return os.path.join(java_base, "java21", "bin", "javaw.exe")

    try:
        def run():
            minecraft_command = minecraft_launcher_lib.command.get_minecraft_command(version, minecraft_directory, options)

            ventana.withdraw()
            java_path = get_java_path(version)
            minecraft_command[0] = java_path
            print(f"Abriendo Minecraft {version} con Java: {java_path}.")
            print(f"Directorio de juego: {minecraft_directory}")
            
            # Controlar si mostrar la consola según el checkbox
            if mostrar_consola_dev.get():
                # Mostrar consola de Minecraft
                subprocess.run(minecraft_command)
            else:
                # Ocultar consola de Minecraft pero ejecutar el juego
                subprocess.run(minecraft_command, creationflags=subprocess.CREATE_NO_WINDOW)
            
            ventana.deiconify()  # Muestra la ventana otra vez
        run()
    
    except Exception as e:
        print(f"Error al obtener comando Minecraft: {e}")
        messagebox.showerror("Error", f"Ocurrió un error al ejecutar Minecraft: {e}")
        respuesta = messagebox.askokcancel("Reinstalar versión", 
        f"La versión {version} parece dañada o incompleta.\n¿Quieres reinstalarla?\n(No eliminará mods ni paquetes de recursos instalados con CubeCraft).")
        if respuesta:
            reinstalar_version(version, version_dir)
        else:
            return
        return

    

"""