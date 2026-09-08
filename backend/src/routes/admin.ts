import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { errors } from "../lib/errors";
import { authenticate, requireRole } from "../middleware/auth";
import { getBusinessSettings, updateBusinessSettings } from "../domain/businessSettings";
import { hashPassword, validateMobile } from "../domain/auth";

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole("ADMIN"));

function dateRangeFromQuery(req: { query: Record<string, unknown> }) {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  return { from, to };
}

// --- Dashboard -------------------------------------------------------------

adminRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalCustomers,
      activeSubscriptions,
      todaysOrders,
      todaysDeliveries,
      pendingPayments,
      completedPayments,
      cancelledOrders,
      salesAgg,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.order.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.deliveryAssignment.count({
        where: { OR: [{ order: { scheduledDeliveryDate: { gte: todayStart, lte: todayEnd } } }, { subscriptionDelivery: { scheduledDate: { gte: todayStart, lte: todayEnd } } }] },
      }),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.payment.count({ where: { status: "PAID" } }),
      prisma.order.count({ where: { status: "CANCELLED" } }),
      prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    ]);

    res.json({
      totalCustomers,
      activeSubscriptions,
      todaysOrders,
      todaysDeliveries,
      pendingPayments,
      completedPayments,
      cancelledOrders,
      totalSales: salesAgg._sum.amount ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

// --- Customers ---------------------------------------------------------------

adminRouter.get("/customers", async (req, res, next) => {
  try {
    const search = req.query.search ? String(req.query.search) : undefined;
    const customers = await prisma.customer.findMany({
      where: search
        ? { user: { OR: [{ name: { contains: search, mode: "insensitive" } }, { mobile: { contains: search } }] } }
        : undefined,
      include: { user: true },
      take: 50,
      orderBy: { createdAt: "desc" },
    });
    res.json(customers);
  } catch (err) {
    next(err);
  }
});

// --- Orders ------------------------------------------------------------------

adminRouter.get("/orders", async (req, res, next) => {
  try {
    const { from, to } = dateRangeFromQuery(req);
    const status = req.query.status ? String(req.query.status) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;

    const orders = await prisma.order.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
        ...(search
          ? {
              OR: [
                { id: search },
                { customer: { user: { name: { contains: search, mode: "insensitive" } } } },
                { customer: { user: { mobile: { contains: search } } } },
              ],
            }
          : {}),
      },
      include: { items: true, customer: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/orders/:id/assign", async (req, res, next) => {
  try {
    const { deliveryPersonId } = z.object({ deliveryPersonId: z.string() }).parse(req.body);
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw errors.notFound("Order not found.");

    const assignment = await prisma.deliveryAssignment.upsert({
      where: { orderId: order.id },
      create: { orderId: order.id, deliveryPersonId, status: "ASSIGNED" },
      update: { deliveryPersonId, status: "ASSIGNED", assignedAt: new Date() },
    });
    res.json(assignment);
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/orders/:id/cancel", async (req, res, next) => {
  try {
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body ?? {});
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
    });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/subscription-deliveries/:id/assign", async (req, res, next) => {
  try {
    const { deliveryPersonId } = z.object({ deliveryPersonId: z.string() }).parse(req.body);
    const delivery = await prisma.subscriptionDelivery.findUnique({ where: { id: req.params.id } });
    if (!delivery) throw errors.notFound("Subscription delivery not found.");

    const assignment = await prisma.deliveryAssignment.upsert({
      where: { subscriptionDeliveryId: delivery.id },
      create: { subscriptionDeliveryId: delivery.id, deliveryPersonId, status: "ASSIGNED" },
      update: { deliveryPersonId, status: "ASSIGNED", assignedAt: new Date() },
    });
    res.json(assignment);
  } catch (err) {
    next(err);
  }
});

// --- Subscriptions -------------------------------------------------------------

adminRouter.get("/subscriptions", async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const subscriptions = await prisma.subscription.findMany({
      where: status ? { status: status as never } : undefined,
      include: { product: true, customer: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(subscriptions);
  } catch (err) {
    next(err);
  }
});

// --- Deliveries -------------------------------------------------------------

adminRouter.get("/deliveries", async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const deliveries = await prisma.deliveryAssignment.findMany({
      where: status ? { status: status as never } : undefined,
      include: { order: true, subscriptionDelivery: true, deliveryPerson: { include: { user: true } } },
      orderBy: { assignedAt: "desc" },
      take: 100,
    });
    res.json(deliveries);
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/delivery-persons", async (_req, res, next) => {
  try {
    const persons = await prisma.deliveryPerson.findMany({ include: { user: true }, where: { isActive: true } });
    res.json(persons);
  } catch (err) {
    next(err);
  }
});

const createDeliveryPersonSchema = z.object({
  name: z.string().min(1),
  mobile: z.string(),
  password: z.string().min(8),
});

adminRouter.post("/delivery-persons", async (req, res, next) => {
  try {
    const body = createDeliveryPersonSchema.parse(req.body);
    if (!validateMobile(body.mobile)) throw errors.badRequest("Please enter a valid 10-digit mobile number.");

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        role: "DELIVERY_PERSON",
        name: body.name,
        mobile: body.mobile,
        passwordHash,
        deliveryPerson: { create: {} },
      },
      include: { deliveryPerson: true },
    });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// --- Payments -------------------------------------------------------------

adminRouter.get("/payments", async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const payments = await prisma.payment.findMany({
      where: status ? { status: status as never } : undefined,
      include: { customer: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(payments);
  } catch (err) {
    next(err);
  }
});

// --- Reports -------------------------------------------------------------

adminRouter.get("/reports/sales", async (req, res, next) => {
  try {
    const { from, to } = dateRangeFromQuery(req);
    const orderSales = await prisma.order.aggregate({
      where: { status: { not: "CANCELLED" }, ...(from || to ? { createdAt: { gte: from, lte: to } } : {}) },
      _sum: { totalAmount: true },
      _count: true,
    });
    const subscriptionSales = await prisma.bill.aggregate({
      where: { status: "PAID", ...(from || to ? { billDate: { gte: from, lte: to } } : {}) },
      _sum: { totalAmount: true },
      _count: true,
    });
    res.json({ oneTimeOrders: orderSales, subscriptions: subscriptionSales });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/reports/orders", async (req, res, next) => {
  try {
    const { from, to } = dateRangeFromQuery(req);
    const where = from || to ? { createdAt: { gte: from, lte: to } } : {};
    const [total, completed, cancelled, failed] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, status: "DELIVERED" } }),
      prisma.order.count({ where: { ...where, status: "CANCELLED" } }),
      prisma.order.count({ where: { ...where, status: "FAILED" } }),
    ]);
    res.json({ total, completed, cancelled, failed });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/reports/subscriptions", async (req, res, next) => {
  try {
    const { from, to } = dateRangeFromQuery(req);
    const where = from || to ? { createdAt: { gte: from, lte: to } } : {};
    const [active, created, cancelled, expired] = await Promise.all([
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.count({ where }),
      prisma.subscription.count({ where: { ...where, status: "CANCELLED" } }),
      prisma.subscription.count({ where: { ...where, status: "EXPIRED" } }),
    ]);
    res.json({ active, new: created, cancelled, expired });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/reports/payments", async (req, res, next) => {
  try {
    const { from, to } = dateRangeFromQuery(req);
    const where = from || to ? { createdAt: { gte: from, lte: to } } : {};
    const [paid, pending, failed, overdueBills] = await Promise.all([
      prisma.payment.count({ where: { ...where, status: "PAID" } }),
      prisma.payment.count({ where: { ...where, status: "PENDING" } }),
      prisma.payment.count({ where: { ...where, status: "FAILED" } }),
      prisma.bill.count({ where: { status: "OVERDUE" } }),
    ]);
    res.json({ paid, pending, failed, overdue: overdueBills });
  } catch (err) {
    next(err);
  }
});

// --- Business settings -------------------------------------------------------------

adminRouter.get("/settings", async (_req, res, next) => {
  try {
    res.json(await getBusinessSettings());
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/settings", async (req, res, next) => {
  try {
    const updated = await updateBusinessSettings(req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// --- Non-delivery days -------------------------------------------------------------

adminRouter.post("/non-delivery-days/weekly", async (req, res, next) => {
  try {
    const { dayOfWeek } = z.object({ dayOfWeek: z.number().int().min(0).max(6) }).parse(req.body);
    const created = await prisma.weeklyNonDeliveryDay.upsert({
      where: { dayOfWeek },
      create: { dayOfWeek },
      update: {},
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/non-delivery-days/closures", async (req, res, next) => {
  try {
    const body = z.object({ date: z.coerce.date(), reason: z.string().optional() }).parse(req.body);
    const created = await prisma.businessClosure.upsert({
      where: { date: body.date },
      create: body,
      update: { reason: body.reason },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});
