import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { NotificationChannel } from "@prisma/client";

// Provider-per-channel abstraction (Rule 20). Each channel has a "dev"
// adapter (logs only) so the system runs without real credentials; a real
// SMS/email/push provider is added by implementing NotificationSender.
export interface NotificationSender {
  send(to: string, event: string, payload: Record<string, unknown>): Promise<void>;
}

class DevSender implements NotificationSender {
  async send(to: string, event: string, payload: Record<string, unknown>): Promise<void> {
    logger.info({ to, event, payload }, "notification:dev-send");
  }
}

const senders: Record<NotificationChannel, NotificationSender> = {
  PUSH: new DevSender(),
  SMS: new DevSender(),
  EMAIL: new DevSender(),
  WHATSAPP: new DevSender(),
};

// Queues a notification without blocking the caller's transaction (Rule:
// notification delivery must not block core order/payment transactions).
// The row is created PENDING; actual sending happens in processPendingNotifications.
export async function queueNotification(
  customerId: string,
  event: string,
  channel: NotificationChannel,
  payload: Record<string, unknown>,
): Promise<void> {
  await prisma.notification.create({
    data: { customerId, event, channel, payload: payload as never, status: "PENDING" },
  });
}

const MAX_ATTEMPTS = 5;

// Sends all pending notifications. Failures are logged and left PENDING for
// retry (up to MAX_ATTEMPTS) rather than silently dropped.
export async function processPendingNotifications(batchSize = 100): Promise<{ sent: number; failed: number }> {
  const pending = await prisma.notification.findMany({
    where: { status: "PENDING", attempts: { lt: MAX_ATTEMPTS } },
    include: { customer: { include: { user: true } } },
    take: batchSize,
  });

  let sent = 0;
  let failed = 0;

  for (const notification of pending) {
    try {
      const sender = senders[notification.channel];
      const to =
        notification.channel === "EMAIL"
          ? notification.customer.user.email ?? ""
          : notification.customer.user.mobile ?? "";
      if (!to) {
        throw new Error(`No ${notification.channel === "EMAIL" ? "email" : "mobile number"} on file for this customer.`);
      }

      await sender.send(to, notification.event, notification.payload as Record<string, unknown>);
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 } },
      });
      sent += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error({ notificationId: notification.id, err: message }, "notification:send-failed");
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          attempts: { increment: 1 },
          lastError: message,
          status: notification.attempts + 1 >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
        },
      });
      failed += 1;
    }
  }

  return { sent, failed };
}
