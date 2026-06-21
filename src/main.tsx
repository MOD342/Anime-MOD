/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { handleFrontendFallback, isFallbackActive, setFallbackActive } from './utils/frontendFallback';

// مُعترض لطلبات الـ fetch لضمان عمل التطبيق على Vercel وتطبيقات أندرويد والويب فيوز (WebView) بكل سلاسة
// يقوم بتحويل المسارات النسبية للـ API (/api/...) إلى روابط كاملة تشير إلى السيرفر السحابي المباشر عند تشغيل التطبيق خارج بيئة التطوير الأصلية،
// ومع وجود نظام الانزلاق والتحويل الذاتي للأطراف الخارجية ليكون التطبيق مكتفياً ذاتياً بالكامل باستخدام Jikan MAL.
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

// دالة مخصصة ومعترضة ومحسنة لتشغيل بدائل الخادم محلياً في المتصفح والـ APK
async function smartFetch(input: any, init?: any): Promise<Response> {
  const urlString = typeof input === 'string' ? input : (input && input.url ? input.url : '');
  
  if (urlString && urlString.includes('/api/')) {
    // 1. إذا كان معروفاً مسبقاً أن السيرفر السحابي مغلق أو غير متاح
    if (isFallbackActive()) {
      try {
        const fbRes = await handleFrontendFallback(urlString, init);
        if (fbRes) return fbRes;
      } catch (fbErr) {
        console.warn("[SmartFetch] Fallback engine error, trying standard fetch:", fbErr);
      }
    }

    // 2. محاولة جلب البيانات من السيرفر كخيار أول وبسرعة
    const resolvedInput = resolveAbsoluteUrl(input);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // مهلة قصيرة لضمان سرعة رد الفعل

      const fetchOptions = init ? { ...init } : {};
      if (!fetchOptions.signal) {
        fetchOptions.signal = controller.signal;
      }

      const res = await originalFetch(resolvedInput, fetchOptions);
      clearTimeout(timeoutId);

      // في حال وجود مشكلة في الترخيص أو CORS أو خطأ داخلي بالسيرفر
      if (!res.ok && res.status >= 400 && res.status !== 401 && res.status !== 403) {
        setFallbackActive(true);
        const fbRes = await handleFrontendFallback(urlString, init);
        if (fbRes) return fbRes;
      }

      return res;
    } catch (err) {
      console.warn(`[SmartFetch] Backend offline/blocked for ${urlString}, initiating dynamic fallback logic:`, err);
      setFallbackActive(true);
      
      const fbRes = await handleFrontendFallback(urlString, init);
      if (fbRes) return fbRes;

      // إذا تعثر كل شيء، نقوم بالاستدعاء الأصلي
      return originalFetch(resolvedInput, init);
    }
  }

  return originalFetch(input, init);
}

try {
  Object.defineProperty(window, 'fetch', {
    value: smartFetch,
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (e) {
  console.warn("Failed to override window.fetch via Object.defineProperty, falling back to direct assignment:", e);
  try {
    (window as any).fetch = smartFetch;
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
