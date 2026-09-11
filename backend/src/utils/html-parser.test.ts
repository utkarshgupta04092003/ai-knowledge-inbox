import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractPageContent, decodeHtmlEntities } from "./html-parser.js";

describe("HtmlParser", () => {
  it("extracts page title and strips HTML tags, scripts, and comments", () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Deep Dive into Vector DBs</title>
          <script>console.log("secret script");</script>
          <style>body { color: red; }</style>
        </head>
        <body>
          <!-- Nav banner -->
          <nav>Menu navigation</nav>
          <h1>Understanding HNSW</h1>
          <p>Hierarchical Navigable Small World graphs enable fast approximate search.</p>
          <footer>Copyright 2026</footer>
        </body>
      </html>
    `;

    const result = extractPageContent(html, "fallback");
    assert.equal(result.title, "Deep Dive into Vector DBs");
    assert.ok(!result.content.includes("console.log"));
    assert.ok(!result.content.includes("body { color: red; }"));
    assert.ok(!result.content.includes("Menu navigation"));
    assert.ok(result.content.includes("Understanding HNSW"));
    assert.ok(result.content.includes("Hierarchical Navigable Small World graphs enable fast approximate search."));
  });

  it("decodes HTML entities properly", () => {
    const html = `<title>Cats &amp; Dogs</title><p>This &gt; that &amp; &quot;quoted&quot; &#39;apostrophe&#39;</p>`;
    const result = extractPageContent(html, "fallback");

    assert.equal(result.title, "Cats & Dogs");
    assert.equal(result.content, `This > that & "quoted" 'apostrophe'`);
  });

  it("uses fallback title when title tag is missing", () => {
    const html = `<p>Plain content without title tag.</p>`;
    const result = extractPageContent(html, "example.com");

    assert.equal(result.title, "example.com");
    assert.equal(result.content, "Plain content without title tag.");
  });

  it("decodes entities via decodeHtmlEntities directly", () => {
    assert.equal(decodeHtmlEntities("&amp;&lt;&gt;&quot;&#39;&nbsp;&#65;"), "&<>\"' A");
  });
});
