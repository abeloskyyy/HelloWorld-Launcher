const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

class ModManager {

    // --- Modrinth API ---
    async searchModrinth(query, options = {}) {
        try {
            const { projectType = 'mod', filters = {}, limit = 20, offset = 0, index } = options;

            // Construct facets
            const facets = [[`project_type:${projectType}`]];

            if (filters.categories) {
                filters.categories.forEach(c => facets.push([`categories:${c}`]));
            }
            if (filters.excludeCategories) {
                filters.excludeCategories.forEach(c => facets.push([`categories!=${c}`]));
            }
            if (filters.game_version && typeof filters.game_version === 'string') {
                facets.push([`versions:${filters.game_version}`]);
            }

            // Allow frontend to specify sort index, fallback to default behavior
            let sortIndex = index;
            if (!sortIndex) {
                sortIndex = query ? 'relevance' : 'downloads';
            }

            const params = {
                query,
                limit,
                offset,
                index: sortIndex,
                facets: JSON.stringify(facets)
            };

            const res = await axios.get('https://api.modrinth.com/v2/search', { params });
            return { success: true, results: res.data.hits };

        } catch (e) {
            console.error("Modrinth Search Error:", e);
            return { success: false, error: e.message };
        }
    }

    async getModCategories() {
        try {
            const res = await axios.get('https://api.modrinth.com/v2/tag/category');
            return { success: true, categories: res.data };
        } catch (e) {
            console.error("Modrinth Categories Error:", e);
            return { success: false, error: e.message };
        }
    }

    async getModVersions(projectId, gameVersion, loader) {
        try {
            const params = {};
            if (gameVersion) params.game_versions = JSON.stringify([gameVersion]);
            if (loader) params.loaders = JSON.stringify([loader]);

            const res = await axios.get(`https://api.modrinth.com/v2/project/${projectId}/version`, { params });
            return { success: true, versions: res.data };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getVersionFromId(versionId) {
        try {
            const res = await axios.get(`https://api.modrinth.com/v2/version/${versionId}`);
            const files = res.data.files;
            const primary = files.find(f => f.primary) || files[0];
            return { success: true, url: primary.url, filename: primary.filename };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getModDetails(projectId) {
        try {
            const res = await axios.get(`https://api.modrinth.com/v2/project/${projectId}`);
            return { success: true, details: res.data };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // --- Local Management ---

    async installProject(url, filename, directory, onProgress) {
        try {
            await fs.ensureDir(directory);
            const filePath = path.join(directory, filename);
            const writer = fs.createWriteStream(filePath);

            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream'
            });

            const totalLength = parseInt(response.headers['content-length'], 10);
            let downloaded = 0;

            console.log(`[installProject] Stream started. Total size: ${totalLength}`);

            response.data.on('data', (chunk) => {
                downloaded += chunk.length;

                // Logging
                if (downloaded % (1024 * 1024) < chunk.length) {
                    console.log(`[installProject] Downloaded: ${(downloaded / 1024 / 1024).toFixed(2)} MB`);
                }

                // Progress Callback
                if (onProgress && totalLength) {
                    const percentage = Math.round((downloaded / totalLength) * 100);
                    onProgress(percentage);
                }
            });

            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log(`[installProject] Download finished: ${filename}`);
                    resolve({ success: true });
                });
                writer.on('error', (err) => {
                    console.error('[installProject] Writer error:', err);
                    reject(err);
                });
            });

        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getInstalledAddons(directory, type = 'mod') {
        // Logic to list jars/zips in directory
        try {
            if (!fs.existsSync(directory)) return { success: true, mods: [] };

            const files = await fs.readdir(directory);
            const addons = [];

            for (const file of files) {
                const isEnabled = !file.endsWith('.disabled');
                const displayName = file.replace('.disabled', '');

                // Basic filtering
                if (type === 'mod' && !displayName.endsWith('.jar')) continue;
                if (type !== 'mod' && !displayName.endsWith('.zip') && !fs.lstatSync(path.join(directory, file)).isDirectory()) continue;

                const fullPath = path.join(directory, file);
                const stats = fs.statSync(fullPath);
                const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

                addons.push({
                    filename: file,
                    display_name: displayName,
                    enabled: isEnabled,
                    type: stats.isDirectory() ? 'folder' : 'file',
                    size_mb: sizeMb
                });
            }
            return { success: true, mods: addons };

        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async toggleAddon(filename, directory) {
        try {
            const oldPath = path.join(directory, filename);
            let newName = filename;

            if (filename.endsWith('.disabled')) {
                newName = filename.replace('.disabled', '');
            } else {
                newName = filename + '.disabled';
            }

            await fs.rename(oldPath, path.join(directory, newName));
            return { success: true, new_name: newName };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async deleteAddon(filename, directory) {
        try {
            await fs.remove(path.join(directory, filename));
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // --- Shader Validation (Basic) ---
    async validateShaderSupport(modsDir) {
        if (!fs.existsSync(modsDir)) return { supported: false, reason: "No mods folder" };
        const files = await fs.readdir(modsDir);
        const hasLoader = files.some(f => {
            const lower = f.toLowerCase();
            return (lower.includes('iris') || lower.includes('optifine') || lower.includes('oculus')) && !lower.endsWith('.disabled');
        });

        return hasLoader
            ? { supported: true }
            : { supported: false, reason: "Requires Iris or Optifine installed in mods" };
    }
}

module.exports = new ModManager();
