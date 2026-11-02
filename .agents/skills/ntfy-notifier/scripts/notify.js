#!/usr/bin/env node

/**
 * Script puente de la skill ntfy-notifier hacia scripts/notify-ntfy.js
 */

const path = require('path');
const targetScript = path.resolve(__dirname, '..', '..', '..', 'scripts', 'notify-ntfy.js');

require(targetScript);
