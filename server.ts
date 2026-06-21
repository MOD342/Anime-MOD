import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import apiRoutes from './src/api/index';
import { connectDB } from './src/config/database';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // الاتصال بقاعدة البيانات بشكل غير حاصر للتأكد من إطلاق الخادم فوراً وبسرعة قصوى
  connectDB().catch(err => {
    console.error('خطأ غير متوقع أثناء تهيئة الاتصال بـ MongoDB:', err);
  });

  // سياسات CORS لتمكين الاتصال المباشر من تطبيقات أندرويد 15 والويب فيوز ومختلف النطاقات
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Middleware لمعالجة JSON
  app.use(express.json());

  // توجيه الطلبات الخاصة بالـ API
  app.use('/api', apiRoutes);

  // مسارات تطبيق الويب التقدمي (PWA) لتمكين تثبيت التطبيق
  app.get('/manifest.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send({
      "name": "أنمي MOD - Otaku Hub",
      "short_name": "أنمي MOD",
      "description": "منصة أوتاكو وبوابة الأنمي لتقييم ومناقشة ومتابعة مواسم الأنمي المختلفة",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#0a0a0c",
      "theme_color": "#FF1744",
      "orientation": "portrait-primary",
      "icons": [
        {
          "src": "/app_icon.png",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "/app_icon.png",
          "sizes": "512x512",
          "type": "image/png"
        }
      ]
    });
  });

  app.get('/sw.js', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
const CACHE_NAME = 'anime-mod-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api') || url.pathname.includes('chrome-extension')) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
    `);
  });

  app.get('/app_icon.png', (req: Request, res: Response) => {
    const iconPath = path.join(process.cwd(), 'src/assets/images/app_icon.png');
    res.sendFile(iconPath, (err) => {
      if (err) {
        res.sendFile(path.join(process.cwd(), 'assets/app_icon.png'));
      }
    });
  });

  // Global Error Handler لتنسيق الأخطاء
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('API Error:', err);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم',
      error: err.message
    });
  });

  // Vite middleware for development vs Static static files for production
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV !== 'production' || !hasDist) {
    console.log('Starting Vite in development middleware mode (Dynamic Fallback)...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving production build from dist...');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Anime Backend API Simulator running on http://localhost:${PORT}`);
  });
}

startServer();
