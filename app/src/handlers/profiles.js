const fs = require('fs-extra');
const path = require('path');
const { app, nativeImage } = require('electron');
const uuid = require('uuid');
const axios = require('axios');

const paths = require('../utils/paths');
const versionUtils = require('../utils/version');

class ProfileManager {
    constructor() {
        // Paths are now managed by src/utils/paths.js
    }

    isReservedName(name) {
        if (!name) return false;
        const lowerName = name.trim().toLowerCase();
        return lowerName === 'latest release' || lowerName === 'latest snapshot';
    }

    // --- Core CRUD ---
    loadProfiles() {
        try {
            const profilesFile = paths.getProfilesFilePath();
            let data = { profiles: {} };
            if (fs.existsSync(profilesFile)) {
                data = fs.readJsonSync(profilesFile);
            }

            // Remove any legacy/saved "Latest release" or "Latest snapshot" from profiles.json
            let modified = false;
            if (data && data.profiles) {
                for (const [id, prof] of Object.entries(data.profiles)) {
                    if (prof && this.isReservedName(prof.name)) {
                        delete data.profiles[id];
                        modified = true;
                    }
                }
            }

            if (modified) {
                this.saveProfiles(data);
            }

            // Dedicated fixed directories without UUID
            let docsPath = '';
            try {
                docsPath = app ? app.getPath('documents') : path.join(require('os').homedir(), 'Documents');
            } catch (_) {
                docsPath = path.join(require('os').homedir(), 'Documents');
            }
            const mcDirRelease = path.join(docsPath, 'MinecraftDirectories', 'latest-release');
            const mcDirSnapshot = path.join(docsPath, 'MinecraftDirectories', 'latest-snapshot');

            try { fs.ensureDirSync(mcDirRelease); } catch (_) {}
            try { fs.ensureDirSync(mcDirSnapshot); } catch (_) {}

            const latestReleaseVer = global.latestReleaseVersion || '26.2';
            const latestSnapshotVer = global.latestSnapshotVersion || '26.3-pre-2';

            const builtInProfiles = {
                'latest-release': {
                    name: 'Latest release',
                    version: latestReleaseVer,
                    icon: 'grass.png',
                    directory: mcDirRelease,
                    jvm_args: '',
                    java_path: '',
                    isBuiltIn: true,
                    readOnly: true
                },
                'latest-snapshot': {
                    name: 'Latest snapshot',
                    version: latestSnapshotVer,
                    icon: 'furnace.png',
                    directory: mcDirSnapshot,
                    jvm_args: '',
                    java_path: '',
                    isBuiltIn: true,
                    readOnly: true
                }
            };

            return {
                profiles: {
                    ...builtInProfiles,
                    ...(data.profiles || {})
                }
            };
        } catch (e) {
            console.error("Error loading profiles:", e);
        }
        return { profiles: {} };
    }

    saveProfiles(data) {
        const profilesFile = paths.getProfilesFilePath();
        fs.ensureDirSync(path.dirname(profilesFile));
        
        // Clean out reserved profiles before saving to disk
        const cleanData = JSON.parse(JSON.stringify(data || { profiles: {} }));
        if (cleanData && cleanData.profiles) {
            for (const [id, prof] of Object.entries(cleanData.profiles)) {
                if (prof && (id === 'latest-release' || id === 'latest-snapshot' || this.isReservedName(prof.name))) {
                    delete cleanData.profiles[id];
                }
            }
        }
        fs.writeJsonSync(profilesFile, cleanData, { spaces: 4 });
    }

    async addProfile(name, version, icon, directory, jvmArgs, javaPath, isInternal = false) {
        if (!isInternal && this.isReservedName(name)) {
            return { success: false, error: "Cannot create a profile with a reserved name." };
        }
        const profiles = this.loadProfiles();
        const id = uuid.v4();

        let iconFilename = "default.png";

        if (icon && typeof icon === 'object' && icon.base64) {
            iconFilename = this.saveIcon(id, icon.base64);
        } else if (icon && typeof icon === 'object' && icon.url) {
            iconFilename = await this.saveIconFromUrl(id, icon.url);
        } else if (typeof icon === 'string' && icon.startsWith('data:')) {
            iconFilename = this.saveIcon(id, icon);
        } else if (typeof icon === 'string' && (icon.startsWith('http://') || icon.startsWith('https://'))) {
            iconFilename = await this.saveIconFromUrl(id, icon);
        } else if (typeof icon === 'string' && icon) {
            iconFilename = icon;
        }

        if (!profiles.profiles) profiles.profiles = {}; // Safety check

        let normVersion = version;
        const info = versionUtils.parseVersionString(version);
        if (info) normVersion = info.normalizedId;

        profiles.profiles[id] = {
            name,
            version: normVersion,
            icon: iconFilename,
            directory: directory || "",
            jvm_args: jvmArgs || "",
            java_path: javaPath || "",
        };

        this.saveProfiles(profiles);
        return { success: true, profile_id: id };
    }

    async editProfile(id, data) {
        const profiles = this.loadProfiles();
        if (!profiles.profiles || !profiles.profiles[id]) return { success: false, error: "Profile not found" };

        const pName = profiles.profiles[id].name;
        if (this.isReservedName(pName)) {
            return { success: false, error: "This profile is managed automatically and cannot be edited." };
        }

        if (data && data.name && this.isReservedName(data.name)) {
            return { success: false, error: "Cannot rename a profile to a reserved name." };
        }

        const updateData = {};
        for (const [key, val] of Object.entries(data || {})) {
            if (val !== undefined && val !== null) {
                updateData[key] = val;
            }
        }

        if (updateData.icon && typeof updateData.icon === 'object' && updateData.icon.base64) {
            updateData.icon = this.saveIcon(id, updateData.icon.base64);
        } else if (updateData.icon && typeof updateData.icon === 'object' && updateData.icon.url) {
            updateData.icon = await this.saveIconFromUrl(id, updateData.icon.url);
        } else if (typeof updateData.icon === 'string' && updateData.icon.startsWith('data:')) {
            updateData.icon = this.saveIcon(id, updateData.icon);
        } else if (typeof updateData.icon === 'string' && (updateData.icon.startsWith('http://') || updateData.icon.startsWith('https://'))) {
            updateData.icon = await this.saveIconFromUrl(id, updateData.icon);
        }
        if (updateData.version) {
            const info = versionUtils.parseVersionString(updateData.version);
            if (info) updateData.version = info.normalizedId;
        }

        profiles.profiles[id] = { ...profiles.profiles[id], ...updateData };
        this.saveProfiles(profiles);
        return { success: true };
    }

    // Bypass protections for internal launcher updates
    async forceEditProfile(id, data) {
        const profiles = this.loadProfiles();
        if (!profiles.profiles || !profiles.profiles[id]) return { success: false, error: "Profile not found" };

        const updateData = {};
        for (const [key, val] of Object.entries(data || {})) {
            if (val !== undefined && val !== null) {
                updateData[key] = val;
            }
        }

        if (updateData.icon && typeof updateData.icon === 'object' && updateData.icon.base64) {
            updateData.icon = this.saveIcon(id, updateData.icon.base64);
        } else if (updateData.icon && typeof updateData.icon === 'object' && updateData.icon.url) {
            updateData.icon = await this.saveIconFromUrl(id, updateData.icon.url);
        } else if (typeof updateData.icon === 'string' && updateData.icon.startsWith('data:')) {
            updateData.icon = this.saveIcon(id, updateData.icon);
        } else if (typeof updateData.icon === 'string' && (updateData.icon.startsWith('http://') || updateData.icon.startsWith('https://'))) {
            updateData.icon = await this.saveIconFromUrl(id, updateData.icon);
        }
        if (updateData.version) {
            const info = versionUtils.parseVersionString(updateData.version);
            if (info) updateData.version = info.normalizedId;
        }

        profiles.profiles[id] = { ...profiles.profiles[id], ...updateData };
        this.saveProfiles(profiles);
        return { success: true };
    }

    deleteProfile(id) {
        const profiles = this.loadProfiles();
        if (profiles.profiles && profiles.profiles[id]) {
            const pName = profiles.profiles[id].name;
            if (this.isReservedName(pName)) {
                return { success: false, error: "This profile is managed automatically and cannot be deleted." };
            }

            delete profiles.profiles[id];
            this.saveProfiles(profiles);

            const imgDir = paths.getProfilesImgDir();
            const imgPath = path.join(imgDir, `${id}.png`);
            if (fs.existsSync(imgPath)) fs.removeSync(imgPath);

            return { success: true };
        }
        return { success: false };
    }

    // --- Icons ---
    saveIcon(id, base64Data) {
        try {
            if (!base64Data || typeof base64Data !== 'string') return "default.png";
            let buffer;
            const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                buffer = Buffer.from(matches[2], 'base64');
            } else {
                buffer = Buffer.from(base64Data, 'base64');
            }
            if (!buffer || buffer.length === 0) return "default.png";

            const filename = `${id}.png`;
            const imgDir = paths.getProfilesImgDir();
            fs.ensureDirSync(imgDir);
            const filepath = path.join(imgDir, filename);

            fs.writeFileSync(filepath, buffer);
            console.log(`[ProfileManager] Saved base64 icon to ${filename}`);
            return filename;
        } catch (e) {
            console.error("Error saving icon:", e);
            return "default.png";
        }
    }

    async saveIconFromUrl(id, url) {
        try {
            if (!url || typeof url !== 'string') return "default.png";
            if (url.startsWith('data:')) {
                return this.saveIcon(id, url);
            }

            console.log(`[ProfileManager] Downloading icon from ${url} for profile ${id}...`);
            const res = await axios.get(url, { 
                responseType: 'arraybuffer',
                timeout: 15000,
                headers: {
                    'User-Agent': 'HelloWorld-Launcher/2.1.0 (Minecraft Launcher)'
                }
            });
            const buffer = Buffer.from(res.data);
            if (!buffer || buffer.length === 0) return "default.png";

            const filename = `${id}.png`;
            const imgDir = paths.getProfilesImgDir();
            fs.ensureDirSync(imgDir);
            const filepath = path.join(imgDir, filename);

            if (nativeImage && typeof nativeImage.createFromBuffer === 'function') {
                try {
                    let img = nativeImage.createFromBuffer(buffer);
                    if (!img.isEmpty()) {
                        let size = img.getSize();
                        if (size.width > 0 && size.height > 0) {
                            const minSide = Math.min(size.width, size.height);
                            if (size.width !== size.height) {
                                const x = Math.floor((size.width - minSide) / 2);
                                const y = Math.floor((size.height - minSide) / 2);
                                img = img.crop({ x, y, width: minSide, height: minSide });
                            }
                            if (minSide > 512) {
                                img = img.resize({ width: 256, height: 256, quality: 'good' });
                            }
                            const pngBuffer = img.toPNG();
                            if (pngBuffer && pngBuffer.length > 0) {
                                fs.writeFileSync(filepath, pngBuffer);
                                console.log(`[ProfileManager] Successfully downloaded and saved icon to ${filename}`);
                                return filename;
                            }
                        }
                    }
                } catch (imgErr) {
                    console.warn(`[ProfileManager] nativeImage processing skipped:`, imgErr.message);
                }
            }

            // Fallback for WebP / SVG or formats that nativeImage.createFromBuffer cannot parse (e.g. Modrinth icons)
            fs.writeFileSync(filepath, buffer);
            console.log(`[ProfileManager] Successfully saved raw icon buffer to ${filename} (size: ${buffer.length} bytes)`);
            return filename;
        } catch (e) {
            console.error(`[ProfileManager] Error saving icon from URL ${url}:`, e.message);
            return "default.png";
        }
    }

    getProfileIconAsBase64(filename) {
        try {
            if (!filename) filename = 'default.png';
            if (typeof filename === 'string') {
                if (filename.startsWith('data:')) return filename;
                if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
            }

            const imgDir = paths.getProfilesImgDir();
            let filepath = path.join(imgDir, filename);
            if (!fs.existsSync(filepath)) {
                const uiProfilePath = path.join(__dirname, '../../ui/img/profiles', filename);
                if (fs.existsSync(uiProfilePath)) {
                    filepath = uiProfilePath;
                } else {
                    const uiImgPath = path.join(__dirname, '../../ui/img', filename);
                    if (fs.existsSync(uiImgPath)) {
                        filepath = uiImgPath;
                    } else if (filename !== 'default.png') {
                        const defaultPath = path.join(imgDir, 'default.png');
                        if (fs.existsSync(defaultPath)) {
                            filepath = defaultPath;
                        } else {
                            filepath = path.join(__dirname, '../../ui/img/profiles/default.png');
                        }
                    }
                }
            }

            if (fs.existsSync(filepath)) {
                const buffer = fs.readFileSync(filepath);
                let mime = 'image/png';
                if (buffer.length >= 12 && buffer.toString('utf8', 0, 4) === 'RIFF' && buffer.toString('utf8', 8, 12) === 'WEBP') {
                    mime = 'image/webp';
                } else if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
                    mime = 'image/jpeg';
                } else if (buffer.length >= 4 && buffer.toString('utf8', 0, 4) === '<svg') {
                    mime = 'image/svg+xml';
                }
                return `data:${mime};base64,${buffer.toString('base64')}`;
            }
        } catch (e) { }
        return "";
    }

    // --- Worlds (For Datapacks) ---
    getWorlds(profileId, mcDirDefault) {
        const profiles = this.loadProfiles().profiles;
        const profile = profiles[profileId];
        if (!profile) return { success: false, error: "Profile Not Found" };

        const profileDir = profile.directory || mcDirDefault;
        const savesDir = path.join(profileDir, 'saves');

        if (!fs.existsSync(savesDir)) return { success: true, worlds: [] };

        try {
            const worlds = [];
            const items = fs.readdirSync(savesDir);
            for (const item of items) {
                const wPath = path.join(savesDir, item);
                if (fs.lstatSync(wPath).isDirectory() && fs.existsSync(path.join(wPath, 'level.dat'))) {
                    worlds.push({ name: item, path: wPath }); // Use folder name as name for now
                }
            }
            return { success: true, worlds };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // --- Helper for Mod Check ---
    isProfileModdable(profile) {
        const version = (profile.version || "").toLowerCase();
        if (version.includes('forge') || version.includes('fabric') || version.includes('neoforge') || version.includes('optifine')) return true;
        // Check local folder?
        return false;
    }

    // --- Read Seed from World ---
    async readWorldSeed(profileId, worldName, mcDirDefault) {
        const profiles = this.loadProfiles().profiles;
        const profile = profiles[profileId];
        if (!profile) return { success: false, error: "Profile Not Found" };

        const profileDir = profile.directory || mcDirDefault;
        const levelDatPath = path.join(profileDir, 'saves', worldName, 'level.dat');
        const worldGenSettingsPath = path.join(profileDir, 'saves', worldName, 'world_gen_settings.dat');

        if (!fs.existsSync(levelDatPath)) {
            return { success: false, error: "World not found" };
        }

        try {
            const nbt = require('prismarine-nbt');
            
            // Try world_gen_settings.dat first (newer Minecraft versions)
            if (fs.existsSync(worldGenSettingsPath)) {
                const data = fs.readFileSync(worldGenSettingsPath);
                const { parsed } = await nbt.parse(data);
                const simplified = nbt.simplify(parsed);
                
                if (simplified.seed !== undefined) {
                    const seedString = typeof simplified.seed === 'bigint' ? simplified.seed.toString() : String(simplified.seed);
                    return { success: true, seed: seedString };
                }
            }
            
            // Fallback to level.dat
            const data = fs.readFileSync(levelDatPath);
            
            // Parse NBT data (prismarine-nbt auto-decompresses gzipped data)
            const { parsed } = await nbt.parse(data);
            
            // Simplify the NBT structure for easier access
            const simplified = nbt.simplify(parsed);
            
            // Try to find seed in various locations
            let seed = null;
            
            // Check Data.seed
            if (simplified.Data && simplified.Data.seed !== undefined) {
                seed = simplified.Data.seed;
            }
            
            // Check WorldGenSettings.seed
            if (seed === null && simplified.Data && simplified.Data.WorldGenSettings && simplified.Data.WorldGenSettings.seed !== undefined) {
                seed = simplified.Data.WorldGenSettings.seed;
            }
            
            if (seed === null) {
                return { success: false, error: "Seed not found in world data (try using /seed command in-game)" };
            }
            
            // Convert to string to avoid precision loss with large numbers
            const seedString = typeof seed === 'bigint' ? seed.toString() : String(seed);
            
            return { success: true, seed: seedString };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

module.exports = new ProfileManager();
