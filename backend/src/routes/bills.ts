import { Router } from "express";
import { prisma } from "../lib/prisma";
import { errors } from "../lib/errors";
import { authenticate, requireRole } from "../middleware/auth";

export const billsRouter = Router();
billsRouter.use(authenticate, requireRole("CUSTOMER"));

billsRouter.get("/", async (req, res, next) => {
  try {
    const bills = await prisma.bill.findMany({
      where: { customerId: req.auth!.profileId },
      include: { subscription: { include: { product: true } } },
      orderBy: { billDate: "desc" },
    });
    res.json(bills);
  } catch (err) {
    next(err);
  }
});

billsRouter.get("/:id", async (req, res, next) => {
  try {
    const bill = await prisma.bill.findFirst({
      where: { id: req.params.id, customerId: req.auth!.profileId },
      include: { deliveries: true, subscription: { include: { product: true } }, payment: true },
    });
    if (!bill) throw errors.notFound("Bill not found.");
    res.json(bill);
  } catch (err) {
    next(err);
  }
});
