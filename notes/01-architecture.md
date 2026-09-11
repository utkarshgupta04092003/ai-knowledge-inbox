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
| Prisma + SQLite |         | Pinecone Vector |                    |
| (local file DB) |         | Index (Serverless)                   |
+-----------------+         +-----------------+                    |
| - items         |         | - vectors (1536)|                    |
|                 |         | - chunk metadata|                    |
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
| **Database (Relational)**| Prisma ORM + SQLite (`@prisma/adapter-better-sqlite3`) | Type-safe local persistence for items, managed migrations, zero redundancy, and zero external database infrastructure |
| **Vector Store** | Pinecone (`@pinecone-database/pinecone`) | Managed vector database, native ANN search, stores vector embeddings and chunk text as metadata |
| **AI Provider** | OpenAI API (`text-embedding-3-small`, `gpt-4o-mini`) | 1536-dim embeddings and grounded chat completions |

---

## 3. Project Directory Structure

```text
ai-knowledge-inbox/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── db/
│   │   │   └── prisma.ts
│   │   ├── routes/
│   │   │   ├── health.routes.ts
│   │   │   ├── ingest.routes.ts
│   │   │   ├── items.routes.ts
│   │   │   └── query.routes.ts
│   │   ├── services/
│   │   │   ├── ai-client.service.ts
│   │   │   ├── item.service.ts
│   │   │   ├── pinecone.service.ts
│   │   │   ├── url-fetch.service.ts
│   │   │   ├── chunking.service.ts
│   │   │   ├── embedding.service.ts
│   │   │   ├── ingestion.service.ts
│   │   │   ├── search.service.ts
│   │   │   └── rag.service.ts
│   │   ├── middleware/
│   │   │   ├── error.middleware.ts
│   │   │   └── logger.middleware.ts
│   │   ├── scripts/
│   │   │   ├── setup-pinecone.ts
│   │   │   └── verify-pinecone.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── prisma.config.ts
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

### Prisma schema: `Item`
```prisma
enum SourceType {
  note
  url
}

model Item {
  id         String     @id @default(uuid())
  sourceType SourceType @map("source_type")
  title      String
  content    String
  sourceUrl  String?    @map("source_url")
  createdAt  DateTime   @default(now()) @map("created_at")
  updatedAt  DateTime   @updatedAt @map("updated_at")

  @@map("items")
}
```

### Pinecone: Vector Record
- **Index**: Metric = `cosine`, Dimension = `1536`.
- **Vector Record Structure**:
```json
{
  "id": "item_uuid#0",
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
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
DATABASE_URL=file:./data/inbox-prisma.db
```
