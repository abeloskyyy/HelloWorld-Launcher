/**
 * Ejecuta backend/migrations/0002_migrated_data.sql en lotes seguros (<= 60 KB)
 * para respetar el límite de tamaño de sentencia/lote de Cloudflare D1.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const mode = process.argv.includes('--remote') ? '--remote' : '--local';
const backendDir = path.resolve(__dirname, '..');
const sqlPath = path.join(backendDir, 'migrations', '0002_migrated_data.sql');

if (!fs.existsSync(sqlPath)) {
  console.error('❌ No existe backend/migrations/0002_migrated_data.sql. Ejecuta primero npm run seed:generate');
  process.exit(1);
}

const raw = fs.readFileSync(sqlPath, 'utf8');
const statements = raw
  .split(/(?=\nINSERT INTO )/)
  .map(s => s.trim())
  .filter(s => s.startsWith('INSERT INTO'));

const MAX_BATCH_BYTES = 60 * 1024;
const MAX_BATCH_STMTS = 25;
const batches = [];
let currentBatch = [];
let currentBytes = 0;

for (const stmt of statements) {
  const bytes = Buffer.byteLength(stmt, 'utf8');
  if (currentBatch.length > 0 && (currentBytes + bytes > MAX_BATCH_BYTES || currentBatch.length >= MAX_BATCH_STMTS)) {
    batches.push(currentBatch.join('\n\n'));
    currentBatch = [];
    currentBytes = 0;
  }
  currentBatch.push(stmt);
  currentBytes += bytes;
}
if (currentBatch.length > 0) {
  batches.push(currentBatch.join('\n\n'));
}

console.log(`🚀 Aplicando ${statements.length} sentencias en ${batches.length} lotes seguros (${mode})...`);

const tmpFile = path.join(backendDir, '.tmp_d1_batch.sql');
try {
  for (let i = 0; i < batches.length; i++) {
    fs.writeFileSync(tmpFile, batches[i], 'utf8');
    console.log(`   ⏳ Lote ${i + 1}/${batches.length} (${Math.round(Buffer.byteLength(batches[i], 'utf8') / 1024)} KB)...`);
    execFileSync('npx', ['wrangler', 'd1', 'execute', 'DB', mode, `--file=${tmpFile}`, '--yes'], {
      cwd: backendDir,
      stdio: 'inherit'
    });
  }
  console.log('\n✅ Migración completa aplicada correctamente en D1.\n');
} finally {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
}
