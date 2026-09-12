import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.businessSetting.upsert({
    where: { key: "business_settings" },
    create: {
      key: "business_settings",
      value: {
        deliveryRadiusKm: 2,
        businessLatitude: 12.9716,
        businessLongitude: 77.5946,
        timezone: "Asia/Kolkata",
        sameDayOrderCutoff: "18:00",
        deliveryStartTime: "18:00",
        deliveryEndTime: "21:00",
        skipDeadlineTime: "21:00",
        subscriptionBilling: "POSTPAID",
        subscriptionFrequencyDefault: "DAILY",
      },
    },
    update: {},
  });

  const milk = await prisma.product.upsert({
    where: { id: "seed-milk" },
    create: {
      id: "seed-milk",
      name: "Full Cream Milk",
      description: "Fresh full cream cow milk",
      unit: "1 L",
      subscriptionAvailable: true,
      availableQuantity: 500,
      prices: { create: { price: 60 } },
    },
    update: {},
  });

  await prisma.product.upsert({
    where: { id: "seed-curd" },
    create: {
      id: "seed-curd",
      name: "Curd",
      description: "Fresh curd",
      unit: "500 g",
      subscriptionAvailable: true,
      availableQuantity: 200,
      prices: { create: { price: 40 } },
    },
    update: {},
  });

  await prisma.product.upsert({
    where: { id: "seed-toned-milk" },
    create: {
      id: "seed-toned-milk",
      name: "Toned Milk",
      description: "Lighter, lower-fat daily milk",
      unit: "1 L",
      subscriptionAvailable: true,
      availableQuantity: 500,
      prices: { create: { price: 52 } },
    },
    update: {},
  });

  await prisma.product.upsert({
    where: { id: "seed-paneer" },
    create: {
      id: "seed-paneer",
      name: "Paneer",
      description: "Soft paneer, cut fresh to order",
      unit: "200 g",
      subscriptionAvailable: false,
      availableQuantity: 100,
      prices: { create: { price: 90 } },
    },
    update: {},
  });

  await prisma.product.upsert({
    where: { id: "seed-ghee" },
    create: {
      id: "seed-ghee",
      name: "Ghee",
      description: "Traditional bilona-method cow ghee",
      unit: "500 ml",
      subscriptionAvailable: false,
      availableQuantity: 100,
      prices: { create: { price: 320 } },
    },
    update: {},
  });

  await prisma.product.upsert({
    where: { id: "seed-buttermilk" },
    create: {
      id: "seed-buttermilk",
      name: "Buttermilk",
      description: "Spiced, fresh-churned buttermilk",
      unit: "500 ml",
      subscriptionAvailable: true,
      availableQuantity: 200,
      prices: { create: { price: 25 } },
    },
    update: {},
  });

  const adminMobile = "9999999999";
  const existingAdmin = await prisma.user.findUnique({ where: { mobile: adminMobile } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        role: "ADMIN",
        name: "KS MILK Admin",
        mobile: adminMobile,
        passwordHash: await bcrypt.hash("ChangeMe123!", 12),
        admin: { create: {} },
      },
    });
  }

  console.log("Seed complete. Admin login: 9999999999 / ChangeMe123! (change immediately). Product:", milk.name);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
