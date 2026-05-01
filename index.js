require('dotenv').config();
require('./error-handler'); // Agregar manejo global de errores
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { generateQRHTML, generateQRTerminal, generateQRImage } = require('./qr-handler');

// Usar variable de entorno o valor por defecto
const SCRIPT_URL = process.env.SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxn-xzoeM2xpsav8JRwj-Pt8VbojDy_-n96mRgPImTUs1VbTYMT9orr0Pmq5DCtHbLNPw/exec';
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`✅ Iniciando bot en modo: ${NODE_ENV}`);

const startupTime = Math.floor(Date.now() / 1000);

let modoManual = {};
let datosUsuario = {};
let pasoActual = {};
let procesando = {};
let temporizadorAviso = {};
let temporizadorCierre = {};
let mensajesVistos = new Set();
let ticketsActivos = {};
let ticketEnCalificacion = {};
let ticketsManualPorChat = {};
let mensajesBotEnviados = new Set();
let mensajesBotRecientesPorChat = {};
let lastQrUpdatedAt = 0;

function registrarMensajeBotReciente(chatID, cuerpo) {
    const texto = String(cuerpo || '').trim();
    if (!texto) return;

    if (!mensajesBotRecientesPorChat[chatID]) {
        mensajesBotRecientesPorChat[chatID] = new Set();
    }

    mensajesBotRecientesPorChat[chatID].add(texto);
    setTimeout(() => {
        const setReciente = mensajesBotRecientesPorChat[chatID];
        if (!setReciente) return;
        setReciente.delete(texto);
        if (setReciente.size === 0) {
            delete mensajesBotRecientesPorChat[chatID];
        }
    }, 30000);
}

function esMensajeBotReciente(chatID, cuerpo) {
    const texto = String(cuerpo || '').trim();
    if (!texto) return false;
    return !!mensajesBotRecientesPorChat[chatID]?.has(texto);
}

function asegurarSetManual(chatID) {
    if (!ticketsManualPorChat[chatID]) {
        ticketsManualPorChat[chatID] = new Set();
    }
    return ticketsManualPorChat[chatID];
}

function activarModoManual(chatID, ticketID) {
    if (!ticketID) return;
    const setManual = asegurarSetManual(chatID);
    setManual.add(String(ticketID));
    modoManual[chatID] = setManual.size > 0;
    console.log(`🔒 manual_on chat=${chatID} ticket=${ticketID}`);
}

function desactivarModoManualPorTicket(chatID, ticketID) {
    const setManual = ticketsManualPorChat[chatID];
    if (setManual && ticketID) {
        setManual.delete(String(ticketID));
    }

    if (!setManual || setManual.size === 0) {
        delete ticketsManualPorChat[chatID];
        delete modoManual[chatID];
        console.log(`🔓 manual_off chat=${chatID} ticket=${ticketID || 'N/A'}`);
        return;
    }

    modoManual[chatID] = true;
    console.log(`🔒 manual_still_on chat=${chatID} active_manual_tickets=${setManual.size}`);
}

const isCloudRuntime = NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
const puppeteerArgs = isCloudRuntime
    ? [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
    ]
    : [
        // En local (Windows), --single-process suele romper Chromium y causa
        // "Navigating frame was detached" al inicializar WhatsApp Web.
    ];

// Asegurar que la carpeta .wwebjs_auth existe con permisos correctos
const authDir = path.join(process.cwd(), '.wwebjs_auth');
try {
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true, mode: 0o777 });
        console.log(`📁 Carpeta .wwebjs_auth creada con permisos: 0o777`);
    } else {
        // Asegurar permisos incluso si la carpeta ya existe
        fs.chmodSync(authDir, 0o777);
        console.log(`📁 Permisos de .wwebjs_auth ajustados a: 0o777`);
    }
} catch (err) {
    console.warn(`⚠️  Error ajustando permisos de .wwebjs_auth: ${err.message}`);
}

// Configuración de Puppeteer: especificar Chrome en Docker
const puppeteerConfig = {
    args: puppeteerArgs,
    headless: 'new'
};

if (isCloudRuntime) {
    puppeteerConfig.executablePath = '/usr/bin/chromium-browser';
    console.log('🐳 Configurado para Docker - usando Chrome en /usr/bin/chromium-browser');
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: puppeteerConfig
});

const sendMessageOriginal = client.sendMessage.bind(client);
client.sendMessage = async (...args) => {
    const chatID = args[0];
    const cuerpo = args[1];
    registrarMensajeBotReciente(chatID, cuerpo);

    const enviado = await sendMessageOriginal(...args);
    const mensajes = Array.isArray(enviado) ? enviado : [enviado];

    for (const m of mensajes) {
        const sentId = m?.id?._serialized;
        if (!sentId) continue;
        mensajesBotEnviados.add(sentId);
        setTimeout(() => mensajesBotEnviados.delete(sentId), 10 * 60 * 1000);
    }

    return enviado;
};

let isInitializing = false;
let reconnectTimer = null;
let initTimeout = null;
const RECONNECT_DELAY_MS = 7000;
const INIT_TIMEOUT_MS = 60000;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

function limpiarReconexionProgramada() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
}

function limpiarLocksSesion() {
    const sessionPath = path.join(process.cwd(), '.wwebjs_auth', 'session');
    const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];

    for (const file of lockFiles) {
        const filePath = path.join(sessionPath, file);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🧹 Lock eliminado: ${file}`);
            }
        } catch (e) {
            console.error(`No se pudo eliminar lock ${file}:`, e.message || e);
        }
    }
}

async function inicializarCliente(origen = 'startup') {
    if (isInitializing) {
        console.log(`ℹ️ Inicialización omitida (${origen}): ya hay una en progreso.`);
        return;
    }

    limpiarReconexionProgramada();
    isInitializing = true;
    console.log(`🔄 Inicializando cliente (${origen})...`);

    try {
        await Promise.race([
            client.initialize(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout de inicialización (${INIT_TIMEOUT_MS / 1000}s)`)), INIT_TIMEOUT_MS)
            )
        ]);
    } catch (error) {
        const errMsg = error?.message || String(error);
        console.error(`❌ Error al inicializar (${origen}):`, errMsg);
        reconnectAttempts++;

        if (errMsg.includes('The browser is already running for')) {
            console.log('🔓 Detectado bloqueo de perfil del navegador. Limpiando locks de sesion...');
            limpiarLocksSesion();
        }

        try {
            await client.destroy();
        } catch (_) { }

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            programarReconexion(`initialize_error:${origen}`);
        } else {
            console.error(`❌ Máximo de reintentos alcanzado (${MAX_RECONNECT_ATTEMPTS}). Deteniendo reconexión.`);
        }
    } finally {
        isInitializing = false;
    }
}

function programarReconexion(motivo = 'desconocido') {
    if (reconnectTimer) {
        console.log(`⏳ Reconexión ya programada. Motivo nuevo: ${motivo}`);
        return;
    }

    console.log(`🔌 Reconectando en ${RECONNECT_DELAY_MS / 1000}s (motivo: ${motivo})...`);
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        inicializarCliente(`reconnect:${motivo}`);
    }, RECONNECT_DELAY_MS);
}

function gestionarTemporizadores(chatID) {
    if (temporizadorAviso[chatID]) clearTimeout(temporizadorAviso[chatID]);
    if (temporizadorCierre[chatID]) clearTimeout(temporizadorCierre[chatID]);
    if (modoManual[chatID]) return;

    if (pasoActual[chatID] === 'ESPERANDO_CALIFICACION') {
        temporizadorCierre[chatID] = setTimeout(() => {
            console.log(`⏱️ Encuesta expirada para ${chatID}. Reseteando sesión silenciosamente.`);
            delete pasoActual[chatID];
            delete datosUsuario[chatID];
            delete ticketEnCalificacion[chatID];
            delete ticketsManualPorChat[chatID];
            delete modoManual[chatID];
            delete procesando[chatID];
            delete temporizadorCierre[chatID];
        }, 10 * 60 * 1000);
        return;
    }

    temporizadorAviso[chatID] = setTimeout(async () => {
        if (pasoActual[chatID] && !modoManual[chatID]) {
            try {
                await client.sendMessage(chatID, "👋 ¿Sigues ahí? He notado que no has respondido. Recuerda que si pasan otros 5 minutos sin actividad, tendré que cerrar la sesión actual para ahorrar recursos. 😊");
            } catch (e) { console.error("Error aviso:", e); }
        }
    }, 5 * 60 * 1000);

    temporizadorCierre[chatID] = setTimeout(async () => {
        if (pasoActual[chatID] && !modoManual[chatID]) {
            try {
                await client.sendMessage(chatID, "⌛ *Sesión finalizada por inactividad.*\n\nTu solicitud no fue completada. Si aún necesitas ayuda de SARI, escribe de nuevo cualquier mensaje para iniciar el diagnóstico. 👋");
                delete pasoActual[chatID];
                delete datosUsuario[chatID];
                delete temporizadorAviso[chatID];
                delete temporizadorCierre[chatID];
                delete procesando[chatID];
            } catch (e) { console.error("Error cierre:", e); }
        }
    }, 10 * 60 * 1000);
}

async function enviarDatosFinales(numero, datos, chatID) {
    try {
        const res = await axios.post(SCRIPT_URL, {
            telefono: numero,
            descripcion: datos.descripcion,
            informado: datos.nombre,
            cargo: datos.cargo,
            institucion: datos.institucion,
            proyecto: datos.proyecto,
            servicio: datos.servicio,
            prioridad: datos.prioridad,
            municipio: datos.municipio
        });
        const ticketID = String(res.data).replace(/\D/g, "");
        if (!ticketsActivos[chatID]) ticketsActivos[chatID] = [];
        ticketsActivos[chatID].push({ ticket: ticketID, proyecto: datos.proyecto });
        console.log(`✅ Ticket #${ticketID} registrado para [${datos.proyecto}].`);
        return ticketID;
    } catch (e) { console.error("❌ Error registro inicial:", e.message); }
    return null;
}

client.on('qr', async qr => {
    console.log('\n🔐 NUEVA AUTENTICACIÓN REQUERIDA\n');
    lastQrUpdatedAt = Date.now();

    // Generar QR en terminal (versión compacta en logs para que sea escaneable)
    // compact = true imprime la versión pequeña (mejor para logs)
    generateQRTerminal(qr, true);

    // Generar QR en HTML (archivo)
    try {
        await generateQRHTML(qr, path.join(process.cwd(), 'qr.html'));
        console.log('\n💡 TIP: Si el QR es muy pequeño para escanear, abre el archivo qr.html en tu navegador.\n');
    } catch (error) {
        console.error('Error generando HTML del QR:', error.message);
    }

    // Guardar imagen PNG del último QR
    try {
        const pngPath = path.join(process.cwd(), 'last-qr.png');
        await generateQRImage(qr, pngPath);
        console.log(`✅ Último QR guardado: ${pngPath}`);
    } catch (e) {
        console.error('Error guardando last-qr.png:', e.message);
    }
});

client.on('ready', () => { console.log('🚀 ALFABOT en línea'); });
client.on('loading_screen', (percent, message) => {
    console.log(`📶 Cargando WhatsApp Web: ${percent}% - ${message}`);
});
client.on('change_state', (state) => {
    console.log('🔁 Estado del cliente:', state);
});
client.on('authenticated', () => {
    console.log('🔐 Sesión autenticada correctamente.');
    reconnectAttempts = 0;
    limpiarReconexionProgramada();
});
client.on('auth_failure', (msg) => {
    console.error('❌ Fallo de autenticación:', msg);
    programarReconexion('auth_failure');
});
client.on('disconnected', (reason) => {
    console.error('⚠️ Cliente desconectado:', reason);
    programarReconexion('disconnected');
});

client.on('message_create', async msg => {
    const chatID = msg.fromMe ? msg.to : msg.from;
    const msgId = msg.id._serialized;

    if (msg.timestamp < startupTime) return;

    // 🛑 Solo procesar chats individuales, ignorar grupos
    if (chatID.includes('@g.us')) return;

    // 🛑 CORRECCIÓN CLAVE: Ignorar notificaciones del sistema (cifrado) y mensajes sin cuerpo
    if (msg.isStatus || msg.type === 'e2e_notification' || msg.type === 'protocol' || msg.type === 'gp2') return;
    if (!msg.body || msg.body.trim() === "") return;

    // Registrar actividad del asesor sobre el ticket mas reciente sin bloquear nuevos tickets.
    if (msg.fromMe) {
        if (esMensajeBotReciente(chatID, msg.body)) {
            return;
        }

        if (mensajesBotEnviados.has(msgId)) {
            mensajesBotEnviados.delete(msgId);
            return;
        }

        const ultimoTicket = ticketsActivos[chatID]?.[ticketsActivos[chatID].length - 1];
        if (!ultimoTicket) return;

        activarModoManual(chatID, ultimoTicket.ticket);

        try {
            await axios.post(SCRIPT_URL, {
                accion: "REGISTRAR_HORA_ASESOR",
                ticket: ultimoTicket.ticket,
                proyecto: ultimoTicket.proyecto
            });
            console.log(`🕒 Hora registrada exitosamente para el Ticket #${ultimoTicket.ticket} de [${ultimoTicket.proyecto}].`);
        } catch (e) { console.error("Error al registrar hora asesor."); }
        return;
    }

    if (mensajesVistos.has(msgId)) return;
    if (procesando[chatID]) return;

    mensajesVistos.add(msgId);
    procesando[chatID] = true;

    const contact = await msg.getContact();
    const numeroReal = contact.number;
    const texto = msg.body.trim();

    try {
        if (modoManual[chatID] && pasoActual[chatID] !== 'ESPERANDO_CALIFICACION') {
            console.log(`⏸️ Chat ${chatID} en modo manual, bot no responde este mensaje.`);
            return;
        }

        gestionarTemporizadores(chatID);

        if (!pasoActual[chatID]) {
            try {
                const resBusqueda = await axios.post(SCRIPT_URL, {
                    accion: "BUSCAR_USUARIO",
                    telefono: numeroReal
                });

                if (resBusqueda.data && resBusqueda.data.encontrado) {
                    const usr = resBusqueda.data.datos;
                    datosUsuario[chatID] = {
                        nombre: usr.nombre,
                        institucion: usr.institucion,
                        municipio: usr.municipio,
                        cargo: usr.cargo
                    };
                    await msg.reply(`¡Hola de nuevo, ${usr.nombre}! 👋 Qué gusto tenerte de vuelta en SARI.\n\n📑 ¿A qué **PROYECTO** pertenece tu nueva solicitud hoy?\n\n1️⃣ Alfatic\n2️⃣ Generación Tech\n\n*Responde 1 o 2*`);
                    pasoActual[chatID] = 'PREGUNTA_PROYECTO_RECURRENTE';
                } else {
                    await msg.reply(`😄 Me da mucho gusto que estés aquí. Bienvenid@ a SARI (Servicio de Atención Remota Integral) 🤝🏽😊 👋. Soy ALFABOT 🤖 y estoy aquí para ayudarte. Es importante que sepas que al continuar en el chat aceptas nuestras políticas de privacidad y tratamiento de datos. Iniciairemos el diagnóstico de tu solicitud.\n\n📑 ¿A qué **PROYECTO** pertenece su solicitud?\n\n1️⃣ Alfatic\n2️⃣ Generación Tech\n\n*Responde 1 o 2*`);
                    datosUsuario[chatID] = {};
                    pasoActual[chatID] = 'PREGUNTA_PROYECTO_INICIAL';
                }
            } catch (error) {
                await msg.reply(`😄 Me da mucho gusto que estés aquí. Bienvenid@ a SARI 👋. Iniciairemos el diagnóstico.\n\n📑 ¿A qué **PROYECTO** pertenece su solicitud?\n1️⃣ Alfatic\n2️⃣ Generación Tech`);
                datosUsuario[chatID] = {};
                pasoActual[chatID] = 'PREGUNTA_PROYECTO_INICIAL';
            }
        }
        else if (pasoActual[chatID] === 'PREGUNTA_PROYECTO_RECURRENTE') {
            if (texto === "1") {
                datosUsuario[chatID].proyecto = "Alfatic";
                await msg.reply("🛠️ *ALFATIC* - ¿Qué servicio requiere?\n\n1️⃣ Ayuda Pedagógica\n2️⃣ Ayuda informativa - PQRS\n3️⃣ Gestión Institucional\n4️⃣ Inclúyeme en TIC\n5️⃣ Ayuda Tecnológica\n\n0️⃣ Volver al menú de Cargos");
                pasoActual[chatID] = 'PREGUNTA_SERVICIO';
            } else if (texto === "2") {
                datosUsuario[chatID].proyecto = "Generación Tech";
                await msg.reply("🌟 *GENERACIÓN TECH* - ¿Qué servicio requiere?\n\n1️⃣ Consultorio Pedagógico\n2️⃣ INFRAESTRUCTURA TIC\n3️⃣ ¿Quiénes somos?\n\n0️⃣ Volver al menú de Cargos");
                pasoActual[chatID] = 'PREGUNTA_SERVICIO';
            } else { await msg.reply("❌ Opción no válida. Elija 1 o 2."); }
        }
        else if (pasoActual[chatID] === 'PREGUNTA_PROYECTO_INICIAL') {
            if (texto === "1") {
                datosUsuario[chatID].proyecto = "Alfatic";
                await msg.reply("👤 ¿Cuál es tu nombre completo?");
                pasoActual[chatID] = 'PREGUNTA_NOMBRE';
            } else if (texto === "2") {
                datosUsuario[chatID].proyecto = "Generación Tech";
                await msg.reply("👤 ¿Cuál es tu nombre completo?");
                pasoActual[chatID] = 'PREGUNTA_NOMBRE';
            } else { await msg.reply("❌ Opción no válida. Elija 1 o 2."); }
        }
        else if (pasoActual[chatID] === 'ESPERANDO_CALIFICACION') {
            const nota = parseInt(texto);
            if (!isNaN(nota) && nota >= 1 && nota <= 5) {
                const ticketCerrado = ticketEnCalificacion[chatID];
                if (ticketCerrado && ticketCerrado.ticket) {
                    try {
                        await axios.post(SCRIPT_URL, {
                            accion: "REGISTRAR_CALIFICACION",
                            ticket: ticketCerrado.ticket,
                            proyecto: ticketCerrado.proyecto,
                            nota: nota
                        });
                        console.log(`⭐ Calificación de ${nota} registrada para el Ticket #${ticketCerrado.ticket}.`);
                    } catch (e) { console.error("Error al registrar calificación."); }
                }
                await msg.reply("¡Gracias por tu calificación! 🤖 ALFABOT en línea nuevamente. ¿En qué más puedo ayudarte hoy? 👋");
                delete pasoActual[chatID];
                delete ticketEnCalificacion[chatID];
                delete datosUsuario[chatID];
                if (!ticketsActivos[chatID] || ticketsActivos[chatID].length === 0) {
                    delete ticketsManualPorChat[chatID];
                    delete modoManual[chatID];
                }
            } else { await msg.reply("❌ Por favor, ingresa solo un número del *1 al 5* para calificar nuestro servicio."); }
        }
        else if (pasoActual[chatID] === 'PREGUNTA_NOMBRE') {
            datosUsuario[chatID].nombre = texto;
            await msg.reply("🏫 ¿A qué **INSTITUCIÓN** pertenece su solicitud?");
            pasoActual[chatID] = 'PREGUNTA_INSTITUCION';
        }
        else if (pasoActual[chatID] === 'PREGUNTA_INSTITUCION') {
            datosUsuario[chatID].institucion = texto;
            await msg.reply("📍 ¿En qué **MUNICIPIO** se encuentra?");
            pasoActual[chatID] = 'PREGUNTA_MUNICIPIO';
        }
        else if (pasoActual[chatID] === 'PREGUNTA_MUNICIPIO') {
            datosUsuario[chatID].municipio = texto;
            await msg.reply("🏢 ¿Cuál es su **CARGO**?\n\n1️⃣ Rector/Coordinador\n2️⃣ Docente\n3️⃣ Estudiante\n4️⃣ Comunidad\n5️⃣ Otro\n\n*Responde 1, 2, 3, 4 o 5*");
            pasoActual[chatID] = 'PREGUNTA_CARGO';
        }
        else if (pasoActual[chatID] === 'PREGUNTA_CARGO') {
            const cargos = { "1": "Rector/Coordinador", "2": "Docente", "3": "Estudiante", "4": "Comunidad", "5": "Otro" };
            if (cargos[texto]) {
                datosUsuario[chatID].cargo = cargos[texto];
                if (datosUsuario[chatID].proyecto === "Alfatic") {
                    await msg.reply("🛠️ *ALFATIC* - ¿Qué servicio requiere?\n\n1️⃣ Ayuda Pedagógica\n2️⃣ Ayuda informativa - PQRS\n3️⃣ Gestión Institucional\n4️⃣ Inclúyeme en TIC\n5️⃣ Ayuda Tecnológica\n\n0️⃣ Volver al menú de Cargos");
                } else {
                    await msg.reply("🌟 *GENERACIÓN TECH* - ¿Qué servicio requiere?\n\n1️⃣ Consultorio Pedagógico\n2️⃣ INFRAESTRUCTURA TIC\n3️⃣ ¿Quiénes somos?\n\n0️⃣ Volver al menú de Cargos");
                }
                pasoActual[chatID] = 'PREGUNTA_SERVICIO';
            } else { await msg.reply("❌ Opción no válida. Elija 1, 2, 3, 4 o 5."); }
        }
        else if (pasoActual[chatID] === 'PREGUNTA_SERVICIO') {
            if (texto === "0") {
                await msg.reply("🏢 Volvemos. ¿Cuál es su **CARGO**?\n\n1️⃣ Rector/Coordinador\n2️⃣ Docente\n3️⃣ Estudiante\n4️⃣ Comunidad\n5️⃣ Otro");
                pasoActual[chatID] = 'PREGUNTA_CARGO';
                return;
            }
            if (datosUsuario[chatID].proyecto === "Generación Tech" && texto === "3") {
                await msg.reply("¡Hola! \nBienvenido(a) al canal oficial de comunicación del programa Generación Tech 2026...\nVisita nuestra página: https://info.rutanmedellin.org/generaciontech");
                await msg.reply("🌟 *GENERACIÓN TECH* - ¿Qué servicio requiere?\n\n1️⃣ Consultorio Pedagógico\n2️⃣ INFRAESTRUCTURA TIC\n3️⃣ ¿Quiénes somos?\n\n0️⃣ Volver al menú de Cargos");
                return;
            }
            let servicios = {};
            if (datosUsuario[chatID].proyecto === "Alfatic") {
                servicios = { "1": { n: "Ayuda Pedagógica", p: "Alta" }, "2": { n: "Ayuda informativa - PQRS", p: "Media" }, "3": { n: "Gestión Institucional", p: "Baja" }, "4": { n: "Inclúyeme en TIC", p: "Media" }, "5": { n: "Ayuda Tecnológica", p: "Urgente" } };
            } else {
                servicios = { "1": { n: "Consultorio Pedagógico", p: "Baja" }, "2": { n: "INFRAESTRUCTURA TIC", p: "Baja" } };
            }
            if (servicios[texto]) {
                datosUsuario[chatID].servicio = servicios[texto].n;
                datosUsuario[chatID].prioridad = servicios[texto].p;
                if (datosUsuario[chatID].proyecto === "Alfatic" && texto === "1") {
                    await msg.reply("🍎 *Ayuda Pedagógica* - ¿Cómo deseas proceder?\n\n1️⃣ Hablar con Alfabot IA\n2️⃣ Describir solicitud para un asesor\n\n0️⃣ Volver al menú de Servicios");
                    pasoActual[chatID] = 'PREGUNTA_SUB_PEDAGOGICA';
                }
                else if (datosUsuario[chatID].proyecto === "Alfatic" && texto === "2") {
                    await msg.reply("📑 *Ayuda informativa - PQRS*\n1️⃣ Ayuda informativa\n2️⃣ PQRS\n\n0️⃣ Volver al menú de Servicios");
                    pasoActual[chatID] = 'PREGUNTA_SUB_INFORMATIVA';
                }
                else if (datosUsuario[chatID].proyecto === "Alfatic" && texto === "3") {
                    await msg.reply("🏫 *Gestión Institucional*\n1️⃣ Gestión Directiva\n2️⃣ Gestión Académico - Pedagógica\n3️⃣ Gestión de la comunidad\n\n0️⃣ Volver al menú de Servicios");
                    pasoActual[chatID] = 'PREGUNTA_SUB_INSTITUCIONAL';
                }
                else if (datosUsuario[chatID].proyecto === "Alfatic" && texto === "5") {
                    await msg.reply("💻 *Ayuda Tecnológica*\n1️⃣ Mejorar conectividad\n2️⃣ Clave wifi\n3️⃣ Equipo TIC\n4️⃣ Ciberseguridad\n5️⃣ Alfabot IA\n\n0️⃣ Volver al menú de Servicios");
                    pasoActual[chatID] = 'PREGUNTA_SUB_TECNOLOGICA';
                } else {
                    await msg.reply("📝 Describe brevemente tu solicitud:\n\n*(Escribe '0' si quieres volver al menú de servicios)*");
                    pasoActual[chatID] = 'PREGUNTA_DESCRIPCION';
                }
            } else { await msg.reply("❌ Opción no válida. Elija un número del menú."); }
        }
        else if (pasoActual[chatID] === 'PREGUNTA_SUB_PEDAGOGICA') {
            if (texto === "0") {
                pasoActual[chatID] = 'PREGUNTA_SERVICIO';
                await msg.reply("🛠️ Volvemos. *ALFATIC* - ¿Qué servicio requiere?\n1️⃣ Ayuda Pedagógica\n2️⃣ Ayuda informativa - PQRS\n3️⃣ Gestión Institucional\n4️⃣ Inclúyeme en TIC\n5️⃣ Ayuda Tecnológica\n\n0️⃣ Volver al menú de Cargos");
            } else if (texto === "1") {
                datosUsuario[chatID].subServicio = "Alfabot IA (Pedagógica)";
                await msg.reply("🤖 *ALFABOT IA* - Por favor describe brevemente tu solicitud técnica o duda:");
                pasoActual[chatID] = 'PREGUNTA_DESCRIPCION';
            } else if (texto === "2") {
                datosUsuario[chatID].subServicio = "Asesor (Pedagógica)";
                await msg.reply("📝 Describe brevemente tu solicitud:");
                pasoActual[chatID] = 'PREGUNTA_DESCRIPCION';
            } else { await msg.reply("❌ Elija 1, 2 o 0."); }
        }
        else if (pasoActual[chatID] === 'PREGUNTA_SUB_INFORMATIVA') {
            if (texto === "0") {
                pasoActual[chatID] = 'PREGUNTA_SERVICIO';
                await msg.reply("🛠️ Volvemos. *ALFATIC* - ¿Qué servicio requiere?\n1️⃣ Ayuda Pedagógica\n2️⃣ Ayuda informativa - PQRS\n3️⃣ Gestión Institucional\n4️⃣ Inclúyeme en TIC\n5️⃣ Ayuda Tecnológica\n\n0️⃣ Volver al menú de Cargos");
            } else if (texto === "1") {
                datosUsuario[chatID].subServicio = "Ayuda informativa";
                await msg.reply("📝 Describe brevemente tu solicitud:");
                pasoActual[chatID] = 'PREGUNTA_DESCRIPCION';
            } else if (texto === "2") {
                datosUsuario[chatID].subServicio = "PQRS";
                await msg.reply("📑 *PQRS* - Perfecto, cuéntanos a través de este formulario en que podemos ayudarte: https://forms.gle/Mcat1xurS26m4Xt58\n\n*Describe aquí brevemente tu solicitud:*");
                pasoActual[chatID] = 'PREGUNTA_DESCRIPCION';
            } else { await msg.reply("❌ Elija 1, 2 o 0."); }
        }
        else if (pasoActual[chatID] === 'PREGUNTA_SUB_INSTITUCIONAL') {
            if (texto === "0") {
                pasoActual[chatID] = 'PREGUNTA_SERVICIO';
                await msg.reply("🛠️ Volvemos. *ALFATIC* - ¿Qué servicio requiere?\n1️⃣ Ayuda Pedagógica\n2️⃣ Ayuda informativa - PQRS\n3️⃣ Gestión Institucional\n4️⃣ Inclúyeme en TIC\n5️⃣ Ayuda Tecnológica\n\n0️⃣ Volver al menú de Cargos");
            } else {
                const sub = { "1": "Gestión Directiva", "2": "Gestión Académico - Pedagógica", "3": "Gestión de la comunidad" };
                if (sub[texto]) {
                    datosUsuario[chatID].subServicio = sub[texto];
                    await msg.reply("📝 Describe brevemente tu solicitud:");
                    pasoActual[chatID] = 'PREGUNTA_DESCRIPCION';
                } else { await msg.reply("❌ Elija 1, 2, 3 o 0."); }
            }
        }
        else if (pasoActual[chatID] === 'PREGUNTA_SUB_TECNOLOGICA') {
            if (texto === "0") {
                pasoActual[chatID] = 'PREGUNTA_SERVICIO';
                await msg.reply("🛠️ Volvemos. *ALFATIC* - ¿Qué servicio requiere?\n1️⃣ Ayuda Pedagógica\n2️⃣ Ayuda informativa - PQRS\n3️⃣ Gestión Institucional\n4️⃣ Inclúyeme en TIC\n5️⃣ Ayuda Tecnológica\n\n0️⃣ Volver al menú de Cargos");
            } else if (texto === "4") {
                await msg.reply("🛡️ *Ciberseguridad* - ¿Cómo deseas proceder?\n\n1️⃣ Hablar con Alfabot IA\n2️⃣ Describir solicitud para un asesor\n\n0️⃣ Volver al menú de Ayuda Tecnológica");
                pasoActual[chatID] = 'PREGUNTA_SUB_CIBERSEGURIDAD';
            } else {
                const sub = { "1": "Mejorar conectividad", "2": "Clave wifi", "3": "Equipo TIC", "5": "Alfabot IA" };
                if (sub[texto]) {
                    datosUsuario[chatID].subServicio = sub[texto];
                    await msg.reply("📝 Describe brevemente tu solicitud:");
                    pasoActual[chatID] = 'PREGUNTA_DESCRIPCION';
                } else { await msg.reply("❌ Elija un número o 0."); }
            }
        }
        else if (pasoActual[chatID] === 'PREGUNTA_SUB_CIBERSEGURIDAD') {
            if (texto === "0") {
                pasoActual[chatID] = 'PREGUNTA_SUB_TECNOLOGICA';
                await msg.reply("💻 Volvemos. *Ayuda Tecnológica*\n1️⃣ Mejorar conectividad\n2️⃣ Clave wifi\n3️⃣ Equipo TIC\n4️⃣ Ciberseguridad\n5️⃣ Alfabot IA\n\n0️⃣ Volver al menú de Servicios");
            } else if (texto === "1") {
                datosUsuario[chatID].subServicio = "Alfabot IA (Ciberseguridad)";
                await msg.reply("🤖 *ALFABOT IA* - Por favor describe brevemente tu duda sobre Ciberseguridad:");
                pasoActual[chatID] = 'PREGUNTA_DESCRIPCION';
            } else if (texto === "2") {
                datosUsuario[chatID].subServicio = "Asesor (Ciberseguridad)";
                await msg.reply("📝 Describe brevemente tu solicitud de Ciberseguridad:");
                pasoActual[chatID] = 'PREGUNTA_DESCRIPCION';
            } else { await msg.reply("❌ Elija 1, 2 o 0."); }
        }
        else if (pasoActual[chatID] === 'PREGUNTA_NUEVA_INCIDENCIA') {
            if (texto === "1") {
                datosUsuario[chatID] = {};
                pasoActual[chatID] = 'PREGUNTA_PROYECTO_INICIAL';
                await msg.reply("📑 ¿A qué **PROYECTO** pertenece tu nueva solicitud?\n\n1️⃣ Alfatic\n2️⃣ Generación Tech\n\n*Responde 1 o 2*");
            } else if (texto === "2") {
                delete pasoActual[chatID];
                await msg.reply("✅ Perfecto. Estamos en espera de que nuestro asesor cierre tu caso anterior. Gracias por tu paciencia. 👋");
            } else {
                await msg.reply("❌ Opción no válida. Responde 1 para nueva incidencia o 2 para esperar respuesta.");
            }
        }
        else if (pasoActual[chatID] === 'PREGUNTA_DESCRIPCION') {
            if (texto === "0") {
                pasoActual[chatID] = 'PREGUNTA_SERVICIO';
                if (datosUsuario[chatID].proyecto === "Alfatic") {
                    await msg.reply("🛠️ Volvemos. *ALFATIC* - ¿Qué servicio requiere?\n\n1️⃣ Ayuda Pedagógica\n2️⃣ Ayuda informativa - PQRS\n3️⃣ Gestión Institucional\n4️⃣ Inclúyeme en TIC\n5️⃣ Ayuda Tecnológica\n\n0️⃣ Volver al menú de Cargos");
                } else {
                    await msg.reply("🌟 Volvemos. *GENERACIÓN TECH* - ¿Qué servicio requiere?\n\n1️⃣ Consultorio Pedagógico\n2️⃣ INFRAESTRUCTURA TIC\n3️⃣ ¿Quiénes somos?\n\n0️⃣ Volver al menú de Cargos");
                }
                return;
            }
            const prefijo = datosUsuario[chatID].subServicio ? `[${datosUsuario[chatID].subServicio}] ` : "";
            datosUsuario[chatID].descripcion = prefijo + texto;
            if (temporizadorAviso[chatID]) clearTimeout(temporizadorAviso[chatID]);
            if (temporizadorCierre[chatID]) clearTimeout(temporizadorCierre[chatID]);
            const ticketRegistrado = await enviarDatosFinales(numeroReal, datosUsuario[chatID], chatID);
            await msg.reply("✅ Solicitud registrada con éxito. He transferido tu caso a uno de nuestros asesores, quien te contactará en breve para darte una solución personalizada. ¡Gracias por tu paciencia!.");
            if (ticketRegistrado) {
                await msg.reply("¿Qué deseas hacer ahora?\n\n1️⃣ Registrar una nueva incidencia\n2️⃣ Esperar respuesta de la incidencia anterior\n\n*Responde 1 o 2*");
                pasoActual[chatID] = 'PREGUNTA_NUEVA_INCIDENCIA';
            } else {
                delete pasoActual[chatID];
            }
        }
    } catch (error) { console.error("Error:", error); }
    finally {
        procesando[chatID] = false;
        setTimeout(() => { mensajesVistos.delete(msgId); }, 10000);
    }
});

client.on('message_reaction', async (reaction) => {
    try {
        const msgRelacionado = await client.getMessageById(reaction.msgId._serialized);
        if (msgRelacionado.timestamp < startupTime) return;
        if (reaction.reaction === '👍') {
            const chatID = reaction.msgId.remote;
            if (!reaction.id.fromMe) return;
            const abiertos = ticketsActivos[chatID] || [];
            if (abiertos.length === 0) return;

            const ticketCerrado = abiertos.shift();
            ticketEnCalificacion[chatID] = ticketCerrado;
            ticketsActivos[chatID] = abiertos;
            desactivarModoManualPorTicket(chatID, ticketCerrado.ticket);
            pasoActual[chatID] = 'ESPERANDO_CALIFICACION';
            console.log(`✅ close_event chat=${chatID} ticket=${ticketCerrado.ticket}`);
            await client.sendMessage(chatID, `✅ ¡Tu caso #${ticketCerrado.ticket} ha sido cerrado con éxito!\n\nNos encantaría saber qué tal fue tu experiencia. Por favor, califica la atención de nuestro asesor respondiendo con un número del 1 al 5:\n\n1️⃣ = Muy mala\n5️⃣ = Excelente\n\n¡Tu opinión nos ayuda a mejorar cada día! ⭐`);
            gestionarTemporizadores(chatID);
        }
    } catch (e) { }
});

// Iniciar servidor HTTP para servir QR en web
const http = require('http');

function setNoCacheHeaders(res, contentType) {
    res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
        'Surrogate-Control': 'no-store'
    });
}

const server = http.createServer((req, res) => {
    const pathname = String(req.url || '/').split('?')[0];

    if (pathname === '/' || pathname === '/qr' || pathname === '/qr.html') {
        const imgPath = path.join(process.cwd(), 'last-qr.png');

        if (!fs.existsSync(imgPath)) {
            setNoCacheHeaders(res, 'text/html; charset=utf-8');
            res.end(`
                <!doctype html>
                <html lang="es">
                <head>
                    <meta charset="utf-8" />
                    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0" />
                    <meta http-equiv="Pragma" content="no-cache" />
                    <meta http-equiv="Expires" content="0" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>ALFABOT - Esperando QR</title>
                </head>
                <body style="font-family: Arial, sans-serif; padding: 24px;">
                    <h2>Esperando QR...</h2>
                    <p>El bot aún no ha emitido un QR nuevo. Esta página se recarga cada 10 segundos.</p>
                    <script>setTimeout(() => location.reload(), 10000);</script>
                </body>
                </html>
            `);
            return;
        }

        const stamp = lastQrUpdatedAt || Date.now();
        setNoCacheHeaders(res, 'text/html; charset=utf-8');
        res.end(`
            <!doctype html>
            <html lang="es">
            <head>
                <meta charset="utf-8" />
                <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0" />
                <meta http-equiv="Pragma" content="no-cache" />
                <meta http-equiv="Expires" content="0" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>ALFABOT - QR en vivo</title>
            </head>
            <body style="font-family: Arial, sans-serif; padding: 24px; text-align:center;">
                <h2>Escanea este QR (se actualiza automático)</h2>
                <p>Actualizado: ${new Date(stamp).toLocaleString()}</p>
                <img src="/last-qr.png?t=${stamp}" alt="QR" style="max-width: 95vw; width: 380px; border: 1px solid #ddd;" />
                <p>Si expira, esta página se recarga cada 10 segundos.</p>
                <script>setTimeout(() => location.reload(), 10000);</script>
            </body>
            </html>
        `);
    } else if (pathname === '/last-qr.png') {
        const imgPath = path.join(process.cwd(), 'last-qr.png');
        if (fs.existsSync(imgPath)) {
            const stream = fs.createReadStream(imgPath);
            setNoCacheHeaders(res, 'image/png');
            stream.pipe(res);
            return;
        }
        res.writeHead(404);
        res.end('last-qr.png no disponible');
    } else {
        res.writeHead(404);
        res.end('404');
    }
});

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
let currentPort = DEFAULT_PORT;
let listenAttempts = 0;
const MAX_ATTEMPTS = 5;

function startServerOnPort(port) {
    listenAttempts++;
    server.once('error', (err) => {
        if (err && err.code === 'EADDRINUSE' && listenAttempts < MAX_ATTEMPTS) {
            console.warn(`Puerto ${port} en uso, intentando ${port + 1}...`);
            currentPort = port + 1;
            startServerOnPort(currentPort);
            return;
        }

        console.error('Error en servidor QR:', err && err.message ? err.message : err);
        // No detener la aplicación por un error de puerto; el bot seguirá intentando inicializar
    });

    server.listen(port, () => {
        console.log(`\n🌐 Servidor HTTP en puerto ${port} - Accede a http://localhost:${port}/qr para ver el código QR`);
        if (process.env.NODE_ENV === 'production') {
            console.log(`📱 En Railway: https://<nombre-railway>.up.railway.app/qr\n`);
        }
    });
}

startServerOnPort(currentPort);

inicializarCliente();