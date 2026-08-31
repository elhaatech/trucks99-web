const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env');
const envFileExists = fs.existsSync(envPath);
console.log('Loading environment from:', envPath, 'exists:', envFileExists);

const dotenvResult = require('dotenv').config({ path: envPath });
if (dotenvResult.error) {
    console.error('Error loading .env file:', dotenvResult.error);
}

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const seedDatabase = require('./seedData');
require('./Firebase/firebase');

const server = express();
const DB = process.env.MONGODB_ATLAS;
const RETRY_DELAY_MS = 5000;
let isStarting = false;
let hasMountedApp = false;

function getPreferredPort() {
    const configuredPort = Number(process.env.PORT);
    return Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 3003;
}

function startHttpServer(port = getPreferredPort()) {
    return new Promise((resolve, reject) => {
        const httpServer = http.createServer(server);

        httpServer.once('error', (err) => {
            if (err && err.code === 'EADDRINUSE') {
                console.error(
                    `[startup] Port ${port} is already in use. Stop the other Node process and restart.`,
                );
                console.error(
                    `[startup] Windows: Get-NetTCPConnection -LocalPort ${port} | Select OwningProcess`,
                );
            }
            reject(err);
        });

        httpServer.listen(port, () => {
            console.log(`Server running on port ${port}`);
            resolve(httpServer);
        });
    });
}

if (!DB) {
    console.error('MONGODB_ATLAS is not set in server/.env');
    process.exit(1);
}

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

async function startServer() {
    if (isStarting) return;
    isStarting = true;
    try {
        await mongoose.connect(DB);
        console.log("Successfully connected to database!!");

        try {
            const { ensureMarketItemViewIndexes } = require('./schema/marketItemView');
            await ensureMarketItemViewIndexes();
        } catch (err) {
            console.error('[MarketItemView] Index migration failed:', err.message || err);
        }

        try {
            const { checkOtpDependencies } = require('./helpers/otpStartupCheck');
            await checkOtpDependencies();
        } catch (err) {
            console.error('[OTP] Startup check failed:', err.message || err);
        }

        if (!hasMountedApp) {
            // Load routes only after DB is reachable to avoid startup crashes from DB-dependent middlewares.
            delete require.cache[require.resolve('./app')];
            const app = require('./app');
            server.use(app);
            hasMountedApp = true;

            const emiMounted = (app._router?.stack || []).some(
                (layer) => layer.regexp && String(layer.regexp).includes('emi'),
            );
            if (emiMounted) {
                console.log('[startup] EMI API mounted at /api/emi (tenures, calculate)');
            } else {
                console.error('[startup] WARNING: /api/emi routes are NOT mounted — EMI calculator will return 404');
            }
        }

        // Run seed operations (DB only; does not touch files, so nodemon will not restart)
        try {
            await seedDatabase();
        } catch (err) {
            console.error("Seed error (server will still start):", err.message || err);
        }

        try {
            const { seedDefaultTemplates } = require('./services/notificationService');
            await seedDefaultTemplates();
        } catch (err) {
            console.error("Notification template seed error:", err.message || err);
        }

        const requestedPort = getPreferredPort();
        await startHttpServer(requestedPort);

        // Start the daily subscription expiry scheduler
        try {
            const { startScheduler } = require('./services/subscriptionScheduler');
            startScheduler();
        } catch (err) {
            console.error("Failed to start subscription scheduler:", err.message || err);
        }

        try {
            const { startReminderScheduler } = require('./services/notificationReminderScheduler');
            startReminderScheduler();
        } catch (err) {
            console.error("Failed to start reminder scheduler:", err.message || err);
        }
    } catch (err) {
        console.error("Server startup failed:", err.stack || err.message || err);
        if (err && err.code === "EADDRINUSE") {
            console.error("[startup] Free the port above, then run npm run start again.");
            process.exit(1);
        }
        console.log(`Retrying DB connection in ${RETRY_DELAY_MS / 1000}s...`);
        setTimeout(() => {
            isStarting = false;
            startServer();
        }, RETRY_DELAY_MS);
        return;
    }
    isStarting = false;
}

module.exports = { startServer, startHttpServer, getPreferredPort };

if (require.main === module) {
    startServer();
}

