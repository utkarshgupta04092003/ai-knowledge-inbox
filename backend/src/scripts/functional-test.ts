import dotenv from "dotenv";
dotenv.config();

import { disconnectPrisma, getPrismaClient } from "../db/prisma.js";
import { EmbeddingService } from "../services/embedding.service.js";
import { IngestionService } from "../services/ingestion.service.js";
import { ItemService } from "../services/item.service.js";
import {
  ensurePineconeIndex,
  PineconeService,
  verifyPineconeConnection,
} from "../services/pinecone.service.js";
import { RagService } from "../services/rag.service.js";
import { SearchService } from "../services/search.service.js";

async function runFunctionalTest(): Promise<void> {
  process.stdout.write("--- 1. Testing Pinecone Connectivity ---\n");
  await ensurePineconeIndex();
  const stats = await verifyPineconeConnection();
  process.stdout.write(
    `Pinecone Index Ready: totalRecordCount=${stats.totalRecordCount ?? 0}\n\n`,
  );

  process.stdout.write("--- 2. Testing OpenAI Embedding Generation ---\n");
  const embeddingService = new EmbeddingService();
  const sampleVector = await embeddingService.embedQuery(
    "Functional test query",
  );
  process.stdout.write(
    `Generated embedding with dimension: ${sampleVector.length}\n\n`,
  );

  process.stdout.write(
    "--- 3. Testing Real Ingestion (SQLite + Pinecone) ---\n",
  );
  const prisma = getPrismaClient();
  const itemService = new ItemService(prisma);
  const pineconeService = new PineconeService();
  const ingestionService = new IngestionService(
    itemService,
    undefined,
    undefined,
    embeddingService,
    pineconeService,
  );

  const testTitle = "Autonomous Space Exploration Notes";
  const testContent =
    "The Europa Clipper spacecraft was launched to study Jupiter's moon Europa. It aims to determine whether there are places below Europa's icy surface that could support life. The mission carries nine scientific instruments including ice-penetrating radar.";

  const ingestResult = await ingestionService.ingest({
    type: "note",
    title: testTitle,
    content: testContent,
  });

  process.stdout.write(`Ingested Item ID: ${ingestResult.item.id}\n`);
  process.stdout.write(`Title: ${ingestResult.item.title}\n`);
  process.stdout.write(
    `Chunks created & indexed: ${ingestResult.chunkCount}\n\n`,
  );

  // Allow Pinecone eventual consistency
  process.stdout.write("Waiting 1.5s for Pinecone index propagation...\n");
  await new Promise((resolve) => setTimeout(resolve, 1500));

  process.stdout.write("--- 4. Testing Semantic Search (Pinecone) ---\n");
  const searchService = new SearchService(embeddingService, pineconeService);
  const searchMatches = await searchService.search(
    "What is the goal of Europa Clipper?",
    { topK: 3 },
  );
  process.stdout.write(
    `Search returned ${searchMatches.length} matching chunk(s):\n`,
  );
  for (const match of searchMatches) {
    process.stdout.write(
      ` - Score: ${match.score.toFixed(4)} | Title: ${match.title} | Snippet: ${match.text.slice(0, 80)}...\n`,
    );
  }
  process.stdout.write("\n");

  process.stdout.write("--- 5. Testing RAG Generation (gpt-4o-mini) ---\n");
  const ragService = new RagService(searchService);
  const ragResponse = await ragService.answerQuestion(
    "What instruments does Europa Clipper carry and what is its goal?",
  );
  process.stdout.write(`RAG Answer:\n${ragResponse.answer}\n\n`);
  process.stdout.write(`Sources Cited (${ragResponse.sources.length}):\n`);
  for (const src of ragResponse.sources) {
    process.stdout.write(` - [${src.title}] (ID: ${src.itemId})\n`);
  }
  process.stdout.write("\n");

  process.stdout.write("--- 6. Testing Unanswerable Query Fallback ---\n");
  const fallbackResponse = await ragService.answerQuestion(
    "What is the recipe for baking sourdough bread?",
  );
  process.stdout.write(`Fallback Answer:\n${fallbackResponse.answer}\n`);
  process.stdout.write(`Sources Count: ${fallbackResponse.sources.length}\n\n`);

  process.stdout.write("--- 7. Cleanup ---\n");
  await prisma.item.delete({ where: { id: ingestResult.item.id } });
  await pineconeService.deleteByItemId(ingestResult.item.id);
  await disconnectPrisma();
  process.stdout.write("Cleaned up test item from SQLite and Pinecone.\n");
  process.stdout.write("\nFunctional test completed successfully.\n");
}

runFunctionalTest().catch(async (error) => {
  process.stderr.write(
    `Functional test error: ${error instanceof Error ? error.stack : String(error)}\n`,
  );
  await disconnectPrisma();
  process.exit(1);
});
