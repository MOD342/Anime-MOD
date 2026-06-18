import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

let dbInstance;
const isBrowser = typeof window !== 'undefined';

// Check if running inside a mobile App/WebView (e.g., Cordova, Capacitor, native Android WebView)
const isWebView = isBrowser && (
  window.location.protocol === 'file:' || 
  window.location.hostname === 'localhost' ||
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  navigator.userAgent.includes('wv') ||
  (navigator.userAgent.includes('Android') && navigator.userAgent.includes('Version/'))
);

const dbId = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)")
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

const isIframe = isBrowser && (window.self !== window.top);

if (isIframe) {
  console.log("AI Studio Sandbox: Running inside iframe, bypassing persistent cache to ensure reliable Firestore connection.");
  dbInstance = getFirestore(app, dbId);
} else if (isWebView) {
  console.log("MOD Developer Suite: WebView/APK environment detected. Activating long-polling and single-tab optimizations.");
  try {
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: undefined // No multi-tab tracking in single-view APK wrappers
      })
    }, dbId);
  } catch (error) {
    console.warn("Firestore WebView fallback initiated.", error);
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true
    }, dbId);
  }
} else if (isBrowser) {
  try {
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, dbId);
  } catch (error) {
    console.warn("Firestore persistent cache not supported in this environment, falling back to default.", error);
    dbInstance = getFirestore(app, dbId);
  }
} else {
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, dbId);
}

export const db = dbInstance;
export const auth = getAuth(app);

