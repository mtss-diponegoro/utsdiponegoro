import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import storeHandler from './api/store.ts';
import registerTeacherHandler from './api/register-teacher.ts';
import authHandler from './api/auth.ts';

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  app.all('/api/store', async (req, res) => {
    await storeHandler(req, res);
  });

  app.all('/api/register-teacher', async (req, res) => {
    await registerTeacherHandler(req, res);
  });

  app.all('/api/auth', async (req, res) => {
    await authHandler(req, res);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(import.meta.dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
