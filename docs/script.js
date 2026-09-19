// === Main Script ===

// === i18n Translation Engine ===
const translations = {
    en: {
        "nav.features": "Features",
        "nav.gallery": "Gallery",
        "nav.faq": "FAQ",
        "nav.download": "Download Now",
        "nav.login": "Log In",
        "nav.edit_profile": "Edit Profile",
        "settings.main_title": "Settings",
        "settings.back_home": "Back to Home",
        "settings.tab_account": "Account",
        "settings.account_title": "Account Settings",
        "settings.account_subtitle": "Manage your player identity, avatar, and public profile details.",
        "settings.live_preview_label": "Player Card Preview",
        "settings.avatar_background_label": "Avatar & Profile Banner",
        "settings.upload_avatar": "Upload Avatar",
        "settings.mc_head": "MC Head",
        "settings.avatar_help": "Images are cropped to 1:1 and resized to 128x128 pixels.",
        "settings.username_label": "Minecraft Username",
        "settings.username_warning": "Changing your username might cause you to lose progress, ranks, and inventory on third-party servers.",
        "settings.country_label": "Country",
        "settings.select_country": "Select your country",
        "settings.biography_label": "Biography (max 500 characters)",
        "settings.biography_placeholder": "Tell us about yourself...",
        "settings.links_label": "Links (title and URL)",
        "settings.add_link": "Add Link",
        "settings.fav_mob_label": "Favorite Mob",
        "settings.fav_mob_placeholder": "E.g. Creeper, Enderman...",
        "settings.tags_label": "Playstyle Tags (pick up to 5)",
        "settings.tags_hint": "Click to select/deselect. Max 5 tags.",
        "settings.logout": "Log Out",
        "settings.save": "Save Changes",
        "settings.saving": "Saving...",
        "settings.saved_btn": "Saved",
        "settings.saved_success": "Account settings updated successfully!",
        "hero.badge": "Download Now Available",
        "hero.badge_available": "Now Available",
        "hero.download_win": "Download for Windows",
        "hero.download_linux": "Download for Linux",
        "review.btn_title": "Leave a Review",
        "review.title": "Leave a Review",
        "review.subtitle": "Tell us what you think about HelloWorld Launcher!",
        "review.rating": "Rating",
        "review.name": "Name",
        "review.name_placeholder": "Your name (optional)",
        "review.comment": "Comment",
        "review.comment_placeholder": "Share your experience...",
        "review.submit": "Submit Review",
        "review.alert_rating": "Please select a star rating!",
        "review.alert_thanks": "Thanks for your review!",
        "review.alert_error": "Error saving review to database. Check console.",
        "hero.title": "Your Minecraft, <br><span class=\"gradient-text\">Without Limits.</span>",
        "hero.subtitle": "The open source launcher designed to be lightweight, secure and completely customizable. Forget about bloatware.",
        "hero.install_ps": "Quick Install (PowerShell)",
        "hero.install_bash": "Quick Install (Bash)",
        "hero.install_note": "One-click install",
        "hero.download_win_btn": "<i class=\"bi bi-windows\"></i> Download for Windows <i class=\"bi bi-chevron-down dropdown-arrow\"></i><div class=\"btn-shine\"></div>",
        "hero.win_setup_title": "Setup x64",
        "hero.win_setup_sub": "Installer (Recommended)",
        "hero.best_option": "Best Option",
        "hero.win_setup_arm_title": "Setup ARM64",
        "hero.win_setup_arm_sub": "Installer for ARM devices",
        "hero.win_port_title": "Portable x64",
        "hero.win_port_sub": "ZIP archive",
        "hero.win_port_arm_title": "Portable ARM64",
        "hero.win_port_arm_sub": "ZIP archive for ARM",
        "hero.download_linux_btn": "<i class=\"fa-brands fa-linux\" style=\"font-size: 1.1rem; margin-right: 5px;\"></i> Download for Linux <i class=\"bi bi-chevron-down dropdown-arrow\"></i>",
        "hero.lin_deb_title": "DEB x64",
        "hero.lin_deb_sub": "Debian/Ubuntu (Recommended)",
        "hero.lin_deb_arm_title": "DEB ARM64",
        "hero.lin_deb_arm_sub": "Debian/Ubuntu for ARM",
        "hero.lin_app_title": "AppImage x64",
        "hero.lin_app_sub": "Universal Linux",
        "hero.lin_app_arm_title": "AppImage ARM64",
        "hero.lin_app_arm_sub": "Universal Linux for ARM",
        "hero.os_warning": "<i class=\"bi bi-info-circle\" style=\"margin-right: 5px;\"></i> You are browsing from <strong><span id=\"detectedOSName\">OS</span></strong>. The following installers may not be compatible.",
        "hero.stats_downloads": "Downloads",
        "hero.stats_rating": "<span style=\"font-size: 0.9rem; font-weight: 500; opacity: 0.9;\">/5 Rating</span>",
        "discord.title": "Join our Community",
        "discord.subtitle": "Get support & updates",
        "hero.stats_opensource": "Open Source",
        "hero.stats_telemetry": "Telemetry",
        "hero.stats_perf_val": "High",
        "hero.stats_perf": "Performance",
        "features.title": "Why HelloWorld?",
        "features.subtitle": "Designed with performance and privacy in mind.",
        "features.f1_title": "Privacy First",
        "features.f1_desc": "No telemetry or trackers. Your activity is yours alone. 100% auditable code on GitHub.",
        "features.f2_title": "Fast Startup",
        "features.f2_desc": "Optimized to start in seconds. Perfect for old or low-end PCs.",
        "features.f3_title": "Mod Management",
        "features.f3_desc": "Install Forge, Fabric and mods directly from the launcher without external tools.",
        "features.f4_title": "Smart Installations",
        "features.f4_desc": "Every installation has its own configuration. Keep your versions and mods organized.",
        "features.f5_title": "Offline Mode",
        "features.f5_desc": "No internet? No problem. Play your installed versions anywhere.",
        "features.f6_title": "Open Source",
        "features.f6_desc": "Total transparency. No hidden installers or added software.",
        "gallery.title": "Gallery",
        "gallery.subtitle": "Take a look at the simple and powerful interface.",
        "faq.title": "Frequently Asked Questions",
        "faq.subtitle": "Everything you need to know.",
        "faq.q1": "Why does it say it has a virus?",
        "faq.a1": "Because the app is not signed (certificates cost money). It's a common false positive in open source apps.",
        "faq.q2": "Is it legal?",
        "faq.a2": "Yes. The launcher uses a legal copy of the game according to Mojang/Microsoft terms.",
        "faq.q3": "Does it support large mods?",
        "faq.a3": "Yes, it supports heavy modpacks as long as your PC has enough resources.",
        "faq.q4": "Does it work without internet?",
        "faq.a4": "Yes, you can use Offline Mode to play versions already downloaded.",
        "faq.q5": "Does it support Fabric and Forge?",
        "faq.a5": "Absolutely. You can create independent installations for each.",
        "footer.desc": "The Minecraft launcher made by the community, for the community.",
        "footer.links": "Links",
        "footer.repo": "Repository",
        "footer.report": "Report Error",
        "footer.prev": "Previous Versions",
        "footer.copy": "&copy; 2026 HelloWorld Launcher. Not affiliated with Mojang or Microsoft.",
        "footer.signpath": "This project uses the <a href=\"https://signpath.org/\" target=\"_blank\" rel=\"noopener noreferrer\">SignPath Foundation</a> for code signing. | <a href=\"https://github.com/Abeloskyyy/HelloWorld-Launcher/blob/main/PRIVACY.md\" target=\"_blank\">Privacy Policy</a>",
        "bg.default": "Default Banner",
        "bg.purple": "Purple Gradient",
        "bg.blue": "Blue Gradient",
        "bg.green": "Green Gradient",
        "bg.orange": "Orange Gradient",
        "bg.pink": "Pink Gradient",
        "cropper.title": "Crop your Avatar",
        "cropper.cancel": "Cancel",
        "cropper.apply": "Apply Crop",
        "global.loading": "Loading services...",
        "country.AR": "Argentina",
        "country.AU": "Australia",
        "country.AT": "Austria",
        "country.BE": "Belgium",
        "country.BR": "Brazil",
        "country.CA": "Canada",
        "country.CL": "Chile",
        "country.CN": "China",
        "country.CO": "Colombia",
        "country.CZ": "Czech Republic",
        "country.DK": "Denmark",
        "country.EG": "Egypt",
        "country.FI": "Finland",
        "country.FR": "France",
        "country.DE": "Germany",
        "country.GR": "Greece",
        "country.HK": "Hong Kong",
        "country.HU": "Hungary",
        "country.IS": "Iceland",
        "country.IN": "India",
        "country.ID": "Indonesia",
        "country.IE": "Ireland",
        "country.IL": "Israel",
        "country.IT": "Italy",
        "country.JP": "Japan",
        "country.LU": "Luxembourg",
        "country.MY": "Malaysia",
        "country.MX": "Mexico",
        "country.NL": "Netherlands",
        "country.NZ": "New Zealand",
        "country.NG": "Nigeria",
        "country.NO": "Norway",
        "country.PE": "Peru",
        "country.PH": "Philippines",
        "country.PL": "Poland",
        "country.PT": "Portugal",
        "country.RO": "Romania",
        "country.RU": "Russia",
        "country.SA": "Saudi Arabia",
        "country.SG": "Singapore",
        "country.ZA": "South Africa",
        "country.KR": "South Korea",
        "country.ES": "Spain",
        "country.SE": "Sweden",
        "country.CH": "Switzerland",
        "country.TH": "Thailand",
        "country.TR": "Turkey",
        "country.UA": "Ukraine",
        "country.AE": "United Arab Emirates",
        "country.GB": "United Kingdom",
        "country.US": "United States",
        "country.VE": "Venezuela",
        "country.VN": "Vietnam",
        "country.OTHER": "Other"
    },
    es: {
        "nav.features": "Características",
        "nav.gallery": "Galería",
        "nav.faq": "FAQ",
        "nav.download": "Descargar Ahora",
        "nav.login": "Iniciar Sesión",
        "nav.edit_profile": "Editar Perfil",
        "settings.main_title": "Ajustes",
        "settings.back_home": "Volver a Inicio",
        "settings.tab_account": "Cuenta",
        "settings.account_title": "Ajustes de Cuenta",
        "settings.account_subtitle": "Gestiona tu identidad de jugador, avatar y detalles de perfil público.",
        "settings.live_preview_label": "Vista Previa de Tarjeta",
        "settings.avatar_background_label": "Avatar y Banner de Perfil",
        "settings.upload_avatar": "Subir Avatar",
        "settings.mc_head": "Cabeza MC",
        "settings.avatar_help": "Las imágenes se recortan a 1:1 y se ajustan a 128x128 píxeles.",
        "settings.username_label": "Nombre de Usuario en Minecraft",
        "settings.username_warning": "Cambiar tu nombre de usuario podría causarte la pérdida de progreso, rangos e inventario en servidores de terceros.",
        "settings.country_label": "País",
        "settings.select_country": "Selecciona tu país",
        "settings.biography_label": "Biografía (máx 500 caracteres)",
        "settings.biography_placeholder": "Cuéntanos sobre ti...",
        "settings.links_label": "Enlaces (título y URL)",
        "settings.add_link": "Añadir Enlace",
        "settings.fav_mob_label": "Mob Favorito",
        "settings.fav_mob_placeholder": "Ej. Creeper, Enderman...",
        "settings.tags_label": "Etiquetas de Juego (elige hasta 5)",
        "settings.tags_hint": "Haz clic para seleccionar/deseleccionar. Máximo 5 etiquetas.",
        "settings.logout": "Cerrar Sesión",
        "settings.save": "Guardar Cambios",
        "settings.saving": "Guardando...",
        "settings.saved_btn": "Guardado",
        "settings.saved_success": "¡Ajustes de cuenta guardados correctamente!",
        "hero.badge": "Descarga ya disponible",
        "hero.badge_available": "Ya Disponible",
        "hero.download_win": "Descargar para Windows",
        "hero.download_linux": "Descargar para Linux",
        "review.btn_title": "Dejar una reseña",
        "review.title": "Deja una Reseña",
        "review.subtitle": "¡Cuéntanos qué te parece HelloWorld Launcher!",
        "review.rating": "Puntuación",
        "review.name": "Nombre",
        "review.name_placeholder": "Tu nombre (opcional)",
        "review.comment": "Comentario",
        "review.comment_placeholder": "Comparte tu experiencia...",
        "review.submit": "Enviar Reseña",
        "review.alert_rating": "¡Por favor, selecciona una puntuación de estrellas!",
        "review.alert_thanks": "¡Gracias por tu reseña!",
        "review.alert_error": "Error al guardar la reseña en la base de datos.",
        "hero.title": "Tu Minecraft, <br><span class=\"gradient-text\">Sin Límites.</span>",
        "hero.subtitle": "El launcher de código abierto diseñado para ser ligero, seguro y completamente personalizable. Olvídate del bloatware.",
        "hero.install_ps": "Instalación Rápida (PowerShell)",
        "hero.install_bash": "Instalación Rápida (Bash)",
        "hero.install_note": "Instala con un click",
        "hero.download_win_btn": "<i class=\"bi bi-windows\"></i> Descargar para Windows <i class=\"bi bi-chevron-down dropdown-arrow\"></i><div class=\"btn-shine\"></div>",
        "hero.win_setup_title": "Instalador x64",
        "hero.win_setup_sub": "Instalador (Recomendado)",
        "hero.best_option": "Mejor Opción",
        "hero.win_setup_arm_title": "Instalador ARM64",
        "hero.win_setup_arm_sub": "Instalador para ARM",
        "hero.win_port_title": "Portable x64",
        "hero.win_port_sub": "Archivo ZIP",
        "hero.win_port_arm_title": "Portable ARM64",
        "hero.win_port_arm_sub": "Archivo ZIP para ARM",
        "hero.download_linux_btn": "<i class=\"fa-brands fa-linux\" style=\"font-size: 1.1rem; margin-right: 5px;\"></i> Descargar para Linux <i class=\"bi bi-chevron-down dropdown-arrow\"></i>",
        "hero.lin_deb_title": "DEB x64",
        "hero.lin_deb_sub": "Debian/Ubuntu (Recomendado)",
        "hero.lin_deb_arm_title": "DEB ARM64",
        "hero.lin_deb_arm_sub": "Debian/Ubuntu para ARM",
        "hero.lin_app_title": "AppImage x64",
        "hero.lin_app_sub": "Linux Universal",
        "hero.lin_app_arm_title": "AppImage ARM64",
        "hero.lin_app_arm_sub": "Linux Universal para ARM",
        "hero.os_warning": "<i class=\"bi bi-info-circle\" style=\"margin-right: 5px;\"></i> Estás navegando desde <strong><span id=\"detectedOSName\">OS</span></strong>. Los siguientes instaladores podrían no ser compatibles.",
        "hero.stats_downloads": "Descargas",
        "hero.stats_rating": "<span style=\"font-size: 0.9rem; font-weight: 500; opacity: 0.9;\">/5 Puntuación</span>",
        "discord.title": "Únete a la Comunidad",
        "discord.subtitle": "Soporte y actualizaciones",
        "hero.stats_opensource": "Código Abierto",
        "hero.stats_telemetry": "Telemetría",
        "hero.stats_perf_val": "Alto",
        "hero.stats_perf": "Rendimiento",
        "features.title": "¿Por qué HelloWorld?",
        "features.subtitle": "Diseñado con el rendimiento y la privacidad en mente.",
        "features.f1_title": "Privacidad Ante Todo",
        "features.f1_desc": "Sin telemetría ni rastreadores. Tu actividad es solo tuya. Código 100% auditable en GitHub.",
        "features.f2_title": "Inicio Rápido",
        "features.f2_desc": "Optimizado para iniciar en segundos. Perfecto para PCs antiguos o de bajos recursos.",
        "features.f3_title": "Gestión de Mods",
        "features.f3_desc": "Instala Forge, Fabric y mods directamente desde el launcher sin herramientas externas.",
        "features.f4_title": "Instalaciones Inteligentes",
        "features.f4_desc": "Cada instalación tiene su propia configuración. Mantén tus versiones y mods organizados.",
        "features.f5_title": "Modo Sin Conexión",
        "features.f5_desc": "¿No tienes internet? No hay problema. Juega a tus versiones instaladas en cualquier lugar.",
        "features.f6_title": "Código Abierto",
        "features.f6_desc": "Transparencia total. Sin instaladores ocultos ni software añadido.",
        "gallery.title": "Galería",
        "gallery.subtitle": "Échale un vistazo a su interfaz simple y potente.",
        "faq.title": "Preguntas Frecuentes",
        "faq.subtitle": "Todo lo que necesitas saber.",
        "faq.q1": "¿Por qué dice que tiene un virus?",
        "faq.a1": "Porque la aplicación no está firmada (los certificados cuestan dinero). Es un falso positivo muy común en aplicaciones de código abierto.",
        "faq.q2": "¿Es legal?",
        "faq.a2": "Sí. El launcher usa una copia legal del juego según los términos de Mojang/Microsoft.",
        "faq.q3": "¿Soporta mods pesados?",
        "faq.a3": "Sí, soporta modpacks pesados siempre y cuando tu PC tenga suficientes recursos.",
        "faq.q4": "¿Funciona sin internet?",
        "faq.a4": "Sí, puedes usar el Modo Sin Conexión para jugar a versiones que ya hayas descargado.",
        "faq.q5": "¿Soporta Fabric y Forge?",
        "faq.a5": "Totalmente. Puedes crear instalaciones independientes para cada uno.",
        "footer.desc": "El launcher de Minecraft hecho por la comunidad, para la comunidad.",
        "footer.links": "Enlaces",
        "footer.repo": "Repositorio",
        "footer.report": "Reportar Error",
        "footer.prev": "Versiones Anteriores",
        "footer.copy": "&copy; 2026 HelloWorld Launcher. No afiliado con Mojang ni Microsoft.",
        "footer.signpath": "Este proyecto usa <a href=\"https://signpath.org/\" target=\"_blank\" rel=\"noopener noreferrer\">SignPath Foundation</a> para la firma de código. | <a href=\"https://github.com/Abeloskyyy/HelloWorld-Launcher/blob/main/PRIVACY.md\" target=\"_blank\">Política de Privacidad</a>",
        "bg.default": "Banner Predeterminado",
        "bg.purple": "Degradado Púrpura",
        "bg.blue": "Degradado Azul",
        "bg.green": "Degradado Verde",
        "bg.orange": "Degradado Naranja",
        "bg.pink": "Degradado Rosa",
        "cropper.title": "Recortar Avatar",
        "cropper.cancel": "Cancelar",
        "cropper.apply": "Aplicar Recorte",
        "global.loading": "Cargando servicios...",
        "country.AR": "Argentina",
        "country.AU": "Australia",
        "country.AT": "Austria",
        "country.BE": "Bélgica",
        "country.BR": "Brasil",
        "country.CA": "Canadá",
        "country.CL": "Chile",
        "country.CN": "China",
        "country.CO": "Colombia",
        "country.CZ": "República Checa",
        "country.DK": "Dinamarca",
        "country.EG": "Egipto",
        "country.FI": "Finlandia",
        "country.FR": "Francia",
        "country.DE": "Alemania",
        "country.GR": "Grecia",
        "country.HK": "Hong Kong",
        "country.HU": "Hungría",
        "country.IS": "Islandia",
        "country.IN": "India",
        "country.ID": "Indonesia",
        "country.IE": "Irlanda",
        "country.IL": "Israel",
        "country.IT": "Italia",
        "country.JP": "Japón",
        "country.LU": "Luxemburgo",
        "country.MY": "Malasia",
        "country.MX": "México",
        "country.NL": "Países Bajos",
        "country.NZ": "Nueva Zelanda",
        "country.NG": "Nigeria",
        "country.NO": "Noruega",
        "country.PE": "Perú",
        "country.PH": "Filipinas",
        "country.PL": "Polonia",
        "country.PT": "Portugal",
        "country.RO": "Rumanía",
        "country.RU": "Rusia",
        "country.SA": "Arabia Saudí",
        "country.SG": "Singapur",
        "country.ZA": "Sudáfrica",
        "country.KR": "Corea del Sur",
        "country.ES": "España",
        "country.SE": "Suecia",
        "country.CH": "Suiza",
        "country.TH": "Tailandia",
        "country.TR": "Turquía",
        "country.UA": "Ucrania",
        "country.AE": "Emiratos Árabes Unidos",
        "country.GB": "Reino Unido",
        "country.US": "Estados Unidos",
        "country.VE": "Venezuela",
        "country.VN": "Vietnam",
        "country.OTHER": "Otro"
    },
    fr: {
        "nav.features": "Fonctionnalités",
        "nav.gallery": "Galerie",
        "nav.faq": "FAQ",
        "nav.download": "Télécharger",
        "nav.login": "Se Connecter",
        "nav.edit_profile": "Modifier le Profil",
        "settings.main_title": "Paramètres",
        "settings.back_home": "Retour à l'accueil",
        "settings.tab_account": "Compte",
        "settings.account_title": "Paramètres du Compte",
        "settings.account_subtitle": "Gérez votre identité de joueur, votre avatar et vos informations de profil.",
        "settings.live_preview_label": "Aperçu de la Carte",
        "settings.avatar_background_label": "Avatar & Bannière de Profil",
        "settings.upload_avatar": "Télécharger Avatar",
        "settings.mc_head": "Tête MC",
        "settings.avatar_help": "Les images sont recadrées en 1:1 et redimensionnées à 128x128 pixels.",
        "settings.username_label": "Pseudo Minecraft",
        "settings.username_warning": "Changer votre pseudo peut entraîner la perte de progression, de rangs et d'inventaire sur des serveurs tiers.",
        "settings.country_label": "Pays",
        "settings.select_country": "Sélectionnez votre pays",
        "settings.biography_label": "Biographie (max 500 caractères)",
        "settings.biography_placeholder": "Parlez-nous de vous...",
        "settings.links_label": "Liens (titre et URL)",
        "settings.add_link": "Ajouter un Lien",
        "settings.fav_mob_label": "Mob Favori",
        "settings.fav_mob_placeholder": "Ex. Creeper, Enderman...",
        "settings.tags_label": "Étiquettes de Jeu (choisissez jusqu'à 5)",
        "settings.tags_hint": "Cliquez pour sélectionner/désélectionner. Max 5 étiquettes.",
        "settings.logout": "Se Déconnecter",
        "settings.save": "Sauvegarder",
        "settings.saving": "Sauvegarde...",
        "settings.saved_success": "Paramètres mis à jour avec succès!",
        "bg.default": "Bannière par Défaut",
        "bg.purple": "Dégradé Violet",
        "bg.blue": "Dégradé Bleu",
        "bg.green": "Dégradé Vert",
        "bg.orange": "Dégradé Orange",
        "bg.pink": "Dégradé Rose",
        "cropper.title": "Rogner l'Avatar",
        "cropper.cancel": "Annuler",
        "cropper.apply": "Appliquer",
        "global.loading": "Chargement des services..."
    },
    de: {
        "nav.features": "Features",
        "nav.gallery": "Galerie",
        "nav.faq": "FAQ",
        "nav.download": "Jetzt Herunterladen",
        "nav.login": "Anmelden",
        "nav.edit_profile": "Profil Bearbeiten",
        "settings.main_title": "Einstellungen",
        "settings.back_home": "Zurück zur Startseite",
        "settings.tab_account": "Konto",
        "settings.account_title": "Kontoeinstellungen",
        "settings.account_subtitle": "Verwalte deine Spieleridentität, deinen Avatar und dein öffentliches Profil.",
        "settings.live_preview_label": "Spielerkartenvorschau",
        "settings.avatar_background_label": "Avatar & Profilbanner",
        "settings.upload_avatar": "Avatar Hochladen",
        "settings.mc_head": "MC-Kopf",
        "settings.avatar_help": "Bilder werden auf 1:1 zugeschnitten und auf 128x128 Pixel skaliert.",
        "settings.username_label": "Minecraft-Benutzername",
        "settings.username_warning": "Das Ändern deines Benutzernamens kann zum Verlust von Fortschritt, Rängen und Inventar auf Drittanbieter-Servern führen.",
        "settings.country_label": "Land",
        "settings.select_country": "Wähle dein Land",
        "settings.biography_label": "Biografie (max. 500 Zeichen)",
        "settings.biography_placeholder": "Erzähl uns von dir...",
        "settings.links_label": "Links (Titel und URL)",
        "settings.add_link": "Link Hinzufügen",
        "settings.fav_mob_label": "Lieblings-Mob",
        "settings.fav_mob_placeholder": "Z.B. Creeper, Enderman...",
        "settings.tags_label": "Spielstil-Tags (bis zu 5 wählen)",
        "settings.tags_hint": "Klicken zum Auswählen/Abwählen. Max. 5 Tags.",
        "settings.logout": "Abmelden",
        "settings.save": "Änderungen Speichern",
        "settings.saving": "Speichern...",
        "settings.saved_success": "Kontoeinstellungen erfolgreich aktualisiert!",
        "bg.default": "Standard-Banner",
        "bg.purple": "Lila Farbverlauf",
        "bg.blue": "Blauer Farbverlauf",
        "bg.green": "Grüner Farbverlauf",
        "bg.orange": "Oranger Farbverlauf",
        "bg.pink": "Rosa Farbverlauf",
        "cropper.title": "Avatar Zuschneiden",
        "cropper.cancel": "Abbrechen",
        "cropper.apply": "Anwenden",
        "global.loading": "Dienste werden geladen..."
    },
    pt: {
        "nav.features": "Recursos",
        "nav.gallery": "Galeria",
        "nav.faq": "Perguntas Frequentes",
        "nav.download": "Baixar Agora",
        "nav.login": "Entrar",
        "nav.edit_profile": "Editar Perfil",
        "settings.main_title": "Configurações",
        "settings.back_home": "Voltar ao Início",
        "settings.tab_account": "Conta",
        "settings.account_title": "Configurações de Conta",
        "settings.account_subtitle": "Gerencie sua identidade de jogador, avatar e detalhes do perfil público.",
        "settings.live_preview_label": "Prévia do Card",
        "settings.avatar_background_label": "Avatar e Banner do Perfil",
        "settings.upload_avatar": "Enviar Avatar",
        "settings.mc_head": "Cabeça MC",
        "settings.avatar_help": "As imagens são cortadas em 1:1 e redimensionadas para 128x128 pixels.",
        "settings.username_label": "Nome de Usuário Minecraft",
        "settings.username_warning": "Alterar seu nome de usuário pode causar perda de progresso, ranks e inventário em servidores de terceiros.",
        "settings.country_label": "País",
        "settings.select_country": "Selecione seu país",
        "settings.biography_label": "Biografia (máx 500 caracteres)",
        "settings.biography_placeholder": "Conte-nos sobre você...",
        "settings.links_label": "Links (título e URL)",
        "settings.add_link": "Adicionar Link",
        "settings.fav_mob_label": "Mob Favorito",
        "settings.fav_mob_placeholder": "Ex. Creeper, Enderman...",
        "settings.tags_label": "Tags de Estilo de Jogo (até 5)",
        "settings.tags_hint": "Clique para selecionar/desselecionar. Máx 5 tags.",
        "settings.logout": "Sair",
        "settings.save": "Salvar Alterações",
        "settings.saving": "Salvando...",
        "settings.saved_success": "Configurações atualizadas com sucesso!",
        "bg.default": "Banner Padrão",
        "bg.purple": "Gradiente Roxo",
        "bg.blue": "Gradiente Azul",
        "bg.green": "Gradiente Verde",
        "bg.orange": "Gradiente Laranja",
        "bg.pink": "Gradiente Rosa",
        "cropper.title": "Recortar Avatar",
        "cropper.cancel": "Cancelar",
        "cropper.apply": "Aplicar Recorte",
        "global.loading": "Carregando serviços..."
    },
    it: {
        "nav.features": "Funzionalità",
        "nav.gallery": "Galleria",
        "nav.faq": "FAQ",
        "nav.download": "Scarica Ora",
        "nav.login": "Accedi",
        "nav.edit_profile": "Modifica Profilo",
        "settings.main_title": "Impostazioni",
        "settings.back_home": "Torna alla Home",
        "settings.tab_account": "Account",
        "settings.account_title": "Impostazioni Account",
        "settings.account_subtitle": "Gestisci la tua identità giocatore, avatar e dettagli del profilo pubblico.",
        "settings.live_preview_label": "Anteprima Card",
        "settings.avatar_background_label": "Avatar e Banner Profilo",
        "settings.upload_avatar": "Carica Avatar",
        "settings.mc_head": "Testa MC",
        "settings.avatar_help": "Le immagini vengono ritagliate a 1:1 e ridimensionate a 128x128 pixel.",
        "settings.username_label": "Nome Utente Minecraft",
        "settings.username_warning": "Cambiare il tuo nome utente potrebbe causare la perdita di progressi, rank e inventario su server di terze parti.",
        "settings.country_label": "Paese",
        "settings.select_country": "Seleziona il tuo paese",
        "settings.biography_label": "Biografia (max 500 caratteri)",
        "settings.biography_placeholder": "Parlaci di te...",
        "settings.links_label": "Link (titolo e URL)",
        "settings.add_link": "Aggiungi Link",
        "settings.fav_mob_label": "Mob Preferito",
        "settings.fav_mob_placeholder": "Es. Creeper, Enderman...",
        "settings.tags_label": "Tag Stile di Gioco (fino a 5)",
        "settings.tags_hint": "Clicca per selezionare/deselezionare. Max 5 tag.",
        "settings.logout": "Disconnetti",
        "settings.save": "Salva Modifiche",
        "settings.saving": "Salvataggio...",
        "settings.saved_success": "Impostazioni aggiornate con successo!",
        "bg.default": "Banner Predefinito",
        "bg.purple": "Gradiente Viola",
        "bg.blue": "Gradiente Blu",
        "bg.green": "Gradiente Verde",
        "bg.orange": "Gradiente Arancione",
        "bg.pink": "Gradiente Rosa",
        "cropper.title": "Ritaglia Avatar",
        "cropper.cancel": "Annulla",
        "cropper.apply": "Applica Ritaglio",
        "global.loading": "Caricamento servizi..."
    },
    ru: {
        "nav.features": "Функции",
        "nav.gallery": "Галерея",
        "nav.faq": "Вопросы и Ответы",
        "nav.download": "Скачать",
        "nav.login": "Войти",
        "nav.edit_profile": "Редактировать Профиль",
        "settings.main_title": "Настройки",
        "settings.back_home": "Вернуться на Главную",
        "settings.tab_account": "Аккаунт",
        "settings.account_title": "Настройки Аккаунта",
        "settings.account_subtitle": "Управляйте своей игровой идентичностью, аватаром и деталями профиля.",
        "settings.live_preview_label": "Предпросмотр Карточки",
        "settings.avatar_background_label": "Аватар и Баннер Профиля",
        "settings.upload_avatar": "Загрузить Аватар",
        "settings.mc_head": "Голова MC",
        "settings.avatar_help": "Изображения обрезаются до 1:1 и изменяются до 128x128 пикселей.",
        "settings.username_label": "Имя Пользователя Minecraft",
        "settings.username_warning": "Изменение имени пользователя может привести к потере прогресса, рангов и инвентаря на сторонних серверах.",
        "settings.country_label": "Страна",
        "settings.select_country": "Выберите страну",
        "settings.biography_label": "Биография (макс 500 символов)",
        "settings.biography_placeholder": "Расскажите о себе...",
        "settings.links_label": "Ссылки (название и URL)",
        "settings.add_link": "Добавить Ссылку",
        "settings.fav_mob_label": "Любимый Моб",
        "settings.fav_mob_placeholder": "Напр. Крипер, Эндермен...",
        "settings.tags_label": "Теги Стиля Игры (до 5)",
        "settings.tags_hint": "Нажмите для выбора/отмены. Макс 5 тегов.",
        "settings.logout": "Выйти",
        "settings.save": "Сохранить Изменения",
        "settings.saving": "Сохранение...",
        "settings.saved_success": "Настройки успешно обновлены!",
        "bg.default": "Баннер по умолчанию",
        "bg.purple": "Фиолетовый Градиент",
        "bg.blue": "Синий Градиент",
        "bg.green": "Зелёный Градиент",
        "bg.orange": "Оранжевый Градиент",
        "bg.pink": "Розовый Градиент",
        "cropper.title": "Обрезать Аватар",
        "cropper.cancel": "Отмена",
        "cropper.apply": "Применить",
        "global.loading": "Загрузка сервисов..."
    },
    ja: {
        "nav.features": "機能",
        "nav.gallery": "ギャラリー",
        "nav.faq": "よくある質問",
        "nav.download": "今すぐダウンロード",
        "nav.login": "ログイン",
        "nav.edit_profile": "プロフィール編集",
        "settings.main_title": "設定",
        "settings.back_home": "ホームに戻る",
        "settings.tab_account": "アカウント",
        "settings.account_title": "アカウント設定",
        "settings.account_subtitle": "プレイヤーの身元、アバター、公開プロフィールの詳細を管理します。",
        "settings.live_preview_label": "プレイヤーカードプレビュー",
        "settings.avatar_background_label": "アバター＆プロフィールバナー",
        "settings.upload_avatar": "アバターをアップロード",
        "settings.mc_head": "MCヘッド",
        "settings.avatar_help": "画像は1:1にトリミングされ、128x128ピクセルにリサイズされます。",
        "settings.username_label": "Minecraftユーザー名",
        "settings.username_warning": "ユーザー名を変更すると、サードパーティサーバーでの進行状況、ランク、インベントリが失われる可能性があります。",
        "settings.country_label": "国",
        "settings.select_country": "国を選択してください",
        "settings.biography_label": "自己紹介（最大500文字）",
        "settings.biography_placeholder": "自分について教えてください...",
        "settings.links_label": "リンク（タイトルとURL）",
        "settings.add_link": "リンクを追加",
        "settings.fav_mob_label": "お気に入りMob",
        "settings.fav_mob_placeholder": "例：クリーパー、エンダーマン...",
        "settings.tags_label": "プレイスタイルタグ（最大5つ）",
        "settings.tags_hint": "クリックして選択/解除。最大5タグ。",
        "settings.logout": "ログアウト",
        "settings.save": "変更を保存",
        "settings.saving": "保存中...",
        "settings.saved_success": "アカウント設定が更新されました！",
        "bg.default": "デフォルトバナー",
        "bg.purple": "紫グラデーション",
        "bg.blue": "青グラデーション",
        "bg.green": "緑グラデーション",
        "bg.orange": "オレンジグラデーション",
        "bg.pink": "ピンクグラデーション",
        "cropper.title": "アバターをトリミング",
        "cropper.cancel": "キャンセル",
        "cropper.apply": "適用",
        "global.loading": "サービスを読み込み中..."
    },
    zh: {
        "nav.features": "功能",
        "nav.gallery": "图库",
        "nav.faq": "常见问题",
        "nav.download": "立即下载",
        "nav.login": "登录",
        "nav.edit_profile": "编辑资料",
        "settings.main_title": "设置",
        "settings.back_home": "返回首页",
        "settings.tab_account": "账户",
        "settings.account_title": "账户设置",
        "settings.account_subtitle": "管理您的玩家身份、头像和公开资料详情。",
        "settings.live_preview_label": "玩家卡预览",
        "settings.avatar_background_label": "头像和个人横幅",
        "settings.upload_avatar": "上传头像",
        "settings.mc_head": "MC头像",
        "settings.avatar_help": "图片将被裁剪为1:1并调整为128x128像素。",
        "settings.username_label": "Minecraft用户名",
        "settings.username_warning": "更改用户名可能导致在第三方服务器上失去进度、等级和物品栏。",
        "settings.country_label": "国家",
        "settings.select_country": "选择您的国家",
        "settings.biography_label": "简介（最多500字符）",
        "settings.biography_placeholder": "告诉我们关于您的信息...",
        "settings.links_label": "链接（标题和URL）",
        "settings.add_link": "添加链接",
        "settings.fav_mob_label": "最喜欢的生物",
        "settings.fav_mob_placeholder": "例如：苦力怕、末影人...",
        "settings.tags_label": "游戏风格标签（最多5个）",
        "settings.tags_hint": "点击选择/取消选择。最多5个标签。",
        "settings.logout": "退出登录",
        "settings.save": "保存更改",
        "settings.saving": "保存中...",
        "settings.saved_success": "账户设置已成功更新！",
        "bg.default": "默认横幅",
        "bg.purple": "紫色渐变",
        "bg.blue": "蓝色渐变",
        "bg.green": "绿色渐变",
        "bg.orange": "橙色渐变",
        "bg.pink": "粉色渐变",
        "cropper.title": "裁剪头像",
        "cropper.cancel": "取消",
        "cropper.apply": "应用裁剪",
        "global.loading": "加载服务中..."
    },
    ko: {
        "nav.features": "기능",
        "nav.gallery": "갤러리",
        "nav.faq": "자주 묻는 질문",
        "nav.download": "지금 다운로드",
        "nav.login": "로그인",
        "nav.edit_profile": "프로필 편집",
        "settings.main_title": "설정",
        "settings.back_home": "홈으로 돌아가기",
        "settings.tab_account": "계정",
        "settings.account_title": "계정 설정",
        "settings.account_subtitle": "플레이어 정체성, 아바타 및 공개 프로필 세부 정보를 관리합니다.",
        "settings.live_preview_label": "플레이어 카드 미리보기",
        "settings.avatar_background_label": "아바타 및 프로필 배너",
        "settings.upload_avatar": "아바타 업로드",
        "settings.mc_head": "MC 머리",
        "settings.avatar_help": "이미지는 1:1로 잘리고 128x128 픽셀로 크기가 조정됩니다.",
        "settings.username_label": "Minecraft 사용자 이름",
        "settings.username_warning": "사용자 이름을 변경하면 타사 서버에서 진행 상황, 순위 및 인벤토리를 잃을 수 있습니다.",
        "settings.country_label": "국가",
        "settings.select_country": "국가를 선택하세요",
        "settings.biography_label": "자기소개 (최대 500자)",
        "settings.biography_placeholder": "자신에 대해 알려주세요...",
        "settings.links_label": "링크 (제목 및 URL)",
        "settings.add_link": "링크 추가",
        "settings.fav_mob_label": "좋아하는 몹",
        "settings.fav_mob_placeholder": "예: 크리퍼, 엔더맨...",
        "settings.tags_label": "플레이 스타일 태그 (최대 5개)",
        "settings.tags_hint": "클릭하여 선택/해제. 최대 5개 태그.",
        "settings.logout": "로그아웃",
        "settings.save": "변경 사항 저장",
        "settings.saving": "저장 중...",
        "settings.saved_success": "계정 설정이 성공적으로 업데이트되었습니다!",
        "bg.default": "기본 배너",
        "bg.purple": "보라색 그라데이션",
        "bg.blue": "파란색 그라데이션",
        "bg.green": "초록색 그라데이션",
        "bg.orange": "주황색 그라데이션",
        "bg.pink": "분홍색 그라데이션",
        "cropper.title": "아바타 자르기",
        "cropper.cancel": "취소",
        "cropper.apply": "자르기 적용",
        "global.loading": "서비스 로딩 중..."
    },
    pl: {
        "nav.features": "Funkcje",
        "nav.gallery": "Galeria",
        "nav.faq": "FAQ",
        "nav.download": "Pobierz Teraz",
        "nav.login": "Zaloguj się",
        "nav.edit_profile": "Edytuj Profil",
        "settings.main_title": "Ustawienia",
        "settings.back_home": "Powrót do Strony Głównej",
        "settings.tab_account": "Konto",
        "settings.account_title": "Ustawienia Konta",
        "settings.account_subtitle": "Zarządzaj swoją tożsamością gracza, avatarem i danymi profilu publicznego.",
        "settings.live_preview_label": "Podgląd Karty Gracza",
        "settings.avatar_background_label": "Avatar i Baner Profilu",
        "settings.upload_avatar": "Prześlij Avatar",
        "settings.mc_head": "Głowa MC",
        "settings.avatar_help": "Obrazy są przycinane do formatu 1:1 i skalowane do 128x128 pikseli.",
        "settings.username_label": "Nazwa Użytkownika Minecraft",
        "settings.username_warning": "Zmiana nazwy użytkownika może spowodować utratę postępów, rang i ekwipunku na serwerach zewnętrznych.",
        "settings.country_label": "Kraj",
        "settings.select_country": "Wybierz swój kraj",
        "settings.biography_label": "Biografia (maks. 500 znaków)",
        "settings.biography_placeholder": "Opowiedz nam o sobie...",
        "settings.links_label": "Linki (tytuł i URL)",
        "settings.add_link": "Dodaj Link",
        "settings.fav_mob_label": "Ulubiony Mob",
        "settings.fav_mob_placeholder": "Np. Creeper, Enderman...",
        "settings.tags_label": "Tagi Stylu Gry (wybierz do 5)",
        "settings.tags_hint": "Kliknij aby wybrać/odznaczyć. Maks 5 tagów.",
        "settings.logout": "Wyloguj się",
        "settings.save": "Zapisz Zmiany",
        "settings.saving": "Zapisywanie...",
        "settings.saved_success": "Ustawienia konta zaktualizowane pomyślnie!",
        "bg.default": "Domyślny Baner",
        "bg.purple": "Fioletowy Gradient",
        "bg.blue": "Niebieski Gradient",
        "bg.green": "Zielony Gradient",
        "bg.orange": "Pomarańczowy Gradient",
        "bg.pink": "Różowy Gradient",
        "cropper.title": "Przytnij Avatar",
        "cropper.cancel": "Anuluj",
        "cropper.apply": "Zastosuj Przycinanie",
        "global.loading": "Ładowanie usług..."
    },
    nl: {
        "nav.features": "Functies",
        "nav.gallery": "Galerij",
        "nav.faq": "Veelgestelde Vragen",
        "nav.download": "Nu Downloaden",
        "nav.login": "Inloggen",
        "nav.edit_profile": "Profiel Bewerken",
        "settings.main_title": "Instellingen",
        "settings.back_home": "Terug naar Home",
        "settings.tab_account": "Account",
        "settings.account_title": "Accountinstellingen",
        "settings.account_subtitle": "Beheer uw spelersidentiteit, avatar en openbare profielgegevens.",
        "settings.live_preview_label": "Spelerskaart Voorbeeld",
        "settings.avatar_background_label": "Avatar en Profielbanner",
        "settings.upload_avatar": "Avatar Uploaden",
        "settings.mc_head": "MC Hoofd",
        "settings.avatar_help": "Afbeeldingen worden bijgesneden tot 1:1 en vergroot/verkleind naar 128x128 pixels.",
        "settings.username_label": "Minecraft Gebruikersnaam",
        "settings.username_warning": "Het wijzigen van uw gebruikersnaam kan leiden tot verlies van voortgang, rangen en inventaris op servers van derden.",
        "settings.country_label": "Land",
        "settings.select_country": "Selecteer uw land",
        "settings.biography_label": "Biografie (max 500 tekens)",
        "settings.biography_placeholder": "Vertel ons over uzelf...",
        "settings.links_label": "Links (titel en URL)",
        "settings.add_link": "Link Toevoegen",
        "settings.fav_mob_label": "Favoriete Mob",
        "settings.fav_mob_placeholder": "Bijv. Creeper, Enderman...",
        "settings.tags_label": "Speelstijl Tags (kies max 5)",
        "settings.tags_hint": "Klik om te selecteren/deselecteren. Max 5 tags.",
        "settings.logout": "Uitloggen",
        "settings.save": "Wijzigingen Opslaan",
        "settings.saving": "Opslaan...",
        "settings.saved_success": "Accountinstellingen succesvol bijgewerkt!",
        "bg.default": "Standaard Banner",
        "bg.purple": "Paars Verloop",
        "bg.blue": "Blauw Verloop",
        "bg.green": "Groen Verloop",
        "bg.orange": "Oranje Verloop",
        "bg.pink": "Roze Verloop",
        "cropper.title": "Avatar Bijsnijden",
        "cropper.cancel": "Annuleren",
        "cropper.apply": "Bijsnijden Toepassen",
        "global.loading": "Services laden..."
    },
    tr: {
        "nav.features": "Özellikler",
        "nav.gallery": "Galeri",
        "nav.faq": "Sık Sorulan Sorular",
        "nav.download": "Şimdi İndir",
        "nav.login": "Giriş Yap",
        "nav.edit_profile": "Profili Düzenle",
        "settings.main_title": "Ayarlar",
        "settings.back_home": "Ana Sayfaya Dön",
        "settings.tab_account": "Hesap",
        "settings.account_title": "Hesap Ayarları",
        "settings.account_subtitle": "Oyuncu kimliğinizi, avatarınızı ve genel profil bilgilerinizi yönetin.",
        "settings.live_preview_label": "Oyuncu Kartı Önizlemesi",
        "settings.avatar_background_label": "Avatar ve Profil Başlığı",
        "settings.upload_avatar": "Avatar Yükle",
        "settings.mc_head": "MC Kafası",
        "settings.avatar_help": "Görseller 1:1 olarak kırpılır ve 128x128 piksele yeniden boyutlandırılır.",
        "settings.username_label": "Minecraft Kullanıcı Adı",
        "settings.username_warning": "Kullanıcı adınızı değiştirmek, üçüncü taraf sunucularda ilerleme, rütbe ve envanter kaybına neden olabilir.",
        "settings.country_label": "Ülke",
        "settings.select_country": "Ülkenizi seçin",
        "settings.biography_label": "Biyografi (maks 500 karakter)",
        "settings.biography_placeholder": "Kendiniz hakkında bize bilgi verin...",
        "settings.links_label": "Bağlantılar (başlık ve URL)",
        "settings.add_link": "Bağlantı Ekle",
        "settings.fav_mob_label": "Favori Yaratık",
        "settings.fav_mob_placeholder": "Örn. Creeper, Enderman...",
        "settings.tags_label": "Oyun Stili Etiketleri (en fazla 5)",
        "settings.tags_hint": "Seçmek/seçimi kaldırmak için tıklayın. Maks 5 etiket.",
        "settings.logout": "Çıkış Yap",
        "settings.save": "Değişiklikleri Kaydet",
        "settings.saving": "Kaydediliyor...",
        "settings.saved_success": "Hesap ayarları başarıyla güncellendi!",
        "bg.default": "Varsayılan Başlık",
        "bg.purple": "Mor Gradyan",
        "bg.blue": "Mavi Gradyan",
        "bg.green": "Yeşil Gradyan",
        "bg.orange": "Turuncu Gradyan",
        "bg.pink": "Pembe Gradyan",
        "cropper.title": "Avatarı Kırp",
        "cropper.cancel": "İptal",
        "cropper.apply": "Kırpmayı Uygula",
        "global.loading": "Servisler yükleniyor..."
    },
    ar: {
        "nav.features": "الميزات",
        "nav.gallery": "المعرض",
        "nav.faq": "الأسئلة الشائعة",
        "nav.download": "تحميل الآن",
        "nav.login": "تسجيل الدخول",
        "nav.edit_profile": "تعديل الملف الشخصي",
        "settings.main_title": "الإعدادات",
        "settings.back_home": "العودة للرئيسية",
        "settings.tab_account": "الحساب",
        "settings.account_title": "إعدادات الحساب",
        "settings.account_subtitle": "إدارة هوية اللاعب والصورة الرمزية وتفاصيل الملف الشخصي العام.",
        "settings.live_preview_label": "معاينة بطاقة اللاعب",
        "settings.avatar_background_label": "الصورة الرمزية ولافتة الملف الشخصي",
        "settings.upload_avatar": "رفع الصورة الرمزية",
        "settings.mc_head": "رأس MC",
        "settings.avatar_help": "يتم اقتصاص الصور بنسبة 1:1 وتغيير حجمها إلى 128x128 بكسل.",
        "settings.username_label": "اسم المستخدم في Minecraft",
        "settings.username_warning": "قد يؤدي تغيير اسم المستخدم إلى فقدان التقدم والرتب والمخزون في خوادم الطرف الثالث.",
        "settings.country_label": "البلد",
        "settings.select_country": "اختر بلدك",
        "settings.biography_label": "السيرة الذاتية (حد أقصى 500 حرف)",
        "settings.biography_placeholder": "أخبرنا عن نفسك...",
        "settings.links_label": "الروابط (العنوان والرابط)",
        "settings.add_link": "إضافة رابط",
        "settings.fav_mob_label": "المخلوق المفضل",
        "settings.fav_mob_placeholder": "مثل: كريبر، إندرمان...",
        "settings.tags_label": "علامات أسلوب اللعب (حتى 5)",
        "settings.tags_hint": "انقر للاختيار/إلغاء الاختيار. حد أقصى 5 علامات.",
        "settings.logout": "تسجيل الخروج",
        "settings.save": "حفظ التغييرات",
        "settings.saving": "جارٍ الحفظ...",
        "settings.saved_success": "تم تحديث إعدادات الحساب بنجاح!",
        "bg.default": "اللافتة الافتراضية",
        "bg.purple": "تدرج بنفسجي",
        "bg.blue": "تدرج أزرق",
        "bg.green": "تدرج أخضر",
        "bg.orange": "تدرج برتقالي",
        "bg.pink": "تدرج وردي",
        "cropper.title": "قص الصورة الرمزية",
        "cropper.cancel": "إلغاء",
        "cropper.apply": "تطبيق القص",
        "global.loading": "جارٍ تحميل الخدمات..."
    }
};

function detectSystemLanguage() {
    const candidateLangs = [];
    if (navigator.languages && navigator.languages.length) {
        candidateLangs.push(...navigator.languages);
    }
    if (navigator.language) candidateLangs.push(navigator.language);
    if (navigator.userLanguage) candidateLangs.push(navigator.userLanguage);

    for (const raw of candidateLangs) {
        if (!raw) continue;
        const code = raw.toLowerCase().split(/[-_]/)[0];
        if (translations[code]) {
            return code;
        }
    }
    return 'en';
}

// User explicitly chose a language via the dropdown button
const userSavedLang = localStorage.getItem('user_selected_lang');
let currentLang = (userSavedLang && translations[userSavedLang]) ? userSavedLang : detectSystemLanguage();

// ===== Lang flag data =====
const LANG_FLAGS = {
    en: { flag: 'https://flagcdn.com/gb.svg', code: 'EN' },
    es: { flag: 'https://flagcdn.com/es.svg', code: 'ES' },
    fr: { flag: 'https://flagcdn.com/fr.svg', code: 'FR' },
    de: { flag: 'https://flagcdn.com/de.svg', code: 'DE' },
    pt: { flag: 'https://flagcdn.com/br.svg', code: 'PT' },
    it: { flag: 'https://flagcdn.com/it.svg', code: 'IT' },
    ru: { flag: 'https://flagcdn.com/ru.svg', code: 'RU' },
    ja: { flag: 'https://flagcdn.com/jp.svg', code: 'JA' },
    zh: { flag: 'https://flagcdn.com/cn.svg', code: 'ZH' },
    ko: { flag: 'https://flagcdn.com/kr.svg', code: 'KO' },
    pl: { flag: 'https://flagcdn.com/pl.svg', code: 'PL' },
    nl: { flag: 'https://flagcdn.com/nl.svg', code: 'NL' },
    tr: { flag: 'https://flagcdn.com/tr.svg', code: 'TR' },
    ar: { flag: 'https://flagcdn.com/sa.svg', code: 'AR' },
};


function changeLanguage(lang) {
    if (!translations[lang]) lang = 'en';
    currentLang = lang;
    localStorage.setItem('lang', lang);

    // Update flag button
    const langFlagImg = document.getElementById('langFlagImg');
    const langCode = document.getElementById('langCode');
    const langChevron = document.getElementById('langChevron');
    const flagData = LANG_FLAGS[lang] || LANG_FLAGS.en;
    if (langFlagImg) { langFlagImg.src = flagData.flag; langFlagImg.alt = flagData.code; }
    if (langCode) langCode.textContent = flagData.code;
    // Mark active option
    document.querySelectorAll('.lang-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    document.querySelectorAll('[data-i18n]').forEach(el => {
        if (el.id === 'navDownloadBtn' || el.id === 'heroDownloadBtn' || el.id === 'heroDownloadLinuxBtn') return;
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang] && translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (translations[lang] && translations[lang][key]) {
            el.title = translations[lang][key];
        }
    });

    if (typeof window.updateNavDownloadBtn === 'function') window.updateNavDownloadBtn();
    if (typeof window.updateHeroButtons === 'function') window.updateHeroButtons();
    const badge = document.querySelector('.badge');
    if (badge && window.currentReleaseTag) {
        badge.textContent = `${window.currentReleaseTag} ${t('hero.badge_available', 'Now Available')}`;
    }
}

function t(key, fallback = '') {
    return (translations[currentLang] && translations[currentLang][key]) || (translations['en'] && translations['en'][key]) || fallback || key;
}

document.addEventListener('DOMContentLoaded', () => {
    changeLanguage(currentLang);

    // Wire up flag dropdown
    const langBtn = document.getElementById('langBtn');
    const langDropdown = document.getElementById('langDropdown');
    const langChevron = document.getElementById('langChevron');

    if (langBtn && langDropdown) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = langDropdown.classList.contains('open');
            document.querySelectorAll('.lang-dropdown.open').forEach(d => d.classList.remove('open'));
            document.querySelectorAll('.lang-chevron.open').forEach(c => c.classList.remove('open'));
            if (!isOpen) {
                langDropdown.classList.add('open');
                if (langChevron) langChevron.classList.add('open');
            }
        });

        langDropdown.addEventListener('click', (e) => e.stopPropagation());

        document.querySelectorAll('.lang-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const selected = btn.dataset.lang;
                localStorage.setItem('user_selected_lang', selected);
                localStorage.setItem('lang', selected);
                changeLanguage(selected);
                langDropdown.classList.remove('open');
                if (langChevron) langChevron.classList.remove('open');
            });
        });
    }

    document.addEventListener('click', () => {
        document.querySelectorAll('.lang-dropdown.open').forEach(d => d.classList.remove('open'));
        document.querySelectorAll('.lang-chevron.open').forEach(c => c.classList.remove('open'));
    });
});


// === Firebase Configuration ===
const firebaseConfig = {
    apiKey: atob("QUl6YVN5QUNYRURPNVI0OEhybHhWQ3l6OGZCR2ltRUlWa1kyUVNN"),
    authDomain: "helloworld-launcher.firebaseapp.com",
    databaseURL: "https://helloworld-launcher-default-rtdb.firebaseio.com",
    projectId: "helloworld-launcher",
    storageBucket: "helloworld-launcher.firebasestorage.app",
    messagingSenderId: "1088760222656",
    appId: "1:1088760222656:web:13aefa81bdecdfdf832e25"
};

// Global Firebase DB Reference
let db;


async function init() {
    // === Initialize Firebase ===
    if (window.firebaseModules) {
        try {
            const app = window.firebaseModules.initializeApp(firebaseConfig);
            db = window.firebaseModules.getDatabase(app);
        } catch (e) {
            console.error('Firebase Init Error:', e);
        }
    } else {
        // Firebase not available - hide loader immediately so page is accessible
        console.warn("Firebase modules not loaded yet.");
        const authLoader = document.getElementById('authLoaderOverlay');
        if (authLoader) {
            setTimeout(() => {
                authLoader.style.transition = 'opacity 0.6s ease';
                authLoader.style.opacity = '0';
                setTimeout(() => authLoader.style.display = 'none', 600);
            }, 200);
        }
    }

    // === Check for Launcher Verification flow ===
    const urlParams = new URLSearchParams(window.location.search);
    const launcherVerifyToken = urlParams.get('verify-token');

    // === HW User Badge System (Web) ===
    const BADGE_DEFS = {
        premium:   { cls: 'hw-badge-premium',   icon: 'fa-dollar-sign', title: 'Premium Account' },
        moderator: { cls: 'hw-badge-moderator', icon: 'fa-wrench',      title: 'Moderator' },
        creator:   { cls: 'hw-badge-creator',   icon: 'fa-crown',       title: 'Creator' },
    };

    const BADGE_ROSETTE_SVG = '<svg class="hw-badge-shape" viewBox="0 0 22 22" aria-hidden="true"><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.887-1.692-.474-.45-1.058-.756-1.692-.887-.633-.13-1.29-.083-1.897.14-.274-.586-.706-1.084-1.246-1.438C12.275 1.808 11.646 1.61 11 1.628c-.646.018-1.275.215-1.816.57-.54.354-.972.852-1.246 1.438-.607-.223-1.264-.27-1.897-.14-.634.131-1.218.437-1.692.887-.45.474-.756 1.058-.887 1.692-.13.633-.083 1.29.14 1.897-.586.274-1.084.706-1.438 1.246C1.808 9.725 1.61 10.354 1.628 11c.018.646.215 1.275.57 1.816.354.54.852.972 1.438 1.246-.223.607-.27 1.264-.14 1.897.131.634.437 1.218.887 1.692.474.45 1.058.756 1.692.887.633.13 1.29.083 1.897-.14.274.586.706 1.084 1.246 1.438.541.355 1.17.552 1.816.57.646-.018 1.275-.215 1.816-.57.54-.354.972-.852 1.246-1.438.607.223 1.264.27 1.897.14.634-.131 1.218-.437 1.692-.887.45-.474.756-1.058.887-1.692.13-.633.083-1.29-.14-1.897.586-.274 1.084-.706 1.438-1.246.355-.541.552-1.17.57-1.816z"/></svg>';

    function renderBadgesHtml(badges, large = false) {
        if (!Array.isArray(badges) || badges.length === 0) return '';
        const lgCls = large ? ' hw-badge-lg' : '';
        const parts = badges
            .filter(b => BADGE_DEFS[b])
            .map(b => {
                const def = BADGE_DEFS[b];
                return `<span class="hw-badge ${def.cls}${lgCls}" title="${def.title}">${BADGE_ROSETTE_SVG}<i class="fas ${def.icon}"></i></span>`;
            });
        return parts.join('');
    }

    function extractUserBadges(data) {
        if (!data) return [];
        let badges = Array.isArray(data.badges) ? [...data.badges] : [];
        if (badges.length === 0 && (data.accountType === 'microsoft' || data.isMs)) {
            badges = ['premium'];
        }
        return badges;
    }

    // Badge priority hierarchy for profile avatar halos (Creator > Moderator > Premium)
    const BADGE_HALO_PRIORITY = {
        creator:   { rank: 3, haloClass: 'hw-halo-creator',   name: 'creator' },
        moderator: { rank: 2, haloClass: 'hw-halo-moderator', name: 'moderator' },
        premium:   { rank: 1, haloClass: 'hw-halo-premium',   name: 'premium' }
    };

    function getHighestPriorityBadge(badges) {
        if (!Array.isArray(badges) || badges.length === 0) return null;
        let highest = null;
        let maxRank = 0;
        for (const b of badges) {
            const key = (typeof b === 'string' ? b : (b && b.id)).toLowerCase();
            const conf = BADGE_HALO_PRIORITY[key];
            if (conf && conf.rank > maxRank) {
                maxRank = conf.rank;
                highest = conf;
            }
        }
        return highest;
    }

    function updateAvatarHalo(wrapper, badges) {
        const el = typeof wrapper === 'string' ? document.getElementById(wrapper) : wrapper;
        if (!el) return;
        el.classList.remove('hw-halo-creator', 'hw-halo-moderator', 'hw-halo-premium');
        const topBadge = getHighestPriorityBadge(badges);
        if (topBadge) {
            el.classList.add(topBadge.haloClass);
        }
    }

    window.renderBadgesHtml = renderBadgesHtml;
    window.updateAvatarHalo = updateAvatarHalo;

    // === Authentication Logic ===
    let auth, firestore, currentUser;
    if (window.firebaseModules) {
        auth = window.firebaseModules.getAuth();
        firestore = window.firebaseModules.getFirestore();

        // Auto-trigger Microsoft verification if launched from the desktop app
        if (launcherVerifyToken) {
            setTimeout(() => autoVerifyFromLauncher(auth, firestore, launcherVerifyToken), 800);
        }
        
        // Listen for auth state
        window.firebaseModules.onAuthStateChanged(auth, async (user) => {
            currentUser = user;
            const navLoginBtn = document.getElementById('navLoginBtn');
            const navUserBadge = document.getElementById('navUserBadge');
            const navUsername = document.getElementById('navUsername');
            const authLoader = document.getElementById('authLoaderOverlay');
            
            // Function to fade out loader when everything is done
            const removeLoader = () => {
                if (authLoader) {
                    setTimeout(() => {
                        authLoader.style.transition = 'opacity 0.6s ease';
                        authLoader.style.opacity = '0';
                        setTimeout(() => authLoader.style.display = 'none', 600);
                    }, 300); // Give stars time to render
                }
            };

            if (user && navLoginBtn && navUserBadge) {
                navLoginBtn.style.display = 'none';
                navUserBadge.style.display = 'flex';
                
                try {
                    const userDoc = await window.firebaseModules.getDoc(window.firebaseModules.doc(firestore, "users", user.uid));
                    const navBadgesRow = document.getElementById('navBadgesRow');
                    const navPremiumBadge = document.getElementById('navPremiumBadge');
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        const username = data.username || (user.email ? user.email.split('@')[0] : 'Player');
                        navUsername.textContent = username;
                        const badges = extractUserBadges(data);
                        if (navBadgesRow) navBadgesRow.innerHTML = renderBadgesHtml(badges, false);
                        if (navPremiumBadge) navPremiumBadge.style.display = badges.includes('premium') ? 'inline-flex' : 'none';
                        const isMs = data.accountType === 'microsoft' || badges.includes('premium');
                        const avatarSrc = data.avatarBase64 || (isMs && data.uuid ? `https://mc-heads.net/avatar/${data.uuid}` : null);
                        await setNavAvatarFromSource(avatarSrc, username);
                    } else {
                        const fallbackName = user.email ? user.email.split('@')[0] : 'Player';
                        navUsername.textContent = fallbackName;
                        if (navBadgesRow) navBadgesRow.innerHTML = '';
                        if (navPremiumBadge) navPremiumBadge.style.display = 'none';
                        await setNavAvatarFromSource(null, fallbackName);
                    }
                } catch(e) {
                    const fallbackName = user && user.email ? user.email.split('@')[0] : 'Player';
                    navUsername.textContent = fallbackName;
                    await setNavAvatarFromSource(null, fallbackName);
                }

                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('edit_profile') === 'true') {
                    if (!window.location.pathname.includes('/settings')) {
                        const basePath = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
                        window.location.href = basePath + 'settings/';
                    }
                }

                if (window.location.pathname.includes('/settings') && window.loadAccountSettings) {
                    window.loadAccountSettings();
                }

            } else if (navLoginBtn && navUserBadge) {
                navLoginBtn.style.display = 'flex';
                navUserBadge.style.display = 'none';
                const navBadgesRow = document.getElementById('navBadgesRow');
                if (navBadgesRow) navBadgesRow.innerHTML = '';
                await setNavAvatarFromSource(null, 'Steve');

                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('register') === 'true') {
                    openAuthModal(true);
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else if (urlParams.get('edit_profile') === 'true' || window.location.pathname.includes('/settings')) {
                    openAuthModal(false);
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }
            
            removeLoader();
        });
    }

    // Modal UI Elements
    const authModal = document.getElementById('authModal');
    const closeAuthModal = document.getElementById('closeAuthModal');
    const navLoginBtn = document.getElementById('navLoginBtn');
    const navUserBadge = document.getElementById('navUserBadge');
    
    // Auth Tabs & Forms
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginError = document.getElementById('loginError');
    const registerError = document.getElementById('registerError');
    const linkToRegister = document.getElementById('linkToRegister');
    const linkToLogin = document.getElementById('linkToLogin');
    const navUserAvatarImg = document.getElementById('navUserAvatarImg');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const linkToForgotPassword = document.getElementById('linkToForgotPassword');
    const linkToLoginFromForgot = document.getElementById('linkToLoginFromForgot');
    const forgotPasswordError = document.getElementById('forgotPasswordError');
    const forgotPasswordSuccess = document.getElementById('forgotPasswordSuccess');

    const DEFAULT_NAV_HEAD = 'https://mc-heads.net/avatar/Steve';
    if (navUserAvatarImg) navUserAvatarImg.src = DEFAULT_NAV_HEAD;

    function clearAuthForms() {
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
        if (loginError) loginError.style.display = 'none';
        if (registerError) registerError.style.display = 'none';
        if (forgotPasswordForm) forgotPasswordForm.reset();
        if (forgotPasswordError) forgotPasswordError.style.display = 'none';
        if (forgotPasswordSuccess) forgotPasswordSuccess.style.display = 'none';
    }

    function openAuthModal(isRegister = false) {
        if (!authModal) return;
        clearAuthForms();
        authModal.classList.add('active');
        if (isRegister) {
            switchToRegister();
        } else {
            switchToLogin();
        }
    }

    function closeAuthModalFunc() {
        if (authModal) {
            authModal.classList.remove('active');
            clearAuthForms();
        }
    }

    if (navLoginBtn) navLoginBtn.addEventListener('click', (e) => { e.preventDefault(); openAuthModal(false); });
    if (closeAuthModal) closeAuthModal.addEventListener('click', closeAuthModalFunc);
    // Password Toggles
    const togglePasswords = document.querySelectorAll('.toggle-password');
    togglePasswords.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = document.getElementById(this.getAttribute('data-target'));
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });

    function switchToRegister() {
        if (tabRegister) {
            tabRegister.style.borderBottomColor = 'var(--primary-color)';
            tabRegister.style.color = 'white';
        }
        if (tabLogin) {
            tabLogin.style.borderBottomColor = 'transparent';
            tabLogin.style.color = 'rgba(255,255,255,0.6)';
            tabLogin.style.display = 'block';
        }
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        if (forgotPasswordForm) forgotPasswordForm.style.display = 'none';
        clearAuthForms();
    }

    function switchToLogin() {
        if (tabLogin) {
            tabLogin.style.borderBottomColor = 'var(--primary-color)';
            tabLogin.style.color = 'white';
            tabLogin.style.display = 'block';
        }
        if (tabRegister) {
            tabRegister.style.borderBottomColor = 'transparent';
            tabRegister.style.color = 'rgba(255,255,255,0.6)';
            tabRegister.style.display = 'block';
        }
        if (registerForm) registerForm.style.display = 'none';
        if (loginForm) loginForm.style.display = 'block';
        if (forgotPasswordForm) forgotPasswordForm.style.display = 'none';
        clearAuthForms();
    }

    function switchToForgotPassword() {
        if (tabLogin) tabLogin.style.display = 'none';
        if (tabRegister) tabRegister.style.display = 'none';
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'none';
        if (forgotPasswordForm) forgotPasswordForm.style.display = 'block';
        clearAuthForms();
    }

    if (tabLogin) tabLogin.addEventListener('click', switchToLogin);
    if (tabRegister) tabRegister.addEventListener('click', switchToRegister);
    if (linkToRegister) linkToRegister.addEventListener('click', (e) => { e.preventDefault(); switchToRegister(); });
    if (linkToLogin) linkToLogin.addEventListener('click', (e) => { e.preventDefault(); switchToLogin(); });
    if (linkToForgotPassword) linkToForgotPassword.addEventListener('click', (e) => { e.preventDefault(); switchToForgotPassword(); });
    if (linkToLoginFromForgot) linkToLoginFromForgot.addEventListener('click', (e) => { e.preventDefault(); switchToLogin(); });

    // Enter key navigation for auth forms
    function addEnterNav(fromId, action) {
        const el = document.getElementById(fromId);
        if (!el) return;
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (typeof action === 'string') {
                    const next = document.getElementById(action);
                    if (next) next.focus();
                } else if (typeof action === 'function') {
                    action();
                }
            }
        });
    }
    // Login form: Email → Password → Submit
    addEnterNav('loginEmail', 'loginPassword');
    addEnterNav('loginPassword', () => { const btn = document.getElementById('loginSubmitBtn'); if (btn) btn.click(); });
    // Register form: Username → Email → Password → ConfirmPassword → Submit
    addEnterNav('registerUsername', 'registerEmail');
    addEnterNav('registerEmail', 'registerPassword');
    addEnterNav('registerPassword', 'registerConfirmPassword');
    addEnterNav('registerConfirmPassword', () => { const btn = document.getElementById('registerSubmitBtn'); if (btn) btn.click(); });
    // Forgot password form: Email → Submit
    addEnterNav('forgotPasswordEmail', () => { const btn = document.getElementById('forgotPasswordSubmitBtn'); if (btn) btn.click(); });

    // Microsoft Login
    const microsoftLoginBtn = document.getElementById('microsoftLoginBtn');
    if (microsoftLoginBtn && window.firebaseModules) {
        microsoftLoginBtn.addEventListener('click', async () => {
            const btn = microsoftLoginBtn;
            loginError.style.display = 'none';
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in with Microsoft...';

            try {
                const { OAuthProvider, signInWithPopup } = window.firebaseModules;
                const provider = new OAuthProvider('microsoft.com');

                // Sign in with Microsoft
                const result = await signInWithPopup(auth, provider);
                const msUser = result.user;
                console.log('[Microsoft Login] Firebase UID:', msUser.uid);

                // Check if already linked (returning user)
                const existingDoc = await window.firebaseModules.getDoc(
                    window.firebaseModules.doc(firestore, "users", msUser.uid)
                );
                if (existingDoc.exists() && existingDoc.data().accountType === 'microsoft' && existingDoc.data().uuid) {
                    // Already verified and linked — just close and proceed
                    closeAuthModalFunc();
                    return;
                }

                // New user: check microsoftVerified using their MS email (written by launcher)
                const msEmail = (msUser.email || msUser.providerData?.[0]?.email || '').toLowerCase();
                console.log('[Microsoft Login] email:', msEmail);

                if (!msEmail) {
                    await window.firebaseModules.signOut(auth);
                    throw new Error("Could not read your Microsoft account email. Please try again.");
                }

                const emailKey = msEmail.replace(/\./g, '_DOT_').replace(/@/g, '_AT_');
                const verifiedDoc = await window.firebaseModules.getDoc(
                    window.firebaseModules.doc(firestore, "microsoftVerified", emailKey)
                );

                if (!verifiedDoc.exists() || !verifiedDoc.data().verified) {
                    await window.firebaseModules.signOut(auth);
                    throw new Error(
                        "Your Microsoft account hasn't been verified yet. " +
                        "Please open the HelloWorld Launcher, sign in with your Microsoft account, and then try again here."
                    );
                }

                const verifiedData = verifiedDoc.data();
                await window.firebaseModules.setDoc(
                    window.firebaseModules.doc(firestore, "users", msUser.uid),
                    {
                        username: verifiedData.username,
                        uuid: verifiedData.uuid,
                        accountType: 'microsoft',
                        minecraftUuid: verifiedData.uuid,
                        email: msEmail,
                        createdAt: window.firebaseModules.firestoreTimestamp()
                    }
                );

                closeAuthModalFunc();

            } catch (error) {
                console.error('Microsoft login error:', error);
                loginError.textContent = parseAuthError(error);
                loginError.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 23 23" fill="none">
                    <path d="M11.5 11.5H0V0H11.5V11.5Z" fill="#F25022"/>
                    <path d="M23 11.5H11.5V0H23V11.5Z" fill="#7FBA00"/>
                    <path d="M11.5 23H0V11.5H11.5V23Z" fill="#00A4EF"/>
                    <path d="M23 23H11.5V11.5H23V23Z" fill="#FFB900"/>
                </svg> Sign in with Microsoft`;
            }
        });
    }

    // Auto-verify Microsoft account when opened from the launcher (one-time token)
    async function autoVerifyFromLauncher(auth, firestore, token) {
        const overlay = document.createElement('div');
        overlay.id = 'launcherVerifyOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,14,23,0.97);z-index:99999;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
            <div style="text-align:center;max-width:460px;padding:40px;background:rgba(255,255,255,0.04);border-radius:20px;border:1px solid rgba(255,255,255,0.08);">
                <div style="font-size:48px;margin-bottom:16px;">🔗</div>
                <h2 style="color:#fff;margin-bottom:10px;">Verifying your Microsoft account</h2>
                <p style="color:#a3a3a3;margin-bottom:30px;">Sign in with Microsoft to link your launcher account to the web.</p>
                <div id="launcherVerifyStatus" style="color:#a3a3a3;font-size:0.9em;min-height:20px;"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        const setStatus = (msg, color = '#a3a3a3') => {
            const el = document.getElementById('launcherVerifyStatus');
            if (el) { el.textContent = msg; el.style.color = color; }
        };

        try {
            // 1. Validate the one-time token from Firestore
            setStatus('Validating launcher token...');
            const tokenDoc = await window.firebaseModules.getDoc(
                window.firebaseModules.doc(firestore, 'pendingMsVerify', token)
            );

            if (!tokenDoc.exists()) throw new Error('This verification link is invalid or has already been used.');

            const tokenData = tokenDoc.data();
            if (tokenData.used) throw new Error('This verification link has already been used.');
            if (new Date(tokenData.expiresAt) < new Date()) throw new Error('This verification link has expired. Please log in again from the launcher.');

            // 2. Sign in with Microsoft to get the email
            setStatus('Opening Microsoft sign-in...');
            const { OAuthProvider, signInWithPopup } = window.firebaseModules;
            const provider = new OAuthProvider('microsoft.com');
            const result = await signInWithPopup(auth, provider);
            const msUser = result.user;
            const msEmail = (msUser.email || msUser.providerData?.[0]?.email || '').toLowerCase();

            if (!msEmail) throw new Error('Could not read your Microsoft account email.');

            // 3. Mark token as used (one-time use)
            setStatus('Writing verification...');
            await window.firebaseModules.setDoc(
                window.firebaseModules.doc(firestore, 'pendingMsVerify', token),
                { used: true }, { merge: true }
            );

            // 4. Write microsoftVerified keyed by email
            const emailKey = msEmail.replace(/\./g, '_DOT_').replace(/@/g, '_AT_');
            await window.firebaseModules.setDoc(
                window.firebaseModules.doc(firestore, 'microsoftVerified', emailKey),
                {
                    email: msEmail,
                    username: tokenData.username,
                    uuid: tokenData.uuid,
                    verified: true,
                    verifiedAt: new Date().toISOString()
                }
            );

            overlay.innerHTML = `
                <div style="text-align:center;max-width:460px;padding:40px;background:rgba(255,255,255,0.04);border-radius:20px;border:1px solid rgba(79,175,74,0.3);">
                    <div style="font-size:56px;margin-bottom:16px;">✅</div>
                    <h2 style="color:#4caf50;margin-bottom:10px;">Account Verified!</h2>
                    <p style="color:#a3a3a3;margin-bottom:8px;">Your Microsoft account has been linked to <strong style="color:#fff">${tokenData.username}</strong>.</p>
                    <p style="color:#a3a3a3;margin-bottom:24px;">You can now close this tab and sign in on the web.</p>
                    <button onclick="window.close()" style="background:#4facfe;color:#fff;border:none;padding:12px 28px;border-radius:8px;cursor:pointer;font-size:1em;">Close tab</button>
                </div>
            `;
        } catch (err) {
            overlay.querySelector('div').innerHTML = `
                <div style="font-size:48px;margin-bottom:16px;">❌</div>
                <h2 style="color:#ff8c82;margin-bottom:10px;">Verification Failed</h2>
                <p style="color:#a3a3a3;margin-bottom:24px;">${err.message}</p>
                <button onclick="window.close()" style="background:rgba(255,255,255,0.1);color:#fff;border:none;padding:12px 28px;border-radius:8px;cursor:pointer;font-size:1em;">Close tab</button>
            `;
        }
    }

    // Minecraft Username Modal for Microsoft accounts
    function showMinecraftUsernameModal(user) {
        const modalHtml = `
            <div id="mcUsernameModal" class="review-modal" style="z-index: 10000;">
                <div class="review-modal-content" style="max-width: 400px; text-align: center;">
                    <button class="close-modal" id="closeMcUsernameModal">&times;</button>
                    <h3 style="margin-bottom: 15px;">Verify Minecraft Account</h3>
                    <p style="font-size: 0.9em; color: #a3a3a3; margin-bottom: 20px;">Enter your Minecraft username to verify your account from the launcher.</p>
                    <div class="form-group">
                        <input type="text" id="mcUsernameInput" placeholder="e.g. Notch" class="form-control" style="text-align: center; font-size: 1.1em;" required minlength="3" maxlength="16">
                    </div>
                    <div id="mcUsernameError" style="color: #ff8c82; font-size: 0.9em; margin-bottom: 15px; text-align: center; display: none;"></div>
                    <button type="button" class="btn btn-primary" id="mcUsernameSubmitBtn" style="width: 100%;">Verify and Link</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('mcUsernameModal');
        const closeBtn = document.getElementById('closeMcUsernameModal');
        const input = document.getElementById('mcUsernameInput');
        const submitBtn = document.getElementById('mcUsernameSubmitBtn');
        const errorDiv = document.getElementById('mcUsernameError');

        modal.classList.add('active');

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);

        submitBtn.addEventListener('click', async () => {
            const username = input.value.trim();
            errorDiv.style.display = 'none';
            submitBtn.disabled = true;
            submitBtn.textContent = 'Verifying...';

            try {
                if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
                    throw new Error("Invalid Minecraft username format.");
                }

                const mojangResponse = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
                if (!mojangResponse.ok) {
                    throw new Error("Minecraft username not found.");
                }

                const mojangData = await mojangResponse.json();
                const uuid = mojangData.id.toLowerCase();

                console.log('[Microsoft Link] Username:', username, 'UUID:', uuid);

                const verifiedDoc = await window.firebaseModules.getDoc(
                    window.firebaseModules.doc(firestore, "microsoftVerified", uuid)
                );

                if (!verifiedDoc.exists()) {
                    await window.firebaseModules.signOut(auth);
                    throw new Error(
                        "This Minecraft account hasn't been verified in the launcher yet. " +
                        "Please open the HelloWorld Launcher, add your Microsoft account, and then try again."
                    );
                }

                const verifiedData = verifiedDoc.data();
                console.log('[Microsoft Link] Verified data:', verifiedData);

                await window.firebaseModules.setDoc(
                    window.firebaseModules.doc(firestore, "users", user.uid),
                    {
                        username: verifiedData.username,
                        usernameLower: verifiedData.username.toLowerCase(),
                        uuid: verifiedData.uuid,
                        accountType: 'microsoft',
                        minecraftUuid: verifiedData.uuid,
                        email: user.email || '',
                        createdAt: window.firebaseModules.firestoreTimestamp()
                    }
                );

                closeModal();
                window.location.reload();

            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Verify and Link';
            }
        });

        setTimeout(() => input.focus(), 100);
    }

    // Error Parser Helper
    function parseAuthError(error) {
        let msg = error.message;
        if (error.code) {
            switch(error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    msg = "Incorrect email or password.";
                    break;
                case 'auth/invalid-credential':
                    if (msg && msg.includes('microsoft')) {
                        msg = "Microsoft sign-in failed. Check your Azure App Registration settings (Supported account types must be 'All').";
                    } else {
                        msg = "Incorrect email or password.";
                    }
                    break;
                case 'auth/account-exists-with-different-credential':
                    msg = "This email is already registered with a different sign-in method. Go to Firebase Console → Authentication → Settings and enable 'Multiple accounts per email address'.";
                    break;
                case 'auth/email-already-in-use':
                    msg = "This email is already registered.";
                    break;
                case 'auth/weak-password':
                    msg = "Password should be at least 6 characters.";
                    break;
                case 'auth/popup-closed-by-user':
                    msg = "Sign-in popup was closed. Please try again.";
                    break;
                case 'auth/cancelled-popup-request':
                    msg = "";
                    break;
            }
        }
        return msg;
    }

    function getHeadImageFromSource(src) {
        if (!src) return Promise.resolve(null);
        return new Promise((resolve) => {
            const img = new Image();
            if (!src.startsWith('data:')) {
                img.crossOrigin = 'anonymous';
            }
            img.onload = () => {
                const isAvatarProvider = src.includes('mc-heads.net') || src.includes('minotar.net');
                const isFullSkin = !isAvatarProvider &&
                    ((img.width === img.height || img.width === img.height * 2) &&
                    (img.width % 64 === 0 || img.width === 32));

                if (isFullSkin) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 64;
                    canvas.height = 64;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = false;
                    const s = img.width / 8;
                    ctx.drawImage(img, s, s, s, s, 0, 0, 64, 64);
                    ctx.drawImage(img, s * 5, s, s, s, 0, 0, 64, 64);
                    resolve(canvas.toDataURL());
                } else {
                    resolve(src);
                }
            };
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }

    async function setNavAvatarFromSource(avatarSrc, usernameFallback) {
        if (!navUserAvatarImg) return;
        const fallbackSrc = usernameFallback
            ? `https://ui-avatars.com/api/?name=${encodeURIComponent(usernameFallback)}&background=random&color=fff&rounded=true&bold=true&format=svg`
            : DEFAULT_NAV_HEAD;
        
        // If an avatarSrc is provided (e.g. base64 image), use it directly. Otherwise use fallback.
        navUserAvatarImg.src = avatarSrc || fallbackSrc;
        // Make sure it looks nice
        navUserAvatarImg.style.objectFit = 'cover';
        navUserAvatarImg.style.borderRadius = '50%';
    }

    // Handle Forms
    if (loginForm && window.firebaseModules) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const identifier = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const btn = document.getElementById('loginSubmitBtn');
            loginError.style.display = 'none';
            btn.disabled = true;
            btn.textContent = 'Logging in...';
            
            try {
                let email = identifier;
                // If it doesn't look like an email, resolve username → email via the public 'usernames' index
                if (!identifier.includes('@')) {
                    const usernameDoc = await window.firebaseModules.getDoc(
                        window.firebaseModules.doc(firestore, 'usernames', identifier.toLowerCase())
                    );
                    if (!usernameDoc.exists()) {
                        throw { code: 'auth/user-not-found' };
                    }
                    email = usernameDoc.data().email;
                }

                await window.firebaseModules.signInWithEmailAndPassword(auth, email, password);
                closeAuthModalFunc();
            } catch (error) {
                loginError.textContent = parseAuthError(error);
                loginError.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Log In';
            }
        });
    }

    if (forgotPasswordForm && window.firebaseModules) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('forgotPasswordEmail');
            const submitBtn = document.getElementById('forgotPasswordSubmitBtn');
            const errorDiv = forgotPasswordError;
            const successDiv = forgotPasswordSuccess;

            if (errorDiv) errorDiv.style.display = 'none';
            if (successDiv) successDiv.style.display = 'none';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';
            }

            try {
                await window.firebaseModules.sendPasswordResetEmail(auth, emailInput ? emailInput.value.trim() : '');
                if (successDiv) {
                    successDiv.textContent = "A password reset link has been sent to your email. Check your inbox (and spam folder).";
                    successDiv.style.display = 'block';
                }
                if (emailInput) emailInput.value = '';
            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = parseAuthError(error);
                    errorDiv.style.display = 'block';
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Send Reset Link';
                }
            }
        });
    }

    if (registerForm && window.firebaseModules) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('registerUsername').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirm = document.getElementById('registerConfirmPassword').value;
            const btn = document.getElementById('registerSubmitBtn');
            
            registerError.style.display = 'none';

            if (password !== confirm) {
                registerError.textContent = "Passwords do not match.";
                registerError.style.display = 'block';
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Creating account...';
            
            try {
                // Validation matching offline launcher accounts
                if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
                    throw new Error("Username must be 3-16 characters and contain only letters, numbers, and underscores.");
                }

                // Check if username is already taken
                const usernameDoc = await window.firebaseModules.getDoc(
                    window.firebaseModules.doc(firestore, 'usernames', username.toLowerCase())
                );
                if (usernameDoc.exists()) {
                    throw new Error("This username is already taken.");
                }

                const userCredential = await window.firebaseModules.createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                const generateUuid = (name) => {
                    return CryptoJS.MD5("HelloWorldPlayer:" + name).toString(CryptoJS.enc.Hex);
                };
                
                const uuid = generateUuid(username);
                await window.firebaseModules.setDoc(window.firebaseModules.doc(firestore, "users", user.uid), {
                    username: username,
                    usernameLower: username.toLowerCase(),
                    email: email,
                    uuid: uuid,
                    createdAt: window.firebaseModules.firestoreTimestamp()
                });
                // Write public username index so login-by-username works without auth
                await window.firebaseModules.setDoc(
                    window.firebaseModules.doc(firestore, 'usernames', username.toLowerCase()),
                    { uid: user.uid, email: email }
                );
                
                closeAuthModalFunc();
            } catch (error) {
                registerError.textContent = parseAuthError(error);
                registerError.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Register';
            }
        });
    }

    // === Account Settings Logic ===
    const accountLogoutBtn = document.getElementById('accountLogoutBtn');

    async function loadAccountSettings() {
        if (!currentUser) return;
        const errorDiv = document.getElementById('accountError');
        const successDiv = document.getElementById('accountSuccess');
        const userInp = document.getElementById('dashboardUsername');
        const editUsernameBtn = document.getElementById('editUsernameBtn');
        if (errorDiv) errorDiv.style.display = 'none';
        if (successDiv) successDiv.style.display = 'none';
        if (userInp) {
            userInp.readOnly = true;
            userInp.disabled = true;
        }

        try {
            let docSnap = await window.firebaseModules.getDoc(window.firebaseModules.doc(firestore, "users", currentUser.uid));

            if (!docSnap.exists()) {
                const defaultName = (currentUser.email || "Player").split('@')[0];
                const safeName = defaultName.substring(0,16);
                const generateUuid = (name) => CryptoJS.MD5("HelloWorldPlayer:" + name).toString(CryptoJS.enc.Hex);
                await window.firebaseModules.setDoc(window.firebaseModules.doc(firestore, "users", currentUser.uid), {
                    username: safeName,
                    email: currentUser.email || "",
                    uuid: generateUuid(safeName),
                    createdAt: window.firebaseModules.firestoreTimestamp()
                });
                docSnap = await window.firebaseModules.getDoc(window.firebaseModules.doc(firestore, "users", currentUser.uid));
            }

            if (docSnap.exists()) {
                const data = docSnap.data();
                const isMicrosoftAccount = data.accountType === 'microsoft';
                if (userInp) userInp.value = data.username || "Player";

                const fallbackName = data.username || (currentUser && currentUser.email ? currentUser.email.split('@')[0] : 'Player');

                const avatarPreview = document.getElementById('dashboardAvatarPreview');
                if (avatarPreview) {
                    if (data.avatarBase64) {
                        avatarPreview.src = data.avatarBase64;
                    } else if (isMicrosoftAccount && data.uuid) {
                        avatarPreview.src = `https://mc-heads.net/avatar/${data.uuid}`;
                    } else {
                        avatarPreview.src = `https://ui-avatars.com/api/?name=${fallbackName}&background=random&color=fff&rounded=true&bold=true&format=svg`;
                    }
                }
                stagedAvatarBase64 = null;
                stagedClearAvatar = false;

                const navAvatarSrc = data.avatarBase64 || (isMicrosoftAccount && data.uuid ? `https://mc-heads.net/avatar/${data.uuid}` : null);
                await setNavAvatarFromSource(navAvatarSrc, fallbackName);

                const usernameFormGroup = document.getElementById('usernameFormGroup');
                const dashboardBadgesRow = document.getElementById('dashboardBadgesRow');
                const premiumBadge = document.getElementById('dashboardPremiumBadge');
                const useDefaultAvatarBtn = document.getElementById('useDefaultAvatarBtn');
                const badges = extractUserBadges(data);
                if (dashboardBadgesRow) dashboardBadgesRow.innerHTML = renderBadgesHtml(badges, true);
                updateAvatarHalo('dashboardAvatarWrapper', badges);
                if (isMicrosoftAccount) {
                    if (editUsernameBtn) editUsernameBtn.style.display = 'none';
                    if (usernameFormGroup) usernameFormGroup.style.display = 'none';
                    if (premiumBadge) premiumBadge.style.display = badges.includes('premium') ? 'inline-flex' : 'none';
                    if (useDefaultAvatarBtn) useDefaultAvatarBtn.style.display = 'inline-flex';
                    if (userInp) {
                        userInp.disabled = true;
                        userInp.readOnly = true;
                    }
                } else {
                    if (editUsernameBtn) editUsernameBtn.style.display = 'block';
                    if (usernameFormGroup) usernameFormGroup.style.display = 'block';
                    if (premiumBadge) premiumBadge.style.display = badges.includes('premium') ? 'inline-flex' : 'none';
                    if (useDefaultAvatarBtn) useDefaultAvatarBtn.style.display = 'none';
                }

                const biographyInput = document.getElementById('dashboardBiography');
                const biographyCharCount = document.getElementById('biographyCharCount');
                if (biographyInput) {
                    biographyInput.value = data.biography || '';
                    if (biographyCharCount) biographyCharCount.textContent = (data.biography || '').length;
                }

                const favoriteMobInput = document.getElementById('dashboardFavoriteMob');
                if (favoriteMobInput) favoriteMobInput.value = data.favoriteMob || '';

                const countrySelect = document.getElementById('dashboardCountry');
                if (countrySelect) {
                    countrySelect.value = data.country || '';
                    updateCountryBadge(data.country || '');
                }

                const backgroundSelect = document.getElementById('dashboardBackground');
                if (backgroundSelect) {
                    backgroundSelect.value = data.background || 'default';
                    applyBackgroundPreview(data.background || 'default');
                }

                const displayName = document.getElementById('dashboardDisplayName');
                if (displayName) displayName.textContent = data.username || 'Player';

                const linksContainer = document.getElementById('linksContainer');
                if (linksContainer) {
                    linksContainer.innerHTML = '';
                    const links = data.links || [];
                    links.forEach((link, index) => {
                        addLinkField(link.title, link.url, index);
                    });
                }

                initPlaystyleTagsGrid(data.playstyleTags || []);
            }
        } catch (e) {
           console.error("Failed to load account details", e);
        }
    }

    window.loadAccountSettings = loadAccountSettings;

    // Nav user badge dropdown toggle
    const navUserInner = document.getElementById('navUserInner');
    const navUserDropdown = document.getElementById('navUserDropdown');
    const navUserChevron = document.getElementById('navUserChevron');

    if (navUserInner && navUserDropdown) {
        navUserInner.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = navUserDropdown.classList.contains('open');
            // Close all other dropdowns first
            document.querySelectorAll('.nav-user-dropdown.open').forEach(d => d.classList.remove('open'));
            document.querySelectorAll('.nav-user-chevron.open').forEach(c => c.classList.remove('open'));
            if (!isOpen) {
                navUserDropdown.classList.add('open');
                if (navUserChevron) navUserChevron.classList.add('open');
            }
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.nav-user-dropdown.open').forEach(d => d.classList.remove('open'));
        document.querySelectorAll('.nav-user-chevron.open').forEach(c => c.classList.remove('open'));
    });

    if (navUserBadge) {
        navUserBadge.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Live updating preview listeners
    const dashboardCountry = document.getElementById('dashboardCountry');
    if (dashboardCountry) {
        dashboardCountry.addEventListener('change', (e) => {
            updateCountryBadge(e.target.value);
        });
    }

    const dashboardUsernameInp = document.getElementById('dashboardUsername');
    if (dashboardUsernameInp) {
        dashboardUsernameInp.addEventListener('input', (e) => {
            const displayName = document.getElementById('dashboardDisplayName');
            if (displayName) displayName.textContent = e.target.value.trim() || 'Player';
        });
    }

    const biographyInput = document.getElementById('dashboardBiography');
    const biographyCharCount = document.getElementById('biographyCharCount');
    if (biographyInput && biographyCharCount) {
        biographyInput.addEventListener('input', () => {
            biographyCharCount.textContent = biographyInput.value.length;
        });
    }

    // --- Playstyle Tags ---
    const PLAYSTYLE_TAGS = [
        { id: 'pvp',         label: 'PvP',           icon: 'fas fa-fire' },
        { id: 'pvp_pro',     label: 'PvP Pro',        icon: 'fas fa-fire' },
        { id: 'builder',     label: 'Builder',        icon: 'fas fa-hammer' },
        { id: 'architect',   label: 'Architect',      icon: 'fas fa-drafting-compass' },
        { id: 'survival',    label: 'Survival',       icon: 'fas fa-tree' },
        { id: 'hardcore',    label: 'Hardcore',       icon: 'fas fa-skull' },
        { id: 'redstone',    label: 'Redstone',       icon: 'fas fa-bolt' },
        { id: 'technical',   label: 'Technical',      icon: 'fas fa-cog' },
        { id: 'farms',       label: 'Farm Builder',   icon: 'fas fa-tractor' },
        { id: 'explorer',    label: 'Explorer',       icon: 'fas fa-compass' },
        { id: 'speedrunner', label: 'Speedrunner',    icon: 'fas fa-running' },
        { id: 'socialite',   label: 'Socialite',      icon: 'fas fa-users' },
        { id: 'roleplayer',  label: 'Roleplayer',     icon: 'fas fa-theater-masks' },
        { id: 'modded',      label: 'Modded',         icon: 'fas fa-puzzle-piece' },
        { id: 'modpack',     label: 'Modpack Player', icon: 'fas fa-layer-group' },
        { id: 'creative',    label: 'Creative',       icon: 'fas fa-paint-brush' },
        { id: 'artist',      label: 'Pixel Artist',   icon: 'fas fa-palette' },
        { id: 'streamer',    label: 'Streamer',       icon: 'fas fa-video' },
        { id: 'casual',      label: 'Casual',         icon: 'fas fa-couch' },
        { id: 'minigames',   label: 'Minigames',      icon: 'fas fa-gamepad' },
        { id: 'skyblock',    label: 'Skyblock',       icon: 'fas fa-cloud' },
    ];

    let selectedPlaystyleTags = [];

    function initPlaystyleTagsGrid(currentTags) {
        selectedPlaystyleTags = Array.isArray(currentTags) ? [...currentTags] : [];
        const grid = document.getElementById('playstyleTagsGrid');
        if (!grid) return;
        grid.innerHTML = PLAYSTYLE_TAGS.map(tag => {
            const sel = selectedPlaystyleTags.includes(tag.id);
            return `<button type="button" class="playstyle-tag-btn${sel ? ' selected' : ''}" data-tag-id="${tag.id}" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.2);background:${sel ? 'rgba(79,172,254,0.25)' : 'rgba(255,255,255,0.06)'};color:${sel ? '#60a5fa' : '#9ca3af'};transition:all 0.15s;">
                <i class="${tag.icon}" style="font-size:11px;"></i> ${tag.label}
            </button>`;
        }).join('');
        grid.querySelectorAll('.playstyle-tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.tagId;
                if (selectedPlaystyleTags.includes(id)) {
                    selectedPlaystyleTags = selectedPlaystyleTags.filter(t => t !== id);
                    btn.classList.remove('selected');
                    btn.style.background = 'rgba(255,255,255,0.06)';
                    btn.style.color = '#9ca3af';
                    btn.style.borderColor = 'rgba(255,255,255,0.2)';
                } else if (selectedPlaystyleTags.length < 5) {
                    selectedPlaystyleTags.push(id);
                    btn.classList.add('selected');
                    btn.style.background = 'rgba(79,172,254,0.25)';
                    btn.style.color = '#60a5fa';
                    btn.style.borderColor = 'rgba(79,172,254,0.4)';
                } else {
                    // Flash red to indicate limit reached
                    btn.style.background = 'rgba(239,68,68,0.2)';
                    btn.style.color = '#f87171';
                    setTimeout(() => {
                        btn.style.background = 'rgba(255,255,255,0.06)';
                        btn.style.color = '#9ca3af';
                    }, 600);
                }
            });
        });
    }

    // Link field management
    const linksContainer = document.getElementById('linksContainer');
    const addLinkBtn = document.getElementById('addLinkBtn');

    function addLinkField(title = '', url = '', index = null) {
        const linkDiv = document.createElement('div');
        linkDiv.className = 'link-field';
        linkDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
        
        linkDiv.innerHTML = `
            <input type="text" class="form-control link-title" placeholder="Title (e.g. YouTube)" value="${title}" style="flex: 1;">
            <input type="url" class="form-control link-url" placeholder="URL (https://...)" value="${url}" style="flex: 2;">
            <button type="button" class="btn btn-secondary remove-link-btn" style="width: 40px; height: 40px; padding: 0; color: #ff8c82; border-color: #ff8c82; display: flex; align-items: center; justify-content: center;"><i class="fas fa-trash"></i></button>
        `;
        
        if (linksContainer) {
            if (index !== null && index < linksContainer.children.length) {
                linksContainer.insertBefore(linkDiv, linksContainer.children[index]);
            } else {
                linksContainer.appendChild(linkDiv);
            }
        }

        // Add remove functionality
        const removeBtn = linkDiv.querySelector('.remove-link-btn');
        removeBtn.addEventListener('click', () => {
            linkDiv.remove();
        });
    }

    if (addLinkBtn) {
        addLinkBtn.addEventListener('click', () => {
            addLinkField();
        });
    }

    // Country badge functionality
    function updateCountryBadge(countryCode) {
        const countryBadge = document.getElementById('countryBadge');
        const countryFlagSvg = document.getElementById('countryFlagSvg');
        
        if (!countryBadge || !countryFlagSvg) return;
        
        if (!countryCode || countryCode === '' || countryCode === 'OTHER') {
            countryBadge.style.display = 'none';
            return;
        }
        
        // Use flagcdn.com for SVG flags
        countryFlagSvg.src = `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png`;
        countryBadge.style.display = 'flex';
    }

    // Add event listener to country select
    const countrySelect = document.getElementById('dashboardCountry');
    if (countrySelect) {
        countrySelect.addEventListener('change', (e) => {
            updateCountryBadge(e.target.value);
        });
    }

    // Background preview functionality
    const backgroundSelect = document.getElementById('dashboardBackground');
    const avatarBackgroundPreview = document.getElementById('avatarBackgroundPreview');

    function applyBackgroundPreview(backgroundValue) {
        if (!avatarBackgroundPreview) return;
        
        // Reset to default background and restore border
        const gradients = {
            'gradient1': 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)', // Purple
            'gradient2': 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)', // Blue
            'gradient3': 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', // Green
            'gradient4': 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)', // Orange
            'gradient5': 'linear-gradient(135deg, #e91eb6 0%, #f363e7 100%)' // Pink
        };

        const isSettingsPage = window.location.pathname.includes('/settings') || window.location.pathname.endsWith('/settings/') || window.location.pathname.endsWith('/settings/index.html');
        const bgPrefix = isSettingsPage ? '../backgrounds/' : 'backgrounds/';

        const imageBackgrounds = {
            'minecraft1': `url("${bgPrefix}minecraft1.png")`,
            'minecraft2': `url("${bgPrefix}minecraft2.png")`,
            'minecraft3': `url("${bgPrefix}minecraft3.png")`,
            'minecraft4': `url("${bgPrefix}minecraft4.png")`,
            'minecraft5': `url("${bgPrefix}minecraft5.png")`,
            'minecraft6': `url("${bgPrefix}minecraft6.png")`,
            'minecraft7': `url("${bgPrefix}minecraft7.png")`,
            'minecraft8': `url("${bgPrefix}minecraft8.png")`,
            'minecraft9': `url("${bgPrefix}minecraft9.png")`
        };

        if (gradients[backgroundValue]) {
            avatarBackgroundPreview.style.background = gradients[backgroundValue];
            avatarBackgroundPreview.style.border = '2px solid rgba(255, 255, 255, 0.12)';
        } else if (imageBackgrounds[backgroundValue]) {
            avatarBackgroundPreview.style.background = `${imageBackgrounds[backgroundValue]} center/cover no-repeat`;
            avatarBackgroundPreview.style.border = '2px solid rgba(255, 255, 255, 0.12)';
        } else {
            // Default background logic
            avatarBackgroundPreview.style.background = '';
            avatarBackgroundPreview.style.border = '2px solid rgba(255, 255, 255, 0.12)';
        }
    }

    if (backgroundSelect) {
        backgroundSelect.addEventListener('change', (e) => {
            applyBackgroundPreview(e.target.value);
        });
        // Initial preview render
        applyBackgroundPreview(backgroundSelect.value || 'default');
    }

    if (accountLogoutBtn && window.firebaseModules) {
        accountLogoutBtn.addEventListener('click', () => {
            window.firebaseModules.signOut(auth).then(() => {
                accountModal.classList.remove('active');
                if (window.location.search.includes('register')) {
                    window.location.search = '';
                }
            });
        });
    }

    // Username Editing
    const editUsernameBtn = document.getElementById('editUsernameBtn');
    if (editUsernameBtn) {
        editUsernameBtn.addEventListener('click', () => {
            const warning1 = confirm("WARNING: Changing your username might cause you to lose progress, ranks, and inventory on third-party servers. Are you sure?");
            if (warning1) {
                const warning2 = confirm("Final Warning! Press OK to confirm you accept the risks of changing your in-game identity.");
                if (warning2) {
                    const userInp = document.getElementById('dashboardUsername');
                    userInp.readOnly = false;
                    userInp.disabled = false;
                    userInp.focus();
                }
            }
        });
    }

    // Avatar Upload and Cropping
    const avatarUploadInput = document.getElementById('avatarUploadInput');
    const cropperModal = document.getElementById('cropperModal');
    const closeCropperModal = document.getElementById('closeCropperModal');
    const cancelCropBtn = document.getElementById('cancelCropBtn');
    const applyCropBtn = document.getElementById('applyCropBtn');
    const cropperImage = document.getElementById('cropperImage');
    
    let cropper = null;
    let stagedAvatarBase64 = null;
    let stagedClearAvatar = false;

    function hideCropperModal() {
        if (cropperModal) cropperModal.classList.remove('active');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        if (avatarUploadInput) avatarUploadInput.value = '';
    }

    if (closeCropperModal) closeCropperModal.addEventListener('click', hideCropperModal);
    if (cancelCropBtn) cancelCropBtn.addEventListener('click', hideCropperModal);

    if (avatarUploadInput) {
        avatarUploadInput.addEventListener('change', (e) => {
            if (!e.target.files || !e.target.files.length) return;
            const file = e.target.files[0];
            
            const reader = new FileReader();
            reader.onload = (event) => {
                cropperImage.src = event.target.result;
                cropperModal.classList.add('active');
                
                if (cropper) cropper.destroy();
                cropper = new Cropper(cropperImage, {
                    aspectRatio: 1, // 1:1 square
                    viewMode: 1,
                    dragMode: 'move',
                    autoCropArea: 1,
                    restore: false,
                    guides: true,
                    center: true,
                    highlight: false,
                    cropBoxMovable: true,
                    cropBoxResizable: true,
                    toggleDragModeOnDblclick: false,
                });
            };
            reader.readAsDataURL(file);
        });
    }

    const useDefaultAvatarBtn = document.getElementById('useDefaultAvatarBtn');
    if (useDefaultAvatarBtn) {
        useDefaultAvatarBtn.addEventListener('click', async () => {
            if (!currentUser) return;
            const docSnap = await window.firebaseModules.getDoc(window.firebaseModules.doc(firestore, "users", currentUser.uid));
            const uuid = docSnap.exists() ? docSnap.data().uuid : null;
            stagedAvatarBase64 = null;
            stagedClearAvatar = true;
            const avatarPreview = document.getElementById('dashboardAvatarPreview');
            if (avatarPreview && uuid) avatarPreview.src = `https://mc-heads.net/avatar/${uuid}`;
        });
    }

    if (applyCropBtn) {
        applyCropBtn.addEventListener('click', () => {
            if (!cropper) return;
            
            // Get cropped image, scaled to 128x128
            const canvas = cropper.getCroppedCanvas({
                width: 128,
                height: 128,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });
            
            stagedAvatarBase64 = canvas.toDataURL('image/png');
            
            // Update preview immediately
            const avatarPreview = document.getElementById('dashboardAvatarPreview');
            if (avatarPreview) {
                avatarPreview.src = stagedAvatarBase64;
            }
            
            hideCropperModal();
            
            // Auto-trigger save so they don't have to press "Save Changes" manually if they just changed the avatar
            const successDiv = document.getElementById('accountSuccess');
            if (successDiv) {
                successDiv.style.display = 'none';
            }
        });
    }

    // Save Account settings
    async function handleSaveAccount() {
        if (!currentUser) return;
        const errorDiv = document.getElementById('accountError');
        const successDiv = document.getElementById('accountSuccess');
        const topBtn = document.getElementById('saveAccountBtnTop');
        const bottomBtn = document.getElementById('saveAccountBtnBottom');
        const legacyBtn = document.getElementById('saveAccountBtn');

        const setSaveState = (state, text) => {
            [topBtn, bottomBtn, legacyBtn].forEach(btn => {
                if (!btn) return;
                btn.disabled = (state === 'saving');
                const span = btn.querySelector('span');
                if (state === 'saved') {
                    btn.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
                    btn.style.boxShadow = '0 4px 15px rgba(22, 163, 74, 0.4)';
                    const icon = btn.querySelector('i');
                    if (icon) { icon.className = 'fas fa-check'; }
                } else {
                    btn.style.background = '';
                    btn.style.boxShadow = '';
                    const icon = btn.querySelector('i');
                    if (icon) { icon.className = 'fas fa-save'; }
                }
                if (span) span.textContent = text;
                else btn.textContent = text;
            });
        };

        if (errorDiv) errorDiv.style.display = 'none';
        if (successDiv) successDiv.style.display = 'none';
        setSaveState(true, t('settings.saving', 'Saving...'));

        try {
            const docSnap = await window.firebaseModules.getDoc(window.firebaseModules.doc(firestore, "users", currentUser.uid));
            const currentData = docSnap.data();
            const isMicrosoftAccount = currentData.accountType === 'microsoft';

            const updates = {};

            if (!isMicrosoftAccount) {
                const userInp = document.getElementById('dashboardUsername');
                const newUsername = userInp ? userInp.value.trim() : '';
                if (newUsername && !/^[a-zA-Z0-9_]{3,16}$/.test(newUsername)) {
                    throw new Error("Username must be 3-16 characters and contain only letters, numbers, and underscores.");
                }

                if (newUsername && newUsername !== currentData.username) {
                    const takenDoc = await window.firebaseModules.getDoc(
                        window.firebaseModules.doc(firestore, 'usernames', newUsername.toLowerCase())
                    );
                    if (takenDoc.exists()) {
                        throw new Error("This username is already taken.");
                    }
                    updates.username = newUsername;
                    updates.uuid = CryptoJS.MD5("HelloWorldPlayer:" + newUsername).toString(CryptoJS.enc.Hex);
                }
            }

            if (stagedClearAvatar) {
                updates.avatarBase64 = window.firebaseModules.deleteField();
            } else if (stagedAvatarBase64) {
                updates.avatarBase64 = stagedAvatarBase64;
            }

            const bioEl = document.getElementById('dashboardBiography');
            if (bioEl) {
                const val = bioEl.value.trim();
                updates.biography = val ? val : window.firebaseModules.deleteField();
            }

            const mobEl = document.getElementById('dashboardFavoriteMob');
            if (mobEl) {
                const val = mobEl.value.trim();
                updates.favoriteMob = val ? val : window.firebaseModules.deleteField();
            }

            const countryEl = document.getElementById('dashboardCountry');
            if (countryEl) {
                const val = countryEl.value;
                updates.country = val ? val : window.firebaseModules.deleteField();
            }

            const bgEl = document.getElementById('dashboardBackground');
            if (bgEl) {
                const val = bgEl.value;
                updates.background = val ? val : window.firebaseModules.deleteField();
            }

            const linkFields = document.querySelectorAll('.link-field');
            const linksArray = [];
            linkFields.forEach(field => {
                const title = field.querySelector('.link-title').value.trim();
                const url = field.querySelector('.link-url').value.trim();
                if (title && url) {
                    linksArray.push({ title, url });
                }
            });
            updates.links = linksArray.length > 0 ? linksArray : window.firebaseModules.deleteField();

            if (selectedPlaystyleTags && selectedPlaystyleTags.length > 0) {
                updates.playstyleTags = selectedPlaystyleTags;
            } else {
                updates.playstyleTags = window.firebaseModules.deleteField();
            }
            if (updates.username) {
                updates.usernameLower = updates.username.toLowerCase();
            }

            await window.firebaseModules.updateDoc(window.firebaseModules.doc(firestore, "users", currentUser.uid), updates);

            if (updates.username && updates.username !== currentData.username) {
                await window.firebaseModules.setDoc(
                    window.firebaseModules.doc(firestore, 'usernames', updates.username.toLowerCase()),
                    { uid: currentUser.uid, email: currentData.email || '' }
                );
                if (currentData.username) {
                    await window.firebaseModules.updateDoc(
                        window.firebaseModules.doc(firestore, 'usernames', currentData.username.toLowerCase()),
                        { uid: window.firebaseModules.deleteField(), email: window.firebaseModules.deleteField() }
                    ).catch(() => {});
                }
            }

            if (updates.username) {
                const navUser = document.getElementById('navUsername');
                if (navUser) navUser.textContent = updates.username;
            }

            const displayName = document.getElementById('dashboardDisplayName');
            if (displayName) {
                displayName.textContent = updates.username || currentData.username || 'Player';
            }

            let appliedAvatarSrc = stagedAvatarBase64;
            if (!appliedAvatarSrc) {
                const userDoc = await window.firebaseModules.getDoc(window.firebaseModules.doc(firestore, "users", currentUser.uid));
                if (userDoc.exists()) {
                    const freshData = userDoc.data();
                    if (freshData.avatarBase64) {
                        appliedAvatarSrc = freshData.avatarBase64;
                    } else if (freshData.accountType === 'microsoft' && freshData.uuid) {
                        appliedAvatarSrc = `https://mc-heads.net/avatar/${freshData.uuid}`;
                    } else if (stagedClearAvatar && currentData.uuid) {
                        appliedAvatarSrc = `https://mc-heads.net/avatar/${currentData.uuid}`;
                    }
                }
            }
            stagedAvatarBase64 = null;
            stagedClearAvatar = false;

            await setNavAvatarFromSource(appliedAvatarSrc, updates.username || currentData.username || 'Player');

            if (successDiv) {
                successDiv.textContent = t('settings.saved_success', 'Changes saved successfully!');
                successDiv.style.display = 'block';
                setTimeout(() => { if (successDiv) successDiv.style.display = 'none'; }, 4000);
            }
            // Top button "saved" state
            setSaveState('saved', t('settings.saved_btn', 'Saved'));
            setTimeout(() => setSaveState('idle', t('settings.save', 'Save Changes')), 3000);
        } catch (error) {
            if (errorDiv) {
                errorDiv.textContent = "Failed to update profile: " + error.message;
                errorDiv.style.display = 'block';
            }
            setSaveState('idle', t('settings.save', 'Save Changes'));
        }
    }

    const saveAccountBtnTop = document.getElementById('saveAccountBtnTop');
    const saveAccountBtnBottom = document.getElementById('saveAccountBtnBottom');
    const saveAccountBtn = document.getElementById('saveAccountBtn');

    if (saveAccountBtnTop) saveAccountBtnTop.addEventListener('click', handleSaveAccount);
    if (saveAccountBtnBottom) saveAccountBtnBottom.addEventListener('click', handleSaveAccount);
    if (saveAccountBtn) saveAccountBtn.addEventListener('click', handleSaveAccount);


    // === GitHub API Integration ===
    const repoOwner = 'abeloskyyy';
    // ...

    const repoName = 'HelloWorld-Launcher';
    const heroBtn = document.getElementById('heroDownloadBtn');
    const heroLinuxBtn = document.getElementById('heroDownloadLinuxBtn');
    const navBtn = document.getElementById('navDownloadBtn');
    const heroButtonsContainer = document.querySelector('.hero-buttons');
    const osWarningContainer = document.getElementById('osWarningContainer');
    const detectedOSName = document.getElementById('detectedOSName');
    const windowsDropdown = document.getElementById('windowsDropdown');
    const linuxDropdown = document.getElementById('linuxDropdown');

    const iconLinux = `<i class="fa-brands fa-linux" style="font-size: 1.1rem; margin-right: 5px;"></i>`;

    function detectOS() {
        const ua = window.navigator.userAgent.toLowerCase();
        if (ua.includes("win")) return "Windows";
        if ((ua.includes("linux") || ua.includes("x11") || ua.includes("ubuntu") || ua.includes("cros")) && !ua.includes("android")) return "Linux";
        if (ua.includes("mac")) return "MacOS";
        if (ua.includes("android") || ua.includes("iphone") || ua.includes("ipad")) return "Mobile";
        return "Unknown";
    }

    const userOS = detectOS();

    let latestTagName = '';
    window.currentReleaseTag = '';

    function updateHeroButtons() {
        if (!heroBtn || !heroLinuxBtn) return;
        const tag = latestTagName ? ` ${latestTagName}` : '';
        const winTitle = `${t('hero.download_win', 'Download for Windows')}${tag}`;
        const linuxTitle = `${t('hero.download_linux', 'Download for Linux')}${tag}`;

        if (userOS === "Windows") {
            heroBtn.className = "btn btn-primary btn-lg dropdown-btn";
            heroBtn.innerHTML = `<i class="bi bi-windows"></i> ${winTitle}<i class="bi bi-chevron-down dropdown-arrow"></i><div class="btn-shine"></div>`;
            heroLinuxBtn.className = "btn btn-secondary btn-lg dropdown-btn";
            heroLinuxBtn.innerHTML = `${iconLinux} ${linuxTitle}<i class="bi bi-chevron-down dropdown-arrow"></i>`;
        } else if (userOS === "Linux") {
            heroLinuxBtn.className = "btn btn-primary btn-lg dropdown-btn";
            heroLinuxBtn.innerHTML = `${iconLinux} ${linuxTitle}<i class="bi bi-chevron-down dropdown-arrow"></i><div class="btn-shine"></div>`;
            heroBtn.className = "btn btn-secondary btn-lg dropdown-btn";
            heroBtn.innerHTML = `<i class="bi bi-windows"></i> ${winTitle}<i class="bi bi-chevron-down dropdown-arrow"></i>`;
        } else {
            heroBtn.className = "btn btn-secondary btn-lg dropdown-btn";
            heroBtn.innerHTML = `<i class="bi bi-windows"></i> ${winTitle}<i class="bi bi-chevron-down dropdown-arrow"></i>`;
            heroLinuxBtn.className = "btn btn-secondary btn-lg dropdown-btn";
            heroLinuxBtn.innerHTML = `${iconLinux} ${linuxTitle}<i class="bi bi-chevron-down dropdown-arrow"></i>`;
        }
    }

    function updateNavDownloadBtn() {
        if (!navBtn) return;
        const downloadText = t('nav.download', 'Download Now');
        if (userOS === "Windows") {
            navBtn.innerHTML = `<i class="bi bi-windows"></i> ${downloadText}`;
            navBtn.style.display = 'inline-flex';
        } else if (userOS === "Linux") {
            navBtn.innerHTML = `${iconLinux} ${downloadText}`;
            navBtn.style.display = 'inline-flex';
        } else if (userOS === "Mobile" || userOS === "MacOS") {
            navBtn.style.display = 'none';
        } else {
            navBtn.innerHTML = downloadText;
            navBtn.style.display = 'inline-flex';
        }
    }

    window.updateHeroButtons = updateHeroButtons;
    window.updateNavDownloadBtn = updateNavDownloadBtn;

    // Initial render with current active language
    updateHeroButtons();
    updateNavDownloadBtn();

    // Dropdown functionality
    function toggleDropdown(dropdown) {
        if (!dropdown) return;
        const isActive = dropdown.classList.contains('active');
        // Close all dropdowns first
        if (windowsDropdown) windowsDropdown.classList.remove('active');
        if (linuxDropdown) linuxDropdown.classList.remove('active');
        if (heroBtn) heroBtn.classList.remove('active');
        if (heroLinuxBtn) heroLinuxBtn.classList.remove('active');
        
        // Toggle the clicked dropdown
        if (!isActive) {
            dropdown.classList.add('active');
            if (dropdown === windowsDropdown && heroBtn) heroBtn.classList.add('active');
            if (dropdown === linuxDropdown && heroLinuxBtn) heroLinuxBtn.classList.add('active');
        }
    }

    // Event listeners for dropdowns
    if (heroBtn && windowsDropdown) {
        heroBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleDropdown(windowsDropdown);
        });
    }

    if (heroLinuxBtn && linuxDropdown) {
        heroLinuxBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleDropdown(linuxDropdown);
        });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (windowsDropdown && !windowsDropdown.contains(e.target) && e.target !== heroBtn) {
            windowsDropdown.classList.remove('active');
            if (heroBtn) heroBtn.classList.remove('active');
        }
        if (linuxDropdown && !linuxDropdown.contains(e.target) && e.target !== heroLinuxBtn) {
            linuxDropdown.classList.remove('active');
            if (heroLinuxBtn) heroLinuxBtn.classList.remove('active');
        }
    });

    async function getLatestRelease() {
        try {
            const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            const tagName = data.tag_name; // e.g., "v1.0.4"
            const baseUrl = `https://github.com/${repoOwner}/${repoName}/releases/download/${tagName}`;

            // Match assets from release dynamically
            const assets = Array.isArray(data.assets) ? data.assets : [];

            function findAssetForTarget(target) {
                const isArm = (n) => /arm/i.test(n) || /aarch64/i.test(n);
                return assets.find(a => {
                    const n = (a.name || '').toLowerCase();
                    if (n.endsWith('.blockmap') || n.endsWith('.yml') || n.endsWith('.sha256')) return false;
                    switch (target) {
                        case 'win-setup-x64':
                            return n.endsWith('.exe') && !isArm(n) && (n.includes('x64') || !assets.some(o => (o.name || '').toLowerCase().includes('installer-x64')));
                        case 'win-setup-arm64':
                            return n.endsWith('.exe') && isArm(n);
                        case 'win-portable-x64':
                            return n.endsWith('.zip') && n.includes('portable') && !isArm(n);
                        case 'win-portable-arm64':
                            return n.endsWith('.zip') && n.includes('portable') && isArm(n);
                        case 'linux-deb-x64':
                            return n.endsWith('.deb') && !isArm(n);
                        case 'linux-deb-arm64':
                            return n.endsWith('.deb') && isArm(n);
                        case 'linux-appimage-x64':
                            return n.endsWith('.appimage') && !isArm(n);
                        case 'linux-appimage-arm64':
                            return n.endsWith('.appimage') && isArm(n);
                        default:
                            return false;
                    }
                });
            }

            // Update dropdown links and dynamically hide items if the release lacks that asset
            const dropdownItems = document.querySelectorAll('.dropdown-menu .dropdown-item[data-target]');
            dropdownItems.forEach(item => {
                const target = item.getAttribute('data-target');
                const matchedAsset = findAssetForTarget(target);
                if (matchedAsset && matchedAsset.browser_download_url) {
                    item.href = matchedAsset.browser_download_url;
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });

            // Find primary downloads for Windows & Linux
            const fallbackWinUrl = `https://github.com/${repoOwner}/${repoName}/releases/tag/${tagName}`;
            const fallbackLinuxUrl = `https://github.com/${repoOwner}/${repoName}/releases/tag/${tagName}`;
            const winAsset = findAssetForTarget('win-setup-x64') || findAssetForTarget('win-portable-x64') || findAssetForTarget('win-setup-arm64');
            const linuxAsset = findAssetForTarget('linux-deb-x64') || findAssetForTarget('linux-appimage-x64') || findAssetForTarget('linux-deb-arm64');

            const winDownloadUrl = winAsset ? winAsset.browser_download_url : fallbackWinUrl;
            const linuxDownloadUrl = linuxAsset ? linuxAsset.browser_download_url : fallbackLinuxUrl;

            latestTagName = tagName;
            window.currentReleaseTag = tagName;

            if (heroBtn && heroLinuxBtn) {
                const heroBtnContainer = heroBtn.closest('.dropdown-container') || heroBtn;
                const heroLinuxBtnContainer = heroLinuxBtn.closest('.dropdown-container') || heroLinuxBtn;

                // Apply OS specific ordering and styles
                if (userOS === "Windows") {
                    if (heroBtnContainer.parentNode === heroButtonsContainer && heroLinuxBtnContainer.parentNode === heroButtonsContainer) {
                        heroButtonsContainer.insertBefore(heroBtnContainer, heroLinuxBtnContainer);
                    }
                } else if (userOS === "Linux") {
                    if (heroBtnContainer.parentNode === heroButtonsContainer && heroLinuxBtnContainer.parentNode === heroButtonsContainer) {
                        heroButtonsContainer.insertBefore(heroLinuxBtnContainer, heroBtnContainer);
                    }
                } else {
                    if (osWarningContainer && detectedOSName) {
                        detectedOSName.textContent = userOS === "Unknown" ? "an unknown operating system" : userOS;
                        osWarningContainer.style.display = "block";
                        heroButtonsContainer.style.flexWrap = "wrap";
                    }
                }

                // Set default button href to recommended option
                heroBtn.href = userOS === "Windows" ? winDownloadUrl : linuxDownloadUrl;
                heroBtn.target = '_blank';
                heroLinuxBtn.href = userOS === "Linux" ? linuxDownloadUrl : winDownloadUrl;
                heroLinuxBtn.target = '_blank';

                updateHeroButtons();
            }

            if (navBtn) {
                if (userOS === "Windows") {
                    navBtn.href = winDownloadUrl;
                } else if (userOS === "Linux") {
                    navBtn.href = linuxDownloadUrl;
                }
                updateNavDownloadBtn();
            }

            // Update the badge text as well if it exists
            const badge = document.querySelector('.badge');
            if (badge) badge.textContent = `${tagName} ${t('hero.badge_available', 'Now Available')}`;

        } catch (error) {
            console.error('Error fetching release:', error);
            // Fallback
            const fallbackUrl = `https://github.com/${repoOwner}/${repoName}/releases/latest`;
            if (heroBtn) heroBtn.href = fallbackUrl;
            if (heroLinuxBtn) heroLinuxBtn.href = fallbackUrl;
            if (navBtn) navBtn.href = fallbackUrl;
        }
    }

    getLatestRelease();


    // === Fetch Statistics (Downloads & Stars) ===
    async function getRepoStats() {
        try {
            // 1. Get Stars & Reviews from Firebase (Realtime)
            if (db && window.firebaseModules) {
                const { ref, onValue } = window.firebaseModules;
                const reviewsRef = ref(db, 'reviews');

                onValue(reviewsRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const reviews = Object.values(data);
                        const count = reviews.length;
                        const totalStars = reviews.reduce((acc, curr) => acc + parseInt(curr.rating), 0);
                        const average = (totalStars / count).toFixed(1);

                        // Update UI
                        const starCountEl = document.getElementById('starCount');
                        const reviewCountEl = document.getElementById('reviewCount');

                        if (starCountEl) starCountEl.textContent = average;
                        if (reviewCountEl) reviewCountEl.textContent = `(${count})`;
                    }
                });
            } else {
                // Fallback to GitHub Stars if Firebase not configured
                const repoResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`);
                if (repoResponse.ok) {
                    const repoData = await repoResponse.json();
                    const starCount = repoData.stargazers_count;
                    if (starCount > 0) {
                        const reviewCountEl = document.getElementById('reviewCount');
                        if (reviewCountEl) reviewCountEl.textContent = `(${starCount})`;
                    }
                }
            }

            // 2. Get Total Downloads (GitHub Releases)
            const releasesResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases`);
            if (releasesResponse.ok) {
                const releases = await releasesResponse.json();
                let totalDownloads = 0;
                releases.forEach(release => {
                    if (release.assets) {
                        release.assets.forEach(asset => {
                            totalDownloads += asset.download_count;
                        });
                    }
                });

                const downloadCountEl = document.getElementById('downloadCount');
                // Format number (e.g. 1.2k)
                if (downloadCountEl) {
                    if (totalDownloads > 1000) {
                        downloadCountEl.textContent = (totalDownloads / 1000).toFixed(1) + 'k+';
                    } else {
                        downloadCountEl.textContent = totalDownloads;
                    }
                }
            }

        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }

    getRepoStats();


    // === Carousel Logic ===
    const track = document.getElementById('carouselTrack');
    const slides = Array.from(track.children);
    const nextButton = document.getElementById('nextBtn');
    const prevButton = document.getElementById('prevBtn');
    const nav = document.getElementById('carouselNav');

    // Create indicators
    slides.forEach((_, index) => {
        const indicator = document.createElement('button');
        indicator.classList.add('carousel-indicator');
        if (index === 0) indicator.classList.add('current-slide');
        nav.appendChild(indicator);
        indicator.addEventListener('click', () => {
            moveToSlide(index);
        });
    });

    const indicators = Array.from(nav.children);
    let currentSlideIndex = 0;

    function moveToSlide(targetIndex) {
        // Loop around
        if (targetIndex < 0) targetIndex = slides.length - 1;
        if (targetIndex >= slides.length) targetIndex = 0;

        // Update visuals
        slides[currentSlideIndex].classList.remove('current-slide');
        indicators[currentSlideIndex].classList.remove('current-slide');

        slides[targetIndex].classList.add('current-slide');
        indicators[targetIndex].classList.add('current-slide');

        currentSlideIndex = targetIndex;
    }

    nextButton.addEventListener('click', () => {
        moveToSlide(currentSlideIndex + 1);
    });

    prevButton.addEventListener('click', () => {
        moveToSlide(currentSlideIndex - 1);
    });

    // Auto-advance
    let autoPlay = setInterval(() => moveToSlide(currentSlideIndex + 1), 5000);

    // Pause on hover
    const carouselContainer = document.querySelector('.carousel-container');
    carouselContainer.addEventListener('mouseenter', () => clearInterval(autoPlay));
    carouselContainer.addEventListener('mouseleave', () => {
        autoPlay = setInterval(() => moveToSlide(currentSlideIndex + 1), 5000);
    });


    // === Scroll Effect for Navbar ===
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(5, 5, 16, 0.9)';
            navbar.style.padding = '1rem 0';
        } else {
            navbar.style.background = 'rgba(5, 5, 16, 0.7)';
            navbar.style.padding = '1.5rem 0';
        }
    });

    // === 3D Cube Rotation with Inertia ===
    const cube = document.getElementById('blockCube');
    const heroVisual = document.querySelector('.hero-visual');
    if (cube && heroVisual) {
        // --- Configuration ---
        const friction = 0.95;       // Friction amount (0 to 1). Lower = more friction.
        const sensitivity = 0.5;    // Drag sensitivity.
        const autoSpinSpeed = 0.2;  // Speed of auto-rotation.
        const minRotationX = -90;   // Minimum vertical rotation (degrees)
        const maxRotationX = 90;    // Maximum vertical rotation (degrees)
        // ---------------------

        let isDragging = false;
        let startX, startY;
        let rotationX = -20;
        let rotationY = 30;
        let velocityX = 0;
        let velocityY = 0;

        heroVisual.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            cube.style.transition = 'none';
        });

        heroVisual.addEventListener('touchstart', (e) => {
            isDragging = true;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            cube.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            handleMove(e.clientX, e.clientY);
        });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
        });

        function handleMove(clientX, clientY) {
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;

            // Update velocities based on movement
            velocityY = deltaX * sensitivity;
            velocityX = -deltaY * sensitivity;

            rotationY += velocityY;
            rotationX += velocityX;

            // Clamp vertical rotation
            rotationX = Math.max(minRotationX, Math.min(maxRotationX, rotationX));

            cube.style.transform = `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;

            startX = clientX;
            startY = clientY;
        }

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        document.addEventListener('touchend', () => {
            isDragging = false;
        });

        function update() {
            if (!isDragging) {
                // Apply friction
                velocityY *= friction;
                velocityX *= friction;

                // Add a bit of constant auto-rotation
                rotationY += velocityY + autoSpinSpeed;
                rotationX += velocityX;

                // Clamp vertical rotation during inertia
                rotationX = Math.max(minRotationX, Math.min(maxRotationX, rotationX));

                if (rotationX === minRotationX || rotationX === maxRotationX) velocityX = 0;

                cube.style.transform = `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;
            }
            requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
    }

    // === Review System Logic ===
    const reviewBtn = document.getElementById('reviewBtn');
    const reviewModal = document.getElementById('reviewModal');
    const closeModal = document.querySelector('.close-modal');
    const reviewForm = document.getElementById('reviewForm');
    const stars = document.querySelectorAll('.star-rating i');
    const ratingInput = document.getElementById('ratingValue');

    if (!reviewBtn || !reviewModal) return;

    // Open Modal
    function openModal() {
        reviewModal.classList.add('active');
        // Stop the floating animation when open
        reviewBtn.style.animation = 'none';

        // Check if there's a URL parameter indicating we should open the review
        // (Just to clean the URL if we want, but keeping it simple)
    }

    // Close Modal
    function closeModalFunc() {
        reviewModal.classList.remove('active');
        reviewBtn.style.animation = 'float 3s ease-in-out infinite';
    }

    reviewBtn.addEventListener('click', openModal);

    closeModal.addEventListener('click', closeModalFunc);

    // Check URL Parameters for ?review=true
    if (urlParams.get('review') === 'true') {
        openModal();
    }

    // Star Rating Interaction
    let currentRating = 0;

    stars.forEach(star => {
        // Hover
        star.addEventListener('mouseover', function () {
            const rating = this.getAttribute('data-rating');
            highlightStars(rating);
        });

        // Mouse out
        star.addEventListener('mouseout', function () {
            highlightStars(currentRating);
        });

        // Click
        star.addEventListener('click', function () {
            currentRating = this.getAttribute('data-rating');
            ratingInput.value = currentRating;
            highlightStars(currentRating);
        });
    });

    function highlightStars(rating) {
        stars.forEach(star => {
            const starRating = star.getAttribute('data-rating');
            if (starRating <= rating) {
                star.classList.add('active');
                star.classList.remove('bi-star');
                star.classList.add('bi-star-fill');
            } else {
                star.classList.remove('active');
                star.classList.remove('bi-star-fill');
                star.classList.add('bi-star'); // Optional: outline star for empty
            }
        });
    }

    // Handle Form Submission
    reviewForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const rating = ratingInput.value;
        const name = document.getElementById('reviewerName').value || 'Anonymous';
        const comment = document.getElementById('reviewComment').value;

        if (!rating) {
            alert(t('review.alert_rating', 'Please select a star rating!'));
            return;
        }

        const reviewData = {
            rating,
            name,
            comment,
            timestamp: new Date().toISOString()
        };

        console.log('Review Submitted:', reviewData);

        // --- SAVE TO FIREBASE ---
        if (db && window.firebaseModules) {
            const { ref, push, serverTimestamp } = window.firebaseModules;
            const reviewsRef = ref(db, 'reviews');

            // Push new review
            push(reviewsRef, {
                ...reviewData,
                timestamp: serverTimestamp() // Use server timestamp
            }).then(() => {
                alert(t('review.alert_thanks', 'Thanks for your review!'));
                closeModalFunc();
                reviewForm.reset();
                ratingInput.value = '';
                highlightStars(0);
            }).catch(error => {
                console.error('Firebase Error:', error);
                alert(t('review.alert_error', 'Error saving review to database. Check console.'));
            });
        }

        // --- SEND TO DISCORD (Keep as backup/notification) ---
        const discordWebhookUrl = atob('aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTQ1MjY1MDE3MjYwODgwNzA2NS81Nm13SzFiVnVCQWloOUN5a3ZZQ3F5NHRNdTdLWE8wQzE4OUhuVDVoNmJkQVQ0SlU4bGQ4VG1YUHRYUGtWYkw5Y2xnVQ==');

        if (discordWebhookUrl) {
            fetch(discordWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [
                        {
                            title: "**New Review!**",
                            color: 0x00aa00,
                            fields: [
                                {
                                    name: "**Rating**",
                                    value: `${rating}/5 stars`,
                                    inline: false
                                },
                                {
                                    name: "**Name**",
                                    value: name,
                                    inline: false
                                },
                                {
                                    name: "**Comment**",
                                    value: comment,
                                    inline: false
                                }
                            ]
                        }
                    ]
                })
            }).catch(err => console.error('Error sending webhook:', err));
        }

        // Reset and close
        reviewForm.reset();
        currentRating = 0;
        highlightStars(0);
        closeModalFunc();
    });
    // Handle direct redirect to edit profile if already logged in (e.g. from launcher)
    const urlParamsRedirect = new URLSearchParams(window.location.search);
    if (urlParamsRedirect.get('edit_profile') === 'true') {
        const checkAuthAndClick = setInterval(() => {
            if (auth.currentUser && navUserBadge) {
                clearInterval(checkAuthAndClick);
                navUserBadge.click();
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }, 500);
        // Safety timeout to clear interval after 10 seconds
        setTimeout(() => clearInterval(checkAuthAndClick), 10000);
    }

    // === PowerShell Install Detection and Copy Functionality ===
    // Get DOM elements
    const powershellInstall = document.getElementById('powershellInstall');
    const copyPowershellBtn = document.getElementById('copyPowershellBtn');
    const powershellCommand = document.getElementById('powershellCommand');

    // Copy to clipboard functionality
    if (copyPowershellBtn && powershellCommand) {
        copyPowershellBtn.addEventListener('click', async () => {
            try {
                const command = powershellCommand.textContent;
                await navigator.clipboard.writeText(command);
                
                // Change button to indicate copied
                copyPowershellBtn.classList.add('copied');
                copyPowershellBtn.innerHTML = '<i class="bi bi-check"></i>';
                
                // Revert after 2 seconds
                setTimeout(() => {
                    copyPowershellBtn.classList.remove('copied');
                    copyPowershellBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = powershellCommand.textContent;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                copyPowershellBtn.classList.add('copied');
                copyPowershellBtn.innerHTML = '<i class="bi bi-check"></i>';
                setTimeout(() => {
                    copyPowershellBtn.classList.remove('copied');
                    copyPowershellBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
                }, 2000);
            }
        });
    }

    // Detect Windows or Linux and show appropriate install option
    if (powershellInstall) {
        const userAgent = navigator.userAgent.toLowerCase();
        const isWindows = userAgent.indexOf('win') > -1;
        const isLinux = userAgent.indexOf('linux') > -1 && userAgent.indexOf('android') === -1;
        
        if (isWindows) {
            powershellInstall.style.display = 'block';
        } else if (isLinux) {
            const bashInstall = document.getElementById('bashInstall');
            if (bashInstall) bashInstall.style.display = 'block';
        }
    }

    // Bash Copy Button
    const copyBashBtn = document.getElementById('copyBashBtn');
    const bashCommand = document.getElementById('bashCommand');
    
    if (copyBashBtn && bashCommand) {
        copyBashBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(bashCommand.textContent);
                copyBashBtn.classList.add('copied');
                copyBashBtn.innerHTML = '<i class="bi bi-check"></i>';
                setTimeout(() => {
                    copyBashBtn.classList.remove('copied');
                    copyBashBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                const textArea = document.createElement('textarea');
                textArea.value = bashCommand.textContent;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                copyBashBtn.classList.add('copied');
                copyBashBtn.innerHTML = '<i class="bi bi-check"></i>';
                setTimeout(() => {
                    copyBashBtn.classList.remove('copied');
                    copyBashBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
                }, 2000);
            }
        });
    }

    // === Apex Hosting Floating Promo ===
    initSponsorFloat();
}

// === Sponsor Float (Apex Hosting) Logic ===
async function initSponsorFloat() {
    const sponsorFloat = document.getElementById('sponsorFloat');
    if (!sponsorFloat) return;

    const SPONSOR_GIST_URL = 'https://gist.githubusercontent.com/abeloskyyy/ae6861843152ced82beb7f5135ac3863/raw/hwlauncher-promo.json';
    const PROMO_CACHE_KEY = 'hw_sponsor_promo_data';

    const DEFAULT_PROMO = {
        active: false,
        code: "HWLAUNCHER",
        discount: "25",
        url: "https://billing.apexminecrafthosting.com/aff.php?aff=17119"
    };

    const renderPromo = (data) => {
        if (!data || data.active !== true) {
            sponsorFloat.style.display = 'none';
            return;
        }

        const badge = document.getElementById('sponsorFloatBadge');
        const subtitle = document.getElementById('sponsorFloatSubtitle');
        const copyBtn = document.getElementById('sponsorFloatCopyBtn');
        const openBtn = document.getElementById('sponsorFloatOpenBtn');

        let disc = String(data.discount || '25').trim();
        let discNum = disc.replace(/[^0-9]/g, '') || '25';
        if (!disc.endsWith('%') && !disc.endsWith('OFF')) {
            disc = `${disc}% OFF`;
        }

        if (badge) badge.textContent = disc;
        if (subtitle) subtitle.textContent = `Create your server with ${discNum}% off`;

        const promoUrl = data.url || DEFAULT_PROMO.url;
        if (openBtn) openBtn.href = promoUrl;

        const promoCode = (data.code || DEFAULT_PROMO.code).trim();
        if (copyBtn) {
            copyBtn.onclick = async (e) => {
                e.stopPropagation();
                try {
                    await navigator.clipboard.writeText(promoCode);
                } catch (err) {
                    const textArea = document.createElement('textarea');
                    textArea.value = promoCode;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                }

                copyBtn.classList.add('copied');
                copyBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
                copyBtn.title = 'Code copied!';
                setTimeout(() => {
                    copyBtn.classList.remove('copied');
                    copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
                    copyBtn.title = 'Copy promo code';
                }, 2000);
            };
        }

        sponsorFloat.style.display = 'flex';
    };

    // Mobile tap to expand/collapse toggle
    sponsorFloat.onclick = (e) => {
        if (window.innerWidth <= 768) {
            if (e.target.closest('.sponsor-float-btn')) return;
            sponsorFloat.classList.toggle('is-expanded');
        }
    };

    // 1. Check local cache first for instant load
    let cachedData = null;
    try {
        const cached = localStorage.getItem(PROMO_CACHE_KEY);
        if (cached) {
            cachedData = JSON.parse(cached);
            renderPromo(cachedData);
        }
    } catch (e) {
        console.warn('Error reading sponsor promo cache:', e);
    }

    // 2. Fetch fresh version from Gist
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${SPONSOR_GIST_URL}?t=${Date.now()}`, {
            signal: controller.signal,
            cache: 'no-cache'
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const freshData = await res.json();
            try {
                localStorage.setItem(PROMO_CACHE_KEY, JSON.stringify(freshData));
            } catch (e) {}
            renderPromo(freshData);
        }
    } catch (e) {
        // Silently fail, keep cache or hidden
        if (!cachedData) {
            sponsorFloat.style.display = 'none';
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
