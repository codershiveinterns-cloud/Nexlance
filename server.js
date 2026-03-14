const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { getPaymentConfig, createStripePaymentIntent } = require('./api/_lib/payments');

const PORT = Number(process.env.PORT || 4242);
const ROOT = __dirname;
const MAX_PORT_ATTEMPTS = 10;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4'
};

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    });
    res.end(JSON.stringify(payload));
}

function serveFile(reqPath, res) {
    const safePath = reqPath === '/' ? '/index.html' : reqPath;
    const filePath = path.join(ROOT, safePath);
    const normalized = path.normalize(filePath);

    if (!normalized.startsWith(ROOT)) {
        sendJson(res, 403, { error: 'Forbidden' });
        return;
    }

    fs.readFile(normalized, (error, data) => {
        if (error) {
            if (error.code === 'ENOENT') {
                sendJson(res, 404, { error: 'File not found' });
                return;
            }
            sendJson(res, 500, { error: 'Could not read file' });
            return;
        }

        const ext = path.extname(normalized).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
    });
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', chunk => {
            raw += chunk;
            if (raw.length > 1e6) {
                reject(new Error('Request body too large.'));
            }
        });
        req.on('end', () => {
            try {
                resolve(raw ? JSON.parse(raw) : {});
            } catch (error) {
                reject(new Error('Invalid JSON body.'));
            }
        });
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    if (!req.url) {
        sendJson(res, 400, { error: 'Invalid request' });
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        });
        res.end();
        return;
    }

    if (req.method === 'POST' && url.pathname === '/api/create-payment-intent') {
        try {
            const body = await readBody(req);
            const payload = await createStripePaymentIntent(body);
            sendJson(res, 200, payload);
        } catch (error) {
            sendJson(res, 400, { error: error.message || 'Payment intent could not be created.' });
        }
        return;
    }

    if (req.method === 'GET' && url.pathname === '/api/payment-config') {
        sendJson(res, 200, getPaymentConfig());
        return;
    }

    if (req.method === 'GET') {
        serveFile(url.pathname, res);
        return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
});

function startServer(preferredPort, attemptsLeft = MAX_PORT_ATTEMPTS) {
    server.listen(preferredPort, () => {
        console.log(`Nexlance server running at http://localhost:${preferredPort}`);
        if (preferredPort !== PORT) {
            console.log(`Preferred port ${PORT} was busy, so the server started on ${preferredPort} instead.`);
        }
    });

    server.once('error', error => {
        if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
            const nextPort = preferredPort + 1;
            console.warn(`Port ${preferredPort} is already in use. Trying port ${nextPort}...`);
            server.close(() => {
                startServer(nextPort, attemptsLeft - 1);
            });
            return;
        }

        if (error.code === 'EADDRINUSE') {
            console.error(`Could not start the server because ports ${PORT}-${preferredPort} are all in use.`);
            console.error('Stop the existing process or set a free port with the PORT environment variable.');
            process.exit(1);
        }

        console.error('Server failed to start:', error.message || error);
        process.exit(1);
    });
}

startServer(PORT);
