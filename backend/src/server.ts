import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const app = createApp();

app.listen(PORT, () => {
  const startupLog = {
    level: "info",
    event: "server_started",
    port: PORT,
    nodeEnv: process.env.NODE_ENV || "development"
  };
  process.stdout.write(JSON.stringify(startupLog) + "\n");
});
