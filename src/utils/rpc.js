const client = require('discord-rich-presence')('1464624951578595368');

// We use a simpler approach as this library handles connection internally more gracefully
const clientId = '1464624951578595368';

class RPCManager {
    constructor() {
        this.startTimestamp = new Date();
        this.isConnected = false;

        // discord-rich-presence is simpler, it just works or swallows errors usually.
        // We can't easily detect "ready" event with the wrapper as it abstracts it.
        // But it doesn't crash on build.
        console.log('Discord RPC Initialized (Rich Presence)');
        this.isConnected = true;

        // Initial set
        this.setIdle();
    }

    setIdle() {
        try {
            client.updatePresence({
                state: 'In Menu',
                details: 'Idle',
                startTimestamp: this.startTimestamp,
                largeImageKey: 'logo',
                largeImageText: 'HelloWorld Launcher',
                instance: true,
                buttons: [
                    { label: 'Download Launcher', url: 'https://hwlauncher.abelosky.com' }
                ]
            });
        } catch (e) {
            console.warn('RPC Update Failed:', e);
        }
    }

    setPlaying(version, ign) {
        try {
            client.updatePresence({
                state: 'Playing Minecraft',
                details: `Version: ${version} | IGN: ${ign}`,
                startTimestamp: new Date(),
                largeImageKey: 'logo',
                largeImageText: 'HelloWorld Launcher',
                smallImageKey: 'minecraft_icon',
                smallImageText: version,
                instance: true,
                buttons: [
                    { label: 'Get Launcher', url: 'https://hwlauncher.abelosky.com' }
                ]
            });
        } catch (e) {
            console.warn('RPC Update Failed:', e);
        }
    }
}

module.exports = new RPCManager();
