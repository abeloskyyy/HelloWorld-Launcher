/**
 * Universal Version Utility
 * Handles parsing, formatting, and normalizing version nomenclature across HelloWorld-Launcher.
 * 
 * New Nomenclature:
 * - Vanilla <mcVersion> (e.g., Vanilla 1.21.11)
 * - Fabric <mcVersion> (<loaderVersion>) (e.g., Fabric 1.21.11 (0.58.2))
 * - Forge <mcVersion> (<loaderVersion>) (e.g., Forge 1.20.1 (47.4.10))
 * - NeoForge <mcVersion> (<loaderVersion>) (e.g., NeoForge 1.21.1 (21.1.5))
 * - Quilt <mcVersion> (<loaderVersion>) (e.g., Quilt 1.20.1 (0.21.0))
 * - OptiFine <mcVersion> (<loaderVersion>)
 */

function parseVersionString(version) {
    if (!version || typeof version !== 'string') return null;
    const raw = version.trim();
    if (!raw) return null;

    let type = 'vanilla';
    let software = 'Vanilla';

    // Check prefix or keywords
    const prefixMatch = raw.match(/^(Vanilla|Fabric|Forge|NeoForge|Quilt|OptiFine)\b/i);
    if (prefixMatch) {
        software = prefixMatch[1].charAt(0).toUpperCase() + prefixMatch[1].slice(1).toLowerCase();
        if (software === 'Neoforge') software = 'NeoForge';
        if (software === 'Optifine') software = 'OptiFine';
        type = software.toLowerCase();
    } else {
        const lower = raw.toLowerCase();
        if (lower.includes('neoforge')) {
            type = 'neoforge';
            software = 'NeoForge';
        } else if (lower.includes('forge')) {
            type = 'forge';
            software = 'Forge';
        } else if (lower.includes('fabric')) {
            type = 'fabric';
            software = 'Fabric';
        } else if (lower.includes('quilt')) {
            type = 'quilt';
            software = 'Quilt';
        } else if (lower.includes('optifine')) {
            type = 'optifine';
            software = 'OptiFine';
        } else {
            type = 'vanilla';
            software = 'Vanilla';
        }
    }

    let mcVersion = raw;
    let loaderVersion = null;

    if (type === 'vanilla') {
        mcVersion = raw.replace(/^vanilla\s+/i, '').trim();
        loaderVersion = null;
    } else {
        const parenMatch = raw.match(/^([^\s]+)\s+([^\s(]+)(?:\s+\(([^)]+)\))?/i);
        if (parenMatch && parenMatch[1].toLowerCase() === type) {
            mcVersion = parenMatch[2].trim();
            loaderVersion = parenMatch[3] ? parenMatch[3].trim() : null;
        } else {
            // Old nomenclature fallback (e.g., fabric-loader-0.58.2-1.21.11, forge-1.20.1-47.4.10, 1.20.1-forge-47.4.10)
            const matches = raw.match(/\b\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z][a-zA-Z0-9\.]+)?\b/g) || [];
            mcVersion = matches.find(m => m.startsWith('1.')) || matches[0] || raw;
            loaderVersion = matches.find(m => m !== mcVersion) || null;
            if (!loaderVersion && raw.includes('-')) {
                const parts = raw.split('-').filter(p => p && p.toLowerCase() !== type && p.toLowerCase() !== 'loader' && p !== mcVersion);
                if (parts.length > 0) loaderVersion = parts.join('-');
            }
        }
    }

    const normalizedId = (type !== 'vanilla' && loaderVersion) 
        ? `${software} ${mcVersion} (${loaderVersion})`
        : `${software} ${mcVersion}`;

    return {
        type,
        software,
        mcVersion,
        loaderVersion,
        normalizedId
    };
}

/**
 * Returns possible directory names in Minecraft versions folder for this version string.
 */
function getPossibleDirNames(version) {
    const info = parseVersionString(version);
    if (!info) return [];

    const { type, mcVersion, loaderVersion } = info;
    if (type === 'vanilla') {
        return [mcVersion, `Vanilla ${mcVersion}`];
    }

    const dirs = new Set();
    if (loaderVersion) {
        if (type === 'fabric') {
            dirs.add(`fabric-loader-${loaderVersion}-${mcVersion}`);
            dirs.add(`fabric-${mcVersion}-${loaderVersion}`);
            dirs.add(`fabric-loader-${mcVersion}-${loaderVersion}`);
        } else if (type === 'forge') {
            dirs.add(`${mcVersion}-forge-${loaderVersion}`);
            dirs.add(`forge-${mcVersion}-${loaderVersion}`);
            dirs.add(`${mcVersion}-forge-${mcVersion}-${loaderVersion}`);
        } else if (type === 'neoforge') {
            dirs.add(`neoforge-${loaderVersion}-${mcVersion}`);
            dirs.add(`${mcVersion}-neoforge-${loaderVersion}`);
            dirs.add(`neoforge-${mcVersion}-${loaderVersion}`);
            dirs.add(`neoforge-${loaderVersion}`);
            dirs.add(`${mcVersion}-neoforge-${mcVersion}-${loaderVersion}`);
        } else if (type === 'quilt') {
            dirs.add(`quilt-loader-${loaderVersion}-${mcVersion}`);
            dirs.add(`quilt-${mcVersion}-${loaderVersion}`);
            dirs.add(`quilt-loader-${mcVersion}-${loaderVersion}`);
        } else if (type === 'optifine') {
            dirs.add(`${mcVersion}-OptiFine_${loaderVersion}`);
            dirs.add(`optifine-${mcVersion}-${loaderVersion}`);
        }
    }
    // Also add raw version string as fallback if someone named folder exactly that
    dirs.add(version);
    dirs.add(`${type}-${mcVersion}${loaderVersion ? '-' + loaderVersion : ''}`);

    return Array.from(dirs);
}

module.exports = {
    parseVersionString,
    getPossibleDirNames
};
