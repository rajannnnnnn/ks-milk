import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { errors } from "../lib/errors";
import { authenticate, requireRole } from "../middleware/auth";
import { checkDeliveryRadius } from "../domain/deliveryRadius";

export const addressesRouter = Router();
addressesRouter.use(authenticate, requireRole("CUSTOMER"));

const addressSchema = z.object({
  label: z.string().optional(),
  name: z.string().min(1),
  mobile: z.string(),
  houseNo: z.string().min(1),
  street: z.string().optional().default(""),
  area: z.string().min(1),
  city: z.string().optional().default(""),
  pincode: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  isDefault: z.boolean().optional(),
});

addressesRouter.get("/", async (req, res, next) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { customerId: req.auth!.profileId, isDeleted: false },
      orderBy: { createdAt: "desc" },
    });
    res.json(addresses);
  } catch (err) {
    next(err);
  }
});

// Radius check exposed separately so the customer app can validate before
// checkout, but this is UX-only — checkout re-validates server-side (Rule 3).
addressesRouter.post("/check-radius", async (req, res, next) => {
  try {
    const { latitude, longitude } = z.object({ latitude: z.number(), longitude: z.number() }).parse(req.body);
    const result = await checkDeliveryRadius(latitude, longitude);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

addressesRouter.post("/", async (req, res, next) => {
  try {
    const body = addressSchema.parse(req.body);
    const radiusCheck = await checkDeliveryRadius(body.latitude, body.longitude);
    if (!radiusCheck.allowed) {
      throw errors.badRequest(
        `Sorry, KS MILK currently delivers only within ${radiusCheck.radiusKm} km of our service area.`,
      );
    }

    if (body.isDefault) {
      await prisma.address.updateMany({
        where: { customerId: req.auth!.profileId },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: { ...body, customerId: req.auth!.profileId },
    });
    res.status(201).json(address);
  } catch (err) {
    next(err);
  }
});

async function assertOwnedAddress(customerId: string, addressId: string) {
  const address = await prisma.address.findFirst({ where: { id: addressId, customerId, isDeleted: false } });
  if (!address) throw errors.notFound("Address not found.");
  return address;
}

addressesRouter.patch("/:id", async (req, res, next) => {
  try {
    await assertOwnedAddress(req.auth!.profileId, req.params.id);
    const body = addressSchema.partial().parse(req.body);

    if (body.latitude !== undefined && body.longitude !== undefined) {
      const radiusCheck = await checkDeliveryRadius(body.latitude, body.longitude);
      if (!radiusCheck.allowed) {
        throw errors.badRequest(
          `Sorry, KS MILK currently delivers only within ${radiusCheck.radiusKm} km of our service area.`,
        );
      }
    }

    if (body.isDefault) {
      await prisma.address.updateMany({
        where: { customerId: req.auth!.profileId },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({ where: { id: req.params.id }, data: body });
    res.json(address);
  } catch (err) {
    next(err);
  }
});

addressesRouter.delete("/:id", async (req, res, next) => {
  try {
    await assertOwnedAddress(req.auth!.profileId, req.params.id);
    await prisma.address.update({ where: { id: req.params.id }, data: { isDeleted: true } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
