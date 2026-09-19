const dictionaries = {
  en: {
    'common.back': 'Back',
    'common.browse': 'Browse',
    'common.close': 'Close',
    'common.minimize': 'Minimize',
    'common.detecting': 'Detecting...',
    'common.select_folder': 'Select folder...',

    'loading.connecting': 'Connecting...',

    'welcome.title': 'HelloWorld Launcher Setup',
    'welcome.subtitle': 'What would you like to do?',
    'welcome.install.title': 'Install',
    'welcome.install.desc': 'Set up HelloWorld Launcher on this PC',
    'welcome.update.title': 'Update',
    'welcome.update.desc': 'Update to the latest version',
    'welcome.reinstall.title': 'Reinstall',
    'welcome.reinstall.desc': 'Force a fresh reinstallation of all files',
    'welcome.uninstall.title': 'Uninstall',
    'welcome.uninstall.desc': 'Remove HelloWorld Launcher from this PC',
    'welcome.advanced': 'Advanced options',
    'welcome.advanced.update.desc': 'Specify a custom installation path to update',
    'welcome.advanced.reinstall.desc': 'Reinstall files at a custom path',
    'welcome.advanced.uninstall.desc': 'Remove from a custom path',

    'install.title': 'Install HelloWorld Launcher',
    'install.subtitle': 'Choose your installation options',
    'install.folder': 'Installation folder',
    'install.warning_admin': 'This folder requires administrator permissions. The installer will request elevation.',
    'install.options': 'Options',
    'install.opt_desktop': 'Create desktop shortcut',
    'install.opt_startmenu': 'Create Start Menu shortcut',
    'install.opt_startmenu_linux': 'Create application menu entry (.desktop)',
    'install.opt_launch': 'Launch HelloWorld Launcher after installation',
    'install.btn': 'Install',

    'update.title': 'Update HelloWorld Launcher',
    'update.subtitle': 'Update to the latest version',
    'update.folder': 'Installation folder',
    'update.opt_launch': 'Launch HelloWorld Launcher after update',
    'update.info': 'Your worlds, mods, progress and accounts will not be lost when updating.',
    'update.btn': 'Update Now',

    'reinstall.title': 'Reinstall HelloWorld Launcher',
    'reinstall.subtitle': 'Redownload and replace all launcher files',
    'reinstall.folder': 'Installation folder',
    'reinstall.info': 'Reinstall will forcefully redownload and extract all files over the existing installation. Your worlds, accounts and game data will not be lost.',
    'reinstall.btn': 'Start Reinstall',

    'uninstall.title': 'Uninstall HelloWorld Launcher',
    'uninstall.subtitle': 'Remove the application from this PC',
    'uninstall.folder': 'Installation folder',
    'uninstall.options': 'Additional options',
    'uninstall.opt_userdata': 'Also remove user data, configuration and cache',
    'uninstall.warning': 'Your worlds, mods and game content will not be lost. However, if you choose to remove user data, your launcher profiles, accounts and configuration will be deleted.',
    'uninstall.btn': 'Uninstall',

    'progress.installing': 'Installing...',
    'progress.updating': 'Updating...',
    'progress.repairing': 'Reinstalling...',
    'progress.uninstalling': 'Uninstalling...',
    'progress.initializing': 'Initializing...',
    'progress.log': 'Log',

    'complete.title.install': 'Installation complete!',
    'complete.msg.install': 'HelloWorld Launcher has been installed successfully.',
    'complete.title.update': 'Update complete!',
    'complete.msg.update': 'HelloWorld Launcher is now up to date.',
    'complete.title.reinstall': 'Reinstall complete!',
    'complete.msg.reinstall': 'All launcher files have been successfully redownloaded and replaced.',
    'complete.title.uninstall': 'Uninstall complete!',
    'complete.msg.uninstall': 'HelloWorld Launcher has been removed from this PC.',
    'complete.open_folder': 'Open folder'
  },
  es: {
    'common.back': 'Atrás',
    'common.browse': 'Examinar',
    'common.close': 'Cerrar',
    'common.minimize': 'Minimizar',
    'common.detecting': 'Detectando...',
    'common.select_folder': 'Seleccionar carpeta...',

    'loading.connecting': 'Conectando...',

    'welcome.title': 'Instalador de HelloWorld Launcher',
    'welcome.subtitle': '¿Qué te gustaría hacer?',
    'welcome.install.title': 'Instalar',
    'welcome.install.desc': 'Configurar HelloWorld Launcher en este PC',
    'welcome.update.title': 'Actualizar',
    'welcome.update.desc': 'Actualizar a la última versión',
    'welcome.reinstall.title': 'Reinstalar',
    'welcome.reinstall.desc': 'Forzar una reinstalación limpia de todos los archivos',
    'welcome.uninstall.title': 'Desinstalar',
    'welcome.uninstall.desc': 'Eliminar HelloWorld Launcher de este PC',
    'welcome.advanced': 'Opciones avanzadas',
    'welcome.advanced.update.desc': 'Especificar una ruta personalizada para actualizar',
    'welcome.advanced.reinstall.desc': 'Reinstalar archivos en una ruta personalizada',
    'welcome.advanced.uninstall.desc': 'Desinstalar desde una ruta personalizada',

    'install.title': 'Instalar HelloWorld Launcher',
    'install.subtitle': 'Elige tus opciones de instalación',
    'install.folder': 'Carpeta de instalación',
    'install.warning_admin': 'Esta carpeta requiere permisos de administrador. El instalador solicitará elevación.',
    'install.options': 'Opciones',
    'install.opt_desktop': 'Crear acceso directo en el escritorio',
    'install.opt_startmenu': 'Crear acceso directo en el Menú Inicio',
    'install.opt_startmenu_linux': 'Crear acceso en el menú de aplicaciones (.desktop)',
    'install.opt_launch': 'Iniciar HelloWorld Launcher después de instalar',
    'install.btn': 'Instalar',

    'update.title': 'Actualizar HelloWorld Launcher',
    'update.subtitle': 'Actualizar a la última versión',
    'update.folder': 'Carpeta de instalación',
    'update.opt_launch': 'Iniciar HelloWorld Launcher después de actualizar',
    'update.info': 'Tus mundos, mods, progreso y cuentas no se perderán al actualizar.',
    'update.btn': 'Actualizar Ahora',

    'reinstall.title': 'Reinstalar HelloWorld Launcher',
    'reinstall.subtitle': 'Volver a descargar y reemplazar todos los archivos',
    'reinstall.folder': 'Carpeta de instalación',
    'reinstall.info': 'La reinstalación descargará y extraerá a la fuerza todos los archivos sobre la instalación existente. Tus mundos, cuentas y datos del juego no se perderán.',
    'reinstall.btn': 'Iniciar Reinstalación',

    'uninstall.title': 'Desinstalar HelloWorld Launcher',
    'uninstall.subtitle': 'Eliminar la aplicación de este PC',
    'uninstall.folder': 'Carpeta de instalación',
    'uninstall.options': 'Opciones adicionales',
    'uninstall.opt_userdata': 'Eliminar también datos de usuario, configuración y caché',
    'uninstall.warning': 'Tus mundos, mods y contenido del juego no se perderán. Pero si marcas la opción de eliminar datos de usuario, se borrará tu configuración, perfiles y cuentas.',
    'uninstall.btn': 'Desinstalar',

    'progress.installing': 'Instalando...',
    'progress.updating': 'Actualizando...',
    'progress.repairing': 'Reinstalando...',
    'progress.uninstalling': 'Desinstalando...',
    'progress.initializing': 'Inicializando...',
    'progress.log': 'Registro',

    'complete.title.install': '¡Instalación completada!',
    'complete.msg.install': 'HelloWorld Launcher se ha instalado correctamente.',
    'complete.title.update': '¡Actualización completada!',
    'complete.msg.update': 'HelloWorld Launcher ya está actualizado.',
    'complete.title.reinstall': '¡Reinstalación completada!',
    'complete.msg.reinstall': 'Todos los archivos se han descargado y reemplazado con éxito.',
    'complete.title.uninstall': '¡Desinstalación completada!',
    'complete.msg.uninstall': 'HelloWorld Launcher ha sido eliminado de este PC.',
    'complete.open_folder': 'Abrir carpeta'
  },
  fr: {
    'common.back': 'Retour',
    'common.browse': 'Parcourir',
    'common.close': 'Fermer',
    'common.minimize': 'Réduire',
    'common.detecting': 'Détection...',
    'common.select_folder': 'Sélectionner un dossier...',

    'loading.connecting': 'Connexion...',

    'welcome.title': 'Installation de HelloWorld Launcher',
    'welcome.subtitle': 'Que souhaitez-vous faire ?',
    'welcome.install.title': 'Installer',
    'welcome.install.desc': 'Configurer HelloWorld Launcher sur ce PC',
    'welcome.update.title': 'Mettre à jour',
    'welcome.update.desc': 'Mettre à jour vers la dernière version',
    'welcome.reinstall.title': 'Réinstaller',
    'welcome.reinstall.desc': 'Forcer une réinstallation de tous les fichiers',
    'welcome.uninstall.title': 'Désinstaller',
    'welcome.uninstall.desc': 'Supprimer HelloWorld Launcher de ce PC',
    'welcome.advanced': 'Options avancées',
    'welcome.advanced.update.desc': 'Spécifier un chemin personnalisé pour la mise à jour',
    'welcome.advanced.reinstall.desc': 'Réinstaller les fichiers dans un chemin personnalisé',
    'welcome.advanced.uninstall.desc': 'Désinstaller depuis un chemin personnalisé',

    'install.title': 'Installer HelloWorld Launcher',
    'install.subtitle': 'Choisissez vos options d\'installation',
    'install.folder': 'Dossier d\'installation',
    'install.warning_admin': 'Ce dossier nécessite des droits d\'administrateur. Le programme d\'installation demandera une élévation.',
    'install.options': 'Options',
    'install.opt_desktop': 'Créer un raccourci sur le bureau',
    'install.opt_startmenu': 'Créer un raccourci dans le menu Démarrer',
    'install.opt_startmenu_linux': 'Créer une entrée dans le menu des applications (.desktop)',
    'install.opt_launch': 'Lancer HelloWorld Launcher après l\'installation',
    'install.btn': 'Installer',

    'update.title': 'Mettre à jour HelloWorld Launcher',
    'update.subtitle': 'Mettre à jour vers la dernière version',
    'update.folder': 'Dossier d\'installation',
    'update.opt_launch': 'Lancer HelloWorld Launcher après la mise à jour',
    'update.info': 'Vos mondes, mods, progrès et comptes ne seront pas perdus lors de la mise à jour.',
    'update.btn': 'Mettre à jour',

    'reinstall.title': 'Réinstaller HelloWorld Launcher',
    'reinstall.subtitle': 'Retélécharger et remplacer tous les fichiers',
    'reinstall.folder': 'Dossier d\'installation',
    'reinstall.info': 'La réinstallation téléchargera et extraira de force tous les fichiers sur l\'installation existante. Vos mondes, comptes et données de jeu ne seront pas perdus.',
    'reinstall.btn': 'Démarrer la réinstallation',

    'uninstall.title': 'Désinstaller HelloWorld Launcher',
    'uninstall.subtitle': 'Supprimer l\'application de ce PC',
    'uninstall.folder': 'Dossier d\'installation',
    'uninstall.options': 'Options supplémentaires',
    'uninstall.opt_userdata': 'Supprimer également les données utilisateur, la configuration et le cache',
    'uninstall.warning': 'Vos mondes, mods et contenu de jeu ne seront pas perdus. Cependant, si vous choisissez de supprimer les données utilisateur, vos profils et comptes seront supprimés.',
    'uninstall.btn': 'Désinstaller',

    'progress.installing': 'Installation...',
    'progress.updating': 'Mise à jour...',
    'progress.repairing': 'Réparation...',
    'progress.uninstalling': 'Désinstallation...',
    'progress.initializing': 'Initialisation...',
    'progress.log': 'Journal',

    'complete.title.install': 'Installation terminée !',
    'complete.msg.install': 'HelloWorld Launcher a été installé avec succès.',
    'complete.title.update': 'Mise à jour terminée !',
    'complete.msg.update': 'HelloWorld Launcher est maintenant à jour.',
    'complete.title.reinstall': 'Réinstallation terminée !',
    'complete.msg.reinstall': 'Tous les fichiers ont été retéléchargés et remplacés avec succès.',
    'complete.title.uninstall': 'Désinstallation terminée !',
    'complete.msg.uninstall': 'HelloWorld Launcher a été supprimé de ce PC.',
    'complete.open_folder': 'Ouvrir le dossier'
  },
  de: {
    'common.back': 'Zurück',
    'common.browse': 'Durchsuchen',
    'common.close': 'Schließen',
    'common.minimize': 'Minimieren',
    'common.detecting': 'Erkennung läuft...',
    'common.select_folder': 'Ordner auswählen...',

    'loading.connecting': 'Verbinden...',

    'welcome.title': 'HelloWorld Launcher Setup',
    'welcome.subtitle': 'Was möchten Sie tun?',
    'welcome.install.title': 'Installieren',
    'welcome.install.desc': 'HelloWorld Launcher auf diesem PC einrichten',
    'welcome.update.title': 'Aktualisieren',
    'welcome.update.desc': 'Auf die neueste Version aktualisieren',
    'welcome.reinstall.title': 'Neu installieren',
    'welcome.reinstall.desc': 'Alle Dateien zwingend neu herunterladen',
    'welcome.uninstall.title': 'Deinstallieren',
    'welcome.uninstall.desc': 'HelloWorld Launcher von diesem PC entfernen',
    'welcome.advanced': 'Erweiterte Optionen',
    'welcome.advanced.update.desc': 'Einen benutzerdefinierten Pfad für die Aktualisierung angeben',
    'welcome.advanced.reinstall.desc': 'Dateien in einem benutzerdefinierten Pfad neu installieren',
    'welcome.advanced.uninstall.desc': 'Aus einem benutzerdefinierten Pfad deinstallieren',

    'install.title': 'HelloWorld Launcher installieren',
    'install.subtitle': 'Wählen Sie Ihre Installationsoptionen',
    'install.folder': 'Installationsordner',
    'install.warning_admin': 'Dieser Ordner erfordert Administratorrechte. Das Setup wird Berechtigungen anfordern.',
    'install.options': 'Optionen',
    'install.opt_desktop': 'Desktop-Verknüpfung erstellen',
    'install.opt_startmenu': 'Startmenü-Verknüpfung erstellen',
    'install.opt_startmenu_linux': 'Anwendungsmenü-Eintrag erstellen (.desktop)',
    'install.opt_launch': 'HelloWorld Launcher nach der Installation starten',
    'install.btn': 'Installieren',

    'update.title': 'HelloWorld Launcher aktualisieren',
    'update.subtitle': 'Auf die neueste Version aktualisieren',
    'update.folder': 'Installationsordner',
    'update.opt_launch': 'HelloWorld Launcher nach dem Update starten',
    'update.info': 'Ihre Welten, Mods, Fortschritte und Konten gehen beim Aktualisieren nicht verloren.',
    'update.btn': 'Jetzt aktualisieren',

    'reinstall.title': 'HelloWorld Launcher neu installieren',
    'reinstall.subtitle': 'Alle Dateien neu herunterladen und ersetzen',
    'reinstall.folder': 'Installationsordner',
    'reinstall.info': 'Die Neuinstallation lädt alle Dateien zwingend neu herunter. Ihre Welten, Konten und Spieldaten gehen nicht verloren.',
    'reinstall.btn': 'Neuinstallation starten',

    'uninstall.title': 'HelloWorld Launcher deinstallieren',
    'uninstall.subtitle': 'Die Anwendung von diesem PC entfernen',
    'uninstall.folder': 'Installationsordner',
    'uninstall.options': 'Zusätzliche Optionen',
    'uninstall.opt_userdata': 'Auch Benutzerdaten, Konfiguration und Cache entfernen',
    'uninstall.warning': 'Ihre Welten, Mods und Spielinhalte gehen nicht verloren. Wenn Sie jedoch Benutzerdaten entfernen, werden Ihre Konten und Konfigurationen gelöscht.',
    'uninstall.btn': 'Deinstallieren',

    'progress.installing': 'Installieren...',
    'progress.updating': 'Aktualisieren...',
    'progress.repairing': 'Neu installieren...',
    'progress.uninstalling': 'Deinstallieren...',
    'progress.initializing': 'Initialisieren...',
    'progress.log': 'Protokoll',

    'complete.title.install': 'Installation abgeschlossen!',
    'complete.msg.install': 'HelloWorld Launcher wurde erfolgreich installiert.',
    'complete.title.update': 'Aktualisierung abgeschlossen!',
    'complete.msg.update': 'HelloWorld Launcher ist nun auf dem neuesten Stand.',
    'complete.title.reinstall': 'Neuinstallation abgeschlossen!',
    'complete.msg.reinstall': 'Alle Dateien wurden erfolgreich neu heruntergeladen und ersetzt.',
    'complete.title.uninstall': 'Deinstallation abgeschlossen!',
    'complete.msg.uninstall': 'HelloWorld Launcher wurde von diesem PC entfernt.',
    'complete.open_folder': 'Ordner öffnen'
  },
  ja: {
    'common.back': '戻る',
    'common.browse': '参照',
    'common.close': '閉じる',
    'common.minimize': '最小化',
    'common.detecting': '検出中...',
    'common.select_folder': 'フォルダーを選択...',

    'loading.connecting': '接続中...',

    'welcome.title': 'HelloWorld Launcher セットアップ',
    'welcome.subtitle': '何をしますか？',
    'welcome.install.title': 'インストール',
    'welcome.install.desc': 'このPCに HelloWorld Launcher をセットアップします',
    'welcome.update.title': 'アップデート',
    'welcome.update.desc': '最新バージョンにアップデートします',
    'welcome.reinstall.title': '再インストール',
    'welcome.reinstall.desc': 'すべてのファイルを強制的に再ダウンロードします',
    'welcome.uninstall.title': 'アンインストール',
    'welcome.uninstall.desc': 'このPCから HelloWorld Launcher を削除します',
    'welcome.advanced': '詳細オプション',
    'welcome.advanced.update.desc': 'カスタムパスを指定してアップデートします',
    'welcome.advanced.reinstall.desc': 'カスタムパスに再インストールします',
    'welcome.advanced.uninstall.desc': 'カスタムパスからアンインストールします',

    'install.title': 'HelloWorld Launcher をインストール',
    'install.subtitle': 'インストールオプションを選択してください',
    'install.folder': 'インストール先フォルダー',
    'install.warning_admin': 'このフォルダーには管理者権限が必要です。昇格が要求されます。',
    'install.options': 'オプション',
    'install.opt_desktop': 'デスクトップショートカットを作成する',
    'install.opt_startmenu': 'スタートメニューにショートカットを作成する',
    'install.opt_startmenu_linux': 'アプリケーションメニューエントリを作成する (.desktop)',
    'install.opt_launch': 'インストール後に HelloWorld Launcher を起動する',
    'install.btn': 'インストール',

    'update.title': 'HelloWorld Launcher をアップデート',
    'update.subtitle': '最新バージョンにアップデート',
    'update.folder': 'インストール先フォルダー',
    'update.opt_launch': 'アップデート後に HelloWorld Launcher を起動する',
    'update.info': 'アップデートしても、ワールド、MOD、進捗状況、アカウントは失われません。',
    'update.btn': '今すぐアップデート',

    'reinstall.title': 'HelloWorld Launcher を再インストール',
    'reinstall.subtitle': 'すべてのランチャーファイルを再ダウンロードして置き換えます',
    'reinstall.folder': 'インストール先フォルダー',
    'reinstall.info': '再インストールすると、すべてのファイルが強制的に再ダウンロードされます。ワールド、アカウント、ゲームデータは失われません。',
    'reinstall.btn': '再インストールを開始',

    'uninstall.title': 'HelloWorld Launcher をアンインストール',
    'uninstall.subtitle': 'このPCからアプリケーションを削除します',
    'uninstall.folder': 'インストール先フォルダー',
    'uninstall.options': '追加オプション',
    'uninstall.opt_userdata': 'ユーザーデータ、設定、キャッシュも削除する',
    'uninstall.warning': 'ワールド、MOD、ゲームコンテンツは失われません。ただし、ユーザーデータを削除すると、アカウントと設定も削除されます。',
    'uninstall.btn': 'アンインストール',

    'progress.installing': 'インストール中...',
    'progress.updating': 'アップデート中...',
    'progress.repairing': '再インストール中...',
    'progress.uninstalling': 'アンインストール中...',
    'progress.initializing': '初期化中...',
    'progress.log': 'ログ',

    'complete.title.install': 'インストール完了！',
    'complete.msg.install': 'HelloWorld Launcher が正常にインストールされました。',
    'complete.title.update': 'アップデート完了！',
    'complete.msg.update': 'HelloWorld Launcher は最新です。',
    'complete.title.reinstall': '再インストール完了！',
    'complete.msg.reinstall': 'すべてのファイルが正常に再ダウンロードされ、置き換えられました。',
    'complete.title.uninstall': 'アンインストール完了！',
    'complete.msg.uninstall': 'HelloWorld Launcher がこのPCから削除されました。',
    'complete.open_folder': 'フォルダーを開く'
  },
  zh: {
    'common.back': '返回',
    'common.browse': '浏览',
    'common.close': '关闭',
    'common.minimize': '最小化',
    'common.detecting': '检测中...',
    'common.select_folder': '选择文件夹...',

    'loading.connecting': '连接中...',

    'welcome.title': 'HelloWorld Launcher 安装程序',
    'welcome.subtitle': '您想做什么？',
    'welcome.install.title': '安装',
    'welcome.install.desc': '在这台电脑上设置 HelloWorld Launcher',
    'welcome.update.title': '更新',
    'welcome.update.desc': '更新到最新版本',
    'welcome.reinstall.title': '重新安装',
    'welcome.reinstall.desc': '强制重新下载所有文件',
    'welcome.uninstall.title': '卸载',
    'welcome.uninstall.desc': '从这台电脑上移除 HelloWorld Launcher',
    'welcome.advanced': '高级选项',
    'welcome.advanced.update.desc': '指定自定义路径进行更新',
    'welcome.advanced.reinstall.desc': '在自定义路径重新安装文件',
    'welcome.advanced.uninstall.desc': '从自定义路径卸载',

    'install.title': '安装 HelloWorld Launcher',
    'install.subtitle': '选择您的安装选项',
    'install.folder': '安装文件夹',
    'install.warning_admin': '此文件夹需要管理员权限。安装程序将请求提升权限。',
    'install.options': '选项',
    'install.opt_desktop': '创建桌面快捷方式',
    'install.opt_startmenu': '创建开始菜单快捷方式',
    'install.opt_startmenu_linux': '创建应用程序菜单项 (.desktop)',
    'install.opt_launch': '安装后启动 HelloWorld Launcher',
    'install.btn': '安装',

    'update.title': '更新 HelloWorld Launcher',
    'update.subtitle': '更新到最新版本',
    'update.folder': '安装文件夹',
    'update.opt_launch': '更新后启动 HelloWorld Launcher',
    'update.info': '更新时，您的世界、模组、进度和账户不会丢失。',
    'update.btn': '立即更新',

    'reinstall.title': '重新安装 HelloWorld Launcher',
    'reinstall.subtitle': '重新下载并替换所有启动器文件',
    'reinstall.folder': '安装文件夹',
    'reinstall.info': '重新安装将强制重新下载并提取所有文件。您的世界、账户和游戏数据不会丢失。',
    'reinstall.btn': '开始重新安装',

    'uninstall.title': '卸载 HelloWorld Launcher',
    'uninstall.subtitle': '从这台电脑上移除该应用程序',
    'uninstall.folder': '安装文件夹',
    'uninstall.options': '附加选项',
    'uninstall.opt_userdata': '同时移除用户数据、配置和缓存',
    'uninstall.warning': '您的世界、模组和游戏内容不会丢失。但是，如果您选择移除用户数据，您的账户和配置将被删除。',
    'uninstall.btn': '卸载',

    'progress.installing': '安装中...',
    'progress.updating': '更新中...',
    'progress.repairing': '重新安装中...',
    'progress.uninstalling': '卸载中...',
    'progress.initializing': '初始化中...',
    'progress.log': '日志',

    'complete.title.install': '安装完成！',
    'complete.msg.install': 'HelloWorld Launcher 已成功安装。',
    'complete.title.update': '更新完成！',
    'complete.msg.update': 'HelloWorld Launcher 现在是最新的。',
    'complete.title.reinstall': '重新安装完成！',
    'complete.msg.reinstall': '所有文件已成功重新下载并替换。',
    'complete.title.uninstall': '卸载完成！',
    'complete.msg.uninstall': 'HelloWorld Launcher 已从这台电脑上移除。',
    'complete.open_folder': '打开文件夹'
  }
}

class I18nManager {
  constructor() {
    this.locale = 'en'
  }

  init(systemLocale) {
    let target = localStorage.getItem('hwl_setup_locale')
    if (!target) {
      if (systemLocale) {
        const base = systemLocale.split('-')[0].toLowerCase()
        if (dictionaries[base]) target = base
      }
    }
    
    if (!target || !dictionaries[target]) {
      target = 'en'
    }
    
    this.setLocale(target, true)
  }

  setLocale(lang, updateSelect = true) {
    if (dictionaries[lang]) {
      this.locale = lang
      localStorage.setItem('hwl_setup_locale', lang)
      this.translateDOM()
      
      if (updateSelect) {
        const flags = {
          en: 'us', es: 'es', fr: 'fr', de: 'de', ja: 'jp', zh: 'cn'
        }
        const label = document.getElementById('lang-select-label')
        const flag = document.getElementById('lang-select-flag')
        if (label) label.textContent = lang.toUpperCase()
        if (flag && flags[lang]) flag.src = `https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/7.1.0/flags/4x3/${flags[lang]}.svg`
      }
    }
  }

  t(key) {
    const dict = dictionaries[this.locale] || dictionaries['en']
    return dict[key] || key
  }

  translateDOM() {
    const elements = document.querySelectorAll('[data-i18n]')
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n')
      const text = this.t(key)
      
      if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
        el.setAttribute('placeholder', text)
      } else {
        // Find existing SVG icon to preserve it, if any
        const svg = el.querySelector('svg')
        el.textContent = text
        if (svg) el.prepend(svg) // Restore SVG at the beginning
      }
    })
    
    // Specifically handle elements where SVG is inside or before text
    // We already handled prepending in the loop, but sometimes structure is different
    // Wait, the DOM loop textContent replaces everything including SVGs.
    // Let's refine the replacement logic to only update the Text node
    
    // A better approach to translate elements without deleting child nodes:
  }
}

// Let's rewrite translateDOM properly to avoid removing SVGs:
I18nManager.prototype.translateDOM = function() {
  const elements = document.querySelectorAll('[data-i18n]')
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n')
    const text = this.t(key)
    
    if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
      el.setAttribute('placeholder', text)
    } else {
      let hasElements = false;
      for (const node of el.childNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) hasElements = true;
      }
      
      if (!hasElements) {
        el.textContent = text;
      } else {
        let textNode = null;
        for (const node of el.childNodes) {
          if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim() !== '') {
            textNode = node;
          }
        }
        if (textNode) {
          textNode.nodeValue = ' ' + text;
        } else {
          el.appendChild(document.createTextNode(' ' + text));
        }
      }
    }
  })

  const titleElements = document.querySelectorAll('[data-i18n-title]')
  titleElements.forEach(el => {
    el.setAttribute('title', this.t(el.getAttribute('data-i18n-title')))
  })
}

window.I18n = new I18nManager()
