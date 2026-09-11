# AI Knowledge Inbox - Phased Implementation Plan

## Overview
This plan details the implementation in sequential, verifiable steps using **Prisma ORM with SQLite** for document metadata/text and **Pinecone** for vector indexing and semantic retrieval.

---

## Phase 1: Project Setup & Health Check
**Goal**: Scaffold backend and frontend with clean TypeScript configuration and verify communication.

- [x] Initialize root monorepo `package.json` with scripts (`dev:backend`, `dev:frontend`, `build`).
- [x] Setup `backend`:
  - Express, TypeScript (`tsx`), `cors`, `dotenv`.
  - Structured logging middleware (`request-logger.ts`) and centralized error handler (`error-handler.ts`).
  - Health route: `GET /health` returning `{ "status": "ok" }`.
- [x] Setup `frontend`:
  - Vite + React + TypeScript + Tailwind CSS.
  - Basic page structure with title, status indicator, and layout containers.
- **Verification**:
  - `GET http://localhost:5000/health` returns status `ok`.
  - Frontend boots and renders without console errors.

---

## Phase 2: Database Layer & Pinecone Client
**Goal**: Set up Prisma ORM with SQLite and initialize the Pinecone vector client.

- [x] Prisma ORM with SQLite:
  - [x] Add `prisma/schema.prisma` with `Item` model (zero data redundancy; chunks stored in Pinecone).
  - [x] Add `prisma.config.ts` and configure `DATABASE_URL`.
  - [x] Use `@prisma/adapter-better-sqlite3` for the local SQLite connection.
  - [x] Generate Prisma Client into `src/generated/prisma`.
  - [x] Create and apply the initial Prisma migration.
  - [x] Implement a shared `db/prisma.ts` client lifecycle module.
  - [x] Implement Prisma-backed `ItemService` module (`services/item.service.ts`).
  - [x] Remove the superseded manual database and migration modules.
- [x] Pinecone client initialization (`services/pinecone.service.ts`):
  - Instantiate `Pinecone` client using `PINECONE_API_KEY`.
  - Export index reference (`PINECONE_INDEX`).
  - Add connection verification check.
- **Verification**:
  - [x] `prisma migrate dev` creates the SQLite `items` table and migration history.
  - [x] Repository tests verify item creation, lookup, and deletion through Prisma Client.
  - [x] Prisma Studio command is configured for database inspection.
  - [x] Test script verifies Pinecone index connectivity and describes index stats.

---

## Phase 3: Content Ingestion Pipeline
**Goal**: Ingest notes and URLs, generate embeddings, and upsert to Pinecone.

- [x] **Validation Layer** (`utils/validation.ts`):
  - Validate note content is non-empty and within size bounds.
  - Validate URL format (http/https) and reject private network IP addresses (SSRF defense).
- [x] **URL Fetch Service** (`services/url-fetch.service.ts`):
  - Native `fetch` with strict 5000ms timeout (`AbortSignal`).
  - Extract page title and clean body text (strip HTML tags, scripts, and styles).
  - Return `502` on network/timeout failure.
- [x] **Chunking Service** (`services/chunking.service.ts`):
  - Recursive hierarchical splitting (`["\n\n", "\n", ". ", " ", ""]`).
  - Target: 512 tokens (~2,048 characters) with 128 tokens (~512 characters) overlap.
  - Returns ordered in-memory chunks with `chunkIndex`.
- [x] **Embedding Service** (`services/embedding.service.ts`):
  - OpenAI client wrapper for `text-embedding-3-small` (1536 dimensions).
  - Batch embedding generation.
- [x] **Ingestion Orchestrator** (`services/ingestion.service.ts`):
  - Step 1: Validate payload.
  - Step 2: Fetch & clean text (if URL).
  - Step 3: Insert the item in SQLite through Prisma `ItemService`.
  - Step 4: Split text into in-memory chunks.
  - Step 5: Generate OpenAI embeddings for all chunks.
  - Step 6: Upsert vector records into Pinecone with deterministic IDs (`${itemId}#${chunkIndex}`) and metadata (`itemId`, `chunkIndex`, `text`, `title`, `sourceUrl`, `sourceType`).
- [x] **Controllers & Routes**:
  - `POST /ingest` (returns `201 Created`).
  - `GET /items` (returns `200 OK` list).
- **Verification**:
  - [x] Automated unit and integration test suite passing with real SQLite storage and mocked Pinecone/OpenAI services.

---

## Phase 4: Semantic Search & RAG Pipeline
**Goal**: Retrieve top-K relevant chunks via Pinecone and generate grounded answers.

- [x] **Search Service** (`services/search.service.ts`):
  - Generate embedding for user question via `text-embedding-3-small`.
  - Query Pinecone index:
    ```typescript
    await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true
    });
    ```
  - Map Pinecone match records into structured `SearchResult` items.
- [x] **RAG Service** (`services/rag.service.ts`):
  - Construct prompt with retrieved chunks formatted as `[Source N: Title] Content`.
  - System prompt enforcing strict grounding, citation references, and lack-of-context fallback.
  - Query OpenAI `gpt-4o-mini`.
  - Return structured payload with `answer` string and `sources` array.
- [x] **Query Controller & Route**:
  - `POST /query` accepting `{ "question": "..." }`.
- **Verification**:
  - [x] Automated unit and integration test suite passing with grounded responses, zero-match bypass, and citation snippets.

---

## Phase 5: Frontend UI
**Goal**: Build clean, responsive UI with clear feedback states.

- [ ] **API Client** (`services/api.ts`):
  - Typed client for `/ingest`, `/items`, and `/query`.
- [ ] **Add Content Form** (`components/AddContentForm.tsx`):
  - Tabs: [Add Note] and [Add URL].
  - Inline error feedback and disabled submit while loading.
- [ ] **Items List** (`components/ItemList.tsx` & `ItemCard.tsx`):
  - Displays saved items with type tags (`note` / `url`), title, source URL, and timestamp.
  - Refresh list upon successful ingestion.
- [ ] **Query Interface** (`components/QueryInput.tsx`, `AnswerCard.tsx`, `SourceSnippet.tsx`):
  - Question input box with loading state ("Searching Pinecone...", "Generating answer...").
  - Answer card with clear source pills and expandable snippet previews.
- **Verification**:
  - Complete user cycle in browser: Ingest Note -> Ingest URL -> Verify in List -> Ask Question -> Read Answer & verify source cards.

---

## Phase 6: Testing, Error Hardening & Documentation
**Goal**: Verification, structured logging, and interview documentation.

- [ ] **Unit & Integration Tests**:
  - Unit: Input validation, chunking window & overlap logic.
  - Integration: `POST /ingest` -> `POST /query` workflow with mocked third-party APIs.
- [ ] **Structured Logging & Safety**:
  - Ensure request logs emit latency, chunk count, and item ID in JSON.
  - Confirm `OPENAI_API_KEY` and `PINECONE_API_KEY` are never logged or sent to frontend.
- [ ] **Root Documentation**:
  - `README.md` covering Pinecone configuration, tradeoffs, and scaling considerations.
