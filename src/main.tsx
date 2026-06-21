/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

// مُعترض لطلبات الـ fetch لضمان عمل التطبيق على Vercel وتطبيقات أندرويد والويب فيوز (WebView) بكل سلاسة
// يقوم بتحويل المسارات النسبية للـ API (/api/...) إلى روابط كاملة تشير إلى السيرفر السحابي المباشر عند تشغيل التطبيق خارج بيئة التطوير الأصلية.
const originalFetch = window.fetch;

function resolveAbsoluteUrl(input: any): any {
  if (typeof input === 'string' && input.startsWith('/api')) {
    const host = window.location.hostname;
    
    // الحالات التي لا نحتاج فيها إلى تحويل الرابط (التطوير المحلي داخل حاوية AI Studio)
    const isDirectRun = host.includes('europe-west2.run.app') || (host === 'localhost' && window.location.port === '3000');
    
    if (!isDirectRun) {
      // استخدام متغير البيئة VITE_API_URL إن وُجد، وإلا استخدام خادم الإنتاج السحابي الافتراضي
      const defaultHost = import.meta.env.VITE_API_URL || 'https://ais-pre-n66z4zqpsskq4rqmdhuz4r-358090555339.europe-west2.run.app';
      let absoluteHost = defaultHost;
      try {
        const storedHost = localStorage.getItem('custom_api_host');
        if (storedHost && storedHost.trim()) {
          absoluteHost = storedHost.trim();
        }
      } catch (err) {
        console.warn('Could not read custom_api_host from localStorage:', err);
      }
      
      const cleanHost = absoluteHost.endsWith('/') ? absoluteHost.slice(0, -1) : absoluteHost;
      const cleanInput = input.startsWith('/') ? input : `/${input}`;
      return `${cleanHost}${cleanInput}`;
    }
  }
  return input;
}

try {
  Object.defineProperty(window, 'fetch', {
    value: function (input: any, init?: any) {
      const resolvedInput = resolveAbsoluteUrl(input);
      return originalFetch(resolvedInput, init);
    },
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (e) {
  console.warn("Failed to override window.fetch via Object.defineProperty, falling back to direct assignment:", e);
  try {
    (window as any).fetch = function (input: any, init?: any) {
      const resolvedInput = resolveAbsoluteUrl(input);
      return originalFetch(resolvedInput, init);
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
