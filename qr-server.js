const http = require('http');
const fs = require('fs');
const path = require('path');

/**
 * Inicia un servidor HTTP que sirve el archivo qr.html
 * Útil para escanear el QR desde un navegador en Railway
 */
function startQRServer(port = 3000) {
    const server = http.createServer((req, res) => {
        if (req.url === '/' || req.url === '/qr' || req.url === '/qr.html') {
            const qrPath = path.join(process.cwd(), 'qr.html');

            if (fs.existsSync(qrPath)) {
                fs.readFile(qrPath, (err, data) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Error al leer el archivo QR');
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(data);
                });
            } else {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`
                    <html>
                        <head>
                            <meta charset="utf-8">
                            <title>ALFABOT - Esperando QR</title>
                            <style>
                                body { font-family: Arial; text-align: center; padding: 50px; background: #f0f0f0; }
                                .container { background: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1>🤖 ALFABOT</h1>
                                <p>⏳ Esperando que el bot genere el código QR...</p>
                                <p>Recarga esta página en 5 segundos</p>
                                <button onclick="location.reload()">🔄 Recargar ahora</button>
                                <script>
                                    setTimeout(() => location.reload(), 5000);
                                </script>
                            </div>
                        </body>
                    </html>
                `);
            }
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 - Página no encontrada');
        }
    });

    server.listen(port, () => {
        console.log(`\n🌐 Servidor QR disponible en: http://localhost:${port}/qr.html`);
        if (process.env.NODE_ENV === 'production') {
            console.log(`📱 En Railway, accede desde: https://<tu-railway-app>/qr.html`);
        }
    });

    return server;
}

module.exports = {
    startQRServer,
};
