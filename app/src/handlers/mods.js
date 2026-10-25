const { app } = require('electron');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');
const versionUtils = require('../utils/version');
const packageJson = require('../../../package.json');

const getLauncherVersion = () => {
    try {
        if (app && typeof app.getVersion === 'function') {
            return app.getVersion();
        }
    } catch (_) {}
    return packageJson.version || '2.2.1';
};

const MODRINTH_USER_AGENT = `HelloWorld-Launcher/${getLauncherVersion()} (abelosky.dev@gmail.com)`;

class ModManager {

    // --- Modrinth API ---
    async searchModrinth(query, options = {}) {
        try {
            console.log('[searchModrinth] QUERY:', query, 'OPTIONS:', JSON.stringify(options));
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
            if (filters.loader && typeof filters.loader === 'string') {
                const l = filters.loader.toLowerCase();
                facets.push([`loaders:${l}`]);
            } else if (projectType === 'mod') {
                // When searching for mods without a specific loader, restrict to client mod loaders so server plugins are excluded
                facets.push(['loaders:fabric', 'loaders:forge', 'loaders:neoforge', 'loaders:quilt']);
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
            let versions = res.data || [];

            // Quilt is compatible with Fabric mods: if no quilt versions found, fallback to fabric
            if (loader === 'quilt' && versions.length === 0) {
                params.loaders = JSON.stringify(['fabric']);
                const fbRes = await axios.get(`https://api.modrinth.com/v2/project/${projectId}/version`, { params });
                versions = fbRes.data || [];
            }

            return { success: true, versions };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getVersionFromId(versionId, targetType = null) {
        try {
            const res = await axios.get(`https://api.modrinth.com/v2/version/${versionId}`);
            const files = Array.isArray(res.data.files) ? res.data.files : [];
            let file = null;
            if (targetType === 'datapack') {
                file = files.find(f => f.filename && f.filename.toLowerCase().endsWith('.zip'))
                    || files.find(f => f.primary)
                    || files[0];
            } else if (targetType === 'mod') {
                file = files.find(f => f.filename && f.filename.toLowerCase().endsWith('.jar'))
                    || files.find(f => f.primary)
                    || files[0];
            } else {
                file = files.find(f => f.primary) || files[0];
            }
            if (!file) {
                return { success: false, error: 'No files found in version' };
            }
            return { success: true, url: file.url, filename: file.filename };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getModDetails(projectId) {
        if (!this._modDetailsCache) this._modDetailsCache = new Map();
        if (this._modDetailsCache.has(projectId)) {
            return { success: true, details: this._modDetailsCache.get(projectId) };
        }
        try {
            const res = await axios.get(`https://api.modrinth.com/v2/project/${projectId}`);
            this._modDetailsCache.set(projectId, res.data);
            return { success: true, details: res.data };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getMultipleModDetails(projectIds) {
        if (!this._modDetailsCache) this._modDetailsCache = new Map();
        try {
            const missingIds = projectIds.filter(id => !this._modDetailsCache.has(id));
            
            // Chunk missingIds to avoid 414 URI Too Long (max ~50 per request is safe)
            const chunkSize = 50;
            for (let i = 0; i < missingIds.length; i += chunkSize) {
                const chunk = missingIds.slice(i, i + chunkSize);
                const url = `https://api.modrinth.com/v2/projects?ids=${encodeURIComponent(JSON.stringify(chunk))}`;
                const res = await axios.get(url);
                if (res.data && Array.isArray(res.data)) {
                    for (const proj of res.data) {
                        this._modDetailsCache.set(proj.id, proj);
                        if (proj.slug) this._modDetailsCache.set(proj.slug, proj);
                    }
                }
            }
            
            const details = [];
            for (const id of projectIds) {
                if (this._modDetailsCache.has(id)) {
                    details.push(this._modDetailsCache.get(id));
                }
            }
            return { success: true, details: details };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // --- Dependency Resolution ---

    /**
     * Resolves all Modrinth dependencies (required + optional) for a given version, recursively.
     * @param {string} versionId - The Modrinth version ID of the mod being installed.
     * @param {string} gameVersion - MC version string (e.g. "1.21.1")
     * @param {string} loader - Loader slug (e.g. "fabric")
     * @param {Set<string>} installedProjectIds - Set of project_ids already installed in the profile.
    /**
     * Resolves all dependencies for a given version, crawling transitively.
     * Compatible with both Mods and Data Packs (a datapack can require a mod or another datapack).
     * @param {string} versionId - Version ID of the mod or datapack.
     * @param {string} gameVersion - MC version string (e.g. "1.21.1")
     * @param {string} loader - Profile loader slug (e.g. "fabric", "forge", "neoforge") or null.
     * @param {Set<string>} installedProjectIds - Set of project_ids already installed for mods.
     * @param {Set<string>} installedFilenames - Set of filenames already installed for mods.
     * @param {Set<string>} installedDatapackProjectIds - Set of project_ids already installed for datapacks.
     * @param {Set<string>} installedDatapackFilenames - Set of filenames already installed for datapacks.
     * @returns {{ required: Array, optional: Array, alreadyInstalled: Array }}
     */
    async resolveModDependencies(
        versionId,
        gameVersion,
        loader,
        installedProjectIds = new Set(),
        installedFilenames = new Set(),
        installedDatapackProjectIds = new Set(),
        installedDatapackFilenames = new Set()
    ) {
        const MAX_DEPTH = 4;
        const CLIENT_MOD_LOADERS = ['fabric', 'forge', 'neoforge', 'quilt', 'legacy-fabric', 'babric', 'liteloader', 'rift'];
        const SERVER_PLUGIN_LOADERS = ['bukkit', 'spigot', 'paper', 'purpur', 'folia', 'bungeecord', 'velocity', 'waterfall', 'sponge', 'geyser'];

        // Normalize sets for fast case-insensitive lookup
        const normalizedInstalledIds = new Set();
        if (installedProjectIds) {
            installedProjectIds.forEach(id => {
                if (id) normalizedInstalledIds.add(String(id).toLowerCase().trim());
            });
        }
        const normalizedInstalledFilenames = new Set();
        if (installedFilenames) {
            installedFilenames.forEach(f => {
                if (f) normalizedInstalledFilenames.add(String(f).toLowerCase().trim());
            });
        }
        const normalizedInstalledDatapackIds = new Set();
        if (installedDatapackProjectIds) {
            installedDatapackProjectIds.forEach(id => {
                if (id) normalizedInstalledDatapackIds.add(String(id).toLowerCase().trim());
            });
        }
        const normalizedInstalledDatapackFilenames = new Set();
        if (installedDatapackFilenames) {
            installedDatapackFilenames.forEach(f => {
                if (f) normalizedInstalledDatapackFilenames.add(String(f).toLowerCase().trim());
            });
        }

        const normalizedClientLoader = loader ? loader.toLowerCase().trim() : null;

        // resolved maps: projectId -> dep info
        const resolvedRequired = new Map();
        const resolvedOptional = new Map();
        const alreadyInstalled = new Map();

        const visited = new Set(); // version IDs we've already crawled

        // 1. Identify the root mod so we NEVER suggest or require the root mod as a dependency of itself
        let rootProjectId = null;
        let rootProjectSlug = null;
        try {
            const rootRes = await axios.get(`https://api.modrinth.com/v2/version/${versionId}`);
            if (rootRes.data && rootRes.data.project_id) {
                rootProjectId = String(rootRes.data.project_id).trim();
                if (!this._modDetailsCache) this._modDetailsCache = new Map();
                if (!this._modDetailsCache.has(rootProjectId)) {
                    const rpRes = await axios.get(`https://api.modrinth.com/v2/project/${rootProjectId}`);
                    this._modDetailsCache.set(rootProjectId, rpRes.data);
                    if (rpRes.data.slug) {
                        this._modDetailsCache.set(rpRes.data.slug, rpRes.data);
                    }
                }
                const rpData = this._modDetailsCache.get(rootProjectId);
                if (rpData && rpData.slug) {
                    rootProjectSlug = String(rpData.slug).toLowerCase().trim();
                }
            }
        } catch (e) {
            console.warn(`[resolveModDependencies] Could not fetch root version ${versionId}:`, e.message);
        }

        const fetchVersionDeps = async (vid, depth, isFromRequiredParent = true) => {
            if (depth > MAX_DEPTH) return;
            if (visited.has(vid)) return;
            visited.add(vid);

            let versionData;
            try {
                const res = await axios.get(`https://api.modrinth.com/v2/version/${vid}`);
                versionData = res.data;
            } catch (e) {
                console.warn(`[resolveModDependencies] Could not fetch version ${vid}:`, e.message);
                return;
            }

            const deps = versionData.dependencies || [];

            for (const dep of deps) {
                if (!dep.project_id) continue; // version-only dep with no project (skip)
                const depProjectId = dep.project_id;
                const depProjIdLower = String(depProjectId).toLowerCase().trim();
                const depType = dep.dependency_type; // "required" | "optional" | "incompatible" | "embedded"

                // NEVER process incompatible or embedded dependencies (embedded is already bundled in the jar!)
                if (depType === 'incompatible' || depType === 'embedded') continue;

                // NEVER let a mod depend on itself
                if (rootProjectId && depProjIdLower === rootProjectId.toLowerCase()) continue;

                // Enrich with project details FIRST so already-installed deps have data
                let projectDetails = null;
                try {
                    if (!this._modDetailsCache) this._modDetailsCache = new Map();
                    if (this._modDetailsCache.has(depProjectId)) {
                        projectDetails = this._modDetailsCache.get(depProjectId);
                    } else {
                        const pRes = await axios.get(`https://api.modrinth.com/v2/project/${depProjectId}`);
                        projectDetails = pRes.data;
                        this._modDetailsCache.set(depProjectId, projectDetails);
                        if (projectDetails.id) this._modDetailsCache.set(projectDetails.id, projectDetails);
                        if (projectDetails.slug) this._modDetailsCache.set(projectDetails.slug, projectDetails);
                    }
                } catch (e) {
                    console.warn(`[resolveModDependencies] Could not fetch project details for ${depProjectId}:`, e.message);
                }

                const projSlugLower = projectDetails?.slug ? String(projectDetails.slug).toLowerCase().trim() : null;
                if (rootProjectSlug && projSlugLower === rootProjectSlug) continue;

                // Check if already in our resolved sets (avoid duplicates)
                if (resolvedRequired.has(depProjectId) || resolvedOptional.has(depProjectId) || alreadyInstalled.has(depProjectId)) continue;

                // Determine loaders supported by this dependency
                const projectLoaders = Array.isArray(projectDetails?.loaders) ? projectDetails.loaders.map(l => l.toLowerCase()) : [];
                const hasClientLoader = projectLoaders.some(l => CLIENT_MOD_LOADERS.includes(l));
                const hasDatapackLoader = projectLoaders.includes('datapack') || projectDetails?.project_type === 'datapack';
                const isServerOnlyPlugin = !hasClientLoader && !hasDatapackLoader && projectLoaders.some(l => SERVER_PLUGIN_LOADERS.includes(l));

                // If this is purely a server-side plugin (Paper/Spigot/Velocity/etc.), SKIP IT!
                if (isServerOnlyPlugin) {
                    console.log(`[resolveModDependencies] Skipping server-only plugin: ${projectDetails?.title || depProjectId}`);
                    continue;
                }

                let depAddonType = 'mod';
                if (projectDetails?.project_type === 'datapack' || (hasDatapackLoader && !hasClientLoader)) {
                    depAddonType = 'datapack';
                } else if (hasDatapackLoader && hasClientLoader) {
                    // Hybrid project (like Terralith)
                    if (normalizedClientLoader && projectLoaders.includes(normalizedClientLoader)) {
                        depAddonType = 'mod';
                    } else {
                        depAddonType = 'datapack';
                    }
                }

                // Choose target loader for querying Modrinth versions
                let targetDepLoader = null;
                if (depAddonType === 'datapack') {
                    targetDepLoader = 'datapack';
                } else {
                    if (normalizedClientLoader) {
                        const supportsTarget = projectLoaders.includes(normalizedClientLoader) ||
                            (normalizedClientLoader === 'quilt' && projectLoaders.includes('fabric')) ||
                            (normalizedClientLoader === 'fabric' && projectLoaders.includes('quilt'));
                        if (!supportsTarget) {
                            // Incompatible with current client loader!
                            console.log(`[resolveModDependencies] Skipping ${projectDetails?.title || depProjectId}: not compatible with client loader ${normalizedClientLoader}`);
                            continue;
                        }
                        targetDepLoader = normalizedClientLoader;
                    } else {
                        targetDepLoader = projectLoaders.find(l => CLIENT_MOD_LOADERS.includes(l)) || null;
                    }
                }

                // Check if already installed in appropriate target directory
                const targetInstalledIds = depAddonType === 'datapack' ? normalizedInstalledDatapackIds : normalizedInstalledIds;
                const targetInstalledFilenames = depAddonType === 'datapack' ? normalizedInstalledDatapackFilenames : normalizedInstalledFilenames;

                const projDetailsIdLower = projectDetails?.id ? String(projectDetails.id).toLowerCase().trim() : null;

                let isAlreadyInstalled = targetInstalledIds.has(depProjIdLower) ||
                    (projDetailsIdLower && targetInstalledIds.has(projDetailsIdLower)) ||
                    (projSlugLower && targetInstalledIds.has(projSlugLower));

                if (!isAlreadyInstalled && projSlugLower && targetInstalledFilenames.size > 0) {
                    for (const fn of targetInstalledFilenames) {
                        const cleanFn = fn.replace(/\.disabled$/, '').replace(/\.jar$/, '').replace(/\.zip$/, '');
                        if (cleanFn === projSlugLower ||
                            cleanFn.startsWith(projSlugLower + '-') ||
                            cleanFn.startsWith(projSlugLower + '_') ||
                            cleanFn.startsWith(projSlugLower + '+')) {
                            isAlreadyInstalled = true;
                            break;
                        }
                    }
                }

                // Resolve the best compatible version for this dep
                let depVersionId = dep.version_id || null;
                let resolvedVersion = null;

                try {
                    if (depVersionId) {
                        const vRes = await axios.get(`https://api.modrinth.com/v2/version/${depVersionId}`);
                        resolvedVersion = vRes.data;
                        if (targetDepLoader && resolvedVersion.loaders && !resolvedVersion.loaders.map(l => l.toLowerCase()).includes(targetDepLoader.toLowerCase())) {
                            resolvedVersion = null;
                        }
                    } else {
                        const params = {};
                        if (gameVersion) {
                            const info = versionUtils.parseVersionString(gameVersion);
                            const mcVer = info ? info.mcVersion : gameVersion;
                            params.game_versions = JSON.stringify([mcVer]);
                        }
                        if (targetDepLoader) params.loaders = JSON.stringify([targetDepLoader]);

                        const listRes = await axios.get(`https://api.modrinth.com/v2/project/${depProjectId}/version`, { params });
                        let versions = listRes.data || [];
                        if (targetDepLoader) {
                            const matchingLoaderVersions = versions.filter(v => Array.isArray(v.loaders) && v.loaders.map(l => l.toLowerCase()).includes(targetDepLoader.toLowerCase()));
                            if (matchingLoaderVersions.length > 0) versions = matchingLoaderVersions;
                        }
                        resolvedVersion = versions.find(v => v.version_type === 'release' && v.featured)
                            || versions.find(v => v.version_type === 'release')
                            || versions.find(v => v.featured)
                            || versions.find(v => v.version_type === 'beta')
                            || versions[0]
                            || null;

                        if (!resolvedVersion && versions.length === 0) {
                            // Try without game_version filter, but KEEP target loader
                            const fbParams = {};
                            if (targetDepLoader) fbParams.loaders = JSON.stringify([targetDepLoader]);
                            const fallbackRes = await axios.get(`https://api.modrinth.com/v2/project/${depProjectId}/version`, { params: fbParams });
                            let fbVersions = fallbackRes.data || [];
                            if (targetDepLoader) {
                                const matchingLoaderFb = fbVersions.filter(v => Array.isArray(v.loaders) && v.loaders.map(l => l.toLowerCase()).includes(targetDepLoader.toLowerCase()));
                                if (matchingLoaderFb.length > 0) fbVersions = matchingLoaderFb;
                            }
                            resolvedVersion = fbVersions.find(v => v.version_type === 'release') || fbVersions[0] || null;
                        }

                        // If target was datapack and still nothing, try without loader filter and pick a zip version
                        if (!resolvedVersion && depAddonType === 'datapack') {
                            const allRes = await axios.get(`https://api.modrinth.com/v2/project/${depProjectId}/version`);
                            const allVersions = allRes.data || [];
                            resolvedVersion = allVersions.find(v => (v.loaders && v.loaders.includes('datapack')) || (v.files && v.files.some(f => f.filename.endsWith('.zip')))) || allVersions[0] || null;
                        }
                    }
                } catch (e) {
                    console.warn(`[resolveModDependencies] Could not resolve version for dep ${depProjectId}:`, e.message);
                }

                // Discard version if it has only server plugin loaders
                if (resolvedVersion) {
                    const vLoaders = Array.isArray(resolvedVersion.loaders) ? resolvedVersion.loaders.map(l => l.toLowerCase()) : [];
                    const vHasClient = vLoaders.some(l => CLIENT_MOD_LOADERS.includes(l));
                    const vHasDatapack = vLoaders.includes('datapack');
                    if (!vHasClient && !vHasDatapack) {
                        console.log(`[resolveModDependencies] Version ${resolvedVersion.id} for ${depProjectId} has only plugin loaders (${vLoaders.join(', ')}), discarding`);
                        resolvedVersion = null;
                    }
                }

                // Final check on resolvedVersion: refine depAddonType based on resolved files & loaders
                if (resolvedVersion) {
                    const vLoaders = Array.isArray(resolvedVersion.loaders) ? resolvedVersion.loaders.map(l => l.toLowerCase()) : [];
                    if (vLoaders.includes('datapack') && !vLoaders.some(l => CLIENT_MOD_LOADERS.includes(l))) {
                        depAddonType = 'datapack';
                    } else if (vLoaders.some(l => CLIENT_MOD_LOADERS.includes(l))) {
                        depAddonType = 'mod';
                    }
                }

                // Also check if any file of the resolved version matches existing files on disk
                if (!isAlreadyInstalled && resolvedVersion && Array.isArray(resolvedVersion.files) && targetInstalledFilenames.size > 0) {
                    for (const f of resolvedVersion.files) {
                        if (f && f.filename) {
                            const fnLower = String(f.filename).toLowerCase();
                            if (targetInstalledFilenames.has(fnLower) || targetInstalledFilenames.has(fnLower + '.disabled')) {
                                isAlreadyInstalled = true;
                                break;
                            }
                        }
                    }
                }

                if (!isAlreadyInstalled && !resolvedVersion) continue;

                const depEntry = {
                    project_id: depProjectId,
                    dependency_type: depType,
                    addon_type: depAddonType,
                    resolved_version: resolvedVersion,
                    project: projectDetails
                };

                if (isAlreadyInstalled) {
                    alreadyInstalled.set(depProjectId, depEntry);
                } else {
                    if (depType === 'required' && isFromRequiredParent) {
                        resolvedRequired.set(depProjectId, depEntry);
                    } else {
                        resolvedOptional.set(depProjectId, depEntry);
                    }
                }

                // CRITICAL: ONLY recursively crawl dependencies if this dependency is REQUIRED and its parent is REQUIRED!
                // Never crawl optional dependencies to prevent massive exponential trees and irrelevant dependencies!
                if (!isAlreadyInstalled && resolvedVersion && resolvedVersion.id && depType === 'required' && isFromRequiredParent) {
                    await fetchVersionDeps(resolvedVersion.id, depth + 1, true);
                }
            }
        };

        await fetchVersionDeps(versionId, 1, true);

        return {
            success: true,
            required: Array.from(resolvedRequired.values()),
            optional: Array.from(resolvedOptional.values()),
            alreadyInstalled: Array.from(alreadyInstalled.values())
        };
    }

    /**
     * Resolves dynamic compatibility for a list of addons/mods against a target Minecraft version and loader,
     * including cascading invalidation of any mods whose required dependencies cannot be satisfied.
     * @param {Object} opts
     * @param {Array} opts.addons - Array of { project_id, version_id, filename, name, type, ... }
     * @param {string} opts.targetMcVersion - e.g. "1.21.1"
     * @param {string} opts.targetLoader - e.g. "fabric", "forge", "neoforge"
     * @param {boolean} [opts.autoIncludeMissingDeps=true] - Whether to automatically fetch missing required libraries from Modrinth
     * @returns {Promise<Object>} Compatibility report { success, targetMcVersion, targetLoader, compatible, incompatible, autoAdded }
     */
    async resolveModpackCompatibility({ addons, targetMcVersion, targetLoader, autoIncludeMissingDeps = true }) {
        try {
            if (!Array.isArray(addons) || addons.length === 0) {
                return {
                    success: true,
                    targetMcVersion,
                    targetLoader,
                    totalChecked: 0,
                    compatible: [],
                    incompatible: [],
                    autoAdded: []
                };
            }

            // Normalize target MC version and loader
            const verInfo = versionUtils.parseVersionString(targetMcVersion);
            const cleanMcVersion = verInfo ? verInfo.mcVersion : (targetMcVersion || '').replace(/^(Fabric|Forge|NeoForge|Vanilla)\s+/i, '').trim();
            const cleanLoader = (targetLoader || (verInfo ? verInfo.loader : 'fabric') || 'fabric').toLowerCase();

            console.log(`[resolveModpackCompatibility] Checking ${addons.length} addons for MC ${cleanMcVersion} (${cleanLoader})...`);

            const candidateMap = new Map();     // projectId -> candidate addon info
            const incompatibleMap = new Map();  // projectId -> incompatible info { project_id, filename, name, type, reason, isCascade, causedBy }
            const brokenDepsMap = new Map();    // projectId -> { project_id, name, reason }
            const autoAddedMap = new Map();     // projectId -> dep addon info

            // Helper to get project details from cache or Modrinth
            const fetchProjectInfo = async (pid) => {
                if (!this._modDetailsCache) this._modDetailsCache = new Map();
                if (this._modDetailsCache.has(pid)) return this._modDetailsCache.get(pid);
                try {
                    const res = await axios.get(`https://api.modrinth.com/v2/project/${pid}`);
                    this._modDetailsCache.set(pid, res.data);
                    return res.data;
                } catch (e) {
                    return null;
                }
            };

            // Helper to find best matching version for a project
            const findBestVersion = async (projectId, type = 'mod') => {
                const params = {};
                if (cleanMcVersion) params.game_versions = JSON.stringify([cleanMcVersion]);
                const isLoaderMod = (type === 'mod' || !type);
                if (isLoaderMod && cleanLoader) {
                    params.loaders = JSON.stringify([cleanLoader]);
                }

                try {
                    let listRes = await axios.get(`https://api.modrinth.com/v2/project/${projectId}/version`, { params });
                    let versions = listRes.data || [];

                    // Fallback for non-mods or if loader tag is missing
                    if (versions.length === 0 && !isLoaderMod) {
                        delete params.loaders;
                        listRes = await axios.get(`https://api.modrinth.com/v2/project/${projectId}/version`, { params });
                        versions = listRes.data || [];
                    }

                    if (versions.length === 0) return null;

                    return versions.find(v => v.version_type === 'release' && v.featured)
                        || versions.find(v => v.version_type === 'release')
                        || versions.find(v => v.featured)
                        || versions.find(v => v.version_type === 'beta')
                        || versions[0]
                        || null;
                } catch (e) {
                    console.warn(`[resolveModpackCompatibility] Error fetching versions for ${projectId}:`, e.message);
                    return null;
                }
            };

            // Phase 1: Check compatible versions for each addon in the modpack
            const checkAddon = async (addon) => {
                const pid = addon.project_id;
                const type = addon.type || 'mod';
                // Only keep name if it was an explicit readable title, otherwise leave null to enrich via Modrinth
                const rawTitle = (addon.name && addon.name !== pid && addon.name !== addon.filename) ? addon.name : (addon.title || null);
                const name = rawTitle;

                if (!pid) return;

                const bestVer = await findBestVersion(pid, type);
                if (!bestVer) {
                    incompatibleMap.set(pid, {
                        project_id: pid,
                        filename: addon.filename || `${pid}.jar`,
                        name: name,
                        type: type,
                        icon_url: addon.icon_url || null,
                        reason: `No compatible version found for Minecraft ${cleanMcVersion} (${cleanLoader})`,
                        isCascade: false
                    });
                    return;
                }

                const primaryFile = (bestVer.files || []).find(f => f.primary) || (bestVer.files || [])[0];
                candidateMap.set(pid, {
                    project_id: pid,
                    version_id: bestVer.id,
                    filename: primaryFile ? primaryFile.filename : (addon.filename || `${pid}.jar`),
                    download_url: primaryFile ? primaryFile.url : null,
                    file_size: primaryFile ? primaryFile.size : 0,
                    name: name,
                    type: type,
                    icon_url: addon.icon_url || null,
                    dependencies: bestVer.dependencies || []
                });
            };

            // Run in concurrent batches of 6
            const batchSize = 6;
            const validAddons = addons.filter(a => a && a.project_id);
            for (let i = 0; i < validAddons.length; i += batchSize) {
                const batch = validAddons.slice(i, i + batchSize);
                await Promise.all(batch.map(checkAddon));
            }

            // Phase 2: Inspect required dependencies of candidate mods
            const pendingExternalDeps = new Set();
            for (const candidate of candidateMap.values()) {
                const requiredDeps = (candidate.dependencies || []).filter(d => d.dependency_type === 'required' && d.project_id);
                for (const dep of requiredDeps) {
                    if (!candidateMap.has(dep.project_id) && !incompatibleMap.has(dep.project_id)) {
                        pendingExternalDeps.add(dep.project_id);
                    }
                }
            }

            // If auto-inclusion is enabled, attempt to resolve missing external dependencies
            if (autoIncludeMissingDeps && pendingExternalDeps.size > 0) {
                const resolveExternalDep = async (depPid) => {
                    const bestVer = await findBestVersion(depPid, 'mod');
                    const projInfo = await fetchProjectInfo(depPid);
                    const depName = projInfo ? projInfo.title : depPid;
                    const depIcon = projInfo ? projInfo.icon_url : null;

                    if (!bestVer) {
                        brokenDepsMap.set(depPid, {
                            project_id: depPid,
                            name: depName,
                            reason: `Required dependency '${depName}' has no version for Minecraft ${cleanMcVersion} (${cleanLoader})`
                        });
                        return;
                    }

                    const primaryFile = (bestVer.files || []).find(f => f.primary) || (bestVer.files || [])[0];
                    const depObj = {
                        project_id: depPid,
                        version_id: bestVer.id,
                        filename: primaryFile ? primaryFile.filename : `${depPid}.jar`,
                        download_url: primaryFile ? primaryFile.url : null,
                        file_size: primaryFile ? primaryFile.size : 0,
                        name: depName,
                        type: 'mod',
                        icon_url: depIcon,
                        dependencies: bestVer.dependencies || [],
                        auto_added: true
                    };

                    autoAddedMap.set(depPid, depObj);
                    candidateMap.set(depPid, depObj);
                };

                const extArr = Array.from(pendingExternalDeps);
                for (let i = 0; i < extArr.length; i += batchSize) {
                    const batch = extArr.slice(i, i + batchSize);
                    await Promise.all(batch.map(resolveExternalDep));
                }
            } else {
                for (const depPid of pendingExternalDeps) {
                    brokenDepsMap.set(depPid, {
                        project_id: depPid,
                        name: depPid,
                        reason: `Required dependency '${depPid}' is missing and not included in modpack`
                    });
                }
            }

            // Phase 3: Cascading Invalidation Algorithm (Fixed-point iteration)
            let cascadeChanged = true;
            while (cascadeChanged) {
                cascadeChanged = false;
                for (const [pid, candidate] of Array.from(candidateMap.entries())) {
                    const requiredDeps = (candidate.dependencies || []).filter(d => d.dependency_type === 'required' && d.project_id);
                    for (const dep of requiredDeps) {
                        const depPid = dep.project_id;
                        let failure = null;

                        if (incompatibleMap.has(depPid)) {
                            failure = incompatibleMap.get(depPid);
                        } else if (brokenDepsMap.has(depPid)) {
                            failure = brokenDepsMap.get(depPid);
                        } else if (!candidateMap.has(depPid)) {
                            failure = { name: depPid, reason: `Required dependency '${depPid}' is missing` };
                        }

                        if (failure) {
                            const depName = failure.name || depPid;
                            incompatibleMap.set(pid, {
                                project_id: pid,
                                filename: candidate.filename,
                                name: candidate.name,
                                type: candidate.type,
                                icon_url: candidate.icon_url,
                                reason: `Requires '${depName}', which is incompatible with Minecraft ${cleanMcVersion}`,
                                isCascade: true,
                                causedBy: depPid
                            });

                            autoAddedMap.delete(pid);
                            candidateMap.delete(pid);
                            cascadeChanged = true;
                            break;
                        }
                    }
                }
            }

            // Phase 4: Fetch names/icons for any entries that lack readable names
            const allPidsToEnrich = new Set();
            for (const [pid, item] of candidateMap.entries()) {
                if (!item.name || item.name === pid || item.name === item.filename) allPidsToEnrich.add(pid);
            }
            for (const [pid, item] of incompatibleMap.entries()) {
                if (!item.name || item.name === pid || item.name === item.filename) allPidsToEnrich.add(pid);
                if (item.causedBy) allPidsToEnrich.add(item.causedBy);
            }
            for (const pid of brokenDepsMap.keys()) {
                allPidsToEnrich.add(pid);
            }

            const projTitleMap = new Map();
            if (allPidsToEnrich.size > 0) {
                const detailsRes = await this.getMultipleModDetails(Array.from(allPidsToEnrich));
                if (detailsRes && detailsRes.success && Array.isArray(detailsRes.details)) {
                    for (const proj of detailsRes.details) {
                        const title = proj.title || proj.name;
                        if (title) {
                            projTitleMap.set(proj.id, title);
                            if (proj.slug) projTitleMap.set(proj.slug, title);
                        }

                        const matchItem = (map) => map.get(proj.id) || (proj.slug && map.get(proj.slug));
                        
                        const c = matchItem(candidateMap);
                        if (c) {
                            if (title) c.name = title;
                            if (!c.icon_url && proj.icon_url) c.icon_url = proj.icon_url;
                        }

                        const ic = matchItem(incompatibleMap);
                        if (ic) {
                            if (title) ic.name = title;
                            if (!ic.icon_url && proj.icon_url) ic.icon_url = proj.icon_url;
                        }

                        const aa = matchItem(autoAddedMap);
                        if (aa) {
                            if (title) aa.name = title;
                            if (!aa.icon_url && proj.icon_url) aa.icon_url = proj.icon_url;
                        }
                    }
                }
            }

            // Fallback for any items that still don't have a readable name: clean up filename
            const cleanFallback = (filename, pid) => {
                if (!filename) return pid;
                return filename
                    .replace(/\.(jar|zip|mrpack)$/i, '')
                    .replace(/[-_+](fabric|forge|neoforge|mc)?v?[0-9].*$/i, '')
                    .replace(/[-_]/g, ' ')
                    .trim() || pid;
            };

            for (const item of candidateMap.values()) {
                if (!item.name || item.name === item.project_id || item.name === item.filename) {
                    item.name = cleanFallback(item.filename, item.project_id);
                }
            }
            for (const item of incompatibleMap.values()) {
                if (!item.name || item.name === item.project_id || item.name === item.filename) {
                    item.name = cleanFallback(item.filename, item.project_id);
                }
            }

            // Also update any cascading failure reasons to display the clean causer name instead of raw PID/filename
            for (const ic of incompatibleMap.values()) {
                if (ic.isCascade && ic.causedBy) {
                    const causer = incompatibleMap.get(ic.causedBy) || brokenDepsMap.get(ic.causedBy) || candidateMap.get(ic.causedBy);
                    const causerName = (causer && causer.name && causer.name !== ic.causedBy) ? causer.name : (projTitleMap.get(ic.causedBy) || ic.causedBy);
                    ic.reason = `Requires '${causerName}', which is incompatible with Minecraft ${cleanMcVersion}`;
                }
            }

            const compatibleList = Array.from(candidateMap.values()).filter(c => !autoAddedMap.has(c.project_id));
            const autoAddedList = Array.from(autoAddedMap.values());
            const incompatibleList = Array.from(incompatibleMap.values());

            console.log(`[resolveModpackCompatibility] Results: ${compatibleList.length} compatible, ${incompatibleList.length} incompatible (${incompatibleList.filter(i => i.isCascade).length} cascade), ${autoAddedList.length} auto-added.`);

            return {
                success: true,
                targetMcVersion: cleanMcVersion,
                targetLoader: cleanLoader,
                totalChecked: validAddons.length,
                compatible: compatibleList,
                autoAdded: autoAddedList,
                incompatible: incompatibleList
            };

        } catch (e) {
            console.error('[resolveModpackCompatibility] Fatal Error:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Checks for updates for addons (mods, resourcepacks, shaders) with Modrinth IDs against
     * the target Minecraft version and loader.
     * @param {Object} opts
     * @param {Array} opts.addons - Array of { project_id, version_id, filename, type, state, ... }
     * @param {string} opts.targetMcVersion - e.g. "1.21.1"
     * @param {string} opts.targetLoader - e.g. "fabric", "forge", "neoforge", "vanilla"
     * @param {string} [opts.profileDir] - Game directory of the profile to check existing files
     * @returns {Promise<Array>} Array of updated addons to install { project_id, version_id, old_version_id, filename, old_filename, name, type, download_url, file_size }
     */
    async checkAddonUpdates({ addons, targetMcVersion, targetLoader, profileDir = null }) {
        try {
            if (!Array.isArray(addons) || addons.length === 0) return [];

            const checkableAddons = addons.filter(addon => {
                if (!addon || !addon.project_id) return false;
                // Skip disabled addons
                if (addon.state === 'disabled' || (addon.state !== 'enabled' && addon.enabled === false)) return false;
                // Only check mods, resourcepacks, shaders
                const type = addon.type || 'mod';
                if (type !== 'mod' && type !== 'resourcepack' && type !== 'shader') return false;
                return true;
            });

            if (checkableAddons.length === 0) return [];

            // Normalize MC version and loader
            const verInfo = versionUtils.parseVersionString(targetMcVersion);
            const cleanMcVersion = verInfo ? verInfo.mcVersion : (targetMcVersion || '').replace(/^(Fabric|Forge|NeoForge|Vanilla|OptiFine)\s+/i, '').trim();
            const cleanLoader = (targetLoader || (verInfo ? verInfo.type : 'vanilla') || 'vanilla').toLowerCase();

            if (!this._versionCheckCache) this._versionCheckCache = new Map();

            const checkSingleAddon = async (addon) => {
                const pid = addon.project_id;
                const type = addon.type || 'mod';

                // Mods cannot be updated for Vanilla profiles
                if (type === 'mod' && cleanLoader === 'vanilla') return null;

                const cacheKey = `${pid}:${cleanMcVersion}:${type === 'mod' ? cleanLoader : 'any'}`;
                let versions = null;

                const cached = this._versionCheckCache.get(cacheKey);
                if (cached && (Date.now() - cached.timestamp < 180000)) { // 3-minute TTL
                    versions = cached.versions;
                } else {
                    const params = {};
                    if (cleanMcVersion) params.game_versions = JSON.stringify([cleanMcVersion]);
                    if (type === 'mod' && cleanLoader && cleanLoader !== 'vanilla') {
                        params.loaders = JSON.stringify([cleanLoader]);
                    }

                    try {
                        const res = await axios.get(`https://api.modrinth.com/v2/project/${pid}/version`, {
                            params,
                            timeout: 8000,
                            headers: { 'User-Agent': MODRINTH_USER_AGENT }
                        });
                        versions = Array.isArray(res.data) ? res.data : [];

                        this._versionCheckCache.set(cacheKey, { timestamp: Date.now(), versions });
                    } catch (e) {
                        console.warn(`[checkAddonUpdates] Failed to query Modrinth versions for project ${pid}:`, e.message);
                        return null;
                    }
                }

                if (!Array.isArray(versions) || versions.length === 0) return null;

                const matching = versions.filter(v => v && Array.isArray(v.files) && v.files.length > 0);
                if (matching.length === 0) return null;

                // Find currently installed version object if version_id is tracked
                let currentVer = null;
                if (addon.version_id) {
                    currentVer = matching.find(v => v.id === addon.version_id);
                }

                // Choose best compatible version:
                // If currently on release (or no currentVer), prefer latest release
                // If currently on beta/alpha or no release exists, take latest matching
                const isCurrentRelease = !currentVer || currentVer.version_type === 'release';
                let bestVer = null;
                if (isCurrentRelease) {
                    bestVer = matching.find(v => v.version_type === 'release')
                        || matching.find(v => v.version_type === 'beta')
                        || matching[0];
                } else {
                    bestVer = matching.find(v => v.version_type === 'release') || matching[0];
                }

                if (!bestVer) return null;

                // If identical version ID, no update
                if (addon.version_id && bestVer.id === addon.version_id) return null;

                // Pick primary file
                const files = bestVer.files || [];
                let primaryFile = null;
                if (type === 'mod') {
                    primaryFile = files.find(f => f.primary && f.filename && f.filename.toLowerCase().endsWith('.jar'))
                        || files.find(f => f.filename && f.filename.toLowerCase().endsWith('.jar'))
                        || files.find(f => f.primary)
                        || files[0];
                } else {
                    primaryFile = files.find(f => f.primary && f.filename && f.filename.toLowerCase().endsWith('.zip'))
                        || files.find(f => f.filename && f.filename.toLowerCase().endsWith('.zip'))
                        || files.find(f => f.primary)
                        || files[0];
                }

                if (!primaryFile || !primaryFile.filename) return null;

                // If filename is unchanged and it was already that file, no update
                if (addon.filename && addon.filename.replace(/\.disabled$/, '') === primaryFile.filename) {
                    return null;
                }

                // If currentVer is found in matching list, verify that bestVer was published after currentVer
                if (currentVer && currentVer.date_published && bestVer.date_published) {
                    const currentDate = new Date(currentVer.date_published).getTime();
                    const bestDate = new Date(bestVer.date_published).getTime();
                    if (bestDate <= currentDate) return null;
                }

                // If profile directory exists, check if updated file already exists
                if (profileDir) {
                    let targetDir = path.join(profileDir, 'mods');
                    if (type === 'resourcepack') targetDir = path.join(profileDir, 'resourcepacks');
                    if (type === 'shader') targetDir = path.join(profileDir, 'shaderpacks');

                    const targetFile = path.join(targetDir, primaryFile.filename);
                    const targetDisabled = path.join(targetDir, primaryFile.filename + '.disabled');
                    if (fs.existsSync(targetFile) || fs.existsSync(targetDisabled)) {
                        return null;
                    }
                }

                const displayName = (addon.name && addon.name !== pid && addon.name !== addon.filename) ? addon.name : (addon.title || null);

                return {
                    project_id: pid,
                    version_id: bestVer.id,
                    old_version_id: addon.version_id || null,
                    filename: primaryFile.filename,
                    old_filename: addon.filename || null,
                    name: displayName || primaryFile.filename,
                    type: type,
                    download_url: primaryFile.url,
                    file_size: primaryFile.size || 0,
                    state: addon.state || 'enabled'
                };
            };

            // Run in concurrent batches of 8
            const batchSize = 8;
            const updates = [];
            for (let i = 0; i < checkableAddons.length; i += batchSize) {
                const batch = checkableAddons.slice(i, i + batchSize);
                const results = await Promise.all(batch.map(checkSingleAddon));
                for (const r of results) {
                    if (r) updates.push(r);
                }
            }

            // Enrich updates with titles if missing
            if (updates.length > 0) {
                const pidsToEnrich = updates
                    .filter(u => !u.name || u.name === u.filename || u.name === u.project_id)
                    .map(u => u.project_id);

                if (pidsToEnrich.length > 0) {
                    try {
                        const detailsRes = await this.getMultipleModDetails(pidsToEnrich);
                        if (detailsRes && detailsRes.success && Array.isArray(detailsRes.details)) {
                            const titleMap = new Map();
                            for (const p of detailsRes.details) {
                                if (p.title) titleMap.set(p.id, p.title);
                                if (p.slug && p.title) titleMap.set(p.slug, p.title);
                            }
                            for (const u of updates) {
                                if (titleMap.has(u.project_id)) {
                                    u.name = titleMap.get(u.project_id);
                                }
                            }
                        }
                    } catch (_) {}
                }
            }

            return updates;
        } catch (e) {
            console.error("[checkAddonUpdates] Error:", e);
            return [];
        }
    }

    /**
     * Installs Fabric API silently into the given profile directory.
     * @param {string} profileDir - Path to the profile's mods folder parent
     * @param {string} gameVersion - MC version string
     * @returns {{ success: boolean, project_id: string, version_id: string, filename: string } | { success: false }}
     */
    async autoInstallFabricAPI(profileDir, gameVersion) {
        const FABRIC_API_PROJECT_ID = 'P7dR8mSH';
        try {
            // Find best compatible version
            const params = { loaders: JSON.stringify(['fabric']) };
            if (gameVersion) params.game_versions = JSON.stringify([gameVersion]);
            const listRes = await axios.get(`https://api.modrinth.com/v2/project/${FABRIC_API_PROJECT_ID}/version`, { params });
            const versions = listRes.data || [];
            const best = versions.find(v => v.version_type === 'release' && v.featured)
                || versions.find(v => v.version_type === 'release')
                || versions[0]
                || null;

            if (!best) {
                console.warn('[autoInstallFabricAPI] No compatible Fabric API version found for', gameVersion);
                return { success: false, error: 'No compatible version found' };
            }

            const primaryFile = (best.files || []).find(f => f.primary) || best.files[0];
            if (!primaryFile) return { success: false, error: 'No downloadable file found' };

            const modsDir = require('path').join(profileDir, 'mods');
            const targetFile = require('path').join(modsDir, primaryFile.filename);

            // Skip if already present
            if (require('fs-extra').existsSync(targetFile)) {
                return { success: true, alreadyInstalled: true, project_id: FABRIC_API_PROJECT_ID, version_id: best.id, filename: primaryFile.filename };
            }

            const result = await this.installProject(primaryFile.url, primaryFile.filename, modsDir, null);
            if (result.success) {
                return { success: true, project_id: FABRIC_API_PROJECT_ID, version_id: best.id, filename: primaryFile.filename };
            }
            return { success: false, error: result.error };
        } catch (e) {
            console.error('[autoInstallFabricAPI] Error:', e.message);
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
