"use strict";

require("dotenv").config();
const { createClient } = require("redis");

const REDIS_URL =
  process.env.REDIS_URL || process.env.REDIS_URI || "redis://127.0.0.1:6379";
const CONNECT_TIMEOUT_MS = Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 3000);
const FAIL_COOLDOWN_MS = Number(process.env.REDIS_FAIL_COOLDOWN_MS || 15000);

const client = createClient({
  url: REDIS_URL,
  socket: {
    connectTimeout: CONNECT_TIMEOUT_MS,
    reconnectStrategy: (retries) => {
      if (retries > 8) return false;
      return Math.min(retries * 250, 3000);
    },
  },
});

client.on("error", (err) => {
  console.error("Redis Client Error", err.message || err);
});

let connectPromise = null;
let skipReconnectUntil = 0;

async function ensureRedisConnected() {
  if (client.isReady) {
    return client;
  }

  if (Date.now() < skipReconnectUntil) {
    throw new Error("Redis unavailable");
  }

  if (!connectPromise) {
    connectPromise = (async () => {
      if (!client.isOpen) {
        await client.connect();
      }
      await client.ping();
      skipReconnectUntil = 0;
      return client;
    })()
      .catch((err) => {
        skipReconnectUntil = Date.now() + FAIL_COOLDOWN_MS;
        throw err;
      })
      .finally(() => {
        connectPromise = null;
      });
  }

  return connectPromise;
}

// Attempt connect eagerly but do not block module load
ensureRedisConnected().catch((err) => {
  console.error("Failed to connect to Redis:", err.message || err);
});

module.exports = client;
module.exports.ensureRedisConnected = ensureRedisConnected;
