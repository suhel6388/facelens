import pino from "pino";
import { createApp } from "./app.js";

const logger = pino({
  name: "api",
  level: process.env.LOG_LEVEL ?? "info",
});

const port = Number(process.env.API_PORT ?? 4000);
const app = createApp();

app.listen(port, () => {
  logger.info({ port }, "API server listening");
});
