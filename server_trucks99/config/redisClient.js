"use strict";

require("dotenv").config();
const { createClient } = require("redis");

const REDIS_URL =
  process.env.REDIS_URL || process.env.REDIS_URI || "redis://127.0.0.1:6379";

const client = createClient({
  url: REDIS_URL,
  socket: {
    connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000),
    reconnectStrategy: (retries) => (retries > 3 ? false : Math.min(retries * 200, 2000)),
  },
});

client.on("error", (err) => {
  console.error("Redis Client Error", err.message || err);
});

let connectPromise = null;

async function ensureRedisConnected() {
  if (client.isOpen) {
    return client;
  }
  if (!connectPromise) {
    const timeoutMs = Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000);
    connectPromise = Promise.race([
      client.connect().then(() => {
        console.log("Connected to Redis");
        return client;
      }),
      new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error(`Redis connect timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]).catch((err) => {
      connectPromise = null;
      throw err;
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
