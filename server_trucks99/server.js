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
const mongoose = require('mongoose');
const seedDatabase = require('./seedData');
require('./Firebase/firebase');

const server = express();
const DB = process.env.MONGODB_ATLAS;
const RETRY_DELAY_MS = 5000;
let isStarting = false;
let hasMountedApp = false;

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
                console.log('[startup] EMI API mounted at /api/emi (list, create, view, pay, cancel, tenures)');
            } else {
                console.error('[startup] WARNING: /api/emi routes are NOT mounted — EMI features will return 404');
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

        const PORT = process.env.PORT || 3001;
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);

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
        });
    } catch (err) {
        console.error("Server startup failed:", err.message || err);
        console.log(`Retrying DB connection in ${RETRY_DELAY_MS / 1000}s...`);
        setTimeout(() => {
            isStarting = false;
            startServer();
        }, RETRY_DELAY_MS);
        return;
    }
    isStarting = false;
}

startServer();

