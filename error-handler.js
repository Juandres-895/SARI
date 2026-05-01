// Manejo global de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
    console.error('Promesa:', promise);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Excepción no capturada:', error);
    // Reiniciar el bot después de un error crítico
    setTimeout(() => {
        console.log('🔄 Reiniciando bot...'); 
        process.exit(1);
    }, 5000);
});

// Mantener el proceso vivo
process.on('SIGINT', () => {
    console.log('⚠️ Señal SIGINT recibida. Limpiando...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('⚠️ Señal SIGTERM recibida. Limpiando...');
    process.exit(0);
});

// Health check básico
setInterval(() => {
    const memoria = process.memoryUsage();
    console.log(`📊 Memoria: ${Math.round(memoria.heapUsed / 1024 / 1024)}MB / ${Math.round(memoria.heapTotal / 1024 / 1024)}MB`);
}, 60000); // Cada minuto
