import { env } from "./config/env";
import { createApp } from "./app";
import { logger } from "./lib/logger";
import { scheduleJobs } from "./jobs";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`KS MILK backend listening on port ${env.PORT}`);
  scheduleJobs();
});
