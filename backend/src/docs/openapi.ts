export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "AI Knowledge Inbox API",
    version: "1.0.0",
    description: "REST API for AI Knowledge Inbox — document ingestion, semantic search, multi-session chat, and grounded RAG query synthesis.",
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
    { name: "Items", description: "Listing, inspecting, editing, and deleting saved items" },
    { name: "Sessions", description: "Multi-turn conversation sessions and chat history" },
    { name: "RAG Query", description: "Semantic search and grounded question answering with streaming" },
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
      patch: {
        tags: ["Items"],
        summary: "Update Note Content or Title",
        description: "Updates the title or content of an existing note item and reindexes its vector chunks in Pinecone.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "UUID of the note to update",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string", example: "Updated Architecture Notes" },
                  content: { type: "string", example: "Updated note content with new insights." },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Item updated successfully",
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
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Items"],
        summary: "Delete Ingested Document",
        description: "Deletes a document from SQLite and removes its associated vector chunks from Pinecone.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "UUID of the document to delete",
          },
        ],
        responses: {
          "200": {
            description: "Document deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Item deleted successfully." },
                  },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/sessions": {
      get: {
        tags: ["Sessions"],
        summary: "List Chat Sessions",
        description: "Returns all conversation sessions ordered by most recently updated.",
        responses: {
          "200": {
            description: "List of sessions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sessions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ChatSessionSummary" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Sessions"],
        summary: "Create Chat Session",
        description: "Creates a new conversation session.",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string", example: "Discussion on Pinecone Indexing" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Session created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChatSessionSummary" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/sessions/{id}": {
      get: {
        tags: ["Sessions"],
        summary: "Get Session Detail with Turns",
        description: "Returns session metadata along with full turn history, citations, and token metrics.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "UUID of the conversation session",
          },
        ],
        responses: {
          "200": {
            description: "Session detail with turns",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChatSessionDetail" },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Sessions"],
        summary: "Rename Chat Session",
        description: "Updates the title of an existing conversation session.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "UUID of the conversation session",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string", example: "Updated Session Topic" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Session updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChatSessionSummary" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Sessions"],
        summary: "Delete Chat Session",
        description: "Deletes a conversation session and cascades deletion of all associated chat turns.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "UUID of the conversation session",
          },
        ],
        responses: {
          "204": {
            description: "Session deleted successfully",
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/query": {
      post: {
        tags: ["RAG Query"],
        summary: "Ask a Question (RAG with Self-RAG & Session Memory)",
        description: "Synthesizes a grounded answer via Self-RAG loop (retrieval grading, query rewrite, groundedness check). Supports multi-turn session memory and SSE streaming.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["question"],
                properties: {
                  question: { type: "string", example: "What architecture decisions were made?" },
                  sessionId: { type: "string", format: "uuid", example: "f3c959f6-6c8a-40a1-a087-c116d41a3845", description: "Optional chat session ID for conversation memory." },
                  stream: { type: "boolean", default: false, example: true, description: "If true, streams answer via Server-Sent Events (text/event-stream)." },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Synthesized answer with sources (JSON or SSE stream)",
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
                    sessionId: { type: "string", format: "uuid" },
                    iterations: { type: "integer", example: 1 },
                    isFallback: { type: "boolean", example: false },
                    tokenMetrics: {
                      type: "object",
                      properties: {
                        promptTokens: { type: "integer", example: 420 },
                        completionTokens: { type: "integer", example: 85 },
                        totalTokens: { type: "integer", example: 505 },
                      },
                    },
                  },
                },
              },
              "text/event-stream": {
                schema: {
                  type: "string",
                  description: "SSE stream emitting events: session, status, sources, delta, done, error.",
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
      ChatSessionSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          turnCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ChatTurnData: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          sessionId: { type: "string", format: "uuid" },
          question: { type: "string" },
          answer: { type: "string" },
          sources: {
            type: "array",
            nullable: true,
            items: { $ref: "#/components/schemas/SourceCitation" },
          },
          iterations: { type: "integer", nullable: true },
          isFallback: { type: "boolean" },
          promptTokens: { type: "integer", nullable: true },
          completionTokens: { type: "integer", nullable: true },
          totalTokens: { type: "integer", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      ChatSessionDetail: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          turns: {
            type: "array",
            items: { $ref: "#/components/schemas/ChatTurnData" },
          },
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
