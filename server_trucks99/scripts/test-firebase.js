#!/usr/bin/env node
"use strict";

/**
 * Smoke tests for Firebase Admin initialization and FCM helpers.
 * Run: node scripts/test-firebase.js
 */

const assert = require("assert");

function testModuleLoadsWithoutCrash() {
  const firebase = require("../Firebase/firebase");
  assert(typeof firebase === "function", "default export should be sendNotification function");
  assert(typeof firebase.sendNotification === "function");
  assert(typeof firebase.isInvalidTokenError === "function");
  assert(typeof firebase.publishLoadBidEvent === "function");
  console.log("[test] Firebase module loaded");
  console.log("[test] firebaseReady:", firebase.firebaseReady);
  if (firebase.initError) {
    console.log("[test] initError:", firebase.initError.message);
  }
}

function testInvalidTokenDetection() {
  const { isInvalidTokenError } = require("../Firebase/firebase");
  assert.strictEqual(isInvalidTokenError("messaging/invalid-registration-token"), true);
  assert.strictEqual(isInvalidTokenError("messaging/registration-token-not-registered"), true);
  assert.strictEqual(isInvalidTokenError("messaging/internal-error"), false);
  console.log("[test] Invalid token error codes recognized");
}

function testUnconfiguredSendReturnsGracefully() {
  const sendNotification = require("../Firebase/firebase");
  if (sendNotification.firebaseReady) {
    console.log("[test] Firebase configured — skipping unconfigured send test");
    return;
  }

  return sendNotification("fake-token", "Title", "Body").then((result) => {
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.message, "Firebase not configured");
    console.log("[test] Unconfigured send returns gracefully");
  });
}

async function testFcmPushServiceExports() {
  const fcmPushService = require("../services/fcmPushService");
  assert(typeof fcmPushService.sendPushToUser === "function");
  assert(typeof fcmPushService.saveFcmToken === "function");
  console.log("[test] fcmPushService exports OK");
}

async function main() {
  testModuleLoadsWithoutCrash();
  testInvalidTokenDetection();
  await testUnconfiguredSendReturnsGracefully();
  await testFcmPushServiceExports();
  console.log("\nAll Firebase smoke tests passed.");
  process.exit(0);
}

main().catch((err) => {
  console.error("\nFirebase smoke tests failed:", err);
  process.exit(1);
});
