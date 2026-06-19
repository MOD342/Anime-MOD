import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import apiRoutes from './src/api/index';
import { connectDB } from './src/config/database';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // الاتصال بقاعدة البيانات
  await connectDB();

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
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
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
