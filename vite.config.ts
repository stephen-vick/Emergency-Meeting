import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_ROOT = path.resolve(__dirname, 'assets');

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.txt': 'text/plain',
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-assets',
      configureServer(server) {
        // Custom static file middleware that handles URL-decoded paths
        // (spaces, &, !, etc.) correctly on Windows
        server.middlewares.use('/assets', (req, res, next) => {
          try {
            const urlPath = decodeURIComponent(req.url || '');
            const filePath = path.join(ASSETS_ROOT, urlPath);

            // Prevent path traversal
            if (!filePath.startsWith(ASSETS_ROOT)) {
              next();
              return;
            }

            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              const ext = path.extname(filePath).toLowerCase();
              const contentType = MIME_TYPES[ext] || 'application/octet-stream';
              const stat = fs.statSync(filePath);

              res.setHeader('Content-Type', contentType);
              res.setHeader('Content-Length', stat.size);
              res.setHeader('Cache-Control', 'public, max-age=3600');
              res.statusCode = 200;

              fs.createReadStream(filePath).pipe(res);
            } else {
              next();
            }
          } catch {
            next();
          }
        });
      },
    },
  ],
});
