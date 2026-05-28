const client = require('discord-rich-presence')('1464624951578595368');

class RPCManager {
    constructor() {
        this.startTimestamp = new Date();
        this.currentState = null;
        console.log('Discord RPC Initialized (Rich Presence)');
        this.setLauncher();
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

    buildDetails(version, profileName, ign) {
        const parts = [];
        if (version) parts.push(`Version: ${version}`);
        if (profileName) parts.push(`Profile: ${profileName}`);
        if (ign) parts.push(`IGN: ${ign}`);
        return parts.length > 0 ? parts.join(' • ') : 'HelloWorld Launcher';
    }

    updatePresence(payload) {
        try {
            client.updatePresence(payload);
            this.currentState = payload;
        } catch (e) {
            console.warn('RPC Update Failed:', e);
        }
    }

    setLauncher() {
        this.startTimestamp = new Date();
        this.updatePresence({
            ...this.basePresence(),
            state: 'Online',
            details: 'On Launcher'
        });
    }

    setMenu({ version, profileName, ign } = {}) {
        this.startTimestamp = new Date();
        this.updatePresence({
            ...this.basePresence(),
            state: 'In Menu',
            details: this.buildDetails(version, profileName, ign)
        });
    }

    setPlaying({ version, profileName, ign, worldName } = {}) {
        this.startTimestamp = new Date();
        this.updatePresence({
            ...this.basePresence(),
            state: worldName ? `Playing ${worldName}` : 'Playing Minecraft',
            details: this.buildDetails(version, profileName, ign),
            smallImageKey: 'minecraft_icon',
            smallImageText: version || 'Minecraft'
        });
    }

    setServer({ version, profileName, ign, serverIp, privacyMode } = {}) {
        this.startTimestamp = new Date();
        const displayServerIp = privacyMode ? '' : serverIp;
        this.updatePresence({
            ...this.basePresence(),
            state: displayServerIp ? `Playing on ${displayServerIp}` : 'Playing Multiplayer',
            details: this.buildDetails(version, profileName, ign),
            smallImageKey: 'minecraft_icon',
            smallImageText: version || 'Minecraft'
        });
    }
}

module.exports = new RPCManager();
