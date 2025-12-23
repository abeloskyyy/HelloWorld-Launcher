
import minecraft_launcher_lib as mll
import shutil
import sys

print("Minecraft Launcher Lib version:", mll.__version__ if hasattr(mll, '__version__') else "Unknown")
print("Java in PATH:", shutil.which("java"))

try:
    forge_versions = mll.forge.list_forge_versions()
    print(f"Found {len(forge_versions)} forge versions.")
    # Print a few for 1.20.1
    for v in forge_versions:
        if v.startswith("1.20.1-"):
            print("Sample 1.20.1 forge version:", v)
            break
except Exception as e:
    print("Error listing forge versions:", e)

# Check install_forge_version signature
try:
    import inspect
    sig = inspect.signature(mll.forge.install_forge_version)
    print("install_forge_version signature:", sig)
except Exception as e:
    print("Error inspecting signature:", e)
