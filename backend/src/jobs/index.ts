import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { generateSubscriptionDeliveries, expireSubscriptions } from "../domain/subscriptionLedger";
import { generateBillForPeriod, markOverdueBills } from "../domain/billing";
import { processPendingNotifications } from "../domain/notifications";
import { DateTime } from "luxon";

// Every job run is wrapped in a JobRun row keyed by (jobName, runKey), so a
// job that is triggered twice for the same key (e.g. the same day) is a
// no-op the second time — this is the idempotency guard required by Rule 9,
// on top of each domain function already being individually idempotent.
async function runOnce(jobName: string, runKey: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await prisma.jobRun.create({ data: { jobName, runKey, status: "RUNNING" } });
  } catch {
    logger.info({ jobName, runKey }, "job:already-run");
    return;
  }

  try {
    const result = await fn();
    await prisma.jobRun.updateMany({
      where: { jobName, runKey },
      data: { status: "SUCCEEDED", finishedAt: new Date() },
    });
    logger.info({ jobName, runKey, result }, "job:succeeded");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.jobRun.updateMany({
      where: { jobName, runKey },
      data: { status: "FAILED", finishedAt: new Date(), error: message },
    });
    logger.error({ jobName, runKey, err: message }, "job:failed");
  }
}

function todayKey(): string {
  return DateTime.now().toISODate() ?? new Date().toISOString().slice(0, 10);
}

async function generateEndOfPeriodBills(): Promise<number> {
  const endingToday = await prisma.subscription.findMany({
    where: { status: { in: ["ACTIVE", "EXPIRED"] }, endDate: { lt: new Date() } },
  });

  let count = 0;
  for (const sub of endingToday) {
    const result = await generateBillForPeriod(sub.id, sub.startDate, sub.endDate);
    if (result.created) count += 1;
  }
  return count;
}

export function scheduleJobs(): void {
  // Daily at 00:10 IST-ish (server local); real deployments should pin the
  // cron scheduler's timezone via node-cron's timezone option per environment.
  cron.schedule("10 0 * * *", () => {
    void runOnce("generate-subscription-deliveries", todayKey(), () => generateSubscriptionDeliveries());
    void runOnce("expire-subscriptions", todayKey(), () => expireSubscriptions());
    void runOnce("generate-end-of-period-bills", todayKey(), () => generateEndOfPeriodBills());
    void runOnce("mark-overdue-bills", todayKey(), () => markOverdueBills());
  });

  // Notifications drain frequently since they must not block core flows.
  cron.schedule("*/5 * * * *", () => {
    void processPendingNotifications();
  });

  logger.info("Background jobs scheduled");
}
