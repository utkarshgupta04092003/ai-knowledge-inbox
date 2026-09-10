# AI Knowledge Inbox - Architecture & System Design

## 1. High-Level Architecture

```text
                     +---------------------------------+
                     |   React Frontend (Vite + TS)   |
                     +---------------------------------+
                                      |
                                HTTP REST API
                                      |
                     +---------------------------------+
                     |    Express Backend (Node + TS)  |
                     +---------------------------------+
                                      |
         +----------------------------+----------------------------+
         |                            |                            |
+-----------------+          +-----------------+          +-----------------+
| Ingest Service  |          |  Search Service |          |   RAG Service   |
+-----------------+          +-----------------+          +-----------------+
         |                            |                            |
  [URL Fetch / Text]                  |                     [OpenAI Chat]
         |                            |                            |
  [Chunking & Embed]                  |                            |
         |                            |                            |
         +-------------+--------------+                            |
                       |                                           |
         +-------------+-------------+                             |
         |                           |                             |
         v                           v                             |
+-----------------+         +-----------------+                    |
| SQLite Database |         | Pinecone Vector |                    |
| (better-sqlite3)|         | Index (Serverless)                   |
+-----------------+         +-----------------+                    |
| - items         |         | - vectors (1536)|                    |
| - chunks (text) |         | - chunk metadata|                    |
+-----------------+         +--------+--------+                    |
                                     |                             |
                                     +--------------+--------------+
                                                    | (Top-K Chunks)
                                                    v
                                            [Context Assembly]
```

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React, Vite, TypeScript, Tailwind CSS | Fast dev loop, clean UI, typed client |
| **Backend** | Node.js, Express, TypeScript | Lightweight, typed, standard REST API |
| **Database (Relational)**| SQLite (`better-sqlite3`) | Durable local store for items, text chunks, and metadata |
| **Vector Store** | Pinecone (`@pinecone-database/pinecone`) | Managed vector database, native ANN search, eliminates $O(N)$ scan |
| **AI Provider** | OpenAI API (`text-embedding-3-small`, `gpt-4o-mini`) | 1536-dim embeddings and grounded chat completions |

---

## 3. Project Directory Structure

```text
ai-knowledge-inbox/
├── backend/
│   ├── src/
│   │   ├── ai/
│   │   │   ├── openai.client.ts
│   │   │   └── pinecone.client.ts
│   │   ├── controllers/
│   │   │   ├── ingest.controller.ts
│   │   │   ├── items.controller.ts
│   │   │   └── query.controller.ts
│   │   ├── db/
│   │   │   ├── database.ts
│   │   │   ├── migrations.ts
│   │   │   └── repositories/
│   │   │       ├── chunk.repository.ts
│   │   │       └── item.repository.ts
│   │   ├── middleware/
│   │   │   ├── error-handler.ts
│   │   │   └── request-logger.ts
│   │   ├── routes/
│   │   │   ├── ingest.routes.ts
│   │   │   ├── items.routes.ts
│   │   │   └── query.routes.ts
│   │   ├── services/
│   │   │   ├── chunking.service.ts
│   │   │   ├── embedding.service.ts
│   │   │   ├── ingestion.service.ts
│   │   │   ├── rag.service.ts
│   │   │   ├── search.service.ts
│   │   │   └── url-fetch.service.ts
│   │   ├── utils/
│   │   │   └── validation.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddContentForm.tsx
│   │   │   ├── AnswerCard.tsx
│   │   │   ├── ItemCard.tsx
│   │   │   ├── ItemList.tsx
│   │   │   ├── QueryInput.tsx
│   │   │   └── SourceSnippet.tsx
│   │   ├── hooks/
│   │   │   └── useKnowledgeInbox.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── notes/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 4. Storage Schemas

### SQLite: Table `items`
```sql
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK(source_type IN ('note', 'url')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### SQLite: Table `chunks`
```sql
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chunks_item_id ON chunks(item_id);
```

### Pinecone: Vector Record
- **Index**: Metric = `cosine`, Dimension = `1536`.
- **Vector Record Structure**:
```json
{
  "id": "chunk_uuid",
  "values": [0.0123, -0.0456, "... (1536 floats)"],
  "metadata": {
    "itemId": "item_uuid",
    "chunkIndex": 0,
    "text": "Chunk text snippet...",
    "title": "Item title",
    "sourceUrl": "https://example.com/page",
    "sourceType": "url"
  }
}
```

---

## 5. API Contracts

### `GET /health`
- **Response** `200 OK`:
  ```json
  { "status": "ok" }
  ```

### `POST /ingest`
- **Request (Note)**:
  ```json
  {
    "type": "note",
    "title": "Optional Title",
    "content": "React Server Components allow rendering on the server."
  }
  ```
- **Request (URL)**:
  ```json
  {
    "type": "url",
    "url": "https://example.com/article"
  }
  ```
- **Response** `201 Created`:
  ```json
  {
    "item": {
      "id": "uuid",
      "sourceType": "url",
      "title": "Article Title",
      "sourceUrl": "https://example.com/article",
      "createdAt": "2026-09-10T..."
    }
  }
  ```

### `GET /items`
- **Response** `200 OK`:
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "sourceType": "note",
        "title": "React Notes",
        "sourceUrl": null,
        "createdAt": "2026-09-10T..."
      }
    ]
  }
  ```

### `POST /query`
- **Request**:
  ```json
  {
    "question": "What are React Server Components?"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "answer": "React Server Components allow components to render on the server...",
    "sources": [
      {
        "itemId": "uuid",
        "title": "React Notes",
        "url": null,
        "snippet": "React Server Components allow rendering on the server..."
      }
    ]
  }
  ```

---

## 6. Environment Configuration

```env
PORT=5000
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX=ai-knowledge-inbox
DATABASE_PATH=./data/inbox.db
```
