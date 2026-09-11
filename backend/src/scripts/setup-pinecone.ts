import dotenv from "dotenv";
import { ensurePineconeIndex, verifyPineconeConnection } from "../services/pinecone.service.js";

dotenv.config();

async function main(): Promise<void> {
  await ensurePineconeIndex();
  const stats = await verifyPineconeConnection();
  process.stdout.write(`${JSON.stringify({ event: "pinecone_ready", stats })}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Pinecone setup failed.";
  process.stderr.write(`${JSON.stringify({ event: "pinecone_setup_failed", message })}\n`);
  process.exitCode = 1;
});
