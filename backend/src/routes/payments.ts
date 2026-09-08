import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { errors } from "../lib/errors";
import { authenticate, requireRole } from "../middleware/auth";
import { createPaymentForBill, createPaymentForOrder, applyPaymentWebhookEvent } from "../domain/payments";

export const paymentsRouter = Router();

paymentsRouter.post("/bills/:billId/pay", authenticate, requireRole("CUSTOMER"), async (req, res, next) => {
  try {
    const bill = await prisma.bill.findFirst({
      where: { id: req.params.billId, customerId: req.auth!.profileId },
    });
    if (!bill) throw errors.notFound("Bill not found.");

    const result = await createPaymentForBill(bill.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

paymentsRouter.post("/orders/:orderId/pay", authenticate, requireRole("CUSTOMER"), async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, customerId: req.auth!.profileId },
    });
    if (!order) throw errors.notFound("Order not found.");

    const result = await createPaymentForOrder(order.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

paymentsRouter.get("/", authenticate, requireRole("CUSTOMER"), async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { customerId: req.auth!.profileId },
      orderBy: { createdAt: "desc" },
    });
    res.json(payments);
  } catch (err) {
    next(err);
  }
});

// Trusted server-to-server webhook. Signature verification is delegated to
// the active provider adapter; payment/bill/order state only ever changes
// here, never from a client-reported "success" flag (Rule 7/21).
const webhookSchema = z.object({
  providerEventId: z.string(),
  type: z.enum(["payment.success", "payment.failed"]),
  providerOrderId: z.string(),
  providerPaymentId: z.string(),
});

paymentsRouter.post("/webhook", async (req, res, next) => {
  try {
    const body = webhookSchema.parse(req.body);
    const result = await applyPaymentWebhookEvent({ ...body, rawPayload: req.body });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
