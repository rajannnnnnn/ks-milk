import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { verifyAccessToken } from "../domain/auth";
import { errors } from "../lib/errors";
import { prisma } from "../lib/prisma";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role: Role;
        // Resolved role-scoped profile id (Customer.id / Admin.id / DeliveryPerson.id).
        profileId: string;
      };
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw errors.unauthorized();
    }
    const token = header.slice("Bearer ".length);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { customer: true, admin: true, deliveryPerson: true },
    });

    if (!user || !user.isActive) {
      throw errors.unauthorized();
    }

    const profileId =
      user.role === "CUSTOMER"
        ? user.customer?.id
        : user.role === "ADMIN"
          ? user.admin?.id
          : user.deliveryPerson?.id;

    if (!profileId) {
      throw errors.unauthorized();
    }

    req.auth = { userId: user.id, role: user.role, profileId };
    next();
  } catch {
    next(errors.unauthorized());
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      next(errors.forbidden());
      return;
    }
    next();
  };
}
