const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// 1. Descarga el archivo de credenciales desde: 
// Firebase Console > Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada
// 2. Este archivo (que descargaste) da ACCESO TOTAL de administrador a Firebase. 
// NUNCA, NUNCA, NUNCA lo incluyas en el instalador de la app.
const serviceAccount = require("service-account.json"); 

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Cambia estos valores según necesites
const uid = "vcED4pwdeiQQAVw9ckzWZd3qlRZ2"; // Tu UID de administrador
const userRole = "admin"; // Puede ser "admin" o "moderator"

async function setAdminRole() {
  try {
    const docRef = db.collection("admins").doc(uid);
    await docRef.set({ role: userRole });
    console.log(`✅ ¡Éxito! Rol '${userRole}' asignado al usuario con UID: ${uid}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error al asignar el rol:", error);
    process.exit(1);
  }
}

setAdminRole();
