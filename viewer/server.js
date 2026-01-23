import { createServer } from 'http';
import { readFileSync, existsSync, watchFile, statSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3333;
const LOG_FILE = join(__dirname, '..', '.logs', 'agent.log');

// Track connected SSE clients
const clients = new Set();

// Watch log file for changes
let lastSize = 0;
if (existsSync(LOG_FILE)) {
  lastSize = statSync(LOG_FILE).size;
}

watchFile(LOG_FILE, { interval: 200 }, (curr, prev) => {
  if (curr.size > lastSize) {
    // Read only new content
    const fd = readFileSync(LOG_FILE, 'utf8');
    const newContent = fd.slice(lastSize);
    lastSize = curr.size;
    
    // Send to all connected clients
    for (const client of clients) {
      client.write(`data: ${JSON.stringify({ content: newContent })}\n\n`);
    }
  } else if (curr.size < lastSize) {
    // File was truncated (new run), reset
    lastSize = 0;
  }
});

const server = createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.url === '/') {
    // Serve HTML
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(readFileSync(join(__dirname, 'index.html'), 'utf8'));
  } else if (req.url === '/stream') {
    // SSE endpoint
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    
    // Send existing log content
    if (existsSync(LOG_FILE)) {
      const existing = readFileSync(LOG_FILE, 'utf8');
      res.write(`data: ${JSON.stringify({ content: existing, initial: true })}\n\n`);
    }
    
    clients.add(res);
    
    req.on('close', () => {
      clients.delete(res);
    });
  } else if (req.url === '/clear') {
    // Clear the log
    writeFileSync(LOG_FILE, '');
    lastSize = 0;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n🎬 Agent Viewer running at http://localhost:${PORT}\n`);
  console.log(`Watching: ${LOG_FILE}`);
  console.log(`\nMake sure to run ./loop.sh to see output.\n`);
});
