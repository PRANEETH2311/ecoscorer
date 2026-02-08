require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const server = http.createServer(app);

// Production: Allow connections from any origin
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    // Handle proxy/load balancer
    transports: ['websocket', 'polling']
});

const prisma = new PrismaClient();

// CORS for all origins
app.use(cors({ origin: "*" }));
app.use(express.json());

// Health check for Railway
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/telemetry', require('./routes/telemetry'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

app.get('/', (req, res) => {
    res.send('EcoScorer API is running 🏎️');
});

// WebSocket handling
require('./websocket/handler')(io, prisma);

// Use PORT from environment (Railway sets this)
const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  EcoScorer Server Running                                 ║
║  Port: ${PORT}                                              ║
║  Mode: ${process.env.NODE_ENV || 'development'}                                    ║
╚═══════════════════════════════════════════════════════════╝
`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
