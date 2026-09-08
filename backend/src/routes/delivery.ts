import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { errors } from "../lib/errors";
import { authenticate, requireRole } from "../middleware/auth";

export const deliveryRouter = Router();
deliveryRouter.use(authenticate, requireRole("DELIVERY_PERSON"));

// Today's assigned deliveries for the logged-in delivery person.
deliveryRouter.get("/assignments", async (req, res, next) => {
  try {
    const assignments = await prisma.deliveryAssignment.findMany({
      where: { deliveryPersonId: req.auth!.profileId, status: { in: ["ASSIGNED", "OUT_FOR_DELIVERY"] } },
      include: {
        order: { include: { items: true } },
        subscriptionDelivery: { include: { subscription: { include: { product: true, customer: { include: { user: true } } } } } },
      },
      orderBy: { assignedAt: "asc" },
    });
    res.json(assignments);
  } catch (err) {
    next(err);
  }
});

async function assertOwnedAssignment(deliveryPersonId: string, id: string) {
  const assignment = await prisma.deliveryAssignment.findFirst({ where: { id, deliveryPersonId } });
  if (!assignment) throw errors.notFound("Delivery assignment not found.");
  return assignment;
}

deliveryRouter.post("/assignments/:id/out-for-delivery", async (req, res, next) => {
  try {
    const assignment = await assertOwnedAssignment(req.auth!.profileId, req.params.id);
    if (assignment.status !== "ASSIGNED") {
      throw errors.conflict(`Cannot mark out for delivery from status ${assignment.status}.`);
    }

    const updated = await prisma.deliveryAssignment.update({
      where: { id: assignment.id },
      data: { status: "OUT_FOR_DELIVERY", outForDeliveryAt: new Date() },
    });

    if (updated.orderId) {
      await prisma.order.update({ where: { id: updated.orderId }, data: { status: "OUT_FOR_DELIVERY" } });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

deliveryRouter.post("/assignments/:id/delivered", async (req, res, next) => {
  try {
    const assignment = await assertOwnedAssignment(req.auth!.profileId, req.params.id);
    if (!["ASSIGNED", "OUT_FOR_DELIVERY"].includes(assignment.status)) {
      throw errors.conflict(`Cannot mark delivered from status ${assignment.status}.`);
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.deliveryAssignment.update({
        where: { id: assignment.id },
        data: { status: "DELIVERED", deliveredAt: now },
      });

      if (result.orderId) {
        await tx.order.update({ where: { id: result.orderId }, data: { status: "DELIVERED" } });
      }
      if (result.subscriptionDeliveryId) {
        await tx.subscriptionDelivery.update({
          where: { id: result.subscriptionDeliveryId },
          data: { status: "DELIVERED", deliveredAt: now },
        });
      }

      return result;
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

const failSchema = z.object({ reason: z.string().min(1, "A failure reason is required.") });

deliveryRouter.post("/assignments/:id/failed", async (req, res, next) => {
  try {
    const body = failSchema.parse(req.body);
    const assignment = await assertOwnedAssignment(req.auth!.profileId, req.params.id);
    if (!["ASSIGNED", "OUT_FOR_DELIVERY"].includes(assignment.status)) {
      throw errors.conflict(`Cannot mark failed from status ${assignment.status}.`);
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.deliveryAssignment.update({
        where: { id: assignment.id },
        data: { status: "FAILED", failedAt: now, failureReason: body.reason },
      });

      if (result.orderId) {
        await tx.order.update({ where: { id: result.orderId }, data: { status: "FAILED" } });
      }
      if (result.subscriptionDeliveryId) {
        // Billing eligibility for a subscription delivery is determined from
        // this ledger record (PRD section 23) — a failed delivery is not billable.
        await tx.subscriptionDelivery.update({
          where: { id: result.subscriptionDeliveryId },
          data: { status: "FAILED", reason: body.reason, billable: false },
        });
      }

      return result;
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});
