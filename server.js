import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

/**
 * Universal Request Handler for both Local Dev and Vercel Serverless Function
 */
export default function handler(req, res) {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (!reqPath || reqPath === '/' || reqPath === '/server.js') {
    reqPath = '/index.html';
  }

  const relativePath = reqPath.replace(/^\/+/, '');

  // Search candidate paths (__dirname and process.cwd())
  const candidatePaths = [
    path.join(__dirname, relativePath),
    path.join(process.cwd(), relativePath),
    path.resolve(relativePath)
  ];

  let filePath = null;
  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        filePath = candidate;
        break;
      }
    } catch {
      // Continue to next candidate
    }
  }

  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h2>404 - Không tìm thấy tệp: ${reqPath}</h2>`);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const isCacheable = ['.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.woff2'].includes(ext);

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': isCacheable ? 'public, max-age=3600' : 'no-cache'
  });

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}

// Standalone Server Execution (Local Dev)
const server = http.createServer(handler);

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log('\n======================================================');
    console.log('🌊  FloodGuard Việt Nam — Hệ Thống Cảnh Báo Ngập Lụt');
    console.log('======================================================');
    console.log(`➜  Local:   \x1b[36m${url}\x1b[0m`);
    console.log('➜  Nhấn Ctrl+C để dừng server.\n');

    if (!process.env.CI) {
      const openCmd = process.platform === 'win32' ? `start ${url}` :
                      process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
      exec(openCmd, () => {});
    }
  });
}
