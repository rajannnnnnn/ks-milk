import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { errors } from "../lib/errors";
import { authenticate, requireRole } from "../middleware/auth";
import { checkDeliveryRadius } from "../domain/deliveryRadius";
import { calculateSubscriptionEndDate } from "../domain/subscriptionPlan";
import { isSkipAllowed } from "../domain/orderScheduling";
import { getCurrentPrice } from "../domain/pricing";

export const subscriptionsRouter = Router();
subscriptionsRouter.use(authenticate, requireRole("CUSTOMER"));

const createSchema = z.object({
  productId: z.string(),
  addressId: z.string(),
  quantity: z.number().int().positive(),
  plan: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
  startDate: z.coerce.date(),
});

subscriptionsRouter.post("/", async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const customerId = req.auth!.profileId;

    const [product, address] = await Promise.all([
      prisma.product.findFirst({ where: { id: body.productId, status: "ACTIVE" } }),
      prisma.address.findFirst({ where: { id: body.addressId, customerId, isDeleted: false } }),
    ]);
    if (!product) throw errors.notFound("Product not found.");
    if (!product.subscriptionAvailable) throw errors.badRequest("This product is not available for subscription.");
    if (!address) throw errors.notFound("Address not found.");

    const radiusCheck = await checkDeliveryRadius(address.latitude, address.longitude);
    if (!radiusCheck.allowed) {
      throw errors.badRequest(
        `Sorry, KS MILK currently delivers only within ${radiusCheck.radiusKm} km of our service area.`,
      );
    }

    await getCurrentPrice(product.id); // validates product is priced/orderable

    const endDate = calculateSubscriptionEndDate(body.startDate, body.plan);

    const subscription = await prisma.subscription.create({
      data: {
        customerId,
        addressId: address.id,
        addressSnapshot: {
          name: address.name,
          mobile: address.mobile,
          houseNo: address.houseNo,
          street: address.street,
          area: address.area,
          city: address.city,
          pincode: address.pincode,
          latitude: address.latitude,
          longitude: address.longitude,
        },
        productId: product.id,
        quantity: body.quantity,
        plan: body.plan,
        frequency: "DAILY",
        startDate: body.startDate,
        endDate,
        items: { create: { productId: product.id, quantity: body.quantity } },
      },
      include: { items: true },
    });

    res.status(201).json(subscription);
  } catch (err) {
    next(err);
  }
});

subscriptionsRouter.get("/", async (req, res, next) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { customerId: req.auth!.profileId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(subscriptions);
  } catch (err) {
    next(err);
  }
});

async function assertOwnedSubscription(customerId: string, id: string) {
  const subscription = await prisma.subscription.findFirst({ where: { id, customerId } });
  if (!subscription) throw errors.notFound("Subscription not found.");
  return subscription;
}

subscriptionsRouter.get("/:id", async (req, res, next) => {
  try {
    const subscription = await assertOwnedSubscription(req.auth!.profileId, req.params.id);
    const deliveries = await prisma.subscriptionDelivery.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { scheduledDate: "asc" },
    });
    res.json({ ...subscription, deliveries });
  } catch (err) {
    next(err);
  }
});

subscriptionsRouter.post("/:id/skip", async (req, res, next) => {
  try {
    const { scheduledDate } = z.object({ scheduledDate: z.coerce.date() }).parse(req.body);
    const subscription = await assertOwnedSubscription(req.auth!.profileId, req.params.id);

    if (subscription.status !== "ACTIVE") {
      throw errors.conflict("Only active subscriptions can have deliveries skipped.");
    }

    const delivery = await prisma.subscriptionDelivery.findUnique({
      where: { subscriptionId_scheduledDate: { subscriptionId: subscription.id, scheduledDate } },
    });
    if (!delivery) throw errors.notFound("No scheduled delivery found for that date.");
    if (delivery.status !== "SCHEDULED") {
      throw errors.conflict(`This delivery is already ${delivery.status.toLowerCase().replace("_", " ")}.`);
    }

    const allowed = await isSkipAllowed(scheduledDate);
    if (!allowed) {
      throw errors.badRequest("The skip deadline for this delivery has passed.");
    }

    const updated = await prisma.subscriptionDelivery.update({
      where: { id: delivery.id },
      data: { status: "SKIPPED", reason: "Customer Skipped", billable: false },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

const pauseSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

subscriptionsRouter.post("/:id/pause", async (req, res, next) => {
  try {
    const body = pauseSchema.parse(req.body);
    if (body.endDate < body.startDate) throw errors.badRequest("End date must be on or after start date.");

    const subscription = await assertOwnedSubscription(req.auth!.profileId, req.params.id);
    if (subscription.status !== "ACTIVE") {
      throw errors.conflict("Only active subscriptions can be paused.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.subscriptionPause.create({
        data: { subscriptionId: subscription.id, startDate: body.startDate, endDate: body.endDate },
      });

      await tx.subscriptionDelivery.updateMany({
        where: {
          subscriptionId: subscription.id,
          scheduledDate: { gte: body.startDate, lte: body.endDate },
          status: "SCHEDULED",
        },
        data: { status: "PAUSED", reason: "Customer Paused", billable: false },
      });
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Resume: subscription itself was never taken out of ACTIVE for a pause (a
// pause is a date-range record, not a status change), so "resume" here means
// clearing a pause that has not yet started, restoring those future dates to
// normal scheduling.
subscriptionsRouter.post("/:id/resume", async (req, res, next) => {
  try {
    const { pauseId } = z.object({ pauseId: z.string() }).parse(req.body);
    const subscription = await assertOwnedSubscription(req.auth!.profileId, req.params.id);

    const pause = await prisma.subscriptionPause.findFirst({
      where: { id: pauseId, subscriptionId: subscription.id },
    });
    if (!pause) throw errors.notFound("Pause not found.");

    const now = new Date();
    if (pause.startDate <= now) {
      throw errors.conflict("This pause has already started and cannot be resumed retroactively.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.subscriptionDelivery.updateMany({
        where: {
          subscriptionId: subscription.id,
          scheduledDate: { gte: pause.startDate, lte: pause.endDate },
          status: "PAUSED",
        },
        data: { status: "SCHEDULED", reason: null, billable: true },
      });
      await tx.subscriptionPause.delete({ where: { id: pause.id } });
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

subscriptionsRouter.post("/:id/cancel", async (req, res, next) => {
  try {
    const subscription = await assertOwnedSubscription(req.auth!.profileId, req.params.id);
    if (subscription.status === "CANCELLED") {
      throw errors.conflict("Subscription is already cancelled.");
    }

    // Cancellation is immediate: future scheduled deliveries stop; completed
    // deliveries and any unpaid bill remain payable (PRD section 18).
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      await tx.subscriptionDelivery.updateMany({
        where: { subscriptionId: subscription.id, status: "SCHEDULED", scheduledDate: { gt: new Date() } },
        data: { status: "NOT_DELIVERED", reason: "Subscription Cancelled", billable: false },
      });
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
