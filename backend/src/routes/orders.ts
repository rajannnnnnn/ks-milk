import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { errors } from "../lib/errors";
import { authenticate, requireRole } from "../middleware/auth";
import { checkDeliveryRadius } from "../domain/deliveryRadius";
import { calculateOrderSchedule } from "../domain/orderScheduling";
import { getCurrentPrice } from "../domain/pricing";
import { Decimal } from "@prisma/client/runtime/library";

export const ordersRouter = Router();
ordersRouter.use(authenticate, requireRole("CUSTOMER"));

const checkoutSchema = z.object({
  addressId: z.string(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
});

ordersRouter.post("/", async (req, res, next) => {
  try {
    const body = checkoutSchema.parse(req.body);
    const customerId = req.auth!.profileId;

    const address = await prisma.address.findFirst({
      where: { id: body.addressId, customerId, isDeleted: false },
    });
    if (!address) throw errors.notFound("Address not found.");

    const radiusCheck = await checkDeliveryRadius(address.latitude, address.longitude);
    if (!radiusCheck.allowed) {
      throw errors.badRequest(
        `Sorry, KS MILK currently delivers only within ${radiusCheck.radiusKm} km of our service area.`,
      );
    }

    // Server-side price recalculation — client-sent prices are never trusted (Rule 7).
    const products = await prisma.product.findMany({
      where: { id: { in: body.items.map((i) => i.productId) }, status: "ACTIVE" },
    });
    if (products.length !== body.items.length) {
      throw errors.badRequest("One or more products are currently unavailable.");
    }

    const lineItems = await Promise.all(
      body.items.map(async (item) => {
        const product = products.find((p) => p.id === item.productId)!;
        const unitPrice = await getCurrentPrice(product.id);
        const lineTotal = unitPrice.mul(item.quantity);
        return { product, quantity: item.quantity, unitPrice, lineTotal };
      }),
    );

    const subtotal = lineItems.reduce((sum, li) => sum.add(li.lineTotal), new Decimal(0));
    const deliveryCharge = 0;
    const taxAmount = 0;
    const totalAmount = subtotal.add(deliveryCharge).add(taxAmount);

    const schedule = await calculateOrderSchedule();

    const order = await prisma.order.create({
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
        scheduledDeliveryDate: schedule.scheduledDate,
        deliveryWindowStart: schedule.deliveryWindowStart,
        deliveryWindowEnd: schedule.deliveryWindowEnd,
        subtotal,
        deliveryCharge,
        taxAmount,
        totalAmount,
        items: {
          create: lineItems.map((li) => ({
            productId: li.product.id,
            productName: li.product.name,
            unit: li.product.unit,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            lineTotal: li.lineTotal,
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

ordersRouter.get("/", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: req.auth!.profileId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// Ownership enforced explicitly — /orders/:id alone is never sufficient
// authorization (Rule 10).
ordersRouter.get("/:id", async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, customerId: req.auth!.profileId },
      include: { items: true, delivery: true, payment: true },
    });
    if (!order) throw errors.notFound("Order not found.");
    res.json(order);
  } catch (err) {
    next(err);
  }
});

ordersRouter.post("/:id/cancel", async (req, res, next) => {
  try {
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body ?? {});
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, customerId: req.auth!.profileId },
    });
    if (!order) throw errors.notFound("Order not found.");

    if (!["PLACED", "CONFIRMED"].includes(order.status)) {
      throw errors.conflict(`Order cannot be cancelled once it is ${order.status.toLowerCase().replace("_", " ")}.`);
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
