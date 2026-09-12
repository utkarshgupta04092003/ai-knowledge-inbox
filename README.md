# AI Knowledge Inbox

> A full-stack knowledge retrieval and grounded question-answering system powered by **Iterative Self-RAG**, **Pinecone hybrid search**, **Prisma + SQLite**, and a **Warm Charcoal & Copper** responsive web interface with real-time SSE streaming.

---

## Architecture Overview

```text
                      +---------------------------------------+
                      |       React 18 + Vite Frontend        |
                      |   (Warm Charcoal Editorial Design)    |
                      +---------------------------------------+
                                          |
                         HTTP / Server-Sent Events (SSE)
                                          |
                      +---------------------------------------+
                      |      Express + TypeScript Backend     |
                      |           (OpenAPI 3.0 Spec)          |
                      +---------------------------------------+
                                          |
             +----------------------------+----------------------------+
             |                            |                            |
    +-----------------+          +-----------------+          +-----------------+
    | Ingest Service  |          | Session Service |          | Self-RAG Engine |
    +-----------------+          +-----------------+          +-----------------+
             |                            |                            |
      [HTML Stripper &]           [Turn History &]              [Retrieval &]
      [SSRF Protection]           [Token Metrics ]              [Iterative Rewrite]
             |                            |                            |
      [Recursive Chunk]                   |                     [OpenAI gpt-4o-mini]
      [1536d Embedding]                   |                     [Embeddings: 3-small]
             |                            |                            |
             +-------------+--------------+                            |
                           |                                           |
             +-------------+-------------+                             |
             |                           |                             |
             v                           v                             v
    +-----------------+         +-----------------+          +-------------------+
    | Prisma + SQLite |         | Pinecone Vector |          | SSE Event Stream  |
    | (Better-SQLite3)|         | Index (1536d)   |          | (session, status, |
    +-----------------+         +-----------------+          |  sources, delta,  |
    | - items         |         | - dense vectors |          |  done, error)     |
    | - chat_sessions |         | - sparse BM25   |          +-------------------+
    | - chat_turns    |         | - chunk metadata|
    +-----------------+         +-----------------+
```

---

## Key Features

1. **Document Ingestion & Indexing**:
   - **Notes**: Ingest markdown or plain text with automatic fallback titles.
   - **Web URLs**: Live extraction stripping script/style tags, decoding HTML entities, with strict SSRF protection (blocking loopback, private RFC-1918, and link-local ranges).
   - **Recursive Chunking**: 512-token chunks with 128-token overlap respecting paragraph and sentence boundaries.
2. **Hybrid Semantic Search**:
   - Pinecone serverless vector index (`1536` dimensions via `text-embedding-3-small`) combined with deterministic sparse BM25-style keyword vectors.
3. **Iterative Self-RAG Loop**:
   - **Retrieval Grading**: LLM verifies if retrieved context matches query intent (`isRelevant`).
   - **Query Rewriter**: Reformulates queries if initial retrieval is noisy or irrelevant (up to 3 iterations).
   - **Groundedness Grading**: Verifies generated candidate answer is strictly supported by source snippets to prevent hallucinations (`isGrounded`).
   - **Fallback Disclaimer**: Returns explicit denial disclaimer if no knowledge matches across all iterations.
4. **Multi-Session Chat & Context Memory**:
   - Independent chat sessions with creation, renaming, and cascade deletion.
   - Sliding window of the **last 5 conversation turns** injected into query rewriting and answer synthesis.
   - Token accounting for prompt, completion, and total tokens tracked per turn via `js-tiktoken`.
5. **Real-Time Streaming**:
   - Server-Sent Events (`Accept: text/event-stream`) streaming token deltas, progress stages (`session`, `status`, `sources`, `delta`, `done`, `error`).
   - Sources appear immediately upon generation completion.
6. **Editorial Design System**:
   - Warm Charcoal & Copper color palette with dark/light mode toggle.
   - Fully responsive across desktop (1920x1080), tablet (768x1024), and mobile (360x780).
   - Off-canvas mobile chat history drawer with hamburger toggle.
   - Zero horizontal overflow and custom theme-matched scrollbars.
7. **Full CRUD Support**:
   - Note editing with automatic reindexing and Pinecone vector updating.
   - Item deletion with complete cleanup of Pinecone vector chunks and SQLite records.

---

## Tech Stack

| Layer | Technologies | Role |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Vanilla CSS | Single-page application, custom design system, SSE streaming client |
| **Backend** | Node.js 20+, Express, TypeScript | REST API, SSE streaming pipeline, OpenAPI 3.0 documentation |
| **Database** | Prisma ORM, Better-SQLite3 | Relational persistence for items, chat sessions, and turns |
| **Vector Store**| Pinecone Serverless | ANN vector indexing, dense (1536d) + sparse hybrid search |
| **AI / LLM** | OpenAI API (`gpt-4o-mini`, `text-embedding-3-small`) | Embeddings, grading, query rewriting, and grounded response synthesis |
| **Token Tracking**| `js-tiktoken` | Token metrics for multi-turn sessions |
| **Testing** | Node Native Test Runner (`node:test`, `supertest`) | 99 integration and unit tests across 31 suites |

---

## Self-RAG Flow Diagram

```text
User Query + Last 5 Turns
          │
          ▼
   [Hybrid Retrieval] ◄──────────────────────────────┐
          │                                          │
          ▼                                          │
   [Grade Retrieval]                                 │
     Is relevant?                                    │
    ├── NO ──────► [Rewrite Query] ──────────────────┤ (Max 3 iterations)
    └── YES                                          │
          │                                          │
          ▼                                          │
   [Generate Answer]                                 │
          │                                          │
          ▼                                          │
   [Grade Groundedness]                              │
     Is grounded in sources?                         │
    ├── NO ──────► [Rewrite Query] ──────────────────┘
    └── YES
          │
          ▼
[Stream SSE Deltas + Citations]
```

---

## Local Setup & Development

### Prerequisites
- **Node.js**: v20.x or v22.x LTS
- **npm**: v10.x+
- **OpenAI API Key**: with access to `gpt-4o-mini` and `text-embedding-3-small`
- **Pinecone Account**: API key and serverless index name

---

### 1. Clone & Install Dependencies

Clone the repository and install dependencies at the root and for both workspaces:

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd ai-knowledge-inbox

# Install root dependencies
npm install

# Install backend and frontend dependencies
npm --prefix backend install
npm --prefix frontend install
```

---

### 2. Configure Environment Variables

#### Backend (`backend/.env`)
Create `backend/.env` based on `backend/.env.example`:

```env
PORT=5000
NODE_ENV=development

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Pinecone
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX=ai-knowledge-inbox
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1

# Database
DATABASE_URL=file:./data/inbox-prisma.db
```

#### Frontend (`frontend/.env`)
In local development, leave `VITE_API_BASE_URL` empty to let Vite proxy requests to `http://localhost:5000`:

```env
# Leave empty for local development (uses Vite proxy)
VITE_API_BASE_URL=
```

---

### 3. Initialize the Database

Run Prisma migrations to generate client types and apply migrations:

```bash
# Generate Prisma Client
npm --prefix backend run prisma:generate

# Apply migrations to local SQLite database
npm --prefix backend run db:migrate
```

---

### 4. Verify / Initialize Pinecone Index

Ensure your Pinecone index is created and reachable:

```bash
# Verify connection to Pinecone index
npm --prefix backend run pinecone:verify

# Or create index automatically if it does not exist
npm --prefix backend run pinecone:setup
```

---

### 5. Start Development Servers

Run both backend and frontend concurrently (or in separate terminals):

```bash
# Terminal 1: Backend API (http://localhost:5000)
npm run dev:backend

# Terminal 2: Frontend Client (http://localhost:3000)
npm run dev:frontend
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Endpoints & Swagger Documentation

Interactive OpenAPI documentation is hosted at:
```text
http://localhost:5000/api-docs/
```

| Tag | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **System** | `GET` | `/health` | Health and operational diagnostic status |
| **Ingestion** | `POST` | `/ingest` | Ingest note or web URL with automatic chunking and indexing |
| **Items** | `GET` | `/items` | List all saved items ordered by newest |
| **Items** | `GET` | `/items/{id}` | Inspect a single document by UUID |
| **Items** | `PATCH` | `/items/{id}` | Update note title/content and reindex vector chunks |
| **Items** | `DELETE` | `/items/{id}` | Delete item from SQLite and its vector chunks from Pinecone |
| **Sessions** | `GET` | `/sessions` | List conversation sessions ordered by latest activity |
| **Sessions** | `POST` | `/sessions` | Create a new conversation session |
| **Sessions** | `GET` | `/sessions/{id}` | Fetch session details, turn history, and token metrics |
| **Sessions** | `PATCH` | `/sessions/{id}` | Rename conversation session title |
| **Sessions** | `DELETE` | `/sessions/{id}` | Delete session and cascade delete all associated turns |
| **RAG Query**| `POST` | `/query` | Self-RAG query execution; supports `sessionId` and `stream: true` (SSE) |

---

## Testing & Quality Assurance

Run the automated test suite and verification commands:

```bash
# Run all backend unit and integration tests (99 tests, 31 suites)
npm test

# Typecheck both backend and frontend
npm run typecheck

# Lint source code
npm run lint

# Run full precommit pipeline (typecheck, lint, test, and build)
npm run precommit
```

---

## Production Deployment

### Backend (Heroku)
1. **Buildpack**: Add `heroku/nodejs` (or monorepo buildpack if deploying subfolder).
2. **Procfile**:
   ```text
   web: cd backend && npm run db:migrate && npm start
   ```
3. **Config Vars**:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `PINECONE_API_KEY`: Your Pinecone API key
   - `PINECONE_INDEX`: Index name
   - `PINECONE_CLOUD`: Cloud provider (e.g. `aws`)
   - `PINECONE_REGION`: Index region (e.g. `us-east-1`)
   - `NODE_ENV`: `production`
   - `NPM_CONFIG_PRODUCTION`: `false` (enables Prisma/TypeScript compilation during build)

### Frontend (Vercel)
1. **Framework Preset**: Vite
2. **Root Directory**: `frontend`
3. **Environment Variables**:
   - `VITE_API_BASE_URL`: `https://your-backend-app.herokuapp.com`
