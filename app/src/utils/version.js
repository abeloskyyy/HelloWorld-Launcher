/**
 * Universal Version Utility
 * Handles parsing, formatting, and normalizing version nomenclature across HelloWorld-Launcher.
 * 
 * New Nomenclature:
 * - Vanilla <mcVersion> (e.g., Vanilla 1.21.11)
 * - Fabric <mcVersion> (<loaderVersion>) (e.g., Fabric 1.21.11 (0.58.2))
 * - Forge <mcVersion> (<loaderVersion>) (e.g., Forge 1.20.1 (47.4.10))
 * - NeoForge <mcVersion> (<loaderVersion>) (e.g., NeoForge 1.21.1 (21.1.5))
 * - NeoForge <mcVersion> (<loaderVersion>)
 * - OptiFine <mcVersion> (<loaderVersion>)
 */

function parseVersionString(version) {
    if (!version || typeof version !== 'string') return null;
    const raw = version.trim();
    if (!raw) return null;

    let type = 'vanilla';
    let software = 'Vanilla';

    // Check prefix or keywords
    const prefixMatch = raw.match(/^(Vanilla|Fabric|Forge|NeoForge|OptiFine)\b/i);
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
/**
 * Parses a Minecraft version string (including snapshots and alpha/beta) into a semantic version structure.
 * This is useful for feature detection (e.g. knowing if a snapshot corresponds to 1.20+)
 */
function getSemanticVersion(versionStr) {
    if (!versionStr) return { major: 1, minor: 0, patch: 0, isSnapshot: false };
    
    // YEAR.DROP.PATCH format (e.g. 26.2, 26.3, 26.3 Snapshot 7)
    // Minecraft changed versioning around 2026 to Year.Drop format.
    const yearDropMatch = versionStr.match(/^(\d{2,4})\.(\d+)(?:\.(\d+))?/);
    if (yearDropMatch && parseInt(yearDropMatch[1], 10) >= 20) {
        // Map Year.Drop to a virtual minor > 20 so it's treated as modern (e.g. 2026 -> 23)
        const year = parseInt(yearDropMatch[1], 10);
        const actualYear = year < 2000 ? 2000 + year : year; 
        const virtualMinor = actualYear - 2003; 
        return {
            major: 1,
            minor: virtualMinor,
            patch: parseInt(yearDropMatch[2], 10),
            isSnapshot: versionStr.toLowerCase().includes('snapshot') || versionStr.includes('-pre') || versionStr.includes('-rc')
        };
    }

    // Release or Pre-release/RC: 1.20, 1.20.1, 1.20-rc1, 1.20.2-pre2
    const releaseMatch = versionStr.match(/1\.(\d+)(?:\.(\d+))?/);
    if (releaseMatch) {
        return {
            major: 1,
            minor: parseInt(releaseMatch[1], 10),
            patch: releaseMatch[2] ? parseInt(releaseMatch[2], 10) : 0,
            isSnapshot: versionStr.includes('-pre') || versionStr.includes('-rc')
        };
    }

    // Snapshot: 23w14a, 24w03b, etc.
    const snapMatch = versionStr.match(/^(\d{2})w(\d{2})[a-z]$/i);
    if (snapMatch) {
        const year = parseInt(snapMatch[1], 10); // e.g. 23
        const week = parseInt(snapMatch[2], 10);
        let minor = 0;
        
        if (year >= 24) minor = 21;
        else if (year === 23) minor = week >= 12 ? 20 : 19; // 23w12a+ is 1.20, 23w03a is 1.19.4
        else if (year === 22) minor = 19;
        else if (year === 21) minor = 17;
        else if (year === 20) minor = 16;
        else if (year === 19) minor = week >= 34 ? 15 : 14; // 19w34a+ is 1.15
        else if (year === 18) minor = week >= 43 ? 14 : 13; // 18w43a+ is 1.14
        else if (year === 17) minor = 12;
        else if (year === 16) minor = week >= 32 ? 11 : 10; // 16w32a+ is 1.11
        else if (year === 15) minor = 9;
        else if (year === 14) minor = 8;
        else if (year === 13) minor = week >= 36 ? 7 : (week >= 16 ? 6 : 5); // 13w36a+ is 1.7, 13w16a+ is 1.6
        else if (year === 12) minor = week >= 32 ? 4 : (week >= 15 ? 3 : 2); // 12w32a+ is 1.4
        else if (year === 11) minor = 1;

        return { major: 1, minor, patch: 0, isSnapshot: true, snapshotYear: year };
    }

    // Alpha/Beta: a1.2.6, b1.7.3
    const alphaBetaMatch = versionStr.match(/^[ab](\d+)\.(\d+)(?:\.(\d+))?/i);
    if (alphaBetaMatch) {
        return { 
            major: 0, 
            minor: parseInt(alphaBetaMatch[1], 10), 
            patch: parseInt(alphaBetaMatch[2], 10), 
            isSnapshot: false 
        };
    }

    return { major: 1, minor: 0, patch: 0, isSnapshot: false };
}

module.exports = {
    parseVersionString,
    getPossibleDirNames,
    getSemanticVersion
};
