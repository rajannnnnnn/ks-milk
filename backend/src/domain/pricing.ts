import { prisma } from "../lib/prisma";
import { errors } from "../lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

// The currently effective price for a product: the latest price row whose
// effectiveFrom <= now and (effectiveTo is null or > now). This is the only
// place that resolves "current price" — checkout/subscription code must
// never read a client-supplied price (Rule 7 / PRD section 35).
export async function getCurrentPrice(productId: string, at: Date = new Date()): Promise<Decimal> {
  const priceRow = await prisma.productPrice.findFirst({
    where: {
      productId,
      effectiveFrom: { lte: at },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (!priceRow) {
    throw errors.badRequest("This product currently has no active price and cannot be ordered.");
  }

  return priceRow.price;
}

// Admin changes a product's price by closing the current row and opening a
// new one — historical orders/bills keep referencing the old price via their
// own stored snapshot, never this table directly (Rule 35).
export async function setProductPrice(productId: string, price: number, effectiveFrom: Date = new Date()) {
  return prisma.$transaction(async (tx) => {
    await tx.productPrice.updateMany({
      where: { productId, effectiveTo: null },
      data: { effectiveTo: effectiveFrom },
    });
    return tx.productPrice.create({
      data: { productId, price, effectiveFrom },
    });
  });
}
