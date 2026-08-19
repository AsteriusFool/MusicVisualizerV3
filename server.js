'use strict';
/**
 * Minimal static file server — serves renderer/ at http://localhost:3000
 * No external dependencies; uses only Node built-ins.
 *
 * System audio in the browser (Chrome / Edge only):
 *   Click "System Audio (Loopback)", then in the browser picker choose
 *   "Entire Screen" and tick "Share system audio".
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT    = 3000;
const WEBROOT = path.resolve(__dirname, 'renderer');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const urlPath  = req.url.split('?')[0];
  const filePath = path.resolve(WEBROOT, urlPath === '/' ? 'index.html' : urlPath.slice(1));

  // Prevent path-traversal attacks
  if (!filePath.startsWith(WEBROOT + path.sep) && filePath !== WEBROOT) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + urlPath);
      return;
    }

    const ct = MIME[path.extname(filePath)] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Music Visualizer  →  http://localhost:${PORT}`);
  console.log('  Open in Chrome or Edge for system audio loopback support.\n');
});
