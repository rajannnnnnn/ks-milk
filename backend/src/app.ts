import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { AppError } from "./lib/errors";
import { authRouter } from "./routes/auth";
import { productsRouter } from "./routes/products";
import { addressesRouter } from "./routes/addresses";
import { ordersRouter } from "./routes/orders";
import { subscriptionsRouter } from "./routes/subscriptions";
import { billsRouter } from "./routes/bills";
import { paymentsRouter } from "./routes/payments";
import { deliveryRouter } from "./routes/delivery";
import { adminRouter } from "./routes/admin";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  // Generic rate limit; auth endpoints get a tighter limit below to slow
  // down credential-stuffing / OTP abuse.
  app.use(rateLimit({ windowMs: 60_000, limit: 300 }));
  const authLimiter = rateLimit({ windowMs: 60_000, limit: 20 });

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authLimiter, authRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/addresses", addressesRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/subscriptions", subscriptionsRouter);
  app.use("/api/bills", billsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/delivery", deliveryRouter);
  app.use("/api/admin", adminRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found." } });
  });

  // Centralized error handler — never leaks stack traces / internal details
  // to the client (Rule 15 / PRD section 43).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
      return;
    }

    if (err && typeof err === "object" && "issues" in err) {
      // zod validation error
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid request.", details: (err as { issues: unknown }).issues } });
      return;
    }

    req.log?.error({ err }, "unhandled_error");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } });
  });

  return app;
}
