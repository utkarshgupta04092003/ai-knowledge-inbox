import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import express from "express";
import { createApp } from "./app.js";
import { AppError, errorHandler } from "./middleware/error.middleware.js";

describe("Phase 1 - Backend Core & Health Suite", () => {
  const app = createApp();

  describe("GET /health", () => {
    it("should respond with HTTP 200 and status ok", async () => {
      const res = await request(app).get("/health");

      assert.equal(res.status, 200);
      assert.deepEqual(res.body, { status: "ok" });
      assert.match(res.headers["content-type"], /json/);
    });

    it("should include CORS headers", async () => {
      const res = await request(app)
        .get("/health")
        .set("Origin", "http://localhost:3000");

      assert.equal(res.headers["access-control-allow-origin"], "*");
    });
  });

  describe("404 Handler", () => {
    it("should return structured 404 error envelope for unknown routes", async () => {
      const res = await request(app).get("/api/v1/unknown-endpoint");

      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, "NOT_FOUND");
      assert.equal(res.body.error.message, "The requested route does not exist.");
    });
  });

  describe("Error Handler Middleware", () => {
    it("should handle custom AppError instances with appropriate status code and payload", async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.get("/test-error", () => {
        throw new AppError(400, "INVALID_INPUT", "Test validation failed");
      });
      testApp.use(errorHandler);

      const res = await request(testApp).get("/test-error");

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, "INVALID_INPUT");
      assert.equal(res.body.error.message, "Test validation failed");
    });

    it("should mask unhandled errors with HTTP 500 and generic message", async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.get("/unhandled-crash", () => {
        throw new Error("Simulated database failure");
      });
      testApp.use(errorHandler);

      const res = await request(testApp).get("/unhandled-crash");

      assert.equal(res.status, 500);
      assert.equal(res.body.error.code, "INTERNAL_ERROR");
      assert.equal(res.body.error.message, "An unexpected internal server error occurred.");
    });
  });
});
