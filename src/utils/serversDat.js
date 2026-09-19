const fs = require('fs');
const path = require('path');
const nbt = require('prismarine-nbt');
async function parseNbt(buffer) {
    try {
        const res = nbt.parse(buffer);
        if (res && typeof res.then === 'function') {
            return await res;
        }
    } catch (_) {}
    return new Promise((resolve, reject) => {
        nbt.parse(buffer, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

/**
 * Añade un servidor a la lista de servidores de Minecraft (servers.dat).
 * Esto permite que si la conexión falla ("Connection reset"), el usuario 
 * pueda reintentar unirse desde el menú Multijugador sin tener que volver 
 * a usar el botón del launcher o añadir la IP a mano.
 *
 * @param {string} mcDir - La ruta a la carpeta de Minecraft (e.g. .minecraft)
 * @param {string} serverIp - La IP o dominio del servidor
 */
async function addServerToServersDat(mcDir, serverIp) {
    if (!serverIp) return;
    
    const serversDatPath = path.join(mcDir, 'servers.dat');
    let serversData = {
        name: '',
        type: 'compound',
        value: {
            servers: {
                type: 'list',
                value: {
                    type: 'compound',
                    value: []
                }
            }
        }
    };
    
    // Leer el archivo existente si existe
    if (fs.existsSync(serversDatPath)) {
        try {
            const buffer = fs.readFileSync(serversDatPath);
            const nbtResult = await parseNbt(buffer);
            const parsed = (nbtResult && nbtResult.parsed) ? nbtResult.parsed : nbtResult;
            if (parsed && parsed.value && parsed.value.servers) {
                serversData = parsed;
            }
        } catch (e) {
            console.warn('[serversDat] Error al parsear servers.dat, se creará uno nuevo.', e.message);
        }
    }
    
    // Asegurar que existe el array de servidores
    if (!serversData.value.servers) {
        serversData.value.servers = { type: 'list', value: { type: 'compound', value: [] } };
    }
    
    const serversList = serversData.value.servers.value.value;
    
    // Comprobar si el servidor ya está en la lista (ignorando mayúsculas/minúsculas)
    const exists = serversList.some(srv => {
        return srv.ip && srv.ip.value && srv.ip.value.toLowerCase() === serverIp.toLowerCase();
    });
    
    if (exists) {
        console.log(`[serversDat] El servidor ${serverIp} ya existe en la lista.`);
        return;
    }
    
    // Añadir el nuevo servidor al principio de la lista
    const newServer = {
        name: { type: 'string', value: 'Minecraft Server' },
        ip: { type: 'string', value: serverIp }
    };
    
    serversList.unshift(newServer);
    
    // Escribir los cambios (servers.dat se guarda como NBT sin comprimir en versiones >= 1.6)
    try {
        const outBuffer = nbt.writeUncompressed(serversData);
        fs.writeFileSync(serversDatPath, outBuffer);
        console.log(`[serversDat] Añadido ${serverIp} a servers.dat correctamente.`);
    } catch (e) {
        console.error('[serversDat] Error al guardar servers.dat:', e);
    }
}

/**
 * Obtiene la lista de IPs de servidores guardados en servers.dat.
 *
 * @param {string} mcDir - La ruta a la carpeta de Minecraft (e.g. .minecraft)
 * @returns {Promise<string[]>} Lista de IPs de servidores
 */
async function getServerHistory(mcDir) {
    if (!mcDir) return [];
    const serversDatPath = path.join(mcDir, 'servers.dat');
    if (!fs.existsSync(serversDatPath)) return [];
    try {
        const buffer = fs.readFileSync(serversDatPath);
        const nbtResult = await parseNbt(buffer);
        const parsed = (nbtResult && nbtResult.parsed) ? nbtResult.parsed : nbtResult;
        if (parsed && parsed.value && parsed.value.servers) {
            const list = parsed.value.servers.value?.value || [];
            const history = list
                .map(srv => (srv.ip && srv.ip.value ? String(srv.ip.value).trim() : ''))
                .filter(ip => ip.length > 0);
            return [...new Set(history)];
        }
    } catch (e) {
        console.warn('[serversDat] Error al leer historial de servers.dat:', e.message);
    }
    return [];
}

module.exports = { addServerToServersDat, getServerHistory };
