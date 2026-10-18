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
        "country.OTHER": "Other",
        "bg.mc_overworld": "Minecraft Overworld",
        "bg.mc_sky": "Minecraft Sky",
        "bg.mc_nether": "Minecraft Nether",
        "bg.mc_end": "Minecraft End",
        "bg.mc_village": "Minecraft Village",
        "bg.mc_forest": "Minecraft Forest",
        "bg.mc_desert": "Minecraft Desert",
        "bg.mc_ocean": "Minecraft Ocean",
        "bg.mc_cherry_grove": "Minecraft Cherry Grove",
        "tag.pvp": "PvP",
        "tag.pvp_pro": "PvP Pro",
        "tag.builder": "Builder",
        "tag.architect": "Architect",
        "tag.survival": "Survival",
        "tag.hardcore": "Hardcore",
        "tag.redstone": "Redstone",
        "tag.technical": "Technical",
        "tag.farms": "Farm Builder",
        "tag.explorer": "Explorer",
        "tag.speedrunner": "Speedrunner",
        "tag.socialite": "Socialite",
        "tag.roleplayer": "Roleplayer",
        "tag.modded": "Modded",
        "tag.modpack": "Modpack Player",
        "tag.creative": "Creative",
        "tag.artist": "Pixel Artist",
        "tag.streamer": "Streamer",
        "tag.casual": "Casual",
        "tag.minigames": "Minigames",
        "tag.skyblock": "Skyblock",
        "kofi.btn_title": "Support on Ko-fi",
        "sponsor.copy_title": "Copy promo code",
        "sponsor.open_title": "Visit Apex Hosting",
        "common.copy_clipboard": "Copy to clipboard",
        "settings.mc_head_title": "Use default Minecraft head",
        "badge.premium": "Premium Account",
        "badge.moderator": "Moderator",
        "badge.creator": "Creator"
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
        "country.OTHER": "Otro",
        "bg.mc_overworld": "Minecraft Overworld",
        "bg.mc_sky": "Minecraft Cielo",
        "bg.mc_nether": "Minecraft Nether",
        "bg.mc_end": "Minecraft End",
        "bg.mc_village": "Minecraft Aldea",
        "bg.mc_forest": "Minecraft Bosque",
        "bg.mc_desert": "Minecraft Desierto",
        "bg.mc_ocean": "Minecraft Océano",
        "bg.mc_cherry_grove": "Minecraft Arboleda de Cerezos",
        "tag.pvp": "PvP",
        "tag.pvp_pro": "PvP Pro",
        "tag.builder": "Constructor",
        "tag.architect": "Arquitecto",
        "tag.survival": "Supervivencia",
        "tag.hardcore": "Hardcore",
        "tag.redstone": "Redstone",
        "tag.technical": "Técnico",
        "tag.farms": "Granjero",
        "tag.explorer": "Explorador",
        "tag.speedrunner": "Speedrunner",
        "tag.socialite": "Social",
        "tag.roleplayer": "Roleplayer",
        "tag.modded": "Modded",
        "tag.modpack": "Jugador Modpacks",
        "tag.creative": "Creativo",
        "tag.artist": "Pixel Artist",
        "tag.streamer": "Streamer",
        "tag.casual": "Casual",
        "tag.minigames": "Minijuegos",
        "tag.skyblock": "Skyblock",
        "kofi.btn_title": "Apoyar en Ko-fi",
        "sponsor.copy_title": "Copiar código promocional",
        "sponsor.open_title": "Visitar Apex Hosting",
        "common.copy_clipboard": "Copiar al portapapeles",
        "settings.mc_head_title": "Usar cabeza predeterminada de Minecraft",
        "badge.premium": "Cuenta Premium",
        "badge.moderator": "Moderador",
        "badge.creator": "Creador"
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
        "settings.saved_btn": "Enregistré",
        "settings.saved_success": "Paramètres mis à jour avec succès!",
        "hero.badge": "Téléchargement disponible",
        "hero.badge_available": "Maintenant disponible",
        "hero.download_win": "Télécharger pour Windows",
        "hero.download_linux": "Télécharger pour Linux",
        "review.btn_title": "Laisser un avis",
        "review.title": "Laisser un avis",
        "review.subtitle": "Donnez votre avis sur HelloWorld Launcher !",
        "review.rating": "Note",
        "review.name": "Nom",
        "review.name_placeholder": "Votre nom (optionnel)",
        "review.comment": "Commentaire",
        "review.comment_placeholder": "Partagez votre expérience...",
        "review.submit": "Envoyer l'avis",
        "review.alert_rating": "Veuillez sélectionner une note avec les étoiles !",
        "review.alert_thanks": "Merci pour votre avis !",
        "review.alert_error": "Erreur lors de l'enregistrement de l'avis.",
        "hero.title": "Votre Minecraft, <br><span class=\"gradient-text\">Sans Limites.</span>",
        "hero.subtitle": "Le lanceur open source conçu pour être léger, sécurisé et totalement personnalisable. Oubliez les logiciels superflus.",
        "hero.install_ps": "Installation rapide (PowerShell)",
        "hero.install_bash": "Installation rapide (Bash)",
        "hero.install_note": "Installation en un clic",
        "hero.download_win_btn": "<i class=\"bi bi-windows\"></i> Télécharger pour Windows <i class=\"bi bi-chevron-down dropdown-arrow\"></i><div class=\"btn-shine\"></div>",
        "hero.win_setup_title": "Setup x64",
        "hero.win_setup_sub": "Installateur (Recommandé)",
        "hero.best_option": "Meilleure option",
        "hero.win_setup_arm_title": "Setup ARM64",
        "hero.win_setup_arm_sub": "Installateur pour appareils ARM",
        "hero.win_port_title": "Portable x64",
        "hero.win_port_sub": "Archive ZIP",
        "hero.win_port_arm_title": "Portable ARM64",
        "hero.win_port_arm_sub": "Archive ZIP pour ARM",
        "hero.download_linux_btn": "<i class=\"fa-brands fa-linux\" style=\"font-size: 1.1rem; margin-right: 5px;\"></i> Télécharger pour Linux <i class=\"bi bi-chevron-down dropdown-arrow\"></i>",
        "hero.lin_deb_title": "DEB x64",
        "hero.lin_deb_sub": "Debian/Ubuntu (Recommandé)",
        "hero.lin_deb_arm_title": "DEB ARM64",
        "hero.lin_deb_arm_sub": "Debian/Ubuntu pour ARM",
        "hero.lin_app_title": "AppImage x64",
        "hero.lin_app_sub": "Linux Universel",
        "hero.lin_app_arm_title": "AppImage ARM64",
        "hero.lin_app_arm_sub": "Linux Universel pour ARM",
        "hero.os_warning": "<i class=\"bi bi-info-circle\" style=\"margin-right: 5px;\"></i> Vous naviguez depuis <strong><span id=\"detectedOSName\">OS</span></strong>. Les installateurs suivants peuvent être incompatibles.",
        "hero.stats_downloads": "Téléchargements",
        "hero.stats_rating": "<span style=\"font-size: 0.9rem; font-weight: 500; opacity: 0.9;\">/5 Note</span>",
        "discord.title": "Rejoignez notre communauté",
        "discord.subtitle": "Obtenez de l'aide et des nouveautés",
        "hero.stats_opensource": "Open Source",
        "hero.stats_telemetry": "Télémétrie",
        "hero.stats_perf_val": "Élevée",
        "hero.stats_perf": "Performance",
        "features.title": "Pourquoi HelloWorld ?",
        "features.subtitle": "Conçu avec la performance et la confidentialité à l'esprit.",
        "features.f1_title": "Confidentialité d'abord",
        "features.f1_desc": "Aucune télémétrie ni traqueur. Votre activité n'appartient qu'à vous. Code 100% vérifiable sur GitHub.",
        "features.f2_title": "Démarrage rapide",
        "features.f2_desc": "Optimisé pour démarrer en quelques secondes. Idéal pour les configurations modestes.",
        "features.f3_title": "Gestion des Mods",
        "features.f3_desc": "Installez Forge, Fabric et des mods directement depuis le lanceur sans outils externes.",
        "features.f4_title": "Installations intelligentes",
        "features.f4_desc": "Chaque installation a sa propre configuration. Gardez vos versions et mods bien organisés.",
        "features.f5_title": "Mode Hors Ligne",
        "features.f5_desc": "Pas d'internet ? Aucun souci. Jouez à vos versions installées n'importe où.",
        "features.f6_title": "Open Source",
        "features.f6_desc": "Transparence totale. Aucun installateur caché ni logiciel tiers.",
        "gallery.title": "Galerie",
        "gallery.subtitle": "Découvrez une interface simple, soignée et puissante.",
        "faq.title": "Foire Aux Questions",
        "faq.subtitle": "Tout ce que vous devez savoir.",
        "faq.q1": "Pourquoi indique-t-il un faux virus ?",
        "faq.a1": "L'application n'est pas encore signée par un certificat commercial coûteux. C'est un faux positif classique.",
        "faq.q2": "Est-ce légal ?",
        "faq.a2": "Oui. Le lanceur respecte les conditions officielles de Mojang et Microsoft.",
        "faq.q3": "Prend-il en charge les gros modpacks ?",
        "faq.a3": "Oui, les modpacks lourds fonctionnent parfaitement tant que votre PC dispose de suffisamment de RAM.",
        "faq.q4": "Fonctionne-t-il sans connexion internet ?",
        "faq.a4": "Oui, le mode hors ligne permet de jouer avec les versions déjà téléchargées.",
        "faq.q5": "Supporte-t-il Fabric et Forge ?",
        "faq.a5": "Absolument. Vous pouvez créer des installations indépendantes pour chacun.",
        "footer.desc": "Le lanceur Minecraft créé par la communauté, pour la communauté.",
        "footer.links": "Liens",
        "footer.repo": "Dépôt GitHub",
        "footer.report": "Signaler un bug",
        "footer.prev": "Versions antérieures",
        "footer.copy": "&copy; 2026 HelloWorld Launcher. Non affilié à Mojang ou Microsoft.",
        "footer.signpath": "Ce projet utilise la <a href=\"https://signpath.org/\" target=\"_blank\" rel=\"noopener noreferrer\">SignPath Foundation</a> pour la signature de code.",
        "bg.default": "Bannière par Défaut",
        "bg.purple": "Dégradé Violet",
        "bg.blue": "Dégradé Bleu",
        "bg.green": "Dégradé Vert",
        "bg.orange": "Dégradé Orange",
        "bg.pink": "Dégradé Rose",
        "cropper.title": "Rogner l'Avatar",
        "cropper.cancel": "Annuler",
        "cropper.apply": "Appliquer",
        "global.loading": "Chargement des services...",
        "country.AR": "Argentine",
        "country.AU": "Australie",
        "country.AT": "Autriche",
        "country.BE": "Belgique",
        "country.BR": "Brésil",
        "country.CA": "Canada",
        "country.CL": "Chili",
        "country.CN": "Chine",
        "country.CO": "Colombie",
        "country.CZ": "République tchèque",
        "country.DK": "Danemark",
        "country.EG": "Égypte",
        "country.FI": "Finlande",
        "country.FR": "France",
        "country.DE": "Allemagne",
        "country.GR": "Grèce",
        "country.HK": "Hong Kong",
        "country.HU": "Hongrie",
        "country.IS": "Islande",
        "country.IN": "Inde",
        "country.ID": "Indonésie",
        "country.IE": "Irlande",
        "country.IL": "Israël",
        "country.IT": "Italie",
        "country.JP": "Japon",
        "country.LU": "Luxembourg",
        "country.MY": "Malaisie",
        "country.MX": "Mexique",
        "country.NL": "Pays-Bas",
        "country.NZ": "Nouvelle-Zélande",
        "country.NG": "Nigéria",
        "country.NO": "Norvège",
        "country.PE": "Pérou",
        "country.PH": "Philippines",
        "country.PL": "Pologne",
        "country.PT": "Portugal",
        "country.RO": "Roumanie",
        "country.RU": "Russie",
        "country.SA": "Arabie saoudite",
        "country.SG": "Singapour",
        "country.ZA": "Afrique du Sud",
        "country.KR": "Corée du Sud",
        "country.ES": "Espagne",
        "country.SE": "Suède",
        "country.CH": "Suisse",
        "country.TH": "Thaïlande",
        "country.TR": "Turquie",
        "country.UA": "Ukraine",
        "country.AE": "Émirats arabes unis",
        "country.GB": "Royaume-Uni",
        "country.US": "États-Unis",
        "country.VE": "Venezuela",
        "country.VN": "Vietnam",
        "country.OTHER": "Autre",
        "bg.mc_overworld": "Minecraft Monde Normal",
        "bg.mc_sky": "Minecraft Ciel",
        "bg.mc_nether": "Minecraft Nether",
        "bg.mc_end": "Minecraft End",
        "bg.mc_village": "Minecraft Village",
        "bg.mc_forest": "Minecraft Forêt",
        "bg.mc_desert": "Minecraft Désert",
        "bg.mc_ocean": "Minecraft Océan",
        "bg.mc_cherry_grove": "Minecraft Cerisiers",
        "tag.pvp": "PvP",
        "tag.pvp_pro": "PvP Pro",
        "tag.builder": "Bâtisseur",
        "tag.architect": "Architecte",
        "tag.survival": "Survie",
        "tag.hardcore": "Hardcore",
        "tag.redstone": "Redstone",
        "tag.technical": "Technique",
        "tag.farms": "Fermier",
        "tag.explorer": "Explorateur",
        "tag.speedrunner": "Speedrunner",
        "tag.socialite": "Social",
        "tag.roleplayer": "Rôliste",
        "tag.modded": "Moddé",
        "tag.modpack": "Joueur Modpack",
        "tag.creative": "Créatif",
        "tag.artist": "Pixel Artiste",
        "tag.streamer": "Streamer",
        "tag.casual": "Occasionnel",
        "tag.minigames": "Mini-jeux",
        "tag.skyblock": "Skyblock",
        "kofi.btn_title": "Soutenir sur Ko-fi",
        "sponsor.copy_title": "Copier le code promo",
        "sponsor.open_title": "Visiter Apex Hosting",
        "common.copy_clipboard": "Copier dans le presse-papiers",
        "settings.mc_head_title": "Utiliser la tête Minecraft par défaut",
        "badge.premium": "Compte Premium",
        "badge.moderator": "Modérateur",
        "badge.creator": "Créateur"
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
        "settings.saved_btn": "Gespeichert",
        "settings.saved_success": "Kontoeinstellungen erfolgreich aktualisiert!",
        "hero.badge": "Download jetzt verfügbar",
        "hero.badge_available": "Jetzt verfügbar",
        "hero.download_win": "Für Windows herunterladen",
        "hero.download_linux": "Für Linux herunterladen",
        "review.btn_title": "Bewertung abgeben",
        "review.title": "Bewertung abgeben",
        "review.subtitle": "Sag uns deine Meinung zu HelloWorld Launcher!",
        "review.rating": "Bewertung",
        "review.name": "Name",
        "review.name_placeholder": "Dein Name (optional)",
        "review.comment": "Kommentar",
        "review.comment_placeholder": "Teile deine Erfahrungen...",
        "review.submit": "Bewertung absenden",
        "review.alert_rating": "Bitte wähle eine Sternebewertung aus!",
        "review.alert_thanks": "Vielen Dank für deine Bewertung!",
        "review.alert_error": "Fehler beim Speichern der Bewertung.",
        "hero.title": "Dein Minecraft, <br><span class=\"gradient-text\">Ohne Grenzen.</span>",
        "hero.subtitle": "Der Open-Source-Launcher – leicht, sicher und komplett anpassbar. Vergiss überflüssige Software.",
        "hero.install_ps": "Schnellinstallation (PowerShell)",
        "hero.install_bash": "Schnellinstallation (Bash)",
        "hero.install_note": "Ein-Klick-Installation",
        "hero.download_win_btn": "<i class=\"bi bi-windows\"></i> Für Windows herunterladen <i class=\"bi bi-chevron-down dropdown-arrow\"></i><div class=\"btn-shine\"></div>",
        "hero.win_setup_title": "Setup x64",
        "hero.win_setup_sub": "Installationsprogramm (Empfohlen)",
        "hero.best_option": "Beste Option",
        "hero.win_setup_arm_title": "Setup ARM64",
        "hero.win_setup_arm_sub": "Installationsprogramm für ARM",
        "hero.win_port_title": "Portabel x64",
        "hero.win_port_sub": "ZIP-Archiv",
        "hero.win_port_arm_title": "Portabel ARM64",
        "hero.win_port_arm_sub": "ZIP-Archiv für ARM",
        "hero.download_linux_btn": "<i class=\"fa-brands fa-linux\" style=\"font-size: 1.1rem; margin-right: 5px;\"></i> Für Linux herunterladen <i class=\"bi bi-chevron-down dropdown-arrow\"></i>",
        "hero.lin_deb_title": "DEB x64",
        "hero.lin_deb_sub": "Debian/Ubuntu (Empfohlen)",
        "hero.lin_deb_arm_title": "DEB ARM64",
        "hero.lin_deb_arm_sub": "Debian/Ubuntu für ARM",
        "hero.lin_app_title": "AppImage x64",
        "hero.lin_app_sub": "Universelles Linux",
        "hero.lin_app_arm_title": "AppImage ARM64",
        "hero.lin_app_arm_sub": "Universelles Linux für ARM",
        "hero.os_warning": "<i class=\"bi bi-info-circle\" style=\"margin-right: 5px;\"></i> Du besuchst uns von <strong><span id=\"detectedOSName\">OS</span></strong>. Folgende Installer sind eventuell inkompatibel.",
        "hero.stats_downloads": "Downloads",
        "hero.stats_rating": "<span style=\"font-size: 0.9rem; font-weight: 500; opacity: 0.9;\">/5 Bewertung</span>",
        "discord.title": "Tritt unserer Community bei",
        "discord.subtitle": "Hilfe und Neuigkeiten erhalten",
        "hero.stats_opensource": "Open Source",
        "hero.stats_telemetry": "Telemetrie",
        "hero.stats_perf_val": "Hoch",
        "hero.stats_perf": "Leistung",
        "features.title": "Warum HelloWorld?",
        "features.subtitle": "Entwickelt mit Fokus auf Leistung und Datenschutz.",
        "features.f1_title": "Datenschutz an erster Stelle",
        "features.f1_desc": "Keine Telemetrie oder Tracker. Deine Daten gehören nur dir. 100% überprüfbar auf GitHub.",
        "features.f2_title": "Schneller Start",
        "features.f2_desc": "Optimiert für blitzschnellen Start in wenigen Sekunden. Perfekt für ältere PCs.",
        "features.f3_title": "Mod-Verwaltung",
        "features.f3_desc": "Installiere Forge, Fabric und Mods direkt aus dem Launcher ohne externe Tools.",
        "features.f4_title": "Intelligente Installationen",
        "features.f4_desc": "Jede Installation hat ihre eigene Konfiguration. Halte deine Versionen ordentlich getrennt.",
        "features.f5_title": "Offline-Modus",
        "features.f5_desc": "Kein Internet? Kein Problem. Spiele deine installierten Versionen überall.",
        "features.f6_title": "Open Source",
        "features.f6_desc": "Vollständige Transparenz. Keine versteckten Installationsprogramme.",
        "gallery.title": "Galerie",
        "gallery.subtitle": "Wirf einen Blick auf die moderne und übersichtliche Benutzeroberfläche.",
        "faq.title": "Häufig gestellte Fragen",
        "faq.subtitle": "Alles, was du wissen musst.",
        "faq.q1": "Warum wird ein Virenfund gemeldet?",
        "faq.a1": "Da die App nicht mit teuren kommerziellen Zertifikaten signiert ist. Ein typischer Fehlalarm bei Open-Source-Software.",
        "faq.q2": "Ist das legal?",
        "faq.a2": "Ja. Der Launcher verwendet eine legale Kopie des Spiels gemäß den Richtlinien von Mojang/Microsoft.",
        "faq.q3": "Unterstützt er große Modpacks?",
        "faq.a3": "Ja, selbst anspruchsvolle Modpacks laufen reibungslos, sofern dein PC genügend RAM hat.",
        "faq.q4": "Funktioniert er ohne Internet?",
        "faq.a4": "Ja, im Offline-Modus kannst du bereits heruntergeladene Versionen ohne Verbindung spielen.",
        "faq.q5": "Werden Fabric und Forge unterstützt?",
        "faq.a5": "Absolut. Du kannst separate Installationen für jedes Profil anlegen.",
        "footer.desc": "Der Minecraft-Launcher von der Community für die Community.",
        "footer.links": "Links",
        "footer.repo": "GitHub-Repository",
        "footer.report": "Fehler melden",
        "footer.prev": "Frühere Versionen",
        "footer.copy": "&copy; 2026 HelloWorld Launcher. Nicht mit Mojang oder Microsoft verbunden.",
        "footer.signpath": "Dieses Projekt nutzt die <a href=\"https://signpath.org/\" target=\"_blank\" rel=\"noopener noreferrer\">SignPath Foundation</a> zur Codesignierung.",
        "bg.default": "Standard-Banner",
        "bg.purple": "Lila Farbverlauf",
        "bg.blue": "Blauer Farbverlauf",
        "bg.green": "Grüner Farbverlauf",
        "bg.orange": "Oranger Farbverlauf",
        "bg.pink": "Rosa Farbverlauf",
        "cropper.title": "Avatar Zuschneiden",
        "cropper.cancel": "Abbrechen",
        "cropper.apply": "Anwenden",
        "global.loading": "Dienste werden geladen...",
        "country.AR": "Argentinien",
        "country.AU": "Australien",
        "country.AT": "Österreich",
        "country.BE": "Belgien",
        "country.BR": "Brasilien",
        "country.CA": "Kanada",
        "country.CL": "Chile",
        "country.CN": "China",
        "country.CO": "Kolumbien",
        "country.CZ": "Tschechien",
        "country.DK": "Dänemark",
        "country.EG": "Ägypten",
        "country.FI": "Finnland",
        "country.FR": "Frankreich",
        "country.DE": "Deutschland",
        "country.GR": "Griechenland",
        "country.HK": "Hongkong",
        "country.HU": "Ungarn",
        "country.IS": "Island",
        "country.IN": "Indien",
        "country.ID": "Indonesien",
        "country.IE": "Irland",
        "country.IL": "Israel",
        "country.IT": "Italien",
        "country.JP": "Japan",
        "country.LU": "Luxemburg",
        "country.MY": "Malaysia",
        "country.MX": "Mexiko",
        "country.NL": "Niederlande",
        "country.NZ": "Neuseeland",
        "country.NG": "Nigeria",
        "country.NO": "Norwegen",
        "country.PE": "Peru",
        "country.PH": "Philippinen",
        "country.PL": "Polen",
        "country.PT": "Portugal",
        "country.RO": "Rumänien",
        "country.RU": "Russland",
        "country.SA": "Saudi-Arabien",
        "country.SG": "Singapur",
        "country.ZA": "Südafrika",
        "country.KR": "Südkorea",
        "country.ES": "Spanien",
        "country.SE": "Schweden",
        "country.CH": "Schweiz",
        "country.TH": "Thailand",
        "country.TR": "Türkei",
        "country.UA": "Ukraine",
        "country.AE": "Vereinigte Arabische Emirate",
        "country.GB": "Vereinigtes Königreich",
        "country.US": "Vereinigte Staaten",
        "country.VE": "Venezuela",
        "country.VN": "Vietnam",
        "country.OTHER": "Andere",
        "bg.mc_overworld": "Minecraft Oberwelt",
        "bg.mc_sky": "Minecraft Himmel",
        "bg.mc_nether": "Minecraft Nether",
        "bg.mc_end": "Minecraft Ende",
        "bg.mc_village": "Minecraft Dorf",
        "bg.mc_forest": "Minecraft Wald",
        "bg.mc_desert": "Minecraft Wüste",
        "bg.mc_ocean": "Minecraft Ozean",
        "bg.mc_cherry_grove": "Minecraft Kirschblütenhain",
        "tag.pvp": "PvP",
        "tag.pvp_pro": "PvP Pro",
        "tag.builder": "Baumeister",
        "tag.architect": "Architekt",
        "tag.survival": "Überleben",
        "tag.hardcore": "Hardcore",
        "tag.redstone": "Redstone",
        "tag.technical": "Technisch",
        "tag.farms": "Farbenbauer",
        "tag.explorer": "Entdecker",
        "tag.speedrunner": "Speedrunner",
        "tag.socialite": "Gesellig",
        "tag.roleplayer": "Rollenspieler",
        "tag.modded": "Gemoddet",
        "tag.modpack": "Modpack-Spieler",
        "tag.creative": "Kreativ",
        "tag.artist": "Pixel-Künstler",
        "tag.streamer": "Streamer",
        "tag.casual": "Gelegenheitsspieler",
        "tag.minigames": "Minispiele",
        "tag.skyblock": "Skyblock",
        "kofi.btn_title": "Auf Ko-fi unterstützen",
        "sponsor.copy_title": "Aktionscode kopieren",
        "sponsor.open_title": "Apex Hosting besuchen",
        "common.copy_clipboard": "In die Zwischenablage kopieren",
        "settings.mc_head_title": "Standard-Minecraft-Kopf verwenden",
        "badge.premium": "Premium-Konto",
        "badge.moderator": "Moderator",
        "badge.creator": "Ersteller"
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
        "settings.saved_btn": "Salvo",
        "settings.saved_success": "Configurações atualizadas com sucesso!",
        "hero.badge": "Download disponível agora",
        "hero.badge_available": "Já disponível",
        "hero.download_win": "Baixar para Windows",
        "hero.download_linux": "Baixar para Linux",
        "review.btn_title": "Deixar uma Avaliação",
        "review.title": "Deixar uma Avaliação",
        "review.subtitle": "Conte-nos o que achou do HelloWorld Launcher!",
        "review.rating": "Avaliação",
        "review.name": "Nome",
        "review.name_placeholder": "Seu nome (opcional)",
        "review.comment": "Comentário",
        "review.comment_placeholder": "Compartilhe sua experiência...",
        "review.submit": "Enviar Avaliação",
        "review.alert_rating": "Selecione uma classificação por estrelas!",
        "review.alert_thanks": "Obrigado pela sua avaliação!",
        "review.alert_error": "Erro ao salvar avaliação.",
        "hero.title": "O seu Minecraft, <br><span class=\"gradient-text\">Sem Limites.</span>",
        "hero.subtitle": "O inicializador de código aberto projetado para ser leve, seguro e totalmente personalizável. Esqueça programas desnecessários.",
        "hero.install_ps": "Instalação rápida (PowerShell)",
        "hero.install_bash": "Instalação rápida (Bash)",
        "hero.install_note": "Instalação com um clique",
        "hero.download_win_btn": "<i class=\"bi bi-windows\"></i> Baixar para Windows <i class=\"bi bi-chevron-down dropdown-arrow\"></i><div class=\"btn-shine\"></div>",
        "hero.win_setup_title": "Instalador x64",
        "hero.win_setup_sub": "Instalador (Recomendado)",
        "hero.best_option": "Melhor opção",
        "hero.win_setup_arm_title": "Instalador ARM64",
        "hero.win_setup_arm_sub": "Instalador para ARM",
        "hero.win_port_title": "Portátil x64",
        "hero.win_port_sub": "Arquivo ZIP",
        "hero.win_port_arm_title": "Portátil ARM64",
        "hero.win_port_arm_sub": "Arquivo ZIP para ARM",
        "hero.download_linux_btn": "<i class=\"fa-brands fa-linux\" style=\"font-size: 1.1rem; margin-right: 5px;\"></i> Baixar para Linux <i class=\"bi bi-chevron-down dropdown-arrow\"></i>",
        "hero.lin_deb_title": "DEB x64",
        "hero.lin_deb_sub": "Debian/Ubuntu (Recomendado)",
        "hero.lin_deb_arm_title": "DEB ARM64",
        "hero.lin_deb_arm_sub": "Debian/Ubuntu para ARM",
        "hero.lin_app_title": "AppImage x64",
        "hero.lin_app_sub": "Linux Universal",
        "hero.lin_app_arm_title": "AppImage ARM64",
        "hero.lin_app_arm_sub": "Linux Universal para ARM",
        "hero.os_warning": "<i class=\"bi bi-info-circle\" style=\"margin-right: 5px;\"></i> Você está navegando de <strong><span id=\"detectedOSName\">OS</span></strong>. Os instaladores podem não ser compatíveis.",
        "hero.stats_downloads": "Downloads",
        "hero.stats_rating": "<span style=\"font-size: 0.9rem; font-weight: 500; opacity: 0.9;\">/5 Avaliação</span>",
        "discord.title": "Participe da comunidade",
        "discord.subtitle": "Receba suporte e novidades",
        "hero.stats_opensource": "Código Aberto",
        "hero.stats_telemetry": "Telemetria",
        "hero.stats_perf_val": "Alto",
        "hero.stats_perf": "Desempenho",
        "features.title": "Por que o HelloWorld?",
        "features.subtitle": "Projetado com foco em privacidade e alto desempenho.",
        "features.f1_title": "Privacidade em Primeiro Lugar",
        "features.f1_desc": "Sem rastreadores nem telemetria. Sua atividade pertence somente a você. Código 100% auditável.",
        "features.f2_title": "Inicialização Rápida",
        "features.f2_desc": "Otimizado para iniciar em segundos. Perfeito para computadores modestos.",
        "features.f3_title": "Gerenciamento de Mods",
        "features.f3_desc": "Instale Forge, Fabric e mods diretamente sem programas externos.",
        "features.f4_title": "Instalações Inteligentes",
        "features.f4_desc": "Cada instalação possui sua pasta e configurações separadas.",
        "features.f5_title": "Modo Offline",
        "features.f5_desc": "Sem internet? Jogue suas versões instaladas quando e onde quiser.",
        "features.f6_title": "Código Aberto",
        "features.f6_desc": "Transparência total sem instaladores suspeitos nem pegadinhas.",
        "gallery.title": "Galeria",
        "gallery.subtitle": "Conheça a interface simples, limpa e moderna.",
        "faq.title": "Perguntas Frequentes",
        "faq.subtitle": "Tudo o que você precisa saber.",
        "faq.q1": "Por que o antivírus acusa alerta falso?",
        "faq.a1": "Como o aplicativo não utiliza um certificado comercial pago, antivírus podem gerar falso positivo.",
        "faq.q2": "É seguro e legal?",
        "faq.a2": "Sim. O launcher opera respeitando os termos da Mojang e da Microsoft.",
        "faq.q3": "Suporta modpacks pesados?",
        "faq.a3": "Sim, suporta modpacks grandes com estabilidade, dependendo da RAM do seu PC.",
        "faq.q4": "Funciona sem internet?",
        "faq.a4": "Sim, o Modo Offline permite jogar versões já baixadas sem conexão.",
        "faq.q5": "Suporta Fabric e Forge?",
        "faq.a5": "Com certeza. Você pode criar perfis dedicados para cada um.",
        "footer.desc": "O inicializador de Minecraft feito pela comunidade para a comunidade.",
        "footer.links": "Links",
        "footer.repo": "Repositório GitHub",
        "footer.report": "Reportar Erro",
        "footer.prev": "Versões Anteriores",
        "footer.copy": "&copy; 2026 HelloWorld Launcher. Não afiliado à Mojang ou Microsoft.",
        "footer.signpath": "Este projeto utiliza a <a href=\"https://signpath.org/\" target=\"_blank\" rel=\"noopener noreferrer\">SignPath Foundation</a> para assinatura de código.",
        "bg.default": "Banner Padrão",
        "bg.purple": "Gradiente Roxo",
        "bg.blue": "Gradiente Azul",
        "bg.green": "Gradiente Verde",
        "bg.orange": "Gradiente Laranja",
        "bg.pink": "Gradiente Rosa",
        "cropper.title": "Recortar Avatar",
        "cropper.cancel": "Cancelar",
        "cropper.apply": "Aplicar Recorte",
        "global.loading": "Carregando serviços...",
        "country.AR": "Argentina",
        "country.AU": "Austrália",
        "country.AT": "Áustria",
        "country.BE": "Bélgica",
        "country.BR": "Brasil",
        "country.CA": "Canadá",
        "country.CL": "Chile",
        "country.CN": "China",
        "country.CO": "Colômbia",
        "country.CZ": "República Checa",
        "country.DK": "Dinamarca",
        "country.EG": "Egito",
        "country.FI": "Finlândia",
        "country.FR": "França",
        "country.DE": "Alemanha",
        "country.GR": "Grécia",
        "country.HK": "Hong Kong",
        "country.HU": "Hungria",
        "country.IS": "Islândia",
        "country.IN": "Índia",
        "country.ID": "Indonésia",
        "country.IE": "Irlanda",
        "country.IL": "Israel",
        "country.IT": "Itália",
        "country.JP": "Japão",
        "country.LU": "Luxemburgo",
        "country.MY": "Malásia",
        "country.MX": "México",
        "country.NL": "Países Baixos",
        "country.NZ": "Nova Zelândia",
        "country.NG": "Nigéria",
        "country.NO": "Noruega",
        "country.PE": "Peru",
        "country.PH": "Filipinas",
        "country.PL": "Polônia",
        "country.PT": "Portugal",
        "country.RO": "Romênia",
        "country.RU": "Rússia",
        "country.SA": "Arábia Saudita",
        "country.SG": "Cingapura",
        "country.ZA": "África do Sul",
        "country.KR": "Coreia do Sul",
        "country.ES": "Espanha",
        "country.SE": "Suécia",
        "country.CH": "Suíça",
        "country.TH": "Tailândia",
        "country.TR": "Turquia",
        "country.UA": "Ucrânia",
        "country.AE": "Emirados Árabes Unidos",
        "country.GB": "Reino Unido",
        "country.US": "Estados Unidos",
        "country.VE": "Venezuela",
        "country.VN": "Vietnã",
        "country.OTHER": "Outro",
        "bg.mc_overworld": "Minecraft Overworld",
        "bg.mc_sky": "Minecraft Céu",
        "bg.mc_nether": "Minecraft Nether",
        "bg.mc_end": "Minecraft End",
        "bg.mc_village": "Minecraft Aldeia",
        "bg.mc_forest": "Minecraft Floresta",
        "bg.mc_desert": "Minecraft Deserto",
        "bg.mc_ocean": "Minecraft Oceano",
        "bg.mc_cherry_grove": "Minecraft Bosque de Cerejeiras",
        "tag.pvp": "PvP",
        "tag.pvp_pro": "PvP Pro",
        "tag.builder": "Construtor",
        "tag.architect": "Arquiteto",
        "tag.survival": "Sobrevivência",
        "tag.hardcore": "Hardcore",
        "tag.redstone": "Redstone",
        "tag.technical": "Técnico",
        "tag.farms": "Fazendeiro",
        "tag.explorer": "Explorador",
        "tag.speedrunner": "Speedrunner",
        "tag.socialite": "Sociável",
        "tag.roleplayer": "Roleplayer",
        "tag.modded": "Modded",
        "tag.modpack": "Jogador de Modpacks",
        "tag.creative": "Criativo",
        "tag.artist": "Pixel Artist",
        "tag.streamer": "Streamer",
        "tag.casual": "Casual",
        "tag.minigames": "Minijogos",
        "tag.skyblock": "Skyblock",
        "kofi.btn_title": "Apoiar no Ko-fi",
        "sponsor.copy_title": "Copiar código promocional",
        "sponsor.open_title": "Visitar Apex Hosting",
        "common.copy_clipboard": "Copiar para a área de transferência",
        "settings.mc_head_title": "Usar cabeça padrão do Minecraft",
        "badge.premium": "Conta Premium",
        "badge.moderator": "Moderador",
        "badge.creator": "Criador"
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
        "settings.saved_btn": "Salvato",
        "settings.saved_success": "Impostazioni aggiornate con successo!",
        "hero.badge": "Download disponibile ora",
        "hero.badge_available": "Disponibile ora",
        "hero.download_win": "Scarica per Windows",
        "hero.download_linux": "Scarica per Linux",
        "review.btn_title": "Lascia una recensione",
        "review.title": "Lascia una recensione",
        "review.subtitle": "Dicci cosa pensi di HelloWorld Launcher!",
        "review.rating": "Valutazione",
        "review.name": "Nome",
        "review.name_placeholder": "Il tuo nome (facoltativo)",
        "review.comment": "Commento",
        "review.comment_placeholder": "Condividi la tua esperienza...",
        "review.submit": "Invia recensione",
        "review.alert_rating": "Seleziona un punteggio con le stelle!",
        "review.alert_thanks": "Grazie per la tua recensione!",
        "review.alert_error": "Errore durante il salvataggio della recensione.",
        "hero.title": "Il tuo Minecraft, <br><span class=\"gradient-text\">Senza Limiti.</span>",
        "hero.subtitle": "Il launcher open source progettato per essere leggero, sicuro e completamente personalizzabile. Dimentica il bloatware.",
        "hero.install_ps": "Installazione rapida (PowerShell)",
        "hero.install_bash": "Installazione rapida (Bash)",
        "hero.install_note": "Installazione in un clic",
        "hero.download_win_btn": "<i class=\"bi bi-windows\"></i> Scarica per Windows <i class=\"bi bi-chevron-down dropdown-arrow\"></i><div class=\"btn-shine\"></div>",
        "hero.win_setup_title": "Setup x64",
        "hero.win_setup_sub": "Programma di installazione (Consigliato)",
        "hero.best_option": "Scelta migliore",
        "hero.win_setup_arm_title": "Setup ARM64",
        "hero.win_setup_arm_sub": "Installazione per dispositivi ARM",
        "hero.win_port_title": "Portatile x64",
        "hero.win_port_sub": "Archivio ZIP",
        "hero.win_port_arm_title": "Portatile ARM64",
        "hero.win_port_arm_sub": "Archivio ZIP per ARM",
        "hero.download_linux_btn": "<i class=\"fa-brands fa-linux\" style=\"font-size: 1.1rem; margin-right: 5px;\"></i> Scarica per Linux <i class=\"bi bi-chevron-down dropdown-arrow\"></i>",
        "hero.lin_deb_title": "DEB x64",
        "hero.lin_deb_sub": "Debian/Ubuntu (Consigliato)",
        "hero.lin_deb_arm_title": "DEB ARM64",
        "hero.lin_deb_arm_sub": "Debian/Ubuntu per ARM",
        "hero.lin_app_title": "AppImage x64",
        "hero.lin_app_sub": "Linux Universale",
        "hero.lin_app_arm_title": "AppImage ARM64",
        "hero.lin_app_arm_sub": "Linux Universale per ARM",
        "hero.os_warning": "<i class=\"bi bi-info-circle\" style=\"margin-right: 5px;\"></i> Stai navigando da <strong><span id=\"detectedOSName\">OS</span></strong>. Gli installer potrebbero non essere compatibili.",
        "hero.stats_downloads": "Download",
        "hero.stats_rating": "<span style=\"font-size: 0.9rem; font-weight: 500; opacity: 0.9;\">/5 Valutazione</span>",
        "discord.title": "Unisciti alla Community",
        "discord.subtitle": "Ottieni supporto e aggiornamenti",
        "hero.stats_opensource": "Open Source",
        "hero.stats_telemetry": "Telemetria",
        "hero.stats_perf_val": "Elevata",
        "hero.stats_perf": "Prestazioni",
        "features.title": "Perché HelloWorld?",
        "features.subtitle": "Progettato con particolare attenzione a prestazioni e privacy.",
        "features.f1_title": "La Privacy al Primo Posto",
        "features.f1_desc": "Nessuna telemetria né tracciamento. I tuoi dati restano tuoi. Codice 100% verificabile su GitHub.",
        "features.f2_title": "Avvio Rapido",
        "features.f2_desc": "Ottimizzato per avviarsi in pochi istanti. Perfetto per PC meno recenti.",
        "features.f3_title": "Gestione Mod",
        "features.f3_desc": "Installa Forge, Fabric e mod direttamente dal launcher senza tool esterni.",
        "features.f4_title": "Installazioni Intelligenti",
        "features.f4_desc": "Ogni installazione mantiene le proprie impostazioni e cartelle separate.",
        "features.f5_title": "Modalità Offline",
        "features.f5_desc": "Senza connessione? Nessun problema. Gioca alle versioni già scaricate ovunque.",
        "features.f6_title": "Open Source",
        "features.f6_desc": "Trasparenza totale. Nessun software indesiderato o installer nascosto.",
        "gallery.title": "Galleria",
        "gallery.subtitle": "Esplora l'interfaccia semplice, potente e moderna.",
        "faq.title": "Domande Frequenti",
        "faq.subtitle": "Tutto quello che c'è da sapere.",
        "faq.q1": "Perché viene segnalato un falso virus?",
        "faq.a1": "Poiché l'app non è firmata con un costoso certificato commerciale. È un comune falso positivo.",
        "faq.q2": "È legale?",
        "faq.a2": "Sì. Il launcher utilizza una copia autentica del gioco in conformità alle norme Mojang/Microsoft.",
        "faq.q3": "Supporta modpack pesanti?",
        "faq.a3": "Certamente, a patto che il computer disponga di sufficiente memoria RAM.",
        "faq.q4": "Funziona senza internet?",
        "faq.a4": "Sì, la modalità offline permette di avviare le versioni scaricate senza rete.",
        "faq.q5": "Supporta sia Fabric che Forge?",
        "faq.a5": "Certamente, puoi creare profili indipendenti per ciascuno.",
        "footer.desc": "Il launcher di Minecraft creato dalla community per la community.",
        "footer.links": "Link",
        "footer.repo": "Repository GitHub",
        "footer.report": "Segnala un bug",
        "footer.prev": "Versioni precedenti",
        "footer.copy": "&copy; 2026 HelloWorld Launcher. Non affiliato con Mojang o Microsoft.",
        "footer.signpath": "Questo progetto usa la <a href=\"https://signpath.org/\" target=\"_blank\" rel=\"noopener noreferrer\">SignPath Foundation</a> per la firma del codice.",
        "bg.default": "Banner Predefinito",
        "bg.purple": "Gradiente Viola",
        "bg.blue": "Gradiente Blu",
        "bg.green": "Gradiente Verde",
        "bg.orange": "Gradiente Arancione",
        "bg.pink": "Gradiente Rosa",
        "cropper.title": "Ritaglia Avatar",
        "cropper.cancel": "Annulla",
        "cropper.apply": "Applica Ritaglio",
        "global.loading": "Caricamento servizi...",
        "country.AR": "Argentina",
        "country.AU": "Australia",
        "country.AT": "Austria",
        "country.BE": "Belgio",
        "country.BR": "Brasile",
        "country.CA": "Canada",
        "country.CL": "Cile",
        "country.CN": "Cina",
        "country.CO": "Colombia",
        "country.CZ": "Repubblica Ceca",
        "country.DK": "Danimarca",
        "country.EG": "Egitto",
        "country.FI": "Finlandia",
        "country.FR": "Francia",
        "country.DE": "Germania",
        "country.GR": "Grecia",
        "country.HK": "Hong Kong",
        "country.HU": "Ungheria",
        "country.IS": "Islanda",
        "country.IN": "India",
        "country.ID": "Indonesia",
        "country.IE": "Irlanda",
        "country.IL": "Israele",
        "country.IT": "Italia",
        "country.JP": "Giappone",
        "country.LU": "Lussemburgo",
        "country.MY": "Malesia",
        "country.MX": "Messico",
        "country.NL": "Paesi Bassi",
        "country.NZ": "Nuova Zelanda",
        "country.NG": "Nigeria",
        "country.NO": "Norvegia",
        "country.PE": "Perù",
        "country.PH": "Filippine",
        "country.PL": "Polonia",
        "country.PT": "Portogallo",
        "country.RO": "Romania",
        "country.RU": "Russia",
        "country.SA": "Arabia Saudita",
        "country.SG": "Singapore",
        "country.ZA": "Sudafrica",
        "country.KR": "Corea del Sud",
        "country.ES": "Spagna",
        "country.SE": "Svezia",
        "country.CH": "Svizzera",
        "country.TH": "Thailandia",
        "country.TR": "Turchia",
        "country.UA": "Ucraina",
        "country.AE": "Emirati Arabi Uniti",
        "country.GB": "Regno Unito",
        "country.US": "Stati Uniti",
        "country.VE": "Venezuela",
        "country.VN": "Vietnam",
        "country.OTHER": "Altro",
        "bg.mc_overworld": "Minecraft Overworld",
        "bg.mc_sky": "Minecraft Cielo",
        "bg.mc_nether": "Minecraft Nether",
        "bg.mc_end": "Minecraft End",
        "bg.mc_village": "Minecraft Villaggio",
        "bg.mc_forest": "Minecraft Foresta",
        "bg.mc_desert": "Minecraft Deserto",
        "bg.mc_ocean": "Minecraft Oceano",
        "bg.mc_cherry_grove": "Minecraft Boschetto di Ciliegi",
        "tag.pvp": "PvP",
        "tag.pvp_pro": "PvP Pro",
        "tag.builder": "Costruttore",
        "tag.architect": "Architetto",
        "tag.survival": "Sopravvivenza",
        "tag.hardcore": "Hardcore",
        "tag.redstone": "Redstone",
        "tag.technical": "Tecnico",
        "tag.farms": "Fattorie",
        "tag.explorer": "Esploratore",
        "tag.speedrunner": "Speedrunner",
        "tag.socialite": "Socievole",
        "tag.roleplayer": "Giocatore di ruolo",
        "tag.modded": "Moddato",
        "tag.modpack": "Giocatore di Modpack",
        "tag.creative": "Creativo",
        "tag.artist": "Pixel Artist",
        "tag.streamer": "Streamer",
        "tag.casual": "Casual",
        "tag.minigames": "Minigiochi",
        "tag.skyblock": "Skyblock",
        "kofi.btn_title": "Supporta su Ko-fi",
        "sponsor.copy_title": "Copia codice promozionale",
        "sponsor.open_title": "Visita Apex Hosting",
        "common.copy_clipboard": "Copia negli appunti",
        "settings.mc_head_title": "Usa la testa predefinita di Minecraft",
        "badge.premium": "Account Premium",
        "badge.moderator": "Moderatore",
        "badge.creator": "Creatore"
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
        "settings.saved_btn": "Сохранено",
        "settings.saved_success": "Настройки успешно обновлены!",
        "hero.badge": "Скачивание уже доступно",
        "hero.badge_available": "Уже доступно",
        "hero.download_win": "Скачать для Windows",
        "hero.download_linux": "Скачать для Linux",
        "review.btn_title": "Оставить отзыв",
        "review.title": "Оставить отзыв",
        "review.subtitle": "Поделитесь мнением о HelloWorld Launcher!",
        "review.rating": "Оценка",
        "review.name": "Имя",
        "review.name_placeholder": "Ваше имя (необязательно)",
        "review.comment": "Комментарий",
        "review.comment_placeholder": "Поделитесь впечатлениями...",
        "review.submit": "Отправить отзыв",
        "review.alert_rating": "Пожалуйста, поставьте оценку звездами!",
        "review.alert_thanks": "Спасибо за ваш отзыв!",
        "review.alert_error": "Ошибка при сохранении отзыва.",
        "hero.title": "Твой Minecraft, <br><span class=\"gradient-text\">Без Границ.</span>",
        "hero.subtitle": "Лаунчер с открытым исходным кодом: легкий, безопасный и полностью настраиваемый. Забудьте о лишнем ПО.",
        "hero.install_ps": "Быстрая установка (PowerShell)",
        "hero.install_bash": "Быстрая установка (Bash)",
        "hero.install_note": "Установка в один клик",
        "hero.download_win_btn": "<i class=\"bi bi-windows\"></i> Скачать для Windows <i class=\"bi bi-chevron-down dropdown-arrow\"></i><div class=\"btn-shine\"></div>",
        "hero.win_setup_title": "Установщик x64",
        "hero.win_setup_sub": "Установщик (Рекомендуется)",
        "hero.best_option": "Лучший выбор",
        "hero.win_setup_arm_title": "Установщик ARM64",
        "hero.win_setup_arm_sub": "Для устройств с процессорами ARM",
        "hero.win_port_title": "Портативная x64",
        "hero.win_port_sub": "ZIP-архив",
        "hero.win_port_arm_title": "Портативная ARM64",
        "hero.win_port_arm_sub": "ZIP-архив для ARM",
        "hero.download_linux_btn": "<i class=\"fa-brands fa-linux\" style=\"font-size: 1.1rem; margin-right: 5px;\"></i> Скачать для Linux <i class=\"bi bi-chevron-down dropdown-arrow\"></i>",
        "hero.lin_deb_title": "DEB x64",
        "hero.lin_deb_sub": "Debian/Ubuntu (Рекомендуется)",
        "hero.lin_deb_arm_title": "DEB ARM64",
        "hero.lin_deb_arm_sub": "Debian/Ubuntu для ARM",
        "hero.lin_app_title": "AppImage x64",
        "hero.lin_app_sub": "Универсальный Linux",
        "hero.lin_app_arm_title": "AppImage ARM64",
        "hero.lin_app_arm_sub": "Универсальный Linux для ARM",
        "hero.os_warning": "<i class=\"bi bi-info-circle\" style=\"margin-right: 5px;\"></i> Вы зашли с <strong><span id=\"detectedOSName\">OS</span></strong>. Установщики могут быть несовместимы.",
        "hero.stats_downloads": "Загрузок",
        "hero.stats_rating": "<span style=\"font-size: 0.9rem; font-weight: 500; opacity: 0.9;\">/5 Оценка</span>",
        "discord.title": "Присоединяйтесь к сообществу",
        "discord.subtitle": "Поддержка и новости",
        "hero.stats_opensource": "Открытый код",
        "hero.stats_telemetry": "Телеметрия",
        "hero.stats_perf_val": "Высокая",
        "hero.stats_perf": "Производительность",
        "features.title": "Почему HelloWorld?",
        "features.subtitle": "Создан для максимальной скорости и защиты личных данных.",
        "features.f1_title": "Конфиденциальность прежде всего",
        "features.f1_desc": "Никакой телеметрии и трекеров. Ваши действия только ваши. Полностью открытый код на GitHub.",
        "features.f2_title": "Быстрый запуск",
        "features.f2_desc": "Оптимизирован для старта за считанные секунды. Идеален для слабых ПК.",
        "features.f3_title": "Управление модами",
        "features.f3_desc": "Устанавливайте Forge, Fabric и моды прямо из лаунчера без сторонних программ.",
        "features.f4_title": "Умные профили",
        "features.f4_desc": "Каждая сборка изолирована и хранит свои настройки отдельно.",
        "features.f5_title": "Офлайн-режим",
        "features.f5_desc": "Нет интернета? Играйте в скачанные версии где угодно.",
        "features.f6_title": "Открытый исходный код",
        "features.f6_desc": "Абсолютная честность. Никаких скрытых установщиков и мусора.",
        "gallery.title": "Галерея",
        "gallery.subtitle": "Оцените стильный, удобный и производительный интерфейс.",
        "faq.title": "Часто задаваемые вопросы",
        "faq.subtitle": "Всё, что вам нужно знать.",
        "faq.q1": "Почему антивирус может выдавать предупреждение?",
        "faq.a1": "Поскольку приложение пока не имеет дорогостоящего коммерческого сертификата. Это ложное срабатывание.",
        "faq.q2": "Это легально?",
        "faq.a2": "Да. Лаунчер соблюдает правила и соглашения Mojang/Microsoft.",
        "faq.q3": "Поддерживаются ли тяжелые модпаки?",
        "faq.a3": "Да, лаунчер легко справляется с тяжелыми сборками при наличии достаточного объема RAM.",
        "faq.q4": "Работает ли без интернета?",
        "faq.a4": "Да, офлайн-режим позволяет запускать загруженные версии без сети.",
        "faq.q5": "Поддерживаются ли Fabric и Forge?",
        "faq.a5": "Конечно. Вы можете создавать отдельные независимые сборки.",
        "footer.desc": "Лаунчер Minecraft, созданный сообществом для сообщества.",
        "footer.links": "Ссылки",
        "footer.repo": "Репозиторий GitHub",
        "footer.report": "Сообщить об ошибке",
        "footer.prev": "Предыдущие версии",
        "footer.copy": "&copy; 2026 HelloWorld Launcher. Не связан с Mojang или Microsoft.",
        "footer.signpath": "Проект использует <a href=\"https://signpath.org/\" target=\"_blank\" rel=\"noopener noreferrer\">SignPath Foundation</a> для подписи кода.",
        "bg.default": "Баннер по умолчанию",
        "bg.purple": "Фиолетовый Градиент",
        "bg.blue": "Синий Градиент",
        "bg.green": "Зелёный Градиент",
        "bg.orange": "Оранжевый Градиент",
        "bg.pink": "Розовый Градиент",
        "cropper.title": "Обрезать Аватар",
        "cropper.cancel": "Отмена",
        "cropper.apply": "Применить",
        "global.loading": "Загрузка сервисов...",
        "country.AR": "Аргентина",
        "country.AU": "Австралия",
        "country.AT": "Австрия",
        "country.BE": "Бельгия",
        "country.BR": "Бразилия",
        "country.CA": "Канада",
        "country.CL": "Чили",
        "country.CN": "Китай",
        "country.CO": "Колумбия",
        "country.CZ": "Чехия",
        "country.DK": "Дания",
        "country.EG": "Египет",
        "country.FI": "Финляндия",
        "country.FR": "Франция",
        "country.DE": "Германия",
        "country.GR": "Греция",
        "country.HK": "Гонконг",
        "country.HU": "Венгрия",
        "country.IS": "Исландия",
        "country.IN": "Индия",
        "country.ID": "Индонезия",
        "country.IE": "Ирландия",
        "country.IL": "Израиль",
        "country.IT": "Италия",
        "country.JP": "Япония",
        "country.LU": "Люксембург",
        "country.MY": "Малайзия",
        "country.MX": "Мексика",
        "country.NL": "Нидерланды",
        "country.NZ": "Новая Зеландия",
        "country.NG": "Нигерия",
        "country.NO": "Норвегия",
        "country.PE": "Перу",
        "country.PH": "Филиппины",
        "country.PL": "Польша",
        "country.PT": "Португалия",
        "country.RO": "Румыния",
        "country.RU": "Россия",
        "country.SA": "Саудовская Аравия",
        "country.SG": "Сингапур",
        "country.ZA": "ЮАР",
        "country.KR": "Южная Корея",
        "country.ES": "Испания",
        "country.SE": "Швеция",
        "country.CH": "Швейцария",
        "country.TH": "Таиланд",
        "country.TR": "Турция",
        "country.UA": "Украина",
        "country.AE": "ОАЭ",
        "country.GB": "Великобритания",
        "country.US": "США",
        "country.VE": "Венесуэла",
        "country.VN": "Вьетнам",
        "country.OTHER": "Другое",
        "bg.mc_overworld": "Minecraft Верхний мир",
        "bg.mc_sky": "Minecraft Небо",
        "bg.mc_nether": "Minecraft Незер",
        "bg.mc_end": "Minecraft Энд",
        "bg.mc_village": "Minecraft Деревня",
        "bg.mc_forest": "Minecraft Лес",
        "bg.mc_desert": "Minecraft Пустыня",
        "bg.mc_ocean": "Minecraft Океан",
        "bg.mc_cherry_grove": "Minecraft Вишневая роща",
        "tag.pvp": "PvP",
        "tag.pvp_pro": "PvP Pro",
        "tag.builder": "Строитель",
        "tag.architect": "Архитектор",
        "tag.survival": "Выживание",
        "tag.hardcore": "Хардкор",
        "tag.redstone": "Редстоун",
        "tag.technical": "Технический",
        "tag.farms": "Фермер",
        "tag.explorer": "Исследователь",
        "tag.speedrunner": "Спидраннер",
        "tag.socialite": "Общительный",
        "tag.roleplayer": "Ролевик",
        "tag.modded": "С модами",
        "tag.modpack": "Игрок в модпаки",
        "tag.creative": "Творческий",
        "tag.artist": "Пиксель-артист",
        "tag.streamer": "Стример",
        "tag.casual": "Казуальный",
        "tag.minigames": "Мини-игры",
        "tag.skyblock": "Скайблок",
        "kofi.btn_title": "Поддержать на Ko-fi",
        "sponsor.copy_title": "Скопировать промокод",
        "sponsor.open_title": "Перейти на Apex Hosting",
        "common.copy_clipboard": "Скопировать в буфер обмена",
        "settings.mc_head_title": "Использовать стандартную голову Minecraft",
        "badge.premium": "Премиум-аккаунт",
        "badge.moderator": "Модератор",
        "badge.creator": "Создатель"
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
        "settings.saved_btn": "保存済み",
        "settings.saved_success": "アカウント設定が更新されました！",
        "hero.badge": "ダウンロード可能",
        "hero.badge_available": "今すぐ利用可能",
        "hero.download_win": "Windows 版をダウンロード",
        "hero.download_linux": "Linux 版をダウンロード",
        "review.btn_title": "レビューを書く",
        "review.title": "レビューを書く",
        "review.subtitle": "HelloWorld Launcher の感想をお聞かせください！",
        "review.rating": "評価",
        "review.name": "お名前",
        "review.name_placeholder": "お名前（任意）",
        "review.comment": "コメント",
        "review.comment_placeholder": "感想を共有してください...",
        "review.submit": "レビューを送信",
        "review.alert_rating": "星の数を選択してください！",
        "review.alert_thanks": "レビューありがとうございました！",
        "review.alert_error": "レビューの保存に失敗しました。",
        "hero.title": "あなたのマインクラフトを、<br><span class=\"gradient-text\">限界なしで。</span>",
        "hero.subtitle": "軽量、安全、そして完全にカスタマイズ可能なオープンソースランチャー。不要なソフトとはお別れです。",
        "hero.install_ps": "クイックインストール (PowerShell)",
        "hero.install_bash": "クイックインストール (Bash)",
        "hero.install_note": "ワンクリックインストール",
        "hero.download_win_btn": "<i class=\"bi bi-windows\"></i> Windows 版ダウンロード <i class=\"bi bi-chevron-down dropdown-arrow\"></i><div class=\"btn-shine\"></div>",
        "hero.win_setup_title": "インストーラー x64",
        "hero.win_setup_sub": "インストーラー (推奨)",
        "hero.best_option": "おすすめ",
        "hero.win_setup_arm_title": "インストーラー ARM64",
        "hero.win_setup_arm_sub": "ARM デバイス向け",
        "hero.win_port_title": "ポータブル版 x64",
        "hero.win_port_sub": "ZIP アーカイブ",
        "hero.win_port_arm_title": "ポータブル版 ARM64",
        "hero.win_port_arm_sub": "ARM 向け ZIP",
        "hero.download_linux_btn": "<i class=\"fa-brands fa-linux\" style=\"font-size: 1.1rem; margin-right: 5px;\"></i> Linux 版ダウンロード <i class=\"bi bi-chevron-down dropdown-arrow\"></i>",
        "hero.lin_deb_title": "DEB x64",
        "hero.lin_deb_sub": "Debian/Ubuntu (推奨)",
        "hero.lin_deb_arm_title": "DEB ARM64",
        "hero.lin_deb_arm_sub": "ARM 向け Debian/Ubuntu",
        "hero.lin_app_title": "AppImage x64",
        "hero.lin_app_sub": "汎用 Linux",
        "hero.lin_app_arm_title": "AppImage ARM64",
        "hero.lin_app_arm_sub": "ARM 向け AppImage",
        "hero.os_warning": "<i class=\"bi bi-info-circle\" style=\"margin-right: 5px;\"></i> <strong><span id=\"detectedOSName\">OS</span></strong> からアクセスしています。以下のインストーラーは互換性がない場合があります。",
        "hero.stats_downloads": "ダウンロード",
        "hero.stats_rating": "<span style=\"font-size: 0.9rem; font-weight: 500; opacity: 0.9;\">/5 評価</span>",
        "discord.title": "コミュニティに参加",
        "discord.subtitle": "サポートと最新情報を取得",
        "hero.stats_opensource": "オープンソース",
        "hero.stats_telemetry": "テレメトリ",
        "hero.stats_perf_val": "最高",
        "hero.stats_perf": "パフォーマンス",
        "features.title": "HelloWorld が選ばれる理由",
        "features.subtitle": "軽快な動作と徹底したプライバシー保護を両立。",
        "features.f1_title": "プライバシー最優先",
        "features.f1_desc": "データ収集やトラッカーは一切ありません。GitHub でコードを100%監査可能。",
        "features.f2_title": "高速起動",
        "features.f2_desc": "わずか数秒で起動するように設計。低スペックPCでも快適に動作します。",
        "features.f3_title": "MOD管理機能",
        "features.f3_desc": "Forge、Fabric、各種MODを外部ツールなしで直接インストール可能。",
        "features.f4_title": "独立したインストール",
        "features.f4_desc": "バージョンごとに設定やフォルダを完全に分離して整理できます。",
        "features.f5_title": "オフラインモード",
        "features.f5_desc": "ネット環境がなくても大丈夫。いつでもどこでもプレイ可能。",
        "features.f6_title": "オープンソース",
        "features.f6_desc": "不要な広告や不審なプログラムは一切含まれていません。",
        "gallery.title": "ギャラリー",
        "gallery.subtitle": "シンプルで洗練されたインターフェースをご覧ください。",
        "faq.title": "よくある質問",
        "faq.subtitle": "気になる疑問にお答えします。",
        "faq.q1": "ウイルス警告が表示されるのはなぜですか？",
        "faq.a1": "高額な商業用署名を行っていないためです。オープンソースアプリ特有の誤検知です。",
        "faq.q2": "合法ですか？",
        "faq.a2": "はい。Mojang および Microsoft の規約を遵守して動作します。",
        "faq.q3": "重いMODパックでも動きますか？",
        "faq.a3": "はい、PCのRAMが十分であれば大型MODパックも快適に動作します。",
        "faq.q4": "オフラインでも遊べますか？",
        "faq.a4": "はい、ダウンロード済みのバージョンであればネット接続なしでプレイできます。",
        "faq.q5": "Fabric と Forge の両方に対応していますか？",
        "faq.a5": "もちろんです。それぞれ独立したプロファイルを作成可能です。",
        "footer.desc": "コミュニティによって作られた、コミュニティのための Minecraft ランチャー。",
        "footer.links": "リンク",
        "footer.repo": "GitHub リポジトリ",
        "footer.report": "バグを報告",
        "footer.prev": "過去のバージョン",
        "footer.copy": "&copy; 2026 HelloWorld Launcher. Mojang または Microsoft との提携はありません。",
        "footer.signpath": "本プロジェクトはコード署名に <a href=\"https://signpath.org/\" target=\"_blank\" rel=\"noopener noreferrer\">SignPath Foundation</a> を利用しています。",
        "bg.default": "デフォルトバナー",
        "bg.purple": "紫グラデーション",
        "bg.blue": "青グラデーション",
        "bg.green": "緑グラデーション",
        "bg.orange": "オレンジグラデーション",
        "bg.pink": "ピンクグラデーション",
        "cropper.title": "アバターをトリミング",
        "cropper.cancel": "キャンセル",
        "cropper.apply": "適用",
        "global.loading": "サービスを読み込み中...",
        "country.AR": "アルゼンチン",
        "country.AU": "オーストラリア",
        "country.AT": "オーストリア",
        "country.BE": "ベルギー",
        "country.BR": "ブラジル",
        "country.CA": "カナダ",
        "country.CL": "チリ",
        "country.CN": "中国",
        "country.CO": "コロンビア",
        "country.CZ": "チェコ",
        "country.DK": "デンマーク",
        "country.EG": "エジプト",
        "country.FI": "フィンランド",
        "country.FR": "フランス",
        "country.DE": "ドイツ",
        "country.GR": "ギリシャ",
        "country.HK": "香港",
        "country.HU": "ハンガリー",
        "country.IS": "アイスランド",
        "country.IN": "インド",
        "country.ID": "インドネシア",
        "country.IE": "アイルランド",
        "country.IL": "イスラエル",
        "country.IT": "イタリア",
        "country.JP": "日本",
        "country.LU": "ルクセンブルク",
        "country.MY": "マレーシア",
        "country.MX": "メキシコ",
        "country.NL": "オランダ",
        "country.NZ": "ニュージーランド",
        "country.NG": "ナイジェリア",
        "country.NO": "ノルウェー",
        "country.PE": "ペルー",
        "country.PH": "フィリピン",
        "country.PL": "ポーランド",
        "country.PT": "ポルトガル",
        "country.RO": "ルーマニア",
        "country.RU": "ロシア",
        "country.SA": "サウジアラビア",
        "country.SG": "シンガポール",
        "country.ZA": "南アフリカ",
        "country.KR": "韓国",
        "country.ES": "スペイン",
        "country.SE": "スウェーデン",
        "country.CH": "スイス",
        "country.TH": "タイ",
        "country.TR": "トルコ",
        "country.UA": "ウクライナ",
        "country.AE": "アラブ首長国連邦",
        "country.GB": "イギリス",
        "country.US": "アメリカ",
        "country.VE": "ベネズエラ",
        "country.VN": "ベトナム",
        "country.OTHER": "その他",
        "bg.mc_overworld": "Minecraft オーバーワールド",
        "bg.mc_sky": "Minecraft 空",
        "bg.mc_nether": "Minecraft ネザー",
        "bg.mc_end": "Minecraft エンド",
        "bg.mc_village": "Minecraft 村",
        "bg.mc_forest": "Minecraft 森林",
        "bg.mc_desert": "Minecraft 砂漠",
        "bg.mc_ocean": "Minecraft 海洋",
        "bg.mc_cherry_grove": "Minecraft 桜の林",
        "tag.pvp": "PvP",
        "tag.pvp_pro": "PvP Pro",
        "tag.builder": "建築士",
        "tag.architect": "設計士",
        "tag.survival": "サバイバル",
        "tag.hardcore": "ハードコア",
        "tag.redstone": "レッドストーン",
        "tag.technical": "テクニカル",
        "tag.farms": "自動化トラップ",
        "tag.explorer": "探検家",
        "tag.speedrunner": "スピードランナー",
        "tag.socialite": "社交的",
        "tag.roleplayer": "ロールプレイヤー",
        "tag.modded": "MOD派",
        "tag.modpack": "MODパック派",
        "tag.creative": "クリエイティブ",
        "tag.artist": "ドット絵師",
        "tag.streamer": "配信者",
        "tag.casual": "カジュアル",
        "tag.minigames": "ミニゲーム",
        "tag.skyblock": "スカイブロック",
        "kofi.btn_title": "Ko-fiでサポート",
        "sponsor.copy_title": "プロモーションコードをコピー",
        "sponsor.open_title": "Apex Hosting を訪問",
        "common.copy_clipboard": "クリップボードにコピー",
        "settings.mc_head_title": "デフォルトのMinecraftヘッドを使用",
        "badge.premium": "プレミアムアカウント",
        "badge.moderator": "モデレーター",
        "badge.creator": "クリエイター"
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
        "settings.saved_btn": "已保存",
        "settings.saved_success": "账户设置已成功更新！",
        "hero.badge": "现已开放下载",
        "hero.badge_available": "现已推出",
        "hero.download_win": "下载 Windows 版",
        "hero.download_linux": "下载 Linux 版",
        "review.btn_title": "撰写评价",
        "review.title": "撰写评价",
        "review.subtitle": "分享您对 HelloWorld Launcher 的看法与建议！",
        "review.rating": "评分",
        "review.name": "昵称",
        "review.name_placeholder": "您的名字（选填）",
        "review.comment": "评价内容",
        "review.comment_placeholder": "畅所欲言...",
        "review.submit": "提交评价",
        "review.alert_rating": "请点击星级进行评分！",
        "review.alert_thanks": "感谢您的宝贵评价！",
        "review.alert_error": "保存评价时出错。",
        "hero.title": "你的 Minecraft，<br><span class=\"gradient-text\">自由无界。</span>",
        "hero.subtitle": "开源启动器，专为轻量、安全和完全可定制而设计。彻底告别臃肿软件。",
        "hero.install_ps": "快速安装 (PowerShell)",
        "hero.install_bash": "快速安装 (Bash)",
        "hero.install_note": "一键快速安装",
        "hero.download_win_btn": "<i class=\"bi bi-windows\"></i> 下载 Windows 版 <i class=\"bi bi-chevron-down dropdown-arrow\"></i><div class=\"btn-shine\"></div>",
        "hero.win_setup_title": "安装包 x64",
        "hero.win_setup_sub": "安装程序 (推荐)",
        "hero.best_option": "最佳推荐",
        "hero.win_setup_arm_title": "安装包 ARM64",
        "hero.win_setup_arm_sub": "ARM 架构安装包",
        "hero.win_port_title": "便携版 x64",
        "hero.win_port_sub": "ZIP 压缩包",
        "hero.win_port_arm_title": "便携版 ARM64",
        "hero.win_port_arm_sub": "ARM 版 ZIP 压缩包",
        "hero.download_linux_btn": "<i class=\"fa-brands fa-linux\" style=\"font-size: 1.1rem; margin-right: 5px;\"></i> 下载 Linux 版 <i class=\"bi bi-chevron-down dropdown-arrow\"></i>",
        "hero.lin_deb_title": "DEB x64",
        "hero.lin_deb_sub": "Debian/Ubuntu (推荐)",
        "hero.lin_deb_arm_title": "DEB ARM64",
        "hero.lin_deb_arm_sub": "ARM 版 Debian/Ubuntu",
        "hero.lin_app_title": "AppImage x64",
        "hero.lin_app_sub": "通用 Linux",
        "hero.lin_app_arm_title": "AppImage ARM64",
        "hero.lin_app_arm_sub": "ARM 版 AppImage",
        "hero.os_warning": "<i class=\"bi bi-info-circle\" style=\"margin-right: 5px;\"></i> 检测到您正在使用 <strong><span id=\"detectedOSName\">OS</span></strong>。以下安装包可能不兼容。",
        "hero.stats_downloads": "次下载",
        "hero.stats_rating": "<span style=\"font-size: 0.9rem; font-weight: 500; opacity: 0.9;\">/5 评分</span>",
        "discord.title": "加入官方社区",
        "discord.subtitle": "获取帮助与最新资讯",
        "hero.stats_opensource": "开源透明",
        "hero.stats_telemetry": "数据收集",
        "hero.stats_perf_val": "极高",
        "hero.stats_perf": "运行性能",
        "features.title": "为什么选择 HelloWorld？",
        "features.subtitle": "兼顾极致性能与隐私安全的设计理念。",
        "features.f1_title": "隐私至上",
        "features.f1_desc": "零遥测、零追踪。您的数据完全属于自己。代码 100% 在 GitHub 开源可查。",
        "features.f2_title": "秒速启动",
        "features.f2_desc": "深度优化启动速度，低配电脑也能飞速进入游戏。",
        "features.f3_title": "模组便捷管理",
        "features.f3_desc": "无需外部工具，在启动器内直接安装 Forge、Fabric 及各类模组。",
        "features.f4_title": "智能多版本隔离",
        "features.f4_desc": "每个版本与整合包均拥有独立文件夹与设置，井井有条。",
        "features.f5_title": "离线模式",
        "features.f5_desc": "没有网络？没问题。已下载的版本随时随地离线畅玩。",
        "features.f6_title": "开源透明",
        "features.f6_desc": "完全透明，绝无捆绑安装或流氓行为。",
        "gallery.title": "界面图赏",
        "gallery.subtitle": "领略简约、强大而现代的视觉体验。",
        "faq.title": "常见问题解答",
        "faq.subtitle": "你想了解的内容都在这里。",
        "faq.q1": "为什么会有安全软件误报？",
        "faq.a1": "因为应用尚未购买昂贵的商业签名证书。这是开源项目的常见误报。",
        "faq.q2": "使用本启动器合法吗？",
        "faq.a2": "合法。启动器完全遵循 Mojang 与微软官方条款。",
        "faq.q3": "支持大型模组包吗？",
        "faq.a3": "支持。只要您的电脑拥有足够内存，大型整合包均可流畅运行。",
        "faq.q4": "没有网络也可以玩吗？",
        "faq.a4": "可以。离线模式允许您在无网络状态下畅玩已下载的版本。",
        "faq.q5": "支持 Fabric 和 Forge 吗？",
        "faq.a5": "完美支持。您可以为不同核心创建独立的运行环境。",
        "footer.desc": "源于玩家社区，服务 Minecraft 玩家的启动器。",
        "footer.links": "快捷链接",
        "footer.repo": "GitHub 仓库",
        "footer.report": "反馈 Bug",
        "footer.prev": "历史版本",
        "footer.copy": "&copy; 2026 HelloWorld Launcher. 与 Mojang 或 Microsoft 没有任何从属关系。",
        "footer.signpath": "本项目使用 <a href=\"https://signpath.org/\" target=\"_blank\" rel=\"noopener noreferrer\">SignPath Foundation</a> 进行代码签名。",
        "bg.default": "默认横幅",
        "bg.purple": "紫色渐变",
        "bg.blue": "蓝色渐变",
        "bg.green": "绿色渐变",
        "bg.orange": "橙色渐变",
        "bg.pink": "粉色渐变",
        "cropper.title": "裁剪头像",
        "cropper.cancel": "取消",
        "cropper.apply": "应用裁剪",
        "global.loading": "加载服务中...",
        "country.AR": "阿根廷",
        "country.AU": "澳大利亚",
        "country.AT": "奥地利",
        "country.BE": "比利时",
        "country.BR": "巴西",
        "country.CA": "加拿大",
        "country.CL": "智利",
        "country.CN": "中国",
        "country.CO": "哥伦比亚",
        "country.CZ": "捷克",
        "country.DK": "丹麦",
        "country.EG": "埃及",
        "country.FI": "芬兰",
        "country.FR": "法国",
        "country.DE": "德国",
        "country.GR": "希腊",
        "country.HK": "中国香港",
        "country.HU": "匈牙利",
        "country.IS": "冰岛",
        "country.IN": "印度",
        "country.ID": "印度尼西亚",
        "country.IE": "爱尔兰",
        "country.IL": "以色列",
        "country.IT": "意大利",
        "country.JP": "日本",
        "country.LU": "卢森堡",
        "country.MY": "马来西亚",
        "country.MX": "墨西哥",
        "country.NL": "荷兰",
        "country.NZ": "新西兰",
        "country.NG": "尼日利亚",
        "country.NO": "挪威",
        "country.PE": "秘鲁",
        "country.PH": "菲律宾",
        "country.PL": "波兰",
        "country.PT": "葡萄牙",
        "country.RO": "罗马尼亚",
        "country.RU": "俄罗斯",
        "country.SA": "沙特阿拉伯",
        "country.SG": "新加坡",
        "country.ZA": "南非",
        "country.KR": "韩国",
        "country.ES": "西班牙",
        "country.SE": "瑞典",
        "country.CH": "瑞士",
        "country.TH": "泰国",
        "country.TR": "土耳其",
        "country.UA": "乌克兰",
        "country.AE": "阿联酋",
        "country.GB": "英国",
        "country.US": "美国",
        "country.VE": "委内瑞拉",
        "country.VN": "越南",
        "country.OTHER": "其他",
        "bg.mc_overworld": "Minecraft 主世界",
        "bg.mc_sky": "Minecraft 天空",
        "bg.mc_nether": "Minecraft 下界",
        "bg.mc_end": "Minecraft 末地",
        "bg.mc_village": "Minecraft 村庄",
        "bg.mc_forest": "Minecraft 森林",
        "bg.mc_desert": "Minecraft 沙漠",
        "bg.mc_ocean": "Minecraft 海洋",
        "bg.mc_cherry_grove": "Minecraft 樱花树林",
        "tag.pvp": "PvP",
        "tag.pvp_pro": "PvP 大师",
        "tag.builder": "建筑师",
        "tag.architect": "结构规划师",
        "tag.survival": "生存",
        "tag.hardcore": "极限",
        "tag.redstone": "红石",
        "tag.technical": "生电技术",
        "tag.farms": "农场建造者",
        "tag.explorer": "探险家",
        "tag.speedrunner": "速通玩家",
        "tag.socialite": "交际达人",
        "tag.roleplayer": "角色扮演",
        "tag.modded": "模组玩家",
        "tag.modpack": "整合包玩家",
        "tag.creative": "创造",
        "tag.artist": "像素艺术家",
        "tag.streamer": "主播",
        "tag.casual": "休闲",
        "tag.minigames": "小游戏",
        "tag.skyblock": "空岛生存",
        "kofi.btn_title": "在 Ko-fi 上支持",
        "sponsor.copy_title": "复制优惠码",
        "sponsor.open_title": "访问 Apex Hosting",
        "common.copy_clipboard": "复制到剪贴板",
        "settings.mc_head_title": "使用默认 Minecraft 头部",
        "badge.premium": "高级账户",
        "badge.moderator": "版主",
        "badge.creator": "创作者"
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
        "settings.saved_btn": "저장됨",
        "settings.saved_success": "계정 설정이 성공적으로 업데이트되었습니다!",
        "hero.badge": "지금 다운로드 가능",
        "hero.badge_available": "지금 이용 가능",
        "hero.download_win": "Windows용 다운로드",
        "hero.download_linux": "Linux용 다운로드",
        "review.btn_title": "리뷰 작성",
        "review.title": "리뷰 작성",
        "review.subtitle": "HelloWorld Launcher에 대한 소중한 의견을 들려주세요!",
        "review.rating": "별점",
        "review.name": "이름",
        "review.name_placeholder": "이름 (선택 사항)",
        "review.comment": "한줄평",
        "review.comment_placeholder": "사용 경험을 들려주세요...",
        "review.submit": "리뷰 제출",
        "review.alert_rating": "별점을 선택해주세요!",
        "review.alert_thanks": "리뷰를 남겨주셔서 감사합니다!",
        "review.alert_error": "리뷰 저장 중 오류가 발생했습니다.",
        "hero.title": "한계 없는, <br><span class=\"gradient-text\">당신만의 Minecraft.</span>",
        "hero.subtitle": "가볍고 안전하며 완벽하게 커스터마이징 가능한 오픈 소스 런처. 불필요한 소프트웨어는 이제 안녕.",
        "hero.install_ps": "빠른 설치 (PowerShell)",
        "hero.install_bash": "빠른 설치 (Bash)",
        "hero.install_note": "원클릭 빠른 설치",
        "hero.download_win_btn": "<i class=\"bi bi-windows\"></i> Windows용 다운로드 <i class=\"bi bi-chevron-down dropdown-arrow\"></i><div class=\"btn-shine\"></div>",
        "hero.win_setup_title": "설치 프로그램 x64",
        "hero.win_setup_sub": "설치 프로그램 (권장)",
        "hero.best_option": "최고의 선택",
        "hero.win_setup_arm_title": "설치 프로그램 ARM64",
        "hero.win_setup_arm_sub": "ARM 기기용 설치 프로그램",
        "hero.win_port_title": "포터블 x64",
        "hero.win_port_sub": "ZIP 압축 파일",
        "hero.win_port_arm_title": "포터블 ARM64",
        "hero.win_port_arm_sub": "ARM용 ZIP 파일",
        "hero.download_linux_btn": "<i class=\"fa-brands fa-linux\" style=\"font-size: 1.1rem; margin-right: 5px;\"></i> Linux용 다운로드 <i class=\"bi bi-chevron-down dropdown-arrow\"></i>",
        "hero.lin_deb_title": "DEB x64",
        "hero.lin_deb_sub": "Debian/Ubuntu (권장)",
        "hero.lin_deb_arm_title": "DEB ARM64",
        "hero.lin_deb_arm_sub": "ARM용 Debian/Ubuntu",
        "hero.lin_app_title": "AppImage x64",
        "hero.lin_app_sub": "범용 Linux",
        "hero.lin_app_arm_title": "AppImage ARM64",
        "hero.lin_app_arm_sub": "ARM용 AppImage",
        "hero.os_warning": "<i class=\"bi bi-info-circle\" style=\"margin-right: 5px;\"></i> 현재 <strong><span id=\"detectedOSName\">OS</span></strong>에서 접속 중입니다. 다음 설치 파일과 호환되지 않을 수 있습니다.",
        "hero.stats_downloads": "다운로드",
        "hero.stats_rating": "<span style=\"font-size: 0.9rem; font-weight: 500; opacity: 0.9;\">/5 평점</span>",
        "discord.title": "공식 커뮤니티 참여",
        "discord.subtitle": "지원 및 업데이트 소식 받기",
        "hero.stats_opensource": "오픈 소스",
        "hero.stats_telemetry": "데이터 수집",
        "hero.stats_perf_val": "최상",
        "hero.stats_perf": "성능",
        "features.title": "왜 HelloWorld인가요?",
        "features.subtitle": "성능과 개인정보 보호를 최우선으로 설계되었습니다.",
        "features.f1_title": "개인정보 보호 최우선",
        "features.f1_desc": "원격 측정이나 추적기가 전혀 없습니다. GitHub에서 100% 공개 감사 가능합니다.",
        "features.f2_title": "초고속 시작",
        "features.f2_desc": "몇 초 만에 실행되도록 최적화되어 저사양 PC에서도 쾌적합니다.",
        "features.f3_title": "간편한 모드 관리",
        "features.f3_desc": "외부 프로그램 없이 런처 내에서 Forge, Fabric 및 모드를 직접 설치하세요.",
        "features.f4_title": "스마트 설치 분리",
        "features.f4_desc": "각 설치 버전마다 별도의 설정과 폴더를 유지하여 깔끔하게 정리됩니다.",
        "features.f5_title": "오프라인 모드",
        "features.f5_desc": "인터넷이 없어도 이미 다운로드한 버전을 언제든지 플레이할 수 있습니다.",
        "features.f6_title": "오픈 소스",
        "features.f6_desc": "숨겨진 프로그램이나 광고 없는 완벽한 투명성.",
        "gallery.title": "갤러리",
        "gallery.subtitle": "깔끔하고 세련된 인터페이스를 둘러보세요.",
        "faq.title": "자주 묻는 질문",
        "faq.subtitle": "궁금한 모든 점을 안내해 드립니다.",
        "faq.q1": "백신 프로그램에서 오진하는 이유는 무엇인가요?",
        "faq.a1": "고가의 상용 코드 서명 인증서가 아직 적용되지 않아 발생하는 오픈 소스 특유의 오탐입니다.",
        "faq.q2": "합법적인 프로그램인가요?",
        "faq.a2": "네. Mojang과 Microsoft의 정식 이용 약관을 준수합니다.",
        "faq.q3": "무거운 대형 모드팩도 지원하나요?",
        "faq.a3": "네, 컴퓨터의 RAM 사양에 따라 대형 모드팩도 원활하게 구동됩니다.",
        "faq.q4": "인터넷 없이도 실행 가능한가요?",
        "faq.a4": "네, 오프라인 모드를 통해 다운로드된 버전을 오프라인으로 플레이할 수 있습니다.",
        "faq.q5": "Fabric과 Forge를 모두 지원하나요?",
        "faq.a5": "물론입니다. 각각 독립된 설치 프로필을 생성할 수 있습니다.",
        "footer.desc": "커뮤니티가 만들고 커뮤니티가 사용하는 Minecraft 런처.",
        "footer.links": "바로가기",
        "footer.repo": "GitHub 저장소",
        "footer.report": "버그 신고",
        "footer.prev": "이전 버전",
        "footer.copy": "&copy; 2026 HelloWorld Launcher. Mojang 또는 Microsoft와 제휴되지 않았습니다.",
        "footer.signpath": "이 프로젝트는 코드 서명을 위해 <a href=\"https://signpath.org/\" target=\"_blank\" rel=\"noopener noreferrer\">SignPath Foundation</a>을 사용합니다.",
        "bg.default": "기본 배너",
        "bg.purple": "보라색 그라데이션",
        "bg.blue": "파란색 그라데이션",
        "bg.green": "초록색 그라데이션",
        "bg.orange": "주황색 그라데이션",
        "bg.pink": "분홍색 그라데이션",
        "cropper.title": "아바타 자르기",
        "cropper.cancel": "취소",
        "cropper.apply": "자르기 적용",
        "global.loading": "서비스 로딩 중...",
        "country.AR": "아르헨티나",
        "country.AU": "호주",
        "country.AT": "오스트리아",
        "country.BE": "벨기에",
        "country.BR": "브라질",
        "country.CA": "캐나다",
        "country.CL": "칠레",
        "country.CN": "중국",
        "country.CO": "콜롬비아",
        "country.CZ": "체코",
        "country.DK": "덴마크",
        "country.EG": "이집트",
        "country.FI": "핀란드",
        "country.FR": "프랑스",
        "country.DE": "독일",
        "country.GR": "그리스",
        "country.HK": "홍콩",
        "country.HU": "헝가리",
        "country.IS": "아이슬란드",
        "country.IN": "인도",
        "country.ID": "인도네시아",
        "country.IE": "아일랜드",
        "country.IL": "이스라엘",
        "country.IT": "이탈리아",
        "country.JP": "일본",
        "country.LU": "룩셈부르크",
        "country.MY": "말레이시아",
        "country.MX": "멕시코",
        "country.NL": "네덜란드",
        "country.NZ": "뉴질랜드",
        "country.NG": "나이지리아",
        "country.NO": "노르웨이",
        "country.PE": "페루",
        "country.PH": "필리핀",
        "country.PL": "폴란드",
        "country.PT": "포르투갈",
        "country.RO": "루마니아",
        "country.RU": "러시아",
        "country.SA": "사우디아라비아",
        "country.SG": "싱가포르",
        "country.ZA": "남아프리카",
        "country.KR": "대한민국",
        "country.ES": "스페인",
        "country.SE": "스웨덴",
        "country.CH": "스위스",
        "country.TH": "태국",
        "country.TR": "튀르키예",
        "country.UA": "우크라이나",
        "country.AE": "아랍에미리트",
        "country.GB": "영국",
        "country.US": "미국",
        "country.VE": "베네수엘라",
        "country.VN": "베트남",
        "country.OTHER": "기타",
        "bg.mc_overworld": "Minecraft 오버월드",
        "bg.mc_sky": "Minecraft 하늘",
        "bg.mc_nether": "Minecraft 네더",
        "bg.mc_end": "Minecraft 엔드",
        "bg.mc_village": "Minecraft 마을",
        "bg.mc_forest": "Minecraft 숲",
        "bg.mc_desert": "Minecraft 사막",
        "bg.mc_ocean": "Minecraft 바다",
        "bg.mc_cherry_grove": "Minecraft 벚나무 숲",
        "tag.pvp": "PvP",
        "tag.pvp_pro": "PvP 프로",
        "tag.builder": "건축가",
        "tag.architect": "설계사",
        "tag.survival": "서바이벌",
        "tag.hardcore": "하드코어",
        "tag.redstone": "레드스톤",
        "tag.technical": "테크니컬",
        "tag.farms": "농장 제작자",
        "tag.explorer": "모험가",
        "tag.speedrunner": "스피드러너",
        "tag.socialite": "친목",
        "tag.roleplayer": "롤플레이어",
        "tag.modded": "모드 유저",
        "tag.modpack": "모드팩 유저",
        "tag.creative": "크리에이티브",
        "tag.artist": "도트 아티스트",
        "tag.streamer": "스트리머",
        "tag.casual": "캐주얼",
        "tag.minigames": "미니게임",
        "tag.skyblock": "스카이블록",
        "kofi.btn_title": "Ko-fi에서 후원하기",
        "sponsor.copy_title": "프로모션 코드 복사",
        "sponsor.open_title": "Apex Hosting 방문",
        "common.copy_clipboard": "클립보드에 복사",
        "settings.mc_head_title": "기본 마인크래프트 머리 사용",
        "badge.premium": "프리미엄 계정",
        "badge.moderator": "모더레이터",
        "badge.creator": "크리에이터"
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
        "settings.saved_btn": "Zapisano",
        "settings.saved_success": "Ustawienia konta zaktualizowane pomyślnie!",
        "hero.badge": "Pobieranie już dostępne",
        "hero.badge_available": "Już dostępne",
        "hero.download_win": "Pobierz na Windows",
        "hero.download_linux": "Pobierz na Linux",
        "review.btn_title": "Zostaw opinię",
        "review.title": "Zostaw opinię",
        "review.subtitle": "Napisz, co myślisz o HelloWorld Launcher!",
        "review.rating": "Ocena",
        "review.name": "Imię",
        "review.name_placeholder": "Twoje imię (opcjonalnie)",
        "review.comment": "Komentarz",
        "review.comment_placeholder": "Podziel się wrażeniami...",
        "review.submit": "Wyślij opinię",
        "review.alert_rating": "Wybierz ocenę gwiazdkową!",
        "review.alert_thanks": "Dziękujemy za opinię!",
        "review.alert_error": "Błąd podczas zapisywania opinii.",
        "hero.title": "Twój Minecraft, <br><span class=\"gradient-text\">Bez Granic.</span>",
        "hero.subtitle": "Launcher open source zaprojektowany z myślą o lekkości, bezpieczeństwie i pełnej personalizacji. Zapomnij o zbędnym oprogramowaniu.",
        "hero.install_ps": "Szybka instalacja (PowerShell)",
        "hero.install_bash": "Szybka instalacja (Bash)",
        "hero.install_note": "Instalacja jednym kliknięciem",
        "hero.download_win_btn": "<i class=\"bi bi-windows\"></i> Pobierz na Windows <i class=\"bi bi-chevron-down dropdown-arrow\"></i><div class=\"btn-shine\"></div>",
        "hero.win_setup_title": "Instalator x64",
        "hero.win_setup_sub": "Instalator (Zalecany)",
        "hero.best_option": "Najlepsza opcja",
        "hero.win_setup_arm_title": "Instalator ARM64",
        "hero.win_setup_arm_sub": "Dla urządzeń ARM",
        "hero.win_port_title": "Wersja przenośna x64",
        "hero.win_port_sub": "Archiwum ZIP",
        "hero.win_port_arm_title": "Wersja przenośna ARM64",
        "hero.win_port_arm_sub": "Archiwum ZIP dla ARM",
        "hero.download_linux_btn": "<i class=\"fa-brands fa-linux\" style=\"font-size: 1.1rem; margin-right: 5px;\"></i> Pobierz na Linux <i class=\"bi bi-chevron-down dropdown-arrow\"></i>",
        "hero.lin_deb_title": "DEB x64",
        "hero.lin_deb_sub": "Debian/Ubuntu (Zalecany)",
        "hero.lin_deb_arm_title": "DEB ARM64",
        "hero.lin_deb_arm_sub": "Debian/Ubuntu dla ARM",
        "hero.lin_app_title": "AppImage x64",
        "hero.lin_app_sub": "Uniwersalny Linux",
        "hero.lin_app_arm_title": "AppImage ARM64",
        "hero.lin_app_arm_sub": "Uniwersalny Linux dla ARM",
        "hero.os_warning": "<i class=\"bi bi-info-circle\" style=\"margin-right: 5px;\"></i> Przeglądasz z systemu <strong><span id=\"detectedOSName\">OS</span></strong>. Następujące instalatory mogą być niezgodne.",
        "hero.stats_downloads": "Pobrań",
        "hero.stats_rating": "<span style=\"font-size: 0.9rem; font-weight: 500; opacity: 0.9;\">/5 Ocena</span>",
        "discord.title": "Dołącz do społeczności",
        "discord.subtitle": "Uzyskaj pomoc i aktualności",
        "hero.stats_opensource": "Open Source",
        "hero.stats_telemetry": "Telemetria",
        "hero.stats_perf_val": "Wysoka",
        "hero.stats_perf": "Wydajność",
        "features.title": "Dlaczego HelloWorld?",
        "features.subtitle": "Zaprojektowany z myślą o wydajności i prywatności.",
        "features.f1_title": "Prywatność przede wszystkim",
        "features.f1_desc": "Brak telemetrii i trackerów. Twoje dane należą tylko do Ciebie. 100% audytowalny kod na GitHub.",
        "features.f2_title": "Szybki start",
        "features.f2_desc": "Zoptymalizowany pod kątem uruchamiania w kilka sekund. Idealny na słabsze komputery.",
        "features.f3_title": "Zarządzanie modami",
        "features.f3_desc": "Instaluj Forge, Fabric i modyfikacje bezpośrednio z launchera.",
        "features.f4_title": "Inteligentne profile",
        "features.f4_desc": "Każda instalacja posiada własne ustawienia i oddzielny folder.",
        "features.f5_title": "Tryb offline",
        "features.f5_desc": "Brak internetu? Żaden problem. Graj w pobrane wersje w dowolnym miejscu.",
        "features.f6_title": "Open Source",
        "features.f6_desc": "Pełna przejrzystość. Brak ukrytego oprogramowania.",
        "gallery.title": "Galeria",
        "gallery.subtitle": "Zobacz prosty, nowoczesny i przejrzysty interfejs.",
        "faq.title": "Często zadawane pytania",
        "faq.subtitle": "Wszystko, co musisz wiedzieć.",
        "faq.q1": "Dlaczego antywirus może wykrywać zagrożenie?",
        "faq.a1": "Aplikacja nie posiada jeszcze kosztownego certyfikatu komercyjnego. To typowy fałszywy alarm dla open source.",
        "faq.q2": "Czy to jest legalne?",
        "faq.a2": "Tak. Launcher działa zgodnie z zasadami firmy Mojang i Microsoft.",
        "faq.q3": "Czy launcher poradzi sobie z dużymi paczkami modów?",
        "faq.a3": "Tak, o ile Twój komputer posiada wystarczającą ilość pamięci RAM.",
        "faq.q4": "Czy działa bez połączenia z internetem?",
        "faq.a4": "Tak, tryb offline pozwala na grę w pobrane wersje bez sieci.",
        "faq.q5": "Czy obsługuje Fabric i Forge?",
        "faq.a5": "Oczywiście. Możesz tworzyć niezależne instalacje dla każdego silnika.",
        "footer.desc": "Launcher Minecraft stworzony przez społeczność dla społeczności.",
        "footer.links": "Linki",
        "footer.repo": "Repozytorium GitHub",
        "footer.report": "Zgłoś błąd",
        "footer.prev": "Poprzednie wersje",
        "footer.copy": "&copy; 2026 HelloWorld Launcher. Niezwiązany z Mojang ani Microsoft.",
        "footer.signpath": "Ten projekt korzysta z fundacji <a href=\"https://signpath.org/\" target=\"_blank\" rel=\"noopener noreferrer\">SignPath Foundation</a> do podpisywania kodu.",
        "bg.default": "Domyślny Baner",
        "bg.purple": "Fioletowy Gradient",
        "bg.blue": "Niebieski Gradient",
        "bg.green": "Zielony Gradient",
        "bg.orange": "Pomarańczowy Gradient",
        "bg.pink": "Różowy Gradient",
        "cropper.title": "Przytnij Avatar",
        "cropper.cancel": "Anuluj",
        "cropper.apply": "Zastosuj Przycinanie",
        "global.loading": "Ładowanie usług...",
        "country.AR": "Argentyna",
        "country.AU": "Australia",
        "country.AT": "Austria",
        "country.BE": "Belgia",
        "country.BR": "Brazylia",
        "country.CA": "Kanada",
        "country.CL": "Chile",
        "country.CN": "Chiny",
        "country.CO": "Kolumbia",
        "country.CZ": "Czechy",
        "country.DK": "Dania",
        "country.EG": "Egipt",
        "country.FI": "Finlandia",
        "country.FR": "Francja",
        "country.DE": "Niemcy",
        "country.GR": "Grecja",
        "country.HK": "Hongkong",
        "country.HU": "Węgry",
        "country.IS": "Islandia",
        "country.IN": "Indie",
        "country.ID": "Indonezja",
        "country.IE": "Irlandia",
        "country.IL": "Izrael",
        "country.IT": "Włochy",
        "country.JP": "Japonia",
        "country.LU": "Luksemburg",
        "country.MY": "Malezja",
        "country.MX": "Meksyk",
        "country.NL": "Holandia",
        "country.NZ": "Nowa Zelandia",
        "country.NG": "Nigeria",
        "country.NO": "Norwegia",
        "country.PE": "Peru",
        "country.PH": "Filipiny",
        "country.PL": "Polska",
        "country.PT": "Portugalia",
        "country.RO": "Rumunia",
        "country.RU": "Rosja",
        "country.SA": "Arabia Saudyjska",
        "country.SG": "Singapur",
        "country.ZA": "RPA",
        "country.KR": "Korea Południowa",
        "country.ES": "Hiszpania",
        "country.SE": "Szwecja",
        "country.CH": "Szwajcaria",
        "country.TH": "Tajlandia",
        "country.TR": "Turcja",
        "country.UA": "Ukraina",
        "country.AE": "ZEA",
        "country.GB": "Wielka Brytania",
        "country.US": "Stany Zjednoczone",
        "country.VE": "Wenezuela",
        "country.VN": "Wietnam",
        "country.OTHER": "Inny",
        "bg.mc_overworld": "Minecraft Overworld",
        "bg.mc_sky": "Minecraft Niebo",
        "bg.mc_nether": "Minecraft Nether",
        "bg.mc_end": "Minecraft End",
        "bg.mc_village": "Minecraft Wioska",
        "bg.mc_forest": "Minecraft Las",
        "bg.mc_desert": "Minecraft Pustynia",
        "bg.mc_ocean": "Minecraft Ocean",
        "bg.mc_cherry_grove": "Minecraft Gaj Wiśniowy",
        "tag.pvp": "PvP",
        "tag.pvp_pro": "PvP Pro",
        "tag.builder": "Budowniczy",
        "tag.architect": "Architekt",
        "tag.survival": "Przetrwanie",
        "tag.hardcore": "Hardcore",
        "tag.redstone": "Redstone",
        "tag.technical": "Techniczny",
        "tag.farms": "Budowniczy farm",
        "tag.explorer": "Odkrywca",
        "tag.speedrunner": "Speedrunner",
        "tag.socialite": "Towarzyski",
        "tag.roleplayer": "Roleplayer",
        "tag.modded": "Zmodowany",
        "tag.modpack": "Gracz paczek modów",
        "tag.creative": "Kreatywny",
        "tag.artist": "Piksel artysta",
        "tag.streamer": "Streamer",
        "tag.casual": "Niedzielny gracz",
        "tag.minigames": "Minigry",
        "tag.skyblock": "Skyblock",
        "kofi.btn_title": "Wesprzyj na Ko-fi",
        "sponsor.copy_title": "Skopiuj kod promocyjny",
        "sponsor.open_title": "Odwiedź Apex Hosting",
        "common.copy_clipboard": "Skopiuj do schowka",
        "settings.mc_head_title": "Użyj domyślnej głowy Minecraft",
        "badge.premium": "Konto Premium",
        "badge.moderator": "Moderator",
        "badge.creator": "Twórca"
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
        "settings.saved_btn": "Opgeslagen",
        "settings.saved_success": "Accountinstellingen succesvol bijgewerkt!",
        "hero.badge": "Download nu beschikbaar",
        "hero.badge_available": "Nu beschikbaar",
        "hero.download_win": "Downloaden voor Windows",
        "hero.download_linux": "Downloaden voor Linux",
        "review.btn_title": "Review achterlaten",
        "review.title": "Review achterlaten",
        "review.subtitle": "Vertel ons wat je van HelloWorld Launcher vindt!",
        "review.rating": "Beoordeling",
        "review.name": "Naam",
        "review.name_placeholder": "Je naam (optioneel)",
        "review.comment": "Opmerking",
        "review.comment_placeholder": "Deel je ervaring...",
        "review.submit": "Review versturen",
        "review.alert_rating": "Selecteer een aantal sterren!",
        "review.alert_thanks": "Bedankt voor je beoordeling!",
        "review.alert_error": "Fout bij opslaan van review.",
        "hero.title": "Jouw Minecraft, <br><span class=\"gradient-text\">Zonder Grenzen.</span>",
        "hero.subtitle": "De open-source launcher ontworpen om lichtgewicht, veilig en volledig aanpasbaar te zijn. Vergeet overbodige software.",
        "hero.install_ps": "Snelle installatie (PowerShell)",
        "hero.install_bash": "Snelle installatie (Bash)",
        "hero.install_note": "Installatie met één klik",
        "hero.download_win_btn": "<i class=\"bi bi-windows\"></i> Downloaden voor Windows <i class=\"bi bi-chevron-down dropdown-arrow\"></i><div class=\"btn-shine\"></div>",
        "hero.win_setup_title": "Setup x64",
        "hero.win_setup_sub": "Installatieprogramma (Aanbevolen)",
        "hero.best_option": "Beste keuze",
        "hero.win_setup_arm_title": "Setup ARM64",
        "hero.win_setup_arm_sub": "Voor ARM-apparaten",
        "hero.win_port_title": "Draagbaar x64",
        "hero.win_port_sub": "ZIP-archief",
        "hero.win_port_arm_title": "Draagbaar ARM64",
        "hero.win_port_arm_sub": "ZIP-archief voor ARM",
        "hero.download_linux_btn": "<i class=\"fa-brands fa-linux\" style=\"font-size: 1.1rem; margin-right: 5px;\"></i> Downloaden voor Linux <i class=\"bi bi-chevron-down dropdown-arrow\"></i>",
        "hero.lin_deb_title": "DEB x64",
        "hero.lin_deb_sub": "Debian/Ubuntu (Aanbevolen)",
        "hero.lin_deb_arm_title": "DEB ARM64",
        "hero.lin_deb_arm_sub": "Debian/Ubuntu voor ARM",
        "hero.lin_app_title": "AppImage x64",
        "hero.lin_app_sub": "Universeel Linux",
        "hero.lin_app_arm_title": "AppImage ARM64",
        "hero.lin_app_arm_sub": "Universeel Linux voor ARM",
        "hero.os_warning": "<i class=\"bi bi-info-circle\" style=\"margin-right: 5px;\"></i> Je bezoekt ons vanaf <strong><span id=\"detectedOSName\">OS</span></strong>. De installatiebestanden zijn mogelijk niet compatibel.",
        "hero.stats_downloads": "Downloads",
        "hero.stats_rating": "<span style=\"font-size: 0.9rem; font-weight: 500; opacity: 0.9;\">/5 Beoordeling</span>",
        "discord.title": "Word lid van de community",
        "discord.subtitle": "Hulp en updates ontvangen",
        "hero.stats_opensource": "Open Source",
        "hero.stats_telemetry": "Telemetrie",
        "hero.stats_perf_val": "Hoog",
        "hero.stats_perf": "Prestaties",
        "features.title": "Waarom HelloWorld?",
        "features.subtitle": "Ontworpen met prestaties en privacy in gedachten.",
        "features.f1_title": "Privacy eerst",
        "features.f1_desc": "Geen telemetrie of trackers. Jouw gegevens blijven van jou. 100% controleerbaar op GitHub.",
        "features.f2_title": "Snelle start",
        "features.f2_desc": "Geoptimaliseerd om binnen enkele seconden te starten. Ideaal voor eenvoudigere pc's.",
        "features.f3_title": "Mod-beheer",
        "features.f3_desc": "Installeer Forge, Fabric en mods rechtstreeks zonder externe tools.",
        "features.f4_title": "Slimme installaties",
        "features.f4_desc": "Elke installatie behoudt zijn eigen instellingen en afzonderlijke mappen.",
        "features.f5_title": "Offline modus",
        "features.f5_desc": "Geen internet? Speel je geïnstalleerde versies waar en wanneer je maar wilt.",
        "features.f6_title": "Open Source",
        "features.f6_desc": "Volledige transparantie zonder ongewenste software.",
        "gallery.title": "Galerij",
        "gallery.subtitle": "Bekijk de overzichtelijke, moderne interface.",
        "faq.title": "Veelgestelde vragen",
        "faq.subtitle": "Alles wat je moet weten.",
        "faq.q1": "Waarom geeft mijn virusscanner een waarschuwing?",
        "faq.a1": "Omdat de app nog niet is ondertekend met een duur certificaat. Een bekend vals positief alarm bij open source.",
        "faq.q2": "Is dit legaal?",
        "faq.a2": "Ja. De launcher volgt de richtlijnen van Mojang en Microsoft.",
        "faq.q3": "Ondersteunt het zware modpacks?",
        "faq.a3": "Jazeker, mits je pc over voldoende werkgeheugen beschikt.",
        "faq.q4": "Werkt het zonder internetverbinding?",
        "faq.a4": "Ja, in de offline modus kun je gedownloade versies zonder netwerk spelen.",
        "faq.q5": "Worden Fabric en Forge ondersteund?",
        "faq.a5": "Absoluut. Je kunt voor elk een afzonderlijke installatie aanmaken.",
        "footer.desc": "De Minecraft-launcher gemaakt door de community, voor de community.",
        "footer.links": "Links",
        "footer.repo": "GitHub Repository",
        "footer.report": "Fout melden",
        "footer.prev": "Eerdere versies",
        "footer.copy": "&copy; 2026 HelloWorld Launcher. Niet gelieerd aan Mojang of Microsoft.",
        "footer.signpath": "Dit project gebruikt de <a href=\"https://signpath.org/\" target=\"_blank\" rel=\"noopener noreferrer\">SignPath Foundation</a> voor code signing.",
        "bg.default": "Standaard Banner",
        "bg.purple": "Paars Verloop",
        "bg.blue": "Blauw Verloop",
        "bg.green": "Groen Verloop",
        "bg.orange": "Oranje Verloop",
        "bg.pink": "Roze Verloop",
        "cropper.title": "Avatar Bijsnijden",
        "cropper.cancel": "Annuleren",
        "cropper.apply": "Bijsnijden Toepassen",
        "global.loading": "Services laden...",
        "country.AR": "Argentinië",
        "country.AU": "Australië",
        "country.AT": "Oostenrijk",
        "country.BE": "België",
        "country.BR": "Brazilië",
        "country.CA": "Canada",
        "country.CL": "Chili",
        "country.CN": "China",
        "country.CO": "Colombia",
        "country.CZ": "Tsjechië",
        "country.DK": "Denemarken",
        "country.EG": "Egypte",
        "country.FI": "Finland",
        "country.FR": "Frankrijk",
        "country.DE": "Duitsland",
        "country.GR": "Griekenland",
        "country.HK": "Hongkong",
        "country.HU": "Hongarije",
        "country.IS": "IJsland",
        "country.IN": "India",
        "country.ID": "Indonesië",
        "country.IE": "Ierland",
        "country.IL": "Israël",
        "country.IT": "Italië",
        "country.JP": "Japan",
        "country.LU": "Luxemburg",
        "country.MY": "Maleisië",
        "country.MX": "Mexico",
        "country.NL": "Nederland",
        "country.NZ": "Nieuw-Zeeland",
        "country.NG": "Nigeria",
        "country.NO": "Noorwegen",
        "country.PE": "Peru",
        "country.PH": "Filipijnen",
        "country.PL": "Polen",
        "country.PT": "Portugal",
        "country.RO": "Roemenië",
        "country.RU": "Rusland",
        "country.SA": "Saoedi-Arabië",
        "country.SG": "Singapore",
        "country.ZA": "Zuid-Afrika",
        "country.KR": "Zuid-Korea",
        "country.ES": "Spanje",
        "country.SE": "Zweden",
        "country.CH": "Zwitserland",
        "country.TH": "Thailand",
        "country.TR": "Turkije",
        "country.UA": "Oekraïne",
        "country.AE": "Verenigde Arabische Emiraten",
        "country.GB": "Verenigd Koninkrijk",
        "country.US": "Verenigde Staten",
        "country.VE": "Venezuela",
        "country.VN": "Vietnam",
        "country.OTHER": "Ander",
        "bg.mc_overworld": "Minecraft Bovenwereld",
        "bg.mc_sky": "Minecraft Lucht",
        "bg.mc_nether": "Minecraft Nether",
        "bg.mc_end": "Minecraft End",
        "bg.mc_village": "Minecraft Dorp",
        "bg.mc_forest": "Minecraft Bos",
        "bg.mc_desert": "Minecraft Woestijn",
        "bg.mc_ocean": "Minecraft Oceaan",
        "bg.mc_cherry_grove": "Minecraft Kersenbloesembos",
        "tag.pvp": "PvP",
        "tag.pvp_pro": "PvP Pro",
        "tag.builder": "Bouwer",
        "tag.architect": "Architect",
        "tag.survival": "Overleving",
        "tag.hardcore": "Hardcore",
        "tag.redstone": "Redstone",
        "tag.technical": "Technisch",
        "tag.farms": "Farmbouwer",
        "tag.explorer": "Verkenner",
        "tag.speedrunner": "Speedrunner",
        "tag.socialite": "Sociaal",
        "tag.roleplayer": "Rollenspeler",
        "tag.modded": "Gemod",
        "tag.modpack": "Modpack-speler",
        "tag.creative": "Creatief",
        "tag.artist": "Pixel-kunstenaar",
        "tag.streamer": "Streamer",
        "tag.casual": "Casual",
        "tag.minigames": "Minigames",
        "tag.skyblock": "Skyblock",
        "kofi.btn_title": "Steun op Ko-fi",
        "sponsor.copy_title": "Kopieer promotiecode",
        "sponsor.open_title": "Bezoek Apex Hosting",
        "common.copy_clipboard": "Kopiëren naar klembord",
        "settings.mc_head_title": "Standaard Minecraft-hoofd gebruiken",
        "badge.premium": "Premium-account",
        "badge.moderator": "Moderator",
        "badge.creator": "Maker"
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
        "settings.saved_btn": "Kaydedildi",
        "settings.saved_success": "Hesap ayarları başarıyla güncellendi!",
        "hero.badge": "İndirme şimdi mevcut",
        "hero.badge_available": "Şimdi Mevcut",
        "hero.download_win": "Windows için İndir",
        "hero.download_linux": "Linux için İndir",
        "review.btn_title": "Değerlendirme Yaz",
        "review.title": "Değerlendirme Yaz",
        "review.subtitle": "HelloWorld Launcher hakkındaki düşüncelerinizi paylaşın!",
        "review.rating": "Puan",
        "review.name": "İsim",
        "review.name_placeholder": "Adınız (isteğe bağlı)",
        "review.comment": "Yorum",
        "review.comment_placeholder": "Deneyiminizi paylaşın...",
        "review.submit": "Değerlendirmeyi Gönder",
        "review.alert_rating": "Lütfen yıldız puanı seçin!",
        "review.alert_thanks": "Değerlendirmeniz için teşekkür ederiz!",
        "review.alert_error": "Değerlendirme kaydedilirken hata oluştu.",
        "hero.title": "Senin Minecraft'ın, <br><span class=\"gradient-text\">Sınırsız.</span>",
        "hero.subtitle": "Hafif, güvenli ve tamamen özelleştirilebilir açık kaynaklı başlatıcı. Gereksiz yazılımları unutun.",
        "hero.install_ps": "Hızlı Kurulum (PowerShell)",
        "hero.install_bash": "Hızlı Kurulum (Bash)",
        "hero.install_note": "Tek tıkla kurulum",
        "hero.download_win_btn": "<i class=\"bi bi-windows\"></i> Windows için İndir <i class=\"bi bi-chevron-down dropdown-arrow\"></i><div class=\"btn-shine\"></div>",
        "hero.win_setup_title": "Kurulum x64",
        "hero.win_setup_sub": "Yükleyici (Önerilen)",
        "hero.best_option": "En İyi Seçenek",
        "hero.win_setup_arm_title": "Kurulum ARM64",
        "hero.win_setup_arm_sub": "ARM cihazlar için",
        "hero.win_port_title": "Taşınabilir x64",
        "hero.win_port_sub": "ZIP arşivi",
        "hero.win_port_arm_title": "Taşınabilir ARM64",
        "hero.win_port_arm_sub": "ARM için ZIP arşivi",
        "hero.download_linux_btn": "<i class=\"fa-brands fa-linux\" style=\"font-size: 1.1rem; margin-right: 5px;\"></i> Linux için İndir <i class=\"bi bi-chevron-down dropdown-arrow\"></i>",
        "hero.lin_deb_title": "DEB x64",
        "hero.lin_deb_sub": "Debian/Ubuntu (Önerilen)",
        "hero.lin_deb_arm_title": "DEB ARM64",
        "hero.lin_deb_arm_sub": "ARM için Debian/Ubuntu",
        "hero.lin_app_title": "AppImage x64",
        "hero.lin_app_sub": "Evrensel Linux",
        "hero.lin_app_arm_title": "AppImage ARM64",
        "hero.lin_app_arm_sub": "ARM için Evrensel Linux",
        "hero.os_warning": "<i class=\"bi bi-info-circle\" style=\"margin-right: 5px;\"></i> <strong><span id=\"detectedOSName\">OS</span></strong> üzerinden bağlanıyorsunuz. Yükleyiciler uyumsuz olabilir.",
        "hero.stats_downloads": "İndirme",
        "hero.stats_rating": "<span style=\"font-size: 0.9rem; font-weight: 500; opacity: 0.9;\">/5 Puan</span>",
        "discord.title": "Topluluğumuza Katılın",
        "discord.subtitle": "Destek ve yenilikleri takip edin",
        "hero.stats_opensource": "Açık Kaynak",
        "hero.stats_telemetry": "Telemetri",
        "hero.stats_perf_val": "Yüksek",
        "hero.stats_perf": "Performans",
        "features.title": "Neden HelloWorld?",
        "features.subtitle": "Performans ve gizlilik ön planda tutularak tasarlandı.",
        "features.f1_title": "Önce Gizlilik",
        "features.f1_desc": "Telemetri veya izleyici yok. Verileriniz yalnızca size aittir. GitHub'da 100% denetlenebilir.",
        "features.f2_title": "Hızlı Başlangıç",
        "features.f2_desc": "Saniyeler içinde açılacak şekilde optimize edildi. Eski bilgisayarlar için idealdir.",
        "features.f3_title": "Mod Yönetimi",
        "features.f3_desc": "Forge, Fabric ve modları harici bir programa gerek duymadan doğrudan yükleyin.",
        "features.f4_title": "Akıllı Kurulumlar",
        "features.f4_desc": "Her kurulum kendi ayarlarını ve klasörünü ayrı tutar.",
        "features.f5_title": "Çevrimdışı Mod",
        "features.f5_desc": "İnternetiniz mi yok? İndirilmiş sürümleri istediğiniz zaman çevrimdışı oynayın.",
        "features.f6_title": "Açık Kaynak",
        "features.f6_desc": "Tam şeffaflık. İstenmeyen gizli yazılımlar içermez.",
        "gallery.title": "Galeri",
        "gallery.subtitle": "Basit, güçlü ve şık arayüze göz atın.",
        "faq.title": "Sıkça Sorulan Sorular",
        "faq.subtitle": "Bilmeniz gereken her şey.",
        "faq.q1": "Antivirüs neden uyarı veriyor?",
        "faq.a1": "Uygulama pahalı ticari sertifikalarla imzalanmadığı için açık kaynaklı uygulamalarda yaygın bir yanlış alarmdır.",
        "faq.q2": "Yasal mı?",
        "faq.a2": "Evet. Başlatıcı, Mojang ve Microsoft kurallarına tamamen uygundur.",
        "faq.q3": "Büyük mod paketlerini çalıştırır mı?",
        "faq.a3": "Evet, bilgisayarınızda yeterli RAM olduğu sürece ağır mod paketlerini destekler.",
        "faq.q4": "İnternetsiz çalışır mı?",
        "faq.a4": "Evet, çevrimdışı modda indirilmiş sürümleri ağ bağlantısı olmadan oynayabilirsiniz.",
        "faq.q5": "Fabric ve Forge destekleniyor mu?",
        "faq.a5": "Kesinlikle. Her biri için bağımsız kurulumlar oluşturabilirsiniz.",
        "footer.desc": "Topluluk tarafından topluluk için geliştirilmiş Minecraft başlatıcısı.",
        "footer.links": "Bağlantılar",
        "footer.repo": "GitHub Deposu",
        "footer.report": "Hata Bildir",
        "footer.prev": "Önceki Sürümler",
        "footer.copy": "&copy; 2026 HelloWorld Launcher. Mojang veya Microsoft ile bağlantılı değildir.",
        "footer.signpath": "Bu proje kod imzalama için <a href=\"https://signpath.org/\" target=\"_blank\" rel=\"noopener noreferrer\">SignPath Foundation</a> kullanmaktadır.",
        "bg.default": "Varsayılan Başlık",
        "bg.purple": "Mor Gradyan",
        "bg.blue": "Mavi Gradyan",
        "bg.green": "Yeşil Gradyan",
        "bg.orange": "Turuncu Gradyan",
        "bg.pink": "Pembe Gradyan",
        "cropper.title": "Avatarı Kırp",
        "cropper.cancel": "İptal",
        "cropper.apply": "Kırpmayı Uygula",
        "global.loading": "Servisler yükleniyor...",
        "country.AR": "Arjantin",
        "country.AU": "Avustralya",
        "country.AT": "Avusturya",
        "country.BE": "Belçika",
        "country.BR": "Brezilya",
        "country.CA": "Kanada",
        "country.CL": "Şili",
        "country.CN": "Çin",
        "country.CO": "Kolombiya",
        "country.CZ": "Çekya",
        "country.DK": "Danimarka",
        "country.EG": "Mısır",
        "country.FI": "Finlandiya",
        "country.FR": "Fransa",
        "country.DE": "Almanya",
        "country.GR": "Yunanistan",
        "country.HK": "Hong Kong",
        "country.HU": "Macaristan",
        "country.IS": "İzlanda",
        "country.IN": "Hindistan",
        "country.ID": "Endonezya",
        "country.IE": "İrlanda",
        "country.IL": "İsrail",
        "country.IT": "İtalya",
        "country.JP": "Japonya",
        "country.LU": "Lüksemburg",
        "country.MY": "Malezya",
        "country.MX": "Meksika",
        "country.NL": "Hollanda",
        "country.NZ": "Yeni Zelanda",
        "country.NG": "Nijerya",
        "country.NO": "Norveç",
        "country.PE": "Peru",
        "country.PH": "Filipinler",
        "country.PL": "Polonya",
        "country.PT": "Portekiz",
        "country.RO": "Romanya",
        "country.RU": "Rusya",
        "country.SA": "Suudi Arabistan",
        "country.SG": "Singapur",
        "country.ZA": "Güney Afrika",
        "country.KR": "Güney Kore",
        "country.ES": "İspanya",
        "country.SE": "İsveç",
        "country.CH": "İsviçre",
        "country.TH": "Tayland",
        "country.TR": "Türkiye",
        "country.UA": "Ukrayna",
        "country.AE": "BAE",
        "country.GB": "Birleşik Krallık",
        "country.US": "Amerika Birleşik Devletleri",
        "country.VE": "Venezuela",
        "country.VN": "Vietnam",
        "country.OTHER": "Diğer",
        "bg.mc_overworld": "Minecraft Overworld",
        "bg.mc_sky": "Minecraft Gökyüzü",
        "bg.mc_nether": "Minecraft Nether",
        "bg.mc_end": "Minecraft End",
        "bg.mc_village": "Minecraft Köy",
        "bg.mc_forest": "Minecraft Orman",
        "bg.mc_desert": "Minecraft Çöl",
        "bg.mc_ocean": "Minecraft Okyanus",
        "bg.mc_cherry_grove": "Minecraft Kiraz Korusu",
        "tag.pvp": "PvP",
        "tag.pvp_pro": "PvP Pro",
        "tag.builder": "İnşaatçı",
        "tag.architect": "Mimar",
        "tag.survival": "Hayatta Kalma",
        "tag.hardcore": "Hardcore",
        "tag.redstone": "Kızıltaş",
        "tag.technical": "Teknik",
        "tag.farms": "Çiftlikçi",
        "tag.explorer": "Kaşif",
        "tag.speedrunner": "Hızlı Koşucu",
        "tag.socialite": "Sosyal",
        "tag.roleplayer": "Rol Yapma",
        "tag.modded": "Modlu",
        "tag.modpack": "Modpaketi Oyuncusu",
        "tag.creative": "Yaratıcı",
        "tag.artist": "Piksel Sanatçısı",
        "tag.streamer": "Yayıncı",
        "tag.casual": "Rahat",
        "tag.minigames": "Mini Oyunlar",
        "tag.skyblock": "Skyblock",
        "kofi.btn_title": "Ko-fi'de Destekle",
        "sponsor.copy_title": "Promosyon kodunu kopyala",
        "sponsor.open_title": "Apex Hosting'i Ziyaret Et",
        "common.copy_clipboard": "Panoya kopyala",
        "settings.mc_head_title": "Varsayılan Minecraft kafasını kullan",
        "badge.premium": "Premium Hesap",
        "badge.moderator": "Moderatör",
        "badge.creator": "İçerik Üreticisi"
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
        "settings.saved_btn": "تم الحفظ",
        "settings.saved_success": "تم تحديث إعدادات الحساب بنجاح!",
        "hero.badge": "التنزيل متاح الآن",
        "hero.badge_available": "متاح الآن",
        "hero.download_win": "تنزيل لنظام Windows",
        "hero.download_linux": "تنزيل لنظام Linux",
        "review.btn_title": "كتابة تقييم",
        "review.title": "كتابة تقييم",
        "review.subtitle": "شاركنا رأيك حول HelloWorld Launcher!",
        "review.rating": "التقييم",
        "review.name": "الاسم",
        "review.name_placeholder": "اسمك (اختياري)",
        "review.comment": "التعليق",
        "review.comment_placeholder": "شارك تجربتك معنا...",
        "review.submit": "إرسال التقييم",
        "review.alert_rating": "يرجى اختيار عدد النجوم!",
        "review.alert_thanks": "شكرًا لك على تقييمك!",
        "review.alert_error": "حدث خطأ أثناء حفظ التقييم.",
        "hero.title": "ماينكرافت خاصتك، <br><span class=\"gradient-text\">بلا حدود.</span>",
        "hero.subtitle": "المشغل مفتوح المصدر المصمم ليكون خفيف الوزن، آمنًا وقابلاً للتخصيص بالكامل. وداعًا للبرامج الزائدة.",
        "hero.install_ps": "تثبيت سريع (PowerShell)",
        "hero.install_bash": "تثبيت سريع (Bash)",
        "hero.install_note": "تثبيت بنقرة واحدة",
        "hero.download_win_btn": "<i class=\"bi bi-windows\"></i> تنزيل لنظام Windows <i class=\"bi bi-chevron-down dropdown-arrow\"></i><div class=\"btn-shine\"></div>",
        "hero.win_setup_title": "مُثبّت x64",
        "hero.win_setup_sub": "المُثبّت (موصى به)",
        "hero.best_option": "الخيار الأفضل",
        "hero.win_setup_arm_title": "مُثبّت ARM64",
        "hero.win_setup_arm_sub": "لأجهزة معالجات ARM",
        "hero.win_port_title": "نسخة محمولة x64",
        "hero.win_port_sub": "ملف مضغوط ZIP",
        "hero.win_port_arm_title": "نسخة محمولة ARM64",
        "hero.win_port_arm_sub": "ملف ZIP لأجهزة ARM",
        "hero.download_linux_btn": "<i class=\"fa-brands fa-linux\" style=\"font-size: 1.1rem; margin-right: 5px;\"></i> تنزيل لنظام Linux <i class=\"bi bi-chevron-down dropdown-arrow\"></i>",
        "hero.lin_deb_title": "DEB x64",
        "hero.lin_deb_sub": "Debian/Ubuntu (موصى به)",
        "hero.lin_deb_arm_title": "DEB ARM64",
        "hero.lin_deb_arm_sub": "Debian/Ubuntu لأجهزة ARM",
        "hero.lin_app_title": "AppImage x64",
        "hero.lin_app_sub": "لينكس شامل",
        "hero.lin_app_arm_title": "AppImage ARM64",
        "hero.lin_app_arm_sub": "AppImage شامل لأجهزة ARM",
        "hero.os_warning": "<i class=\"bi bi-info-circle\" style=\"margin-right: 5px;\"></i> أنت تتصفح من <strong><span id=\"detectedOSName\">OS</span></strong>. قد لا تكون ملفات التثبيت متوافقة.",
        "hero.stats_downloads": "تنزيل",
        "hero.stats_rating": "<span style=\"font-size: 0.9rem; font-weight: 500; opacity: 0.9;\">/5 تقييم</span>",
        "discord.title": "انضم إلى مجتمعنا",
        "discord.subtitle": "احصل على الدعم والتحديثات",
        "hero.stats_opensource": "مفتوح المصدر",
        "hero.stats_telemetry": "بيانات التتبع",
        "hero.stats_perf_val": "عالٍ جدًا",
        "hero.stats_perf": "الأداء",
        "features.title": "لماذا HelloWorld؟",
        "features.subtitle": "صُمم مع التركيز الكامل على السرعة والخصوصية.",
        "features.f1_title": "الخصوصية أولاً",
        "features.f1_desc": "بلا تتبع أو جمع بيانات. نشاطك ملكك وحدك. الكود متاح ومفتوح بنسبة 100% على GitHub.",
        "features.f2_title": "بدء تشغيل فائق السرعة",
        "features.f2_desc": "مُحسّن للتشغيل في ثوانٍ معدودة. مثالي للأجهزة الضعيفة.",
        "features.f3_title": "إدارة المودات بسهولة",
        "features.f3_desc": "قم بتثبيت Forge وFabric والمودات مباشرة من المشغل بدون برامج خارجية.",
        "features.f4_title": "تثبيتات ذكية ومستقلة",
        "features.f4_desc": "كل تثبيت له مجلده وإعداداته الخاصة تمامًا.",
        "features.f5_title": "وضع عدم الاتصال",
        "features.f5_desc": "لا يوجد إنترنت؟ لا مشكلة. العب إصداراتك المحملة أينما كنت.",
        "features.f6_title": "مفتوح المصدر بالكامل",
        "features.f6_desc": "شفافية تامة دون برامج مخفية أو إعلانات مزعجة.",
        "gallery.title": "معرض الصور",
        "gallery.subtitle": "استمتع بواجهة حديثة وأنيقة وسهلة الاستخدام.",
        "faq.title": "الأسئلة الشائعة",
        "faq.subtitle": "كل ما تريد معرفته.",
        "faq.q1": "لماذا يظهر تنبيه من مضاد الفيروسات أحيانًا؟",
        "faq.a1": "لأن البرنامج لا يحمل شهادة تجارية مدفوعة الثمن. هذا إنذار خاطئ شائع في البرامج مفتوحة المصدر.",
        "faq.q2": "هل استخدامه قانوني؟",
        "faq.a2": "نعم. يلتزم المشغل ببنود وشروط Mojang وMicrosoft.",
        "faq.q3": "هل يدعم حزم المودات الكبيرة؟",
        "faq.a3": "نعم، يدعم الحزم الثقيلة بسلاسة إذا توفرت ذاكرة RAM كافية بجهازك.",
        "faq.q4": "هل يعمل بدون إنترنت؟",
        "faq.a4": "نعم، يتيح وضع عدم الاتصال تشغيل الإصدارات المحملة مسبقًا بدون شبكة.",
        "faq.q5": "هل يدعم Fabric وForge معًا؟",
        "faq.a5": "بالتأكيد. يمكنك إنشاء تثبيت مستقل ومنفصل لكل منهما.",
        "footer.desc": "مشغل ماينكرافت صُنع بواسطة المجتمع ولأجل المجتمع.",
        "footer.links": "روابط",
        "footer.repo": "مستودع GitHub",
        "footer.report": "الإبلاغ عن خطأ",
        "footer.prev": "الإصدارات السابقة",
        "footer.copy": "&copy; 2026 HelloWorld Launcher. لا ينتمي إلى Mojang أو Microsoft.",
        "footer.signpath": "يستخدم هذا المشروع <a href=\"https://signpath.org/\" target=\"_blank\" rel=\"noopener noreferrer\">SignPath Foundation</a> لتوقيع الكود البرمجي.",
        "bg.default": "اللافتة الافتراضية",
        "bg.purple": "تدرج بنفسجي",
        "bg.blue": "تدرج أزرق",
        "bg.green": "تدرج أخضر",
        "bg.orange": "تدرج برتقالي",
        "bg.pink": "تدرج وردي",
        "cropper.title": "قص الصورة الرمزية",
        "cropper.cancel": "إلغاء",
        "cropper.apply": "تطبيق القص",
        "global.loading": "جارٍ تحميل الخدمات...",
        "country.AR": "الأرجنتين",
        "country.AU": "أستراليا",
        "country.AT": "النمسا",
        "country.BE": "بلجيكا",
        "country.BR": "البرازيل",
        "country.CA": "كندا",
        "country.CL": "تشيلي",
        "country.CN": "الصين",
        "country.CO": "كولومبيا",
        "country.CZ": "التشيك",
        "country.DK": "الدنمارك",
        "country.EG": "مصر",
        "country.FI": "فنلندا",
        "country.FR": "فرنسا",
        "country.DE": "ألمانيا",
        "country.GR": "اليونان",
        "country.HK": "هونغ كونغ",
        "country.HU": "المجر",
        "country.IS": "آيسلندا",
        "country.IN": "الهند",
        "country.ID": "إندونيسيا",
        "country.IE": "أيرلندا",
        "country.IL": "إسرائيل",
        "country.IT": "إيطاليا",
        "country.JP": "اليابان",
        "country.LU": "لوكسمبورغ",
        "country.MY": "ماليزيا",
        "country.MX": "المكسيك",
        "country.NL": "هولندا",
        "country.NZ": "نيوزيلندا",
        "country.NG": "نيجيريا",
        "country.NO": "النرويج",
        "country.PE": "بيرو",
        "country.PH": "الفلبين",
        "country.PL": "بولندا",
        "country.PT": "البرتغال",
        "country.RO": "رومانيا",
        "country.RU": "روسيا",
        "country.SA": "السعودية",
        "country.SG": "سنغافورة",
        "country.ZA": "جنوب أفريقيا",
        "country.KR": "كوريا الجنوبية",
        "country.ES": "إسبانيا",
        "country.SE": "السويد",
        "country.CH": "سويسرا",
        "country.TH": "تايلاند",
        "country.TR": "تركيا",
        "country.UA": "أوكرانيا",
        "country.AE": "الإمارات",
        "country.GB": "المملكة المتحدة",
        "country.US": "الولايات المتحدة",
        "country.VE": "فنزويلا",
        "country.VN": "فيتنام",
        "country.OTHER": "أخرى",
        "bg.mc_overworld": "Minecraft العالم العلوي",
        "bg.mc_sky": "Minecraft السماء",
        "bg.mc_nether": "Minecraft النيذر",
        "bg.mc_end": "Minecraft الإند",
        "bg.mc_village": "Minecraft القرية",
        "bg.mc_forest": "Minecraft الغابة",
        "bg.mc_desert": "Minecraft الصحراء",
        "bg.mc_ocean": "Minecraft المحيط",
        "bg.mc_cherry_grove": "Minecraft بستان الكرز",
        "tag.pvp": "PvP",
        "tag.pvp_pro": "PvP محترف",
        "tag.builder": "بنّاء",
        "tag.architect": "معماري",
        "tag.survival": "بقاء",
        "tag.hardcore": "هاركور",
        "tag.redstone": "ريدستون",
        "tag.technical": "تقني",
        "tag.farms": "بنّاء مزارع",
        "tag.explorer": "مستكشف",
        "tag.speedrunner": "سبيد رانر",
        "tag.socialite": "اجتماعي",
        "tag.roleplayer": "تقمص أدوار",
        "tag.modded": "مودات",
        "tag.modpack": "لاعب مودباك",
        "tag.creative": "إبداعي",
        "tag.artist": "فنان بكسل",
        "tag.streamer": "ستريمر",
        "tag.casual": "عادي",
        "tag.minigames": "ألعاب مصغرة",
        "tag.skyblock": "سكاي بلوك",
        "kofi.btn_title": "ادعمني على Ko-fi",
        "sponsor.copy_title": "نسخ الرمز الترويجي",
        "sponsor.open_title": "زيارة Apex Hosting",
        "common.copy_clipboard": "نسخ إلى الحافظة",
        "settings.mc_head_title": "استخدام رأس ماينكرافت الافتراضي",
        "badge.premium": "حساب مميز",
        "badge.moderator": "مشرف",
        "badge.creator": "صانع محتوى"
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
        if (el.id === 'navDownloadBtn' || el.id === 'heroDownloadBtn' || el.id === 'heroDownloadLinuxBtn' || el.id === 'osWarningContainer') return;
        const key = el.getAttribute('data-i18n');
        const val = (translations[lang] && translations[lang][key]) || (translations['en'] && translations['en'][key]);
        if (val) {
            el.innerHTML = val;
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const val = (translations[lang] && translations[lang][key]) || (translations['en'] && translations['en'][key]);
        if (val) {
            el.placeholder = val;
        }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const val = (translations[lang] && translations[lang][key]) || (translations['en'] && translations['en'][key]);
        if (val) {
            el.title = val;
            if (el.hasAttribute('aria-label')) {
                el.setAttribute('aria-label', val);
            }
        }
    });

    if (typeof window.updateNavDownloadBtn === 'function') window.updateNavDownloadBtn();
    if (typeof window.updateHeroButtons === 'function') window.updateHeroButtons();
    if (typeof window.updateOSWarning === 'function') window.updateOSWarning();
    if (typeof window.reRenderPlaystyleTags === 'function') window.reRenderPlaystyleTags();
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
                const badgeTitle = t('badge.' + b, def.title);
                return `<span class="hw-badge ${def.cls}${lgCls}" title="${badgeTitle}">${BADGE_ROSETTE_SVG}<i class="fas ${def.icon}"></i></span>`;
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
        if (currentTags !== undefined) {
            selectedPlaystyleTags = Array.isArray(currentTags) ? [...currentTags] : [];
        }
        const grid = document.getElementById('playstyleTagsGrid');
        if (!grid) return;
        grid.innerHTML = PLAYSTYLE_TAGS.map(tag => {
            const sel = selectedPlaystyleTags.includes(tag.id);
            const label = t('tag.' + tag.id, tag.label);
            return `<button type="button" class="playstyle-tag-btn${sel ? ' selected' : ''}" data-tag-id="${tag.id}" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.2);background:${sel ? 'rgba(79,172,254,0.25)' : 'rgba(255,255,255,0.06)'};color:${sel ? '#60a5fa' : '#9ca3af'};transition:all 0.15s;">
                <i class="${tag.icon}" style="font-size:11px;"></i> ${label}
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

    window.reRenderPlaystyleTags = () => initPlaystyleTagsGrid();
    if (document.getElementById('playstyleTagsGrid')) {
        initPlaystyleTagsGrid();
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
            'minecraft1': `url("${bgPrefix}minecraft1.webp")`,
            'minecraft2': `url("${bgPrefix}minecraft2.webp")`,
            'minecraft3': `url("${bgPrefix}minecraft3.webp")`,
            'minecraft4': `url("${bgPrefix}minecraft4.webp")`,
            'minecraft5': `url("${bgPrefix}minecraft5.webp")`,
            'minecraft6': `url("${bgPrefix}minecraft6.webp")`,
            'minecraft7': `url("${bgPrefix}minecraft7.webp")`,
            'minecraft8': `url("${bgPrefix}minecraft8.webp")`,
            'minecraft9': `url("${bgPrefix}minecraft9.webp")`
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
        if (ua.includes("android")) return "Android";
        if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod") || (ua.includes("mac") && navigator.maxTouchPoints > 1)) return "iOS";
        if (ua.includes("win")) return "Windows";
        if ((ua.includes("linux") || ua.includes("x11") || ua.includes("ubuntu") || ua.includes("cros"))) return "Linux";
        if (ua.includes("mac")) return "MacOS";
        return "Unknown";
    }

    const userOS = detectOS();
    const isMobileOS = userOS === "Android" || userOS === "iOS";

    function updateOSWarning() {
        const container = document.getElementById('osWarningContainer');
        if (!container) return;

        const isDesktopSupported = userOS === "Windows" || userOS === "Linux";
        if (isDesktopSupported) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        if (heroButtonsContainer) heroButtonsContainer.style.flexWrap = 'wrap';

        const isEs = (typeof currentLang !== 'undefined' && currentLang === 'es') || (localStorage.getItem('lang') === 'es');

        if (isMobileOS) {
            const osLabel = userOS;
            if (isEs) {
                container.innerHTML = `<i class="bi bi-phone" style="margin-right: 6px;"></i> Estás navegando desde un dispositivo móvil (<strong><span id="detectedOSName">${osLabel}</span></strong>). HelloWorld Launcher está diseñado para ordenadores (Windows y Linux) y los instaladores no son compatibles con dispositivos móviles.`;
            } else {
                container.innerHTML = `<i class="bi bi-phone" style="margin-right: 6px;"></i> You are browsing from a mobile device (<strong><span id="detectedOSName">${osLabel}</span></strong>). HelloWorld Launcher is designed for PC (Windows & Linux) and these installers are not compatible with mobile devices.`;
            }
        } else if (userOS === "MacOS") {
            if (isEs) {
                container.innerHTML = `<i class="bi bi-apple" style="margin-right: 6px;"></i> Estás navegando desde <strong><span id="detectedOSName">macOS</span></strong>. HelloWorld Launcher actualmente solo está disponible para Windows y Linux de escritorio.`;
            } else {
                container.innerHTML = `<i class="bi bi-apple" style="margin-right: 6px;"></i> You are browsing from <strong><span id="detectedOSName">macOS</span></strong>. HelloWorld Launcher is currently available for Windows and Linux desktop.`;
            }
        } else {
            const unk = isEs ? 'un sistema operativo no compatible' : 'an unsupported operating system';
            if (isEs) {
                container.innerHTML = `<i class="bi bi-info-circle" style="margin-right: 6px;"></i> Estás navegando desde <strong><span id="detectedOSName">${unk}</span></strong>. Los siguientes instaladores están diseñados para Windows y Linux.`;
            } else {
                container.innerHTML = `<i class="bi bi-info-circle" style="margin-right: 6px;"></i> You are browsing from <strong><span id="detectedOSName">${unk}</span></strong>. The installers below are designed for Windows and Linux.`;
            }
        }
    }

    window.updateOSWarning = updateOSWarning;

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
        } else if (isMobileOS || userOS === "MacOS") {
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
    updateOSWarning();

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

    const REMOTE_CONFIG_GIST_URL = "https://gist.githubusercontent.com/abeloskyyy/b50089b634ed09f48c921f9c8126a49f/raw/hwlauncher-info.json";

    async function getLatestRelease() {
        try {
            let tagName = '';
            let targetMap = {};

            // 1. Try to fetch from remote config Gist first
            try {
                const gistRes = await fetch(REMOTE_CONFIG_GIST_URL, { cache: 'no-cache' });
                if (gistRes.ok) {
                    const gistData = await gistRes.json();
                    if (gistData && gistData.changelog) {
                        const cl = gistData.changelog;
                        const latestVer = cl.latestVersion;
                        const vEntry = (cl.versions && cl.versions.find(v => v.version === latestVer)) || (cl.versions && cl.versions[0]);
                        if (vEntry && vEntry.downloads) {
                            tagName = vEntry.tag || (latestVer ? `v${latestVer}` : '');
                            const d = vEntry.downloads;
                            if (d.windows) {
                                if (d.windows.setup) targetMap['win-setup-x64'] = d.windows.setup;
                                if (d.windows.zip) targetMap['win-portable-x64'] = d.windows.zip;
                            }
                            if (d.linux) {
                                if (d.linux.amd64 && d.linux.amd64.deb) targetMap['linux-deb-x64'] = d.linux.amd64.deb;
                                if (d.linux.arm64 && d.linux.arm64.deb) targetMap['linux-deb-arm64'] = d.linux.arm64.deb;
                                if (d.linux.amd64 && d.linux.amd64.appimage) targetMap['linux-appimage-x64'] = d.linux.amd64.appimage;
                                if (d.linux.arm64 && d.linux.arm64.appimage) targetMap['linux-appimage-arm64'] = d.linux.arm64.appimage;
                            }
                        }
                    }
                }
            } catch (gistErr) {
                console.warn('Gist fetch failed, falling back to GitHub API:', gistErr);
            }

            // 2. Fallback to GitHub API if Gist had no links
            if (Object.keys(targetMap).length === 0) {
                const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`);
                if (!response.ok) throw new Error('GitHub API response was not ok');
                const data = await response.json();
                tagName = data.tag_name;
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
                                return n.endsWith('.zip') && !isArm(n) && !n.includes('mac') && (n.includes('portable') || n.includes('win') || !assets.some(o => (o.name || '').toLowerCase().includes('portable')));
                            case 'win-portable-arm64':
                                return n.endsWith('.zip') && isArm(n) && !n.includes('mac');
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

                ['win-setup-x64', 'win-setup-arm64', 'win-portable-x64', 'win-portable-arm64', 'linux-deb-x64', 'linux-deb-arm64', 'linux-appimage-x64', 'linux-appimage-arm64'].forEach(target => {
                    const m = findAssetForTarget(target);
                    if (m && m.browser_download_url) targetMap[target] = m.browser_download_url;
                });
            }

            // Update dropdown links and dynamically hide items if the target is missing
            const dropdownItems = document.querySelectorAll('.dropdown-menu .dropdown-item[data-target]');
            dropdownItems.forEach(item => {
                const target = item.getAttribute('data-target');
                const url = targetMap[target];
                if (url) {
                    item.href = url;
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });

            // Find primary downloads for Windows & Linux
            const fallbackWinUrl = tagName ? `https://github.com/${repoOwner}/${repoName}/releases/tag/${tagName}` : `https://github.com/${repoOwner}/${repoName}/releases/latest`;
            const fallbackLinuxUrl = fallbackWinUrl;
            const winDownloadUrl = targetMap['win-setup-x64'] || targetMap['win-portable-x64'] || fallbackWinUrl;
            const linuxDownloadUrl = targetMap['linux-deb-x64'] || targetMap['linux-appimage-x64'] || fallbackLinuxUrl;

            latestTagName = tagName || '';
            window.currentReleaseTag = tagName || '';

            if (heroBtn && heroLinuxBtn) {
                const heroBtnContainer = heroBtn.closest('.dropdown-container') || heroBtn;
                const heroLinuxBtnContainer = heroLinuxBtn.closest('.dropdown-container') || heroLinuxBtn;

                if (userOS === "Windows") {
                    if (heroBtnContainer.parentNode === heroButtonsContainer && heroLinuxBtnContainer.parentNode === heroButtonsContainer) {
                        heroButtonsContainer.insertBefore(heroBtnContainer, heroLinuxBtnContainer);
                    }
                } else if (userOS === "Linux") {
                    if (heroBtnContainer.parentNode === heroButtonsContainer && heroLinuxBtnContainer.parentNode === heroButtonsContainer) {
                        heroButtonsContainer.insertBefore(heroLinuxBtnContainer, heroBtnContainer);
                    }
                } else {
                    updateOSWarning();
                }

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
            if (badge && tagName) badge.textContent = `${tagName} ${t('hero.badge_available', 'Now Available')}`;

        } catch (error) {
            console.error('Error fetching release:', error);
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
    if (track) {
        const slides = Array.from(track.children);
        const nextButton = document.getElementById('nextBtn');
        const prevButton = document.getElementById('prevBtn');
        const nav = document.getElementById('carouselNav');

        if (nav) {
            nav.innerHTML = '';
            // Create indicators
            slides.forEach((_, index) => {
                const indicator = document.createElement('button');
                indicator.classList.add('carousel-indicator');
                indicator.setAttribute('aria-label', `Slide ${index + 1}`);
                if (index === 0) indicator.classList.add('current-slide');
                nav.appendChild(indicator);
                indicator.addEventListener('click', () => {
                    moveToSlide(index);
                });
            });
        }

        const indicators = nav ? Array.from(nav.children) : [];
        let currentSlideIndex = 0;

        function moveToSlide(targetIndex) {
            if (!slides.length) return;
            // Loop around
            if (targetIndex < 0) targetIndex = slides.length - 1;
            if (targetIndex >= slides.length) targetIndex = 0;

            // Update visuals
            if (slides[currentSlideIndex]) slides[currentSlideIndex].classList.remove('current-slide');
            if (indicators[currentSlideIndex]) indicators[currentSlideIndex].classList.remove('current-slide');

            if (slides[targetIndex]) slides[targetIndex].classList.add('current-slide');
            if (indicators[targetIndex]) indicators[targetIndex].classList.add('current-slide');

            currentSlideIndex = targetIndex;
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                moveToSlide(currentSlideIndex + 1);
            });
        }

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                moveToSlide(currentSlideIndex - 1);
            });
        }

        // Auto-advance
        let autoPlay = setInterval(() => moveToSlide(currentSlideIndex + 1), 5000);

        // Pause on hover
        const carouselContainer = document.querySelector('.carousel-container');
        if (carouselContainer) {
            carouselContainer.addEventListener('mouseenter', () => clearInterval(autoPlay));
            carouselContainer.addEventListener('mouseleave', () => {
                clearInterval(autoPlay);
                autoPlay = setInterval(() => moveToSlide(currentSlideIndex + 1), 5000);
            });

            // Touch swipe support for mobile
            let touchStartX = 0;
            let touchStartY = 0;
            carouselContainer.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches[0]) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                }
            }, { passive: true });

            carouselContainer.addEventListener('touchend', (e) => {
                if (e.changedTouches && e.changedTouches[0]) {
                    const diffX = e.changedTouches[0].clientX - touchStartX;
                    const diffY = e.changedTouches[0].clientY - touchStartY;
                    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
                        clearInterval(autoPlay);
                        if (diffX < 0) {
                            moveToSlide(currentSlideIndex + 1);
                        } else {
                            moveToSlide(currentSlideIndex - 1);
                        }
                        autoPlay = setInterval(() => moveToSlide(currentSlideIndex + 1), 5000);
                    }
                }
            }, { passive: true });
        }
    }

    // === Scroll Effect for Navbar ===
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 40);
        });
    }

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

    // Star Rating Interaction (Flicker-free)
    const starRatingContainer = document.querySelector('.star-rating');
    let currentRating = 0;

    function highlightStars(rating) {
        stars.forEach(star => {
            const starRating = parseInt(star.getAttribute('data-rating'), 10);
            if (starRating <= rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    stars.forEach(star => {
        // Hover
        star.addEventListener('mouseenter', function () {
            const rating = parseInt(this.getAttribute('data-rating'), 10);
            highlightStars(rating);
        });

        // Click
        star.addEventListener('click', function () {
            currentRating = parseInt(this.getAttribute('data-rating'), 10);
            ratingInput.value = currentRating;
            highlightStars(currentRating);
        });
    });

    if (starRatingContainer) {
        starRatingContainer.addEventListener('mouseleave', function () {
            highlightStars(currentRating);
        });
    }

    // Comment character counter
    const reviewComment = document.getElementById('reviewComment');
    const reviewCharCount = document.getElementById('reviewCharCount');
    if (reviewComment && reviewCharCount) {
        reviewComment.addEventListener('input', () => {
            reviewCharCount.textContent = reviewComment.value.length;
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
                currentRating = 0;
                highlightStars(0);
                if (reviewCharCount) reviewCharCount.textContent = '0';
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
        ratingInput.value = '';
        highlightStars(0);
        if (reviewCharCount) reviewCharCount.textContent = '0';
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

    const SPONSOR_GIST_URL = 'https://gist.githubusercontent.com/abeloskyyy/b50089b634ed09f48c921f9c8126a49f/raw/hwlauncher-info.json';
    const PROMO_CACHE_KEY = 'hw_sponsor_promo_data';

    const DEFAULT_PROMO = {
        active: false,
        code: "HWLAUNCHER",
        discount: "25",
        url: "https://billing.apexminecrafthosting.com/aff.php?aff=17119"
    };

    const renderPromo = (raw) => {
        const data = (raw && raw.sponsor) ? raw.sponsor : raw;
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
