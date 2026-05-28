const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');
const uuid = require('uuid');

const paths = require('../utils/paths');

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
            if (fs.existsSync(profilesFile)) {
                return fs.readJsonSync(profilesFile);
            }
        } catch (e) {
            console.error("Error loading profiles:", e);
        }
        return { profiles: {} };
    }

    saveProfiles(data) {
        const profilesFile = paths.getProfilesFilePath();
        fs.ensureDirSync(path.dirname(profilesFile));
        fs.writeJsonSync(profilesFile, data, { spaces: 4 });
    }

    addProfile(name, version, icon, directory, jvmArgs, javaPath, isInternal = false) {
        if (!isInternal && this.isReservedName(name)) {
            return { success: false, error: "Cannot create a profile with a reserved name." };
        }
        const profiles = this.loadProfiles();
        const id = uuid.v4();

        let iconFilename = "default.png";

        if (icon && typeof icon === 'object' && icon.base64) {
            iconFilename = this.saveIcon(id, icon.base64);
        } else if (typeof icon === 'string' && icon) {
            iconFilename = icon;
        }

        if (!profiles.profiles) profiles.profiles = {}; // Safety check

        profiles.profiles[id] = {
            name,
            version,
            icon: iconFilename,
            directory: directory || "",
            jvm_args: jvmArgs || "",
            java_path: javaPath || "",
        };

        this.saveProfiles(profiles);
        return { success: true, profile_id: id };
    }

    editProfile(id, data) {
        const profiles = this.loadProfiles();
        if (!profiles.profiles || !profiles.profiles[id]) return { success: false, error: "Profile not found" };

        const pName = profiles.profiles[id].name;
        if (this.isReservedName(pName)) {
            return { success: false, error: "This profile is managed automatically and cannot be edited." };
        }

        if (data.name && this.isReservedName(data.name)) {
            return { success: false, error: "Cannot rename a profile to a reserved name." };
        }

        if (data.icon && typeof data.icon === 'object' && data.icon.base64) {
            data.icon = this.saveIcon(id, data.icon.base64);
        }

        profiles.profiles[id] = { ...profiles.profiles[id], ...data };
        this.saveProfiles(profiles);
        return { success: true };
    }

    // Bypass protections for internal launcher updates
    forceEditProfile(id, data) {
        const profiles = this.loadProfiles();
        if (!profiles.profiles || !profiles.profiles[id]) return { success: false, error: "Profile not found" };

        if (data.icon && typeof data.icon === 'object' && data.icon.base64) {
            data.icon = this.saveIcon(id, data.icon.base64);
        }

        profiles.profiles[id] = { ...profiles.profiles[id], ...data };
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
            const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) return "default.png";

            const buffer = Buffer.from(matches[2], 'base64');
            const filename = `${id}.png`;

            const imgDir = paths.getProfilesImgDir();
            fs.ensureDirSync(imgDir);
            const filepath = path.join(imgDir, filename);

            fs.writeFileSync(filepath, buffer);
            return filename;
        } catch (e) {
            console.error("Error saving icon:", e);
            return "default.png";
        }
    }

    getProfileIconAsBase64(filename) {
        try {
            const imgDir = paths.getProfilesImgDir();
            const filepath = path.join(imgDir, filename);
            if (fs.existsSync(filepath)) {
                return `data:image/png;base64,${fs.readFileSync(filepath, 'base64')}`;
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
        if (version.includes('forge') || version.includes('fabric')) return true;
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
