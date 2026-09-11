import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { disconnectPrisma, getPrismaClient } from "./db/prisma.js";

async function startServer(): Promise<void> {
  await getPrismaClient().$connect();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    process.stdout.write(`${JSON.stringify({
      level: "info",
      event: "server_started",
      port: env.PORT,
      nodeEnv: env.NODE_ENV,
    })}\n`);
  });

  const shutdown = (): void => {
    server.close(() => {
      void disconnectPrisma().finally(() => process.exit(0));
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Server startup failed.";
  process.stderr.write(`${JSON.stringify({ level: "error", event: "server_start_failed", message })}\n`);
  process.exitCode = 1;
});
