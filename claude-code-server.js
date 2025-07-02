const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const PORT = 3180;
const ANNOTATIONS_FILE = 'annotations.json';

// Create server
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Handle annotation endpoint
  if (req.url === '/api/annotation' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const annotation = JSON.parse(body);
        
        // Add server timestamp
        annotation.receivedAt = new Date().toISOString();
        
        // Load existing annotations
        let annotations = [];
        try {
          const data = await fs.readFile(ANNOTATIONS_FILE, 'utf8');
          annotations = JSON.parse(data);
        } catch (err) {
          // File doesn't exist yet, start with empty array
        }
        
        // Add new annotation
        annotations.push(annotation);
        
        // Save to file
        await fs.writeFile(
          ANNOTATIONS_FILE, 
          JSON.stringify(annotations, null, 2)
        );
        
        console.log('\n--- New Annotation Received ---');
        console.log('URL:', annotation.element.url);
        console.log('Element:', annotation.element.selector);
        console.log('Note:', annotation.note);
        console.log('Timestamp:', annotation.element.timestamp);
        console.log('-------------------------------\n');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Annotation saved' }));
      } catch (error) {
        console.error('Error processing annotation:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  }
  // Handle GET request to view annotations
  else if (req.url === '/api/annotations' && req.method === 'GET') {
    try {
      const data = await fs.readFile(ANNOTATIONS_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[]');
    }
  }
  // Default response
  else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Claude Code Annotation Server running on port ${PORT}`);
  console.log(`Annotations will be saved to ${ANNOTATIONS_FILE}`);
  console.log('\nEndpoints:');
  console.log(`  POST http://localhost:${PORT}/api/annotation - Receive new annotation`);
  console.log(`  GET  http://localhost:${PORT}/api/annotations - View all annotations`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});