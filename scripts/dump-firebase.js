/**
 * Script de Extracción y Auditoría Completa de Firebase (Firestore + Realtime Database)
 * Requiere: serviceAccountKey.json en la raíz del proyecto.
 */

const fs = require('fs');
const path = require('path');

const keyPath = path.resolve(__dirname, '..', 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
  console.error('\n❌ ERROR: No se encontró el archivo "serviceAccountKey.json" en la raíz del proyecto.');
  console.error('Por favor descárgalo desde la consola de Firebase:');
  console.error('Ajustes del Proyecto -> Cuentas de servicio -> "Generar nueva clave privada".');
  console.error('Y colócalo en: ' + keyPath + '\n');
  process.exit(1);
}

const serviceAccount = require(keyPath);
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getDatabase } = require('firebase-admin/database');

initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://helloworld-launcher-default-rtdb.firebaseio.com'
});

const db = getFirestore();
const rtdb = getDatabase();

const outDir = path.resolve(__dirname, '..', 'firebase_dump');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function dumpFirestore() {
  console.log('\n--- 1. Extrayendo Cloud Firestore ---');
  const collections = await db.listCollections();
  const summary = {};

  for (const col of collections) {
    const colId = col.id;
    console.log(`📦 Leyendo colección: "${colId}"...`);
    const snapshot = await col.get();
    const docsData = [];
    const schemaFields = new Set();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      Object.keys(data).forEach(k => schemaFields.add(k));

      // Inspeccionar posibles subcolecciones conocidas
      const subcollections = await doc.ref.listCollections();
      const subsData = {};
      for (const sub of subcollections) {
        const subSnap = await sub.get();
        subsData[sub.id] = subSnap.docs.map(sDoc => ({
          _id: sDoc.id,
          ...sDoc.data()
        }));
      }

      docsData.push({
        _id: doc.id,
        ...data,
        ...(Object.keys(subsData).length > 0 ? { _subcollections: subsData } : {})
      });
    }

    summary[colId] = {
      totalDocs: docsData.length,
      fieldsDetected: Array.from(schemaFields)
    };

    const filePath = path.join(outDir, `firestore_${colId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docsData, null, 2), 'utf8');
    console.log(`   ✅ Guardados ${docsData.length} documentos en: ${filePath}`);
  }

  return summary;
}

async function dumpRTDB() {
  console.log('\n--- 2. Extrayendo Realtime Database ---');
  try {
    const rootSnapshot = await rtdb.ref().once('value');
    const val = rootSnapshot.val() || {};
    const filePath = path.join(outDir, 'rtdb_full.json');
    fs.writeFileSync(filePath, JSON.stringify(val, null, 2), 'utf8');
    console.log(`   ✅ Realtime Database extraída con éxito en: ${filePath}`);
    return Object.keys(val);
  } catch (err) {
    console.warn('   ⚠️ Aviso al extraer RTDB:', err.message);
    return [];
  }
}

async function run() {
  try {
    const fsSummary = await dumpFirestore();
    const rtdbNodes = await dumpRTDB();

    const summaryReport = {
      timestamp: new Date().toISOString(),
      firestore: fsSummary,
      realtimeDatabaseNodes: rtdbNodes
    };

    fs.writeFileSync(path.join(outDir, 'audit_summary.json'), JSON.stringify(summaryReport, null, 2), 'utf8');

    console.log('\n=============================================');
    console.log('🎉 EXTRACCIÓN Y AUDITORÍA COMPLETADA CON ÉXITO');
    console.log('=============================================');
    console.log('Resumen de Colecciones y Campos Reales en Firestore:');
    for (const [col, info] of Object.entries(fsSummary)) {
      console.log(`\n• [${col}] (${info.totalDocs} docs):`);
      console.log(`  Campos: ${info.fieldsDetected.join(', ')}`);
    }
    console.log(`\n• Realtime Database Nodos: ${rtdbNodes.join(', ')}`);
    console.log(`\nTodos los datos JSON están guardados en: ${outDir}\n`);

  } catch (err) {
    console.error('❌ Error durante la extracción:', err);
  } finally {
    process.exit(0);
  }
}

run();
