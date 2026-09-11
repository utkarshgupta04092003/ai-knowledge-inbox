import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";

describe("Swagger UI API Docs (GET /api-docs)", () => {
  const app = createApp();

  it("serves raw OpenAPI 3.0 specification as JSON", async () => {
    const res = await request(app).get("/api-docs/openapi.json");

    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /json/);
    assert.equal(res.body.openapi, "3.0.0");
    assert.equal(res.body.info.title, "AI Knowledge Inbox API");
    assert.ok(res.body.paths["/health"]);
    assert.ok(res.body.paths["/ingest"]);
    assert.ok(res.body.paths["/items"]);
    assert.ok(res.body.paths["/query"]);
  });

  it("serves Swagger UI html or redirect at /api-docs", async () => {
    const res = await request(app).get("/api-docs/");

    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /html/);
    assert.ok(res.text.includes("swagger-ui"));
  });
});
