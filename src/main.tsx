import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

// مُترضّ لطلبات الـ fetch لضمان عمل التطبيق على تطبيقات أندرويد 15 والويب فيوز (WebView) بكل سلاسة
// حيث يقوم بتحويل المسارات النسبية المتصلة بالسيرفر (/api/...) إلى روابط كاملة تدعم بروتوكول HTTPS الآمن
const originalFetch = window.fetch;
try {
  Object.defineProperty(window, 'fetch', {
    value: function (input: any, init?: any) {
      if (typeof input === 'string' && input.startsWith('/api')) {
        const protocol = window.location.protocol;
        // التحقق مما إذا كان التطبيق يعمل محلياً كحزمة APK في الهواتف الذكية (مثل Capacitor أو Cordova) أو عبر بروتوكولات محلية
        const isLocal = protocol === 'file:' || protocol.includes('capacitor') || protocol.includes('ionic') || protocol.includes('app') || !window.location.host;
        
        if (isLocal) {
          // استخدام رابط النشر السحابي الآمن كخادم أساسي لتمرير البيانات والطلبات
          const absoluteHost = 'https://ais-pre-n66z4zqpsskq4rqmdhuz4r-358090555339.europe-west2.run.app';
          input = `${absoluteHost}${input}`;
          console.info(`[Android 15 Sync Patch] Refactored relative API call to absolute: ${input}`);
        }
      }
      return originalFetch(input, init);
    },
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (e) {
  console.warn("Failed to override window.fetch via Object.defineProperty, falling back to direct assignment:", e);
  try {
    (window as any).fetch = function (input: any, init?: any) {
      if (typeof input === 'string' && input.startsWith('/api')) {
        const protocol = window.location.protocol;
        const isLocal = protocol === 'file:' || protocol.includes('capacitor') || protocol.includes('ionic') || protocol.includes('app') || !window.location.host;
        if (isLocal) {
          const absoluteHost = 'https://ais-pre-n66z4zqpsskq4rqmdhuz4r-358090555339.europe-west2.run.app';
          input = `${absoluteHost}${input}`;
        }
      }
      return originalFetch(input, init);
    };
  } catch (err) {
    console.error("Could not override fetch at all:", err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
