import dotenv from "dotenv";
import { verifyPineconeConnection } from "../services/pinecone.service.js";

dotenv.config();

async function main(): Promise<void> {
  const stats = await verifyPineconeConnection();
  process.stdout.write(`${JSON.stringify({ event: "pinecone_connected", stats })}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Pinecone verification failed.";
  process.stderr.write(`${JSON.stringify({ event: "pinecone_connection_failed", message })}\n`);
  process.exitCode = 1;
});
