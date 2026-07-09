const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');
const versionUtils = require('../utils/version');

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
                const info = versionUtils.parseVersionString(filters.game_version);
                const mcVer = info ? info.mcVersion : filters.game_version;
                facets.push([`versions:${mcVer}`]);
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
            if (gameVersion) {
                const info = versionUtils.parseVersionString(gameVersion);
                const mcVer = info ? info.mcVersion : gameVersion;
                params.game_versions = JSON.stringify([mcVer]);
            }
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

    // --- Shader Validation ---
    async validateShaderSupport(modsDir, profileAddons = []) {
        let hasLoader = false;

        if (Array.isArray(profileAddons) && profileAddons.length > 0) {
            hasLoader = profileAddons.some(a => {
                if (!a) return false;
                if (a.state === 'disabled' || (a.filename && String(a.filename).endsWith('.disabled'))) return false;
                const nameStr = `${a.filename || ''} ${a.display_name || ''} ${a.title || ''} ${a.project_id || ''}`.toLowerCase();
                return nameStr.includes('iris') || nameStr.includes('optifine') || nameStr.includes('oculus') || nameStr.includes('sodium') || nameStr.includes('embeddium');
            });
        }

        if (!hasLoader && fs.existsSync(modsDir)) {
            const files = await fs.readdir(modsDir);
            hasLoader = files.some(f => {
                const lower = f.toLowerCase();
                return (lower.includes('iris') || lower.includes('optifine') || lower.includes('oculus') || lower.includes('sodium') || lower.includes('embeddium')) && !lower.endsWith('.disabled');
            });
        }

        return hasLoader
            ? { supported: true }
            : { supported: false, reason: "Requires Iris, Optifine, or Sodium/Oculus installed in mods" };
    }

    async installModpack(url, filename, profileDir, onProgress) {
        const tempDir = path.join(profileDir, '.modpacks_temp');
        const tempFilePath = path.join(tempDir, filename);
        try {
            await fs.ensureDir(tempDir);
            console.log(`[installModpack] Downloading .mrpack archive from ${url}...`);

            // Download .mrpack file (first 10% of progress)
            await this.installProject(url, filename, tempDir, (perc) => {
                if (onProgress) onProgress(Math.round(perc * 0.1));
            });

            console.log(`[installModpack] Extracting ${filename}...`);
            const zip = new AdmZip(tempFilePath);
            const indexEntry = zip.getEntry('modrinth.index.json');
            if (!indexEntry) {
                throw new Error("Invalid Modrinth modpack: modrinth.index.json not found inside archive.");
            }

            const indexJson = JSON.parse(indexEntry.getData().toString('utf8'));
            const filesList = (indexJson.files || []).filter(f => {
                if (!f.downloads || f.downloads.length === 0) return false;
                if (f.env && f.env.client === 'unsupported') return false;
                return true;
            });

            // Extract overrides
            console.log(`[installModpack] Extracting overrides...`);
            const entries = zip.getEntries();
            for (const entry of entries) {
                let relPath = null;
                if (entry.entryName.startsWith('overrides/')) {
                    relPath = entry.entryName.substring('overrides/'.length);
                } else if (entry.entryName.startsWith('client-overrides/')) {
                    relPath = entry.entryName.substring('client-overrides/'.length);
                }
                if (relPath && relPath !== '') {
                    const destPath = path.join(profileDir, relPath);
                    if (entry.isDirectory || relPath.endsWith('/')) {
                        await fs.ensureDir(destPath);
                    } else {
                        await fs.ensureDir(path.dirname(destPath));
                        await fs.writeFile(destPath, entry.getData());
                    }
                }
            }

            // Download all required mods/files in batches (remaining 90% of progress)
            console.log(`[installModpack] Downloading ${filesList.length} files...`);
            let completedCount = 0;
            const updateProgress = () => {
                completedCount++;
                if (onProgress) {
                    const perc = 10 + Math.round((completedCount / (filesList.length || 1)) * 90);
                    onProgress(Math.min(100, perc));
                }
            };

            const downloadSingleFile = async (fInfo) => {
                const destPath = path.join(profileDir, fInfo.path);
                await fs.ensureDir(path.dirname(destPath));

                // Check if file already exists with matching size
                if (fs.existsSync(destPath)) {
                    try {
                        const stat = await fs.stat(destPath);
                        if (fInfo.fileSize && stat.size === fInfo.fileSize) {
                            updateProgress();
                            return;
                        }
                    } catch (e) {}
                }

                const fileUrl = fInfo.downloads[0];
                const response = await axios({ url: fileUrl, method: 'GET', responseType: 'stream' });
                const writer = fs.createWriteStream(destPath);
                response.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
                updateProgress();
            };

            // Concurrent execution in batches of 6
            const batchSize = 6;
            for (let i = 0; i < filesList.length; i += batchSize) {
                const batch = filesList.slice(i, i + batchSize);
                await Promise.all(batch.map(f => downloadSingleFile(f).catch(err => {
                    console.error(`[installModpack] Error downloading file ${f.path}:`, err.message);
                    updateProgress();
                })));
            }

            // Propagate datapacks to saves if any exist
            const globalDatapacksDir = path.join(profileDir, 'datapacks');
            const savesDir = path.join(profileDir, 'saves');
            if (fs.existsSync(globalDatapacksDir) && fs.existsSync(savesDir)) {
                try {
                    const worlds = await fs.readdir(savesDir);
                    for (const w of worlds) {
                        const worldDpDir = path.join(savesDir, w, 'datapacks');
                        if (fs.existsSync(path.join(savesDir, w, 'level.dat'))) {
                            await fs.copy(globalDatapacksDir, worldDpDir, { overwrite: false });
                        }
                    }
                } catch (e) {
                    console.error("[installModpack] Error propagating datapacks:", e.message);
                }
            }

            // Cleanup temp
            await fs.remove(tempDir).catch(() => {});

            const installedAddons = [];
            for (const f of filesList) {
                const fname = path.basename(f.path);
                let type = 'mod';
                if (f.path.startsWith('resourcepacks/')) type = 'resourcepack';
                else if (f.path.startsWith('shaderpacks/')) type = 'shader';
                else if (f.path.startsWith('datapacks/')) type = 'datapack';

                let project_id = null;
                let version_id = null;
                if (f.downloads && f.downloads[0]) {
                    const match = f.downloads[0].match(/cdn\.modrinth\.com\/data\/([^\/]+)\/versions\/([^\/]+)/i);
                    if (match) {
                        project_id = match[1];
                        version_id = match[2];
                    }
                }
                installedAddons.push({
                    filename: fname,
                    type,
                    project_id,
                    version_id
                });
            }

            return {
                success: true,
                modpackName: indexJson.name || filename,
                dependencies: indexJson.dependencies || {},
                installedAddons
            };

        } catch (e) {
            await fs.remove(tempDir).catch(() => {});
            console.error("[installModpack] Error:", e);
            return { success: false, error: e.message };
        }
    }
}

module.exports = new ModManager();
