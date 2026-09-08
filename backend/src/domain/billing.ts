import { prisma } from "../lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

// Generates a Bill for one subscription's billing period, strictly from its
// SubscriptionDelivery ledger rows (Rule 6/7) — never from calendar-day
// arithmetic. Idempotent via the unique (subscriptionId, periodStart, periodEnd)
// constraint: calling this twice for the same period is a no-op the second time.
export async function generateBillForPeriod(
  subscriptionId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<{ created: boolean; billId: string }> {
  const existing = await prisma.bill.findUnique({
    where: {
      subscriptionId_billingPeriodStart_billingPeriodEnd: {
        subscriptionId,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
      },
    },
  });
  if (existing) {
    return { created: false, billId: existing.id };
  }

  const deliveries = await prisma.subscriptionDelivery.findMany({
    where: {
      subscriptionId,
      scheduledDate: { gte: periodStart, lte: periodEnd },
      billId: null,
    },
  });

  const billableDeliveries = deliveries.filter((d) => d.billable && d.status === "DELIVERED");
  const skippedDays = deliveries.filter((d) => d.status === "SKIPPED").length;
  const pausedDays = deliveries.filter((d) => d.status === "PAUSED").length;
  const nonDeliveryDays = deliveries.filter((d) => d.status === "NOT_DELIVERED").length;

  const subtotal = billableDeliveries.reduce(
    (sum, d) => sum.add(d.unitPrice.mul(d.quantity)),
    new Decimal(0),
  );

  const subscription = await prisma.subscription.findUniqueOrThrow({ where: { id: subscriptionId } });

  const bill = await prisma.$transaction(async (tx) => {
    const created = await tx.bill.create({
      data: {
        customerId: subscription.customerId,
        subscriptionId,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        billableDays: billableDeliveries.length,
        skippedDays,
        pausedDays,
        nonDeliveryDays,
        subtotal,
        discountAmount: 0,
        taxAmount: 0,
        deliveryCharge: 0,
        totalAmount: subtotal,
        status: "PENDING",
      },
    });

    await tx.subscriptionDelivery.updateMany({
      where: { id: { in: billableDeliveries.map((d) => d.id) } },
      data: { billId: created.id },
    });

    return created;
  });

  return { created: true, billId: bill.id };
}

// Bills unpaid past their due date move to OVERDUE. Idempotent — re-running
// on an already-overdue bill is a no-op.
export async function markOverdueBills(referenceDate: Date = new Date()): Promise<number> {
  const result = await prisma.bill.updateMany({
    where: { status: "PENDING", dueDate: { lt: referenceDate } },
    data: { status: "OVERDUE" },
  });
  return result.count;
}
