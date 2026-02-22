// src/lib/test-firebase.ts
import { db } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  try {
    // Test write
    const testCollection = collection(db, 'test');
    const docRef = await addDoc(testCollection, {
      message: 'Hello from JagaDoku!',
      timestamp: new Date().toISOString(),
    });
    
    console.log('✅ Write success! Doc ID:', docRef.id);
    
    // Test read
    const snapshot = await getDocs(testCollection);
    console.log('✅ Read success! Docs count:', snapshot.size);
    
    return { success: true, docId: docRef.id };
  } catch (error) {
    console.error('❌ Firebase error:', error);
    return { success: false, error };
  }
};