import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getDb } from './src/server/database.js';
import { createApiRouter } from './src/server/routes.js';
import { createSampleMediaIfEmpty } from './src/server/sampleMedia.js';

const PORT = 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();

  // Basic security and parsing middleware
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Initialize SQLite database and seed initial demo content if needed
  try {
    await getDb();
    console.log('[CineVault] SQLite Database initialized successfully.');
    // Auto-prepare sample media so the user has immediate playable content out of the box
    await createSampleMediaIfEmpty();
  } catch (err) {
    console.error('[CineVault] Database initialization error:', err);
  }

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Mount REST API routes first
  app.use('/api', createApiRouter());

  // In development, hook up Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    console.log('[CineVault] Running in development mode with Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: HOST, port: PORT, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[CineVault] Running in production mode...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[CineVault Server Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message || 'An unexpected server error occurred.'
        }
      });
    }
  });

  app.listen(PORT, HOST, () => {
    console.log(`=================================================`);
    console.log(`🍿 CineVault: Your Personal Cinema`);
    console.log(`🌐 Server active on: http://localhost:${PORT}`);
    console.log(`📁 Local storage & SQLite ready`);
    console.log(`=================================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal CineVault startup error:', err);
  process.exit(1);
});
