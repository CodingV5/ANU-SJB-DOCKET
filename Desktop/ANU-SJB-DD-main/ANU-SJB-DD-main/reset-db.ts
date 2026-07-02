import admin from 'firebase-admin';
import path from 'path';

// Initialize Admin
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function deleteCollection(collectionPath: string) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(500);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query: any, resolve: any) {
  const snapshot = await query.get();

  if (snapshot.size === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc: any) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

async function resetSystem() {
  console.log('🚮 INITIALIZING GLOBAL DATA PURGE...');

  try {
    console.log('--- Deleting Cases...');
    await deleteCollection('cases');

    console.log('--- Deleting Summons...');
    await deleteCollection('summons');

    console.log('--- Resetting User Onboarding...');
    const users = await db.collection('users').get();
    const batch = db.batch();
    users.docs.forEach(doc => {
      batch.update(doc.ref, { hasCompletedOnboarding: false, studentId: admin.firestore.FieldValue.delete() });
    });
    await batch.commit();

    console.log('✅ SUCCESS: System has been cleared and reset.');
    process.exit(0);
  } catch (e) {
    console.error('❌ ERROR during reset:', e);
    process.exit(1);
  }
}

resetSystem();
