#!/usr/bin/env node

/**
 * Sistema de Notificaciones de Progreso vía NTFY
 * 
 * Envía avisos sobre cambios y tareas completadas hacia la aplicación
 * móvil o web de NTFY (ntfy.sh o servidor autohospedado).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Lugares donde se busca la configuración en orden de prioridad
const CONFIG_CANDIDATES = [
  path.resolve(process.cwd(), 'ntfy.config.json'),
  path.resolve(process.cwd(), '.ntfy.json'),
  path.resolve(process.cwd(), '.agents', 'ntfy.json'),
  path.join(os.homedir(), '.gemini', 'config', 'ntfy.json')
];

/**
 * Carga la configuración desde archivos o variables de entorno.
 */
function loadConfig() {
  let fileConfig = {};

  for (const configPath of CONFIG_CANDIDATES) {
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        fileConfig = JSON.parse(raw);
        fileConfig._source = configPath;
        break;
      } catch (err) {
        console.warn(`[NTFY] Advertencia: Error al leer ${configPath}: ${err.message}`);
      }
    }
  }

  let server = process.env.NTFY_SERVER || fileConfig.server || 'https://ntfy.sh';
  let topic = process.env.NTFY_TOPIC || fileConfig.topic || '';
  let token = process.env.NTFY_TOKEN || fileConfig.token || '';
  let defaultTitle = fileConfig.defaultTitle || 'HelloWorld Launcher - Progreso';

  // Configuración de tags/emojis por defecto
  let defaultTags = ['sparkles'];
  if (fileConfig.tags !== undefined) {
    defaultTags = Array.isArray(fileConfig.tags) ? fileConfig.tags : [fileConfig.tags];
  }

  // Si el usuario puso una URL completa en topic, extraer server y topic
  if (topic.startsWith('http://') || topic.startsWith('https://')) {
    try {
      const url = new URL(topic);
      server = `${url.protocol}//${url.host}`;
      topic = url.pathname.replace(/^\/+/, '');
    } catch (_) {
      // Dejar como está si no parsea
    }
  }

  server = server.replace(/\/+$/, '');
  topic = topic.trim();

  return {
    server,
    topic,
    token: token.trim(),
    defaultTitle,
    defaultTags,
    _source: fileConfig._source || null
  };
}

/**
 * Parsea los argumentos de línea de comandos de forma flexible y robusta.
 */
function parseArgs() {
  const rawArgs = process.argv.slice(2);
  const result = {
    title: '',
    message: '',
    tags: null,
    priority: 3,
    isTest: false,
    showHelp: false
  };

  const positional = [];
  let i = 0;

  while (i < rawArgs.length) {
    const arg = rawArgs[i];

    if (arg === '--help' || arg === '-h') {
      result.showHelp = true;
      i++;
    } else if (arg === '--test') {
      result.isTest = true;
      i++;
    } else if (arg.startsWith('--title=') || arg.startsWith('-t=')) {
      result.title = arg.split('=').slice(1).join('=');
      i++;
    } else if (arg === '--title' || arg === '-t' || arg === '-title') {
      i++;
      const words = [];
      while (i < rawArgs.length && !rawArgs[i].startsWith('-')) {
        words.push(rawArgs[i]);
        i++;
      }
      result.title = words.join(' ');
    } else if (arg.startsWith('--message=') || arg.startsWith('-m=')) {
      result.message = arg.split('=').slice(1).join('=');
      i++;
    } else if (arg === '--message' || arg === '-m' || arg === '-message') {
      i++;
      const words = [];
      while (i < rawArgs.length && !rawArgs[i].startsWith('-')) {
        words.push(rawArgs[i]);
        i++;
      }
      result.message = words.join(' ');
    } else if (arg.startsWith('--tags=')) {
      const val = arg.split('=').slice(1).join('=');
      result.tags = val.split(',').map(s => s.trim()).filter(Boolean);
      i++;
    } else if (arg === '--tags') {
      i++;
      const val = rawArgs[i] || '';
      result.tags = val.split(',').map(s => s.trim()).filter(Boolean);
      i++;
    } else if (arg.startsWith('--priority=') || arg.startsWith('-p=')) {
      const p = parseInt(arg.split('=').slice(1).join('='), 10);
      if (!isNaN(p)) result.priority = p;
      i++;
    } else if (arg === '--priority' || arg === '-p') {
      i++;
      const p = parseInt(rawArgs[i], 10);
      if (!isNaN(p)) result.priority = p;
      i++;
    } else if (arg === '--topic') {
      i++;
      result.customTopic = rawArgs[i];
      i++;
    } else if (arg === '--token') {
      i++;
      result.customToken = rawArgs[i];
      i++;
    } else if (arg === '--server') {
      i++;
      result.customServer = rawArgs[i];
      i++;
    } else {
      positional.push(arg);
      i++;
    }
  }

  // Resolver argumentos posicionales según lo que ya se haya asignado con flags
  if (!result.title && !result.message) {
    if (positional.length === 1) {
      result.message = positional[0];
    } else if (positional.length === 2) {
      result.title = positional[0];
      result.message = positional[1];
    } else if (positional.length > 2) {
      result.title = positional[0];
      result.message = positional.slice(1).join(' ');
    }
  } else if (result.title && !result.message && positional.length > 0) {
    result.message = positional.join(' ');
  } else if (!result.title && result.message && positional.length > 0) {
    result.title = positional.join(' ');
  }

  return result;
}

function printHelp() {
  console.log(`
Uso del Notificador NTFY:
  node scripts/notify-ntfy.js "Título" "Mensaje"
  node scripts/notify-ntfy.js "Mensaje"
  npm run notify -- "Título" "Mensaje"
  npm run notify -- --title "Título" --message "Mensaje"
  npm run notify -- --test

Opciones:
  --title, -t    Título de la notificación (por defecto: configurado en ntfy.config.json)
  --message, -m  Mensaje descriptivo sobre los cambios realizados
  --tags         Lista de tags/emojis separados por coma (ej: rocket,bell o vacio para ninguno)
  --priority, -p Prioridad de 1 (mínima) a 5 (urgente). Por defecto 3
  --test         Envía una notificación de prueba para comprobar la conexión
  --help, -h     Muestra esta ayuda
`);
}

async function sendNotification() {
  const parsed = parseArgs();

  if (parsed.showHelp) {
    printHelp();
    return;
  }

  const config = loadConfig();
  const topic = (parsed.customTopic || config.topic).trim();
  const server = (parsed.customServer || config.server).replace(/\/+$/, '');
  const token = (parsed.customToken !== undefined ? parsed.customToken : config.token).trim();

  // Comprobar si el canal está configurado
  const isPlaceholder = !topic || 
    topic === 'PON_AQUI_TU_TEMA_O_CANAL_DE_NTFY' || 
    topic === 'tu-canal-privado-aqui' ||
    topic.toLowerCase().includes('pon_aqui');

  if (isPlaceholder) {
    console.log('\n[NTFY] ⚠️  Aviso: Aún no has configurado tu canal/topic de NTFY.');
    console.log('Para recibir notificaciones en tu móvil u ordenador:');
    console.log('1. Abre o descarga la app de NTFY (o entra en https://ntfy.sh).');
    console.log('2. Elige un nombre para tu canal (por ejemplo: "abelosky-hwl-progress").');
    console.log('3. Escríbelo en "ntfy.config.json" en la raíz del proyecto:');
    console.log('   {\n     "topic": "tu-nombre-de-canal-aqui"\n   }\n');
    console.log('Una vez configurado, podrás ejecutar `npm run notify -- --test` para verificarlo.\n');
    return;
  }

  let title = parsed.title;
  let message = parsed.message;
  let tags = parsed.tags !== null ? parsed.tags : config.defaultTags;
  let priority = parsed.priority;

  if (parsed.isTest) {
    title = title || 'HelloWorld Launcher - Conexión NTFY Exitosa';
    message = message || '¡El sistema de notificaciones está funcionando perfectamente! A partir de ahora recibirás aquí los avisos cada vez que se complete un cambio en el launcher.';
    tags = parsed.tags !== null ? parsed.tags : (config.defaultTags.length > 0 ? config.defaultTags : ['white_check_mark']);
    priority = 3;
  } else {
    title = title || config.defaultTitle;
    if (!message) {
      console.error('[NTFY] Error: No se especificó ningún mensaje.');
      console.error('Uso: node scripts/notify-ntfy.js "Título" "Mensaje"');
      process.exitCode = 1;
      return;
    }
  }

  const payload = {
    topic,
    title,
    message,
    tags,
    priority
  };

  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(server, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[NTFY] ❌ Error HTTP ${response.status}: ${errText}`);
      process.exitCode = 1;
      return;
    }

    await response.json();
    console.log(`[NTFY] ✅ Notificación enviada con éxito al canal "${topic}".`);
    console.log(`[NTFY] 🔗 Ver en web: ${server}/${topic}`);
  } catch (err) {
    console.error(`[NTFY] ❌ Error de red al conectar con NTFY (${server}): ${err.message}`);
    process.exitCode = 1;
  }
}

sendNotification();
