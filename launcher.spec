# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('ui', 'ui'),  # Incluir carpeta UI completa

        ('version.json', '.'),  # Incluir archivo de versión
    ],
    hiddenimports=[
        'webview',
        'webview.platforms.winforms',
        'requests',
        'packaging',
        'packaging.version',
        'packaging.specifiers',
        'packaging.requirements',
        'minecraft_launcher_lib',
        'messagebox._win32',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'matplotlib',
        'numpy',
        'scipy',
        'pandas',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='HelloWorld-Launcher',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,  # Comprimir con UPX
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Sin ventana de consola
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='ui/img/icon.ico',  # Icono de la aplicación
    # Para crear version_file, usa: pyi-grab_version <cualquier_exe.exe>
    # Luego edita el archivo generado y especifica aquí
    version_file=None,
)
