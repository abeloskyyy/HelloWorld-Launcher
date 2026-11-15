const fs = require('fs');
const path = require('path');

// Auto-bridge Linux sandboxed Discord sockets (Flatpak, Snap, etc.) to standard XDG_RUNTIME_DIR
if (process.platform === 'linux') {
    try {
        const uid = process.getuid ? process.getuid() : 1000;
        const xdgDir = process.env.XDG_RUNTIME_DIR || `/run/user/${uid}`;
        for (let i = 0; i <= 9; i++) {
            const targetSock = path.join(xdgDir, `discord-ipc-${i}`);
            if (!fs.existsSync(targetSock)) {
                const candidates = [
                    path.join(xdgDir, 'app', 'com.discordapp.Discord', `discord-ipc-${i}`),
                    path.join(xdgDir, '.flatpak', 'com.discordapp.Discord', 'xdg-run', `discord-ipc-${i}`),
                    path.join(xdgDir, 'app', 'com.discordapp.DiscordCanary', `discord-ipc-${i}`),
                    path.join(xdgDir, 'snap.discord', `discord-ipc-${i}`)
                ];
                for (const candidate of candidates) {
                    if (fs.existsSync(candidate)) {
                        try {
                            fs.symlinkSync(candidate, targetSock);
                            console.log(`[Discord RPC] Bridged sandboxed socket: ${candidate} -> ${targetSock}`);
                            break;
                        } catch (_) {}
                    }
                }
            }
        }
    } catch (_) {}
}

const client = require('discord-rich-presence')('1464624951578595368');
// Avoid uncaught exception when Discord is not running
client.on('error', (err) => {
    console.warn('[Discord RPC] Connection or presence error:', err.message || err);
});

class RPCManager {
    constructor() {
        this.startTimestamp = new Date();
        this.currentState = null;
        this.enabled = true;
        console.log('Discord RPC Initialized (Rich Presence)');
        this.setLauncher();
    }

    setEnabled(enabled) {
        const wasEnabled = this.enabled;
        this.enabled = Boolean(enabled);
        if (wasEnabled && !this.enabled) {
            this.clear();
        } else if (!wasEnabled && this.enabled) {
            this.setLauncher();
        }
    }

    clear() {
        try {
            client.updatePresence({});
            this.currentState = null;
        } catch (e) {
            console.warn('[Discord RPC] Clear failed:', e);
        }
    }

    basePresence() {
        return {
            startTimestamp: this.startTimestamp,
            largeImageKey: 'logo',
            largeImageText: 'HelloWorld Launcher',
            instance: true,
            buttons: [
                { label: 'Download Launcher', url: 'https://hwlauncher.abelosky.com' }
            ]
        };
    }

    buildDetails(version, profileName, ign, options = {}) {
        const parts = [];
        if (version && options.showGameVersion !== false) parts.push(`Version: ${version}`);
        if (profileName && options.showProfileName !== false) parts.push(`Profile: ${profileName}`);
        if (ign && options.showPlayerIgn !== false) parts.push(`IGN: ${ign}`);
        return parts.length > 0 ? parts.join(' • ') : 'HelloWorld Launcher';
    }

    updatePresence(payload) {
        if (!this.enabled) return;
        try {
            client.updatePresence(payload);
            this.currentState = payload;
        } catch (e) {
            console.warn('RPC Update Failed:', e);
        }
    }

    setLauncher() {
        if (!this.enabled) return;
        this.startTimestamp = new Date();
        this.updatePresence({
            ...this.basePresence(),
            state: 'Online',
            details: 'On Launcher'
        });
    }

    setMenu({ version, profileName, ign, showGameVersion, showProfileName, showPlayerIgn } = {}) {
        if (!this.enabled) return;
        this.startTimestamp = new Date();
        this.updatePresence({
            ...this.basePresence(),
            state: 'In Menu',
            details: this.buildDetails(version, profileName, ign, { showGameVersion, showProfileName, showPlayerIgn })
        });
    }

    setPlaying({ version, profileName, ign, worldName, showWorldName, showGameVersion, showProfileName, showPlayerIgn } = {}) {
        if (!this.enabled) return;
        this.startTimestamp = new Date();
        const cleanWorld = (worldName || '').replace(/ServerLevel\[([^\]]+)\]/i, '$1').trim();
        const displayWorld = (showWorldName !== false && cleanWorld) ? `Playing ${cleanWorld}` : 'Playing Minecraft';
        this.updatePresence({
            ...this.basePresence(),
            state: displayWorld,
            details: this.buildDetails(version, profileName, ign, { showGameVersion, showProfileName, showPlayerIgn }),
            smallImageKey: 'minecraft_icon',
            smallImageText: (showGameVersion !== false && version) ? version : 'Minecraft'
        });
    }

    setServer({ version, profileName, ign, serverIp, privacyMode, showGameVersion, showProfileName, showPlayerIgn } = {}) {
        if (!this.enabled) return;
        this.startTimestamp = new Date();
        const displayServerIp = privacyMode ? '' : serverIp;
        this.updatePresence({
            ...this.basePresence(),
            state: displayServerIp ? `Playing on ${displayServerIp}` : 'Playing Multiplayer',
            details: this.buildDetails(version, profileName, ign, { showGameVersion, showProfileName, showPlayerIgn }),
            smallImageKey: 'minecraft_icon',
            smallImageText: (showGameVersion !== false && version) ? version : 'Minecraft'
        });
    }
}

module.exports = new RPCManager();
