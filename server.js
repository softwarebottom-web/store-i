const express = require('express');
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const admin = require('firebase-admin');
const requestIp = require('request-ip');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(requestIp.mw());
app.use(express.static('public'));

// --- 1. FIREBASE ADMIN SETUP ---
// Menggunakan Private Key dari .env untuk akses database penuh
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// --- 2. DISCORD BOT SETUP ---
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// --- 3. SECURITY MIDDLEWARE (IP BAN & GLOBAL STATUS) ---
app.use(async (req, res, next) => {
    const clientIp = req.clientIp;
    
    try {
        // Cek apakah IP dibanned secara permanen oleh Owner
        const banCheck = await db.collection('banned_ips').doc(clientIp).get();
        if (banCheck.exists) {
            return res.status(403).send("<h1>AKSES DITOLAK</h1><p>IP Anda telah diblokir secara permanen oleh sistem ZStore karena terindikasi penipuan.</p>");
        }

        // Cek Status Toko Global (Hanya Owner yang bisa bypass)
        const config = await db.collection('system_settings').doc('store_config').get();
        const isGlobalOpen = config.exists ? config.data().isGlobalOpen : true;
        
        if (!isGlobalOpen && !req.path.includes('panelowner')) {
            return res.status(503).send("<h1>MAINTENANCE</h1><p>ZStore sedang dalam pemeliharaan rutin. Silahkan kembali nanti.</p>");
        }
    } catch (error) {
        console.error("Security Middleware Error:", error);
    }
    next();
});

// --- 4. API: CREATE TICKET (END-TO-END SYSTEM) ---
app.post('/api/create-ticket', async (req, res) => {
    const { buyerName, sellerId, productName, price, brandName, method } = req.body;

    try {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        
        // Membuat channel privat khusus Buyer dan Seller
        const channel = await guild.channels.create({
            name: `🎫-${brandName}-${buyerName}`,
            type: ChannelType.GuildText,
            parent: process.env.CATEGORY_ID,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel], // Tutup akses publik
                },
                {
                    id: sellerId, // Beri akses ke Seller/Owner Brand
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
                },
            ],
        });

        // Embed Informatif untuk Tiket Baru
        const ticketEmbed = new EmbedBuilder()
            .setTitle("🛒 TRANSAKSI BARU DIMULAI")
            .setDescription(`Halo **${buyerName}**, selamat datang di channel transaksi privat ZStore.`)
            .setColor(sellerId === process.env.OWNER_ID ? 0xFFD700 : 0x2ECC71)
            .addFields(
                { name: "📦 Produk", value: productName, inline: true },
                { name: "💰 Total Harga", value: `Rp ${price.toLocaleString()}`, inline: true },
                { name: "🌐 Jalur Beli", value: method, inline: true },
                { name: "🛡️ Status", value: "Verified by ZStore System" }
            )
            .setFooter({ text: "Gunakan channel ini untuk diskusi dan pengiriman aset jasa." })
            .setTimestamp();

        await channel.send({ 
            content: `<@${sellerId}> Anda memiliki pesanan baru! Silahkan layani pembeli ini.`, 
            embeds: [ticketEmbed] 
        });

        res.json({ success: true, channelUrl: `https://discord.com/channels/${guild.id}/${channel.id}` });

    } catch (error) {
        console.error("Ticket Creation Error:", error);
        res.status(500).json({ error: "Gagal membuat tiket Discord." });
    }
});

// --- 5. API: CLOSE & BACKUP TICKET ---
app.post('/api/close-ticket', async (req, res) => {
    const { channelId, sellerName } = req.body;
    try {
        const channel = await client.channels.fetch(channelId);
        if (channel) {
            // Logika backup bisa ditambahkan di sini (scraping chat)
            await channel.send(`⚠️ Channel ini akan ditutup dalam 10 detik oleh ${sellerName}...`);
            setTimeout(() => channel.delete(), 10000);
            res.json({ success: true });
        }
    } catch (error) {
        res.status(500).send("Gagal menutup tiket.");
    }
});

// --- 6. START SERVER & BOT ---
client.once('ready', () => {
    console.log(`✅ Bot Discord Online sebagai: ${client.user.tag}`);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 ZStore System aktif di port ${PORT}`);
    client.login(process.env.DISCORD_TOKEN);
});
