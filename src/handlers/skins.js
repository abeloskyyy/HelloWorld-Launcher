const fs = require('fs-extra');
const path = require('path');
const uuid = require('uuid');
const axios = require('axios');
const FormData = require('form-data');
const paths = require('../utils/paths');

class SkinManager {
    constructor() {
        // Paths resolved dynamically via paths.js
    }

    getSkinPacks() {
        try {
            const packsDir = paths.getSkinsDir();
            fs.ensureDirSync(packsDir);

            const packs = {};
            let activePack = null;

            // Load active pack from state.json
            const stateFile = path.join(packsDir, 'state.json');
            if (fs.existsSync(stateFile)) {
                try {
                    const state = fs.readJsonSync(stateFile);
                    activePack = state.active_pack || null;
                } catch (e) {
                    console.error('[SkinManager] Error reading state.json:', e);
                }
            }

            if (fs.existsSync(packsDir)) {
                const files = fs.readdirSync(packsDir);
                for (const f of files) {
                    if (f.endsWith('.json') && f !== 'state.json') {
                        try {
                            const data = fs.readJsonSync(path.join(packsDir, f));

                            // Strict validation
                            if (!data.id || !data.name) continue;

                            packs[data.id] = {
                                name: data.name,
                                skin_preview: data.skin,
                                skin_model: data.model,
                                cape_id: data.cape,
                                cape_preview: data.cape_data || null
                            };
                        } catch (e) {
                            console.error(`[SkinManager] Error reading ${f}:`, e);
                        }
                    }
                }
            }

            return { packs, active_pack: activePack };
        } catch (e) {
            console.error("[SkinManager] Error loading packs:", e);
            return { packs: {}, active_pack: null };
        }
    }

    saveSkinPack(data) {
        const packsDir = paths.getSkinsDir();
        console.log(`[SkinManager] Saving pack ${data.id} to ${packsDir}`);
        fs.ensureDirSync(packsDir);
        const filePath = path.join(packsDir, `${data.id}.json`);
        fs.writeJsonSync(filePath, data);
        console.log(`[SkinManager] Pack saved to ${filePath}`);
    }

    createSkinPack(name, skinBase64, model, capeId, capeBase64) {
        // console.log(`[SkinManager] Creating pack: ${name}, Model: ${model}, Cape: ${capeId}`);
        const id = uuid.v4();
        const pack = {
            id,
            name,
            skin: skinBase64,
            model: model || 'classic',
            cape: capeId || null,
            cape_data: capeBase64 || null
        };
        this.saveSkinPack(pack);
        return { success: true, pack };
    }

    editSkinPack(id, name, skinBase64, model, capeId, capeBase64) {
        const packDir = paths.getSkinsDir();
        const packFile = path.join(packDir, `${id}.json`);

        if (!fs.existsSync(packFile)) return { success: false, error: "Pack not found" };

        try {
            const pack = fs.readJsonSync(packFile);

            if (name) pack.name = name;
            if (skinBase64) pack.skin = skinBase64;
            if (model) pack.model = model;
            if (capeId !== undefined) pack.cape = capeId;

            // Only update cape_data if explicitly provided
            // If capeBase64 is undefined, keep existing cape_data
            if (capeBase64 !== undefined) {
                pack.cape_data = capeBase64;
            }

            this.saveSkinPack(pack);
            return { success: true, pack };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    deleteSkinPack(id) {
        try {
            const packsDir = paths.getSkinsDir();
            const file = path.join(packsDir, `${id}.json`);
            if (fs.existsSync(file)) {
                fs.removeSync(file);
                return { success: true };
            }
        } catch (e) { }
        return { success: false };
    }

    // Upload to Mojang
    // Requires active Microsoft session token
    async activateSkinPack(id, token) {
        const packsDir = paths.getSkinsDir();
        fs.ensureDirSync(packsDir);
        const packFile = path.join(packsDir, `${id}.json`);

        if (!fs.existsSync(packFile)) {
            return { success: false, error: "Skin pack not found localy" };
        }

        try {
            const pack = fs.readJsonSync(packFile);
            const variant = pack.model === 'slim' ? 'slim' : 'classic';
            const skinBase64 = pack.skin; // "data:image/png;base64,....."

            if (!skinBase64) return { success: false, error: "No skin data in pack" };

            // Convert base64 to buffer
            const base64Data = skinBase64.replace(/^data:image\/png;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');

            // Prepare Mojang API Upload
            const form = new FormData();
            form.append('variant', variant);
            form.append('file', buffer, { filename: 'skin.png', contentType: 'image/png' });

            console.log(`[SkinManager] Uploading skin to Mojang (Variant: ${variant})...`);

            const response = await axios.post('https://api.minecraftservices.com/minecraft/profile/skins', form, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...form.getHeaders()
                },
                maxBodyLength: Infinity
            });

            console.log(`[SkinManager] Upload Success: ${response.status}`);

            // Update local state if successful
            const stateFile = path.join(packsDir, 'state.json');
            fs.writeJsonSync(stateFile, { active_pack: id });

            return { success: true };

        } catch (e) {
            console.error("[SkinManager] Upload Failed:", e.response ? e.response.data : e.message);
            return {
                success: false,
                error: e.response && e.response.data && e.response.data.errorMessage
                    ? e.response.data.errorMessage
                    : (e.message || "Upload failed")
            };
        }
    }
}

module.exports = new SkinManager();
