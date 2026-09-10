# AI Knowledge Inbox - RAG & Retrieval Design

## 1. Chunking Strategy (Recursive Character Splitting)

### Configuration
- **Method**: Recursive Character Chunking (hierarchical boundary preservation)
- **Separators**: `["\n\n", "\n", ". ", " ", ""]` (Paragraphs $\rightarrow$ Lines $\rightarrow$ Sentences $\rightarrow$ Words $\rightarrow$ Characters)
- **Chunk Size**: 512 tokens (~2,048 characters)
- **Overlap**: 128 tokens (~512 characters)
- **Normalization**: Strip HTML, collapse excessive whitespace.

### Rationale
- **Semantic Boundary Preservation**: Unlike naive fixed-character slicing, recursive chunking attempts to keep complete paragraphs and sentences intact before falling back to word/character boundaries.
- **Context Continuity**: The 128-token overlap (~25%) ensures sentences that span chunk seams retain sufficient surrounding context.
- **Pinecone Metadata Alignment**: Average chunk footprint (~2KB) safely complies with Pinecone's 40KB vector metadata boundary.

---

## 2. Vector Index & Semantic Retrieval (Pinecone)

### Index Specifications
- **Metric**: `cosine`
- **Dimension**: `1536` (`text-embedding-3-small`)
- **Index Type**: Serverless (AWS / GCP region)

### Upsert Payload Structure
Each chunk is upserted with its text and origin metadata stored directly inside Pinecone:
```typescript
await index.upsert([
  {
    id: chunk.id,
    values: embeddingVector, // 1536 float array
    metadata: {
      itemId: item.id,
      chunkIndex: chunk.chunkIndex,
      text: chunk.content,
      title: item.title,
      sourceUrl: item.sourceUrl || "",
      sourceType: item.sourceType
    }
  }
]);
```

### Retrieval Execution
```typescript
const queryEmbedding = await embeddingService.embedQuery(question);

const queryResponse = await pineconeIndex.query({
  vector: queryEmbedding,
  topK: 5,
  includeMetadata: true
});

const chunks = (queryResponse.matches || []).map(match => ({
  chunkId: match.id,
  score: match.score,
  itemId: match.metadata?.itemId as string,
  title: match.metadata?.title as string,
  url: match.metadata?.sourceUrl as string || null,
  text: match.metadata?.text as string
}));
```

---

## 3. System Prompt & Grounding Template

### System Message
```text
You are a precise AI knowledge assistant. Your goal is to answer the user's question using ONLY the provided knowledge base context snippets.

Strict Grounding Guidelines:
1. Base your answer strictly on the provided context. Do NOT invent facts or extrapolate beyond what is stated.
2. If the context does not contain enough information to answer the question, explicitly state:
   "I couldn't find enough information in your saved content to answer this."
3. Mention the relevant source numbers (e.g., [Source 1]) when stating specific facts.
4. Keep the answer concise, direct, and factual.
```

### Context Injection Template
```text
CONTEXT:
---
[Source 1: "{title}"]
{text}
---
[Source 2: "{title}"]
{text}
---

USER QUESTION:
{question}
```

---

## 4. Citation Response Structure

Retrieved chunk metadata from Pinecone is formatted directly into source objects returned in the API response:

```json
{
  "answer": "React Server Components enable server-side rendering without client bundle overhead [Source 1].",
  "sources": [
    {
      "itemId": "item-uuid-1",
      "title": "React Architecture Notes",
      "url": null,
      "snippet": "React Server Components enable server-side rendering without adding extra client-side bundle..."
    }
  ]
}
```
