const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

/**
 * Automates downloading and managing Mojang Java runtimes.
 */
class JavaRuntimeManager {
    constructor(mcDir) {
        this.mcDir = mcDir;
        this.runtimesDir = path.join(mcDir, 'java-runtimes');
        this.manifestUrl = 'https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json';

        fs.ensureDirSync(this.runtimesDir);
    }

    /**
     * Resolves the Java executable path for a given Minecraft version.
     * Downloads the required runtime if it's missing.
     * 
     * @param {string} mcVersion The Minecraft version ID (e.g. "1.21.11", "26.1-snapshot-9")
     * @param {function} onProgress Optional callback for download progress data.
     * @returns {Promise<string>} Absolute path to the java/javaw executable.
     */
    async getJavaPath(mcVersion, onProgress) {
        console.log(`[JavaRuntime] Resolving Java for version: ${mcVersion}`);

        try {
            // 1. Fetch version JSON to find required java component
            const versionManifestRes = await axios.get('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
            const versionManifest = versionManifestRes.data;
            const versionEntry = versionManifest.versions.find(v => v.id === mcVersion);

            if (!versionEntry) {
                console.warn(`[JavaRuntime] Version ${mcVersion} not found in manifest, falling back to system java`);
                return 'java';
            }

            const versionJsonRes = await axios.get(versionEntry.url);
            const versionJson = versionJsonRes.data;

            const javaVersion = versionJson.javaVersion;
            if (!javaVersion || !javaVersion.component) {
                console.log(`[JavaRuntime] No specific Java version required for ${mcVersion}, using system java`);
                return 'java';
            }

            const component = javaVersion.component;
            console.log(`[JavaRuntime] Version ${mcVersion} requires component: ${component} (Java ${javaVersion.majorVersion})`);

            // 2. Check if already downloaded
            const componentDir = path.join(this.runtimesDir, component);
            const javaExe = process.platform === 'win32' ? 'javaw.exe' : 'java';

            if (await fs.pathExists(componentDir)) {
                const existingPath = await this.findFileRecursive(componentDir, javaExe);
                if (existingPath) {
                    console.log(`[JavaRuntime] Found existing Java runtime: ${existingPath}`);
                    return existingPath;
                }
            }

            // 3. Download and extract if missing
            console.log(`[JavaRuntime] Downloading runtime ${component}...`);
            await this.downloadRuntime(component, componentDir, mcVersion, onProgress);

            const newPath = await this.findFileRecursive(componentDir, javaExe);
            if (!newPath) {
                throw new Error(`[JavaRuntime] Failed to find ${javaExe} after downloading component ${component}`);
            }

            console.log(`[JavaRuntime] Successfully installed Java runtime: ${newPath}`);
            return newPath;
        } catch (err) {
            console.error(`[JavaRuntime] Error resolving Java path: ${err.message}`);
            return 'java'; // Fallback to system java on error
        }
    }

    async findFileRecursive(dir, filename) {
        const files = await fs.readdir(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) {
                const result = await this.findFileRecursive(fullPath, filename);
                if (result) return result;
            } else if (file === filename) {
                return fullPath;
            }
        }
        return null;
    }

    async downloadRuntime(component, targetDir, mcVersion, onProgress) {
        const platform = this.getMojangPlatform();
        const runtimeManifestRes = await axios.get(this.manifestUrl);
        const runtimeManifest = runtimeManifestRes.data;

        const platformData = runtimeManifest[platform];
        if (!platformData || !platformData[component] || platformData[component].length === 0) {
            throw new Error(`[JavaRuntime] Component ${component} not found for platform ${platform}`);
        }

        const manifestUrl = platformData[component][0].manifest.url;
        const fileManifestRes = await axios.get(manifestUrl);
        const fileManifest = fileManifestRes.data;

        await fs.ensureDir(targetDir);

        const files = Object.entries(fileManifest.files);
        const totalFiles = files.length;
        console.log(`[JavaRuntime] Downloading ${totalFiles} files for component ${component}...`);

        if (onProgress) {
            onProgress({ type: 'java-download', task: 'Downloading Java Runtime', current: 0, total: totalFiles, percentage: 0, version: mcVersion });
        }

        // We'll download files in batches to avoid overwhelming the network/system
        const batchSize = 10;
        let downloadedCount = 0;

        for (let i = 0; i < totalFiles; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            await Promise.all(batch.map(async ([relPath, info]) => {
                const fullPath = path.join(targetDir, relPath);

                if (info.type === 'directory') {
                    await fs.ensureDir(fullPath);
                } else if (info.type === 'file') {
                    await fs.ensureDir(path.dirname(fullPath));

                    try {
                        const response = await axios({
                            method: 'get',
                            url: info.downloads.raw.url,
                            responseType: 'arraybuffer'
                        });

                        await fs.writeFile(fullPath, Buffer.from(response.data));

                        // Set executable permission on Unix
                        if (process.platform !== 'win32' && (relPath.includes('bin/') || info.executable)) {
                            await fs.chmod(fullPath, 0o755);
                        }
                    } catch (dlErr) {
                        console.error(`[JavaRuntime] Failed to download ${relPath}: ${dlErr.message}`);
                        throw dlErr;
                    }
                }
            }));

            downloadedCount += batch.length;

            if (onProgress) {
                const percentage = Math.round((downloadedCount / totalFiles) * 100);
                onProgress({ type: 'java-download', task: 'Downloading Java Runtime', current: downloadedCount, total: totalFiles, percentage, version: mcVersion });
            }

            if (downloadedCount % (batchSize * 5) === 0 && downloadedCount > 0) {
                console.log(`[JavaRuntime] Downloaded ${downloadedCount}/${totalFiles} files...`);
            }
        }

        if (onProgress) {
            onProgress({ type: 'java-download', task: 'Extracting Java Runtime', current: totalFiles, total: totalFiles, percentage: 100, version: mcVersion });
        }
    }

    getMojangPlatform() {
        if (process.platform === 'win32') {
            return process.arch === 'x64' ? 'windows-x64' : 'windows-x86';
        } else if (process.platform === 'darwin') {
            return process.arch === 'arm64' ? 'mac-os-arm64' : 'mac-os';
        } else if (process.platform === 'linux') {
            return process.arch === 'x64' ? 'linux' : 'linux-i386';
        }
        return 'windows-x64';
    }
}

module.exports = JavaRuntimeManager;
