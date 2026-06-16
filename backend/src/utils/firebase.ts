import admin from 'firebase-admin';

if (!admin.apps.length) {
  // Try to parse the private key, handling escaped newlines if they exist
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

export const bucket = admin.storage().bucket();
export default admin;
