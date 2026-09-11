export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "AI Knowledge Inbox API",
    version: "1.0.0",
    description: "REST API for AI Knowledge Inbox — document ingestion, semantic search, and grounded RAG query synthesis.",
  },
  servers: [
    {
      url: "/",
      description: "Default server",
    },
  ],
  tags: [
    { name: "System", description: "Health check and diagnostics" },
    { name: "Ingestion", description: "Ingesting notes and web URLs" },
    { name: "Items", description: "Listing and inspecting saved items" },
    { name: "RAG Query", description: "Semantic search and grounded question answering" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Service Health Check",
        description: "Returns the operational status of the service.",
        responses: {
          "200": {
            description: "Service is operational",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/ingest": {
      post: {
        tags: ["Ingestion"],
        summary: "Ingest Note or Web URL",
        description: "Persists a document to SQLite, segments it into chunks, embeds via OpenAI, and upserts vectors to Pinecone.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  {
                    type: "object",
                    required: ["type", "content"],
                    properties: {
                      type: { type: "string", enum: ["note"], example: "note" },
                      title: { type: "string", example: "Architecture Decisions" },
                      content: { type: "string", example: "We chose SQLite and Pinecone for clean separation." },
                    },
                  },
                  {
                    type: "object",
                    required: ["type", "url"],
                    properties: {
                      type: { type: "string", enum: ["url"], example: "url" },
                      url: { type: "string", format: "uri", example: "https://example.com/article" },
                    },
                  },
                ],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Document successfully ingested and indexed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    item: { $ref: "#/components/schemas/Item" },
                    chunkCount: { type: "integer", example: 3 },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "502": { $ref: "#/components/responses/UpstreamError" },
        },
      },
    },
    "/items": {
      get: {
        tags: ["Items"],
        summary: "List Ingested Documents",
        description: "Returns all saved notes and URLs ordered by creation timestamp descending.",
        responses: {
          "200": {
            description: "Array of items",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Item" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/items/{id}": {
      get: {
        tags: ["Items"],
        summary: "Get Ingested Document by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "UUID of the document",
          },
        ],
        responses: {
          "200": {
            description: "Item found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    item: { $ref: "#/components/schemas/Item" },
                  },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/query": {
      post: {
        tags: ["RAG Query"],
        summary: "Ask a Question (RAG)",
        description: "Embeds query, searches Pinecone vector store, and synthesizes a grounded answer via gpt-4o-mini with citations.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["question"],
                properties: {
                  question: { type: "string", example: "What architecture decisions were made?" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Synthesized answer with sources",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    answer: { type: "string", example: "The architecture separates relational data in SQLite and vectors in Pinecone [Source 1]." },
                    sources: {
                      type: "array",
                      items: { $ref: "#/components/schemas/SourceCitation" },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "502": { $ref: "#/components/responses/UpstreamError" },
        },
      },
    },
  },
  components: {
    schemas: {
      Item: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          sourceType: { type: "string", enum: ["note", "url"] },
          title: { type: "string" },
          content: { type: "string" },
          sourceUrl: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      SourceCitation: {
        type: "object",
        properties: {
          itemId: { type: "string" },
          title: { type: "string" },
          url: { type: "string", nullable: true },
          snippet: { type: "string" },
        },
      },
      ErrorPayload: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    responses: {
      BadRequest: {
        description: "Invalid input or validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorPayload" },
          },
        },
      },
      NotFound: {
        description: "Requested resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorPayload" },
          },
        },
      },
      UpstreamError: {
        description: "External upstream service failure (OpenAI, Pinecone, or remote URL)",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorPayload" },
          },
        },
      },
    },
  },
};
