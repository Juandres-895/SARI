const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

/**
 * Genera un archivo HTML con el QR código grande y escaneable
 * @param {string} qrData - Datos del QR
 * @param {string} outputPath - Ruta donde guardar el archivo
 */
async function generateQRHTML(qrData, outputPath = './qr.html') {
    try {
        // Generar QR en data URL
        const qrDataURL = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            quality: 0.95,
            margin: 1,
            width: 300,
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
        });

        // Crear HTML con QR grande
        const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ALFABOT - QR de Autenticación</title>
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .qr-container {
            background: #f8f8f8;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            border: 2px solid #ddd;
        }
        .qr-container img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0 auto;
        }
        .instructions {
            background: #e3f2fd;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            border-radius: 4px;
        }
        .instructions h3 {
            margin-top: 0;
            color: #1976D2;
        }
        .instructions ol {
            margin: 10px 0;
            padding-left: 20px;
        }
        .instructions li {
            margin: 8px 0;
            color: #333;
            font-size: 14px;
        }
        .status {
            color: #4CAF50;
            font-weight: bold;
            font-size: 12px;
            margin-top: 15px;
            padding: 10px;
            background: #f1f8f4;
            border-radius: 4px;
        }
        .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin-top: 20px;
            text-align: left;
            border-radius: 4px;
            color: #856404;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 ALFABOT</h1>
        <p class="subtitle">WhatsApp Bot de SARI</p>
        
        <div class="qr-container">
            <img src="${qrDataURL}" alt="QR Code">
        </div>
        
        <div class="instructions">
            <h3>📱 Instrucciones para autenticar:</h3>
            <ol>
                <li>Abre <strong>WhatsApp</strong> en tu teléfono</li>
                <li>Ve a <strong>Configuración</strong> → <strong>WhatsApp Web</strong></li>
                <li><strong>Escanea este código QR</strong> con tu cámara</li>
                <li>Espera a que el bot se conecte (2-5 segundos)</li>
            </ol>
        </div>
        
        <div class="status">
            ✅ El QR está activo. Escanea dentro de los próximos 5 minutos.
        </div>
        
        <div class="warning">
            ⚠️ Si no puedes escanear, intenta:
            <br>• Acerca el código más a tu cámara
            <br>• Asegúrate de tener iluminación adecuada
            <br>• Cierra otras aplicaciones que usen la cámara
        </div>
    </div>
    
    <script>
        // Auto-recargar la página cada 30 segundos si el QR expira
        setTimeout(() => {
            location.reload();
        }, 5 * 60 * 1000); // 5 minutos
    </script>
</body>
</html>
        `;

        // Guardar archivo
        fs.writeFileSync(outputPath, htmlContent);
        console.log(`\n${'='.repeat(60)}`);
        console.log(`✅ QR CODE GENERADO`);
        console.log(`📁 Archivo: ${path.resolve(outputPath)}`);
        console.log(`🌐 Abre en tu navegador el archivo: qr.html`);
        console.log(`${'='.repeat(60)}\n`);

        return outputPath;
    } catch (error) {
        console.error('❌ Error generando QR HTML:', error.message);
        throw error;
    }
}

/**
 * Genera un QR en terminal; por defecto imprime la versión compacta para logs.
 * @param {string} qrData
 * @param {boolean} compact - si true usa la versión pequeña (más legible en logs)
 */
function generateQRTerminal(qrData, compact = true) {
    try {
        const QRCodeTerminal = require('qrcode-terminal');

        if (compact) {
            // Versión reducida adecuada para logs
            QRCodeTerminal.generate(qrData, { small: true }, (code) => {
                console.log('\n' + code + '\n');
            });
            return;
        }

        // Versión más grande/estética (solo para desarrollo local)
        console.log('\n' + '█'.repeat(60));
        console.log('█' + ' '.repeat(58) + '█');
        console.log('█' + '  ESCANEA ESTE CÓDIGO QR CON WHATSAPP  '.padEnd(58) + '█');
        console.log('█' + ' '.repeat(58) + '█');
        console.log('█'.repeat(60) + '\n');

        QRCodeTerminal.generate(qrData, { small: false }, (code) => {
            console.log(code);
        });

        console.log('\n' + '█'.repeat(60) + '\n');
    } catch (error) {
        console.error('Error generando QR terminal:', error.message);
    }
}

module.exports = {
    generateQRHTML,
    generateQRTerminal,
};
