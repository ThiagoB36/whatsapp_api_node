// server.js
const {
  default: makeWASocket,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require("fs");
const qrcode = require("qrcode-terminal");

async function startBot() {
  // Carrega ou cria a pasta de autenticação
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  // Cria conexão
  const sock = makeWASocket({
    logger: P({ level: "silent" }),
    auth: state,
  });

  // Evento: Conectado ou reconectado
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // Em cloud, não dá pra gerar QR no terminal, então só imprime como string
      console.log("📷 Novo QR code (copie e escaneie pelo WhatsApp):");
      console.log(qr);
    }

    if (connection === "open") {
      console.log("✅ Bot conectado ao WhatsApp!");
    } else if (connection === "close") {
      console.log("❌ Conexão perdida, tentando reconectar...");
      startBot();
    }
  });

  // Salva credenciais
  sock.ev.on("creds.update", saveCreds);

  // Evento: Mensagem recebida
  sock.ev.on("messages.upsert", async (msg) => {
    const message = msg.messages[0];
    if (!message.message) return; // Ignora mensagens vazias

    const from = message.key.remoteJid;
    const text =
      message.message.conversation ||
      message.message.extendedTextMessage?.text ||
      "";
    console.log({ message });

    console.log(`📩 Mensagem de ${from}: ${text}`);

    // Respostas automáticas
    if (text.toLowerCase() === "oi") {
      await sock.sendMessage(from, { text: "Oi! Tudo bem? 😊" });
    } else if (text.toLowerCase() === "menu") {
      await sock.sendMessage(from, {
        text: "📋 Opções:\n1 - Sobre nós\n2 - Promoções\n3 - Falar com atendente",
      });
    }
    try {
      await fetch("http://localhost:3000/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: from,
          text: text,
          timestamp: Date.now(),
        }),
      });
    } catch (e) {
      console.error("Erro ao enviar mensagem para API:", e);
    }
  });
}

// Inicia o bot
startBot();
