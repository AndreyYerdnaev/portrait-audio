// Только локальный просмотр. Для публикации этот сервер не требуется.
import http from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mp3': 'audio/mpeg', '.mind': 'application/octet-stream', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let filename = path.resolve(root, `.${pathname}`);
    const relative = path.relative(root, filename);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      response.writeHead(403).end();
      return;
    }
    let info = await stat(filename);
    if (info.isDirectory()) {
      filename = path.join(filename, 'index.html');
      info = await stat(filename);
    }
    if (!info.isFile()) { response.writeHead(404).end(); return; }
    const headers = { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    let start = 0;
    let end = info.size - 1;
    let statusCode = 200;
    if (request.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if (!match || (!match[1] && !match[2])) {
        response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end();
        return;
      }
      if (match[1]) {
        start = Number(match[1]);
        if (match[2]) end = Math.min(Number(match[2]), end);
      } else {
        start = Math.max(0, info.size - Number(match[2]));
      }
      if (start > end || start >= info.size || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
        response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end();
        return;
      }
      statusCode = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length'] = Math.max(0, end - start + 1);
    response.writeHead(statusCode, headers);
    if (request.method === 'HEAD' || info.size === 0) { response.end(); return; }
    const stream = createReadStream(filename, { start, end });
    stream.on('error', () => response.destroy());
    response.on('close', () => stream.destroy());
    stream.pipe(response);
  } catch (error) {
    response.writeHead(error instanceof URIError ? 400 : 404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Файл не найден');
  }
});
server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? 'Порт 8080 занят. Остановите другую копию локального сервера и повторите запуск.' : error.message);
  process.exitCode = 1;
});
server.listen(8080, '127.0.0.1', () => console.log('Откройте http://localhost:8080/ в браузере этого компьютера. Остановка: Ctrl+C.'));
