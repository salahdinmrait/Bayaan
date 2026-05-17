/**
 * Local development server for Bayaan
 * Serves static files + handles /api/* routes
 * Usage: node server.js
 */

import 'dotenv/config';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.ttf':  'font/ttf',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  /* ── API routes ── */
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');

    try {
      const handlerPath = path.join(__dirname, pathname + '.js');
      const { default: handler } = await import(`${handlerPath}?v=${Date.now()}`);

      /* Build a minimal req/res compatible with the handlers */
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', async () => {
        if (req.headers['content-type']?.includes('application/json') && body) {
          try { req.body = JSON.parse(body); } catch {}
        }

        await handler(req, res);
      });
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Handler error: ' + err.message }));
    }
    return;
  }

  /* ── Static files ── */
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  if (!fs.existsSync(filePath)) {
    /* Try adding .html */
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`\n  Bayaan dev server running at http://localhost:${PORT}\n`);
});
