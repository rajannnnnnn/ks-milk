import { prisma } from "../lib/prisma";
import { errors } from "../lib/errors";
import { env } from "../config/env";
import { Decimal } from "@prisma/client/runtime/library";
import crypto from "node:crypto";

// Provider abstraction (Rule 20 / PRD section 21). Real providers (Razorpay,
// etc.) are integrated by implementing this interface; no fake successful
// transactions are ever produced.
export interface PaymentProvider {
  name: string;
  createOrder(params: { amount: Decimal; receipt: string }): Promise<{ providerOrderId: string }>;
  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean;
}

class DevPaymentProvider implements PaymentProvider {
  name = "dev";
  async createOrder(params: { amount: Decimal; receipt: string }) {
    return { providerOrderId: `dev_order_${params.receipt}_${Date.now()}` };
  }
  verifyWebhookSignature(): boolean {
    // Dev adapter has no real signature to check; never used in production
    // (PAYMENT_PROVIDER must be set to a real provider there).
    return env.NODE_ENV !== "production";
  }
}

export function getPaymentProvider(): PaymentProvider {
  // Extension point: add real adapters (e.g. Razorpay) keyed by env.PAYMENT_PROVIDER.
  return new DevPaymentProvider();
}

export async function createPaymentForBill(billId: string): Promise<{ paymentId: string; providerOrderId: string }> {
  const bill = await prisma.bill.findUniqueOrThrow({ where: { id: billId } });
  if (bill.status === "PAID") throw errors.conflict("This bill has already been paid.");

  const existing = await prisma.payment.findUnique({ where: { billId } });
  if (existing && existing.status === "PENDING") {
    return { paymentId: existing.id, providerOrderId: existing.providerOrderId! };
  }

  const provider = getPaymentProvider();
  const { providerOrderId } = await provider.createOrder({ amount: bill.totalAmount, receipt: bill.id });

  const payment = await prisma.payment.upsert({
    where: { billId },
    create: {
      customerId: bill.customerId,
      target: "BILL",
      billId: bill.id,
      amount: bill.totalAmount,
      provider: provider.name,
      providerOrderId,
      status: "PENDING",
    },
    update: { providerOrderId, status: "PENDING" },
  });

  return { paymentId: payment.id, providerOrderId };
}

export async function createPaymentForOrder(orderId: string): Promise<{ paymentId: string; providerOrderId: string }> {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });

  const existing = await prisma.payment.findUnique({ where: { orderId } });
  if (existing && existing.status === "PENDING") {
    return { paymentId: existing.id, providerOrderId: existing.providerOrderId! };
  }

  const provider = getPaymentProvider();
  const { providerOrderId } = await provider.createOrder({ amount: order.totalAmount, receipt: order.id });

  const payment = await prisma.payment.upsert({
    where: { orderId },
    create: {
      customerId: order.customerId,
      target: "ORDER",
      orderId: order.id,
      amount: order.totalAmount,
      provider: provider.name,
      providerOrderId,
      status: "PENDING",
    },
    update: { providerOrderId, status: "PENDING" },
  });

  return { paymentId: payment.id, providerOrderId };
}

interface WebhookEvent {
  providerEventId: string;
  type: "payment.success" | "payment.failed";
  providerOrderId: string;
  providerPaymentId: string;
  rawPayload: unknown;
}

// Applies a provider webhook event. Payment success is only ever recognized
// through this trusted server-to-server path — never from a frontend flag
// (Rule 7). providerEventId uniqueness makes duplicate deliveries a no-op
// (Rule 9): the second delivery of the same event returns early without
// re-applying the state transition.
export async function applyPaymentWebhookEvent(event: WebhookEvent): Promise<{ applied: boolean }> {
  const payment = await prisma.payment.findFirst({ where: { providerOrderId: event.providerOrderId } });
  if (!payment) throw errors.notFound("Payment not found for this order.");

  return prisma.$transaction(async (tx) => {
    const existingTx = await tx.paymentTransaction.findUnique({
      where: { providerEventId: event.providerEventId },
    });
    if (existingTx) {
      return { applied: false };
    }

    await tx.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        providerEventId: event.providerEventId,
        type: event.type,
        rawPayload: event.rawPayload as never,
      },
    });

    if (payment.status !== "PENDING") {
      // Already resolved by an earlier event; nothing further to do.
      return { applied: false };
    }

    if (event.type === "payment.success") {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "PAID", providerPaymentId: event.providerPaymentId },
      });
      if (payment.target === "BILL" && payment.billId) {
        await tx.bill.update({ where: { id: payment.billId }, data: { status: "PAID" } });
      } else if (payment.target === "ORDER" && payment.orderId) {
        await tx.order.update({ where: { id: payment.orderId }, data: { status: "CONFIRMED" } });
      }
    } else {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      if (payment.target === "BILL" && payment.billId) {
        await tx.bill.update({ where: { id: payment.billId }, data: { status: "FAILED" } });
      }
    }

    return { applied: true };
  });
}

export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
