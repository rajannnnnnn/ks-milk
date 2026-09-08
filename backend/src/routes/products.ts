import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { errors } from "../lib/errors";
import { authenticate, requireRole } from "../middleware/auth";
import { getCurrentPrice, setProductPrice } from "../domain/pricing";

export const productsRouter = Router();

// Public browsing — no auth required, matches PRD section 7 (browse before login).
productsRouter.get("/", async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({ where: { status: "ACTIVE" } });
    const withPrices = await Promise.all(
      products.map(async (p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        unit: p.unit,
        subscriptionAvailable: p.subscriptionAvailable,
        price: await getCurrentPrice(p.id).catch(() => null),
      })),
    );
    res.json(withPrices.filter((p) => p.price !== null));
  } catch (err) {
    next(err);
  }
});

productsRouter.get("/:id", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product || product.status !== "ACTIVE") throw errors.notFound("Product not found.");
    const price = await getCurrentPrice(product.id);
    res.json({ ...product, price });
  } catch (err) {
    next(err);
  }
});

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  unit: z.string().min(1),
  subscriptionAvailable: z.boolean().default(true),
  availableQuantity: z.number().int().min(0).default(0),
  price: z.number().positive(),
});

productsRouter.post("/", authenticate, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const body = productSchema.parse(req.body);
    const product = await prisma.product.create({
      data: {
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        unit: body.unit,
        subscriptionAvailable: body.subscriptionAvailable,
        availableQuantity: body.availableQuantity,
        prices: { create: { price: body.price } },
      },
    });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

const productUpdateSchema = productSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

productsRouter.patch("/:id", authenticate, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const body = productUpdateSchema.parse(req.body);
    const { price, ...rest } = body;

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: rest,
    });

    if (price !== undefined) {
      await setProductPrice(product.id, price);
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
});

// Prefer deactivation over deletion for products already referenced by
// historical orders/subscriptions (PRD section 6).
productsRouter.delete("/:id", authenticate, requireRole("ADMIN"), async (req, res, next) => {
  try {
    await prisma.product.update({ where: { id: req.params.id }, data: { status: "INACTIVE" } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
