import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase's web config is not a secret — it identifies the project, not a
 * credential. Access is enforced by Firestore security rules (see
 * firestore.rules) and Firebase Authentication, not by hiding these values.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyC3u-zRDuKLYqPIYVTyfmJITwMvHWgmLZA',
  authDomain: 'lucdia-ae93d.firebaseapp.com',
  projectId: 'lucdia-ae93d',
  storageBucket: 'lucdia-ae93d.firebasestorage.app',
  messagingSenderId: '597220343003',
  appId: '1:597220343003:web:d6063b9bae7a090de9a0fe',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
