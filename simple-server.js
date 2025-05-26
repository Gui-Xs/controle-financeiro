const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const hostname = 'localhost';
const port = 3000;

const server = http.createServer(async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const data = await fs.readFile(filePath);
        const extension = path.extname(filePath).toLowerCase();
        let contentType = 'text/html';

        switch (extension) {
            case '.js':
                contentType = 'text/javascript';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.json':
                contentType = 'application/json';
                break;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    } catch (error) {
        console.error('Error:', error);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
