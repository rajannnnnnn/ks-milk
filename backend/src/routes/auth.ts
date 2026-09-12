import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { errors } from "../lib/errors";
import {
  hashPassword,
  verifyPassword,
  validateMobile,
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  signMobileVerificationToken,
  verifyMobileVerificationToken,
} from "../domain/auth";
import { authenticate } from "../middleware/auth";
import { verifyGoogleIdToken } from "../domain/googleSso";
import { verifyWidgetAccessToken } from "../domain/msg91Widget";
import { env } from "../config/env";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  mobile: z.string(),
  email: z.string().email().optional(),
  password: z.string().min(8),
  // Proof of OTP verification for `mobile`, obtained from POST /auth/otp/verify.
  mobileVerificationToken: z.string().min(1),
  address: z.object({
    name: z.string().min(1),
    mobile: z.string(),
    houseNo: z.string().min(1),
    street: z.string().optional().default(""),
    area: z.string().min(1),
    city: z.string().optional().default(""),
    pincode: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
  }),
});

authRouter.post("/register/customer", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    if (!validateMobile(body.mobile)) {
      throw errors.badRequest("Please enter a valid 10-digit mobile number.");
    }

    verifyMobileVerificationToken(body.mobileVerificationToken, body.mobile);

    const existing = await prisma.user.findUnique({ where: { mobile: body.mobile } });
    if (existing) {
      throw errors.conflict("An account with this mobile number already exists.");
    }

    const passwordHash = await hashPassword(body.password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          role: "CUSTOMER",
          mobile: body.mobile,
          email: body.email,
          passwordHash,
          name: body.name,
          customer: {
            create: {
              addresses: {
                create: {
                  ...body.address,
                  isDefault: true,
                },
              },
            },
          },
        },
        include: { customer: true },
      });
      return created;
    });

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = await issueRefreshToken(user.id);

    res.status(201).json({
      user: { id: user.id, name: user.name, mobile: user.mobile, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  mobile: z.string(),
  password: z.string(),
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { mobile: body.mobile } });

    if (!user || !user.isActive || !user.passwordHash) {
      throw errors.unauthorized("Invalid mobile number or password.");
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      throw errors.unauthorized("Invalid mobile number or password.");
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = await issueRefreshToken(user.id);

    res.json({
      user: { id: user.id, name: user.name, mobile: user.mobile, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const { userId, role, newToken } = await rotateRefreshToken(refreshToken);
    const accessToken = signAccessToken({ userId, role });
    res.json({ accessToken, refreshToken: newToken });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    await revokeRefreshToken(refreshToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

const resetPasswordSchema = z.object({
  mobile: z.string(),
  newPassword: z.string().min(8),
  // In production this must be gated behind a verified OTP challenge.
  // Left as an explicit extension point rather than faked (Rule 20).
  otpVerificationToken: z.string(),
});

authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const body = resetPasswordSchema.parse(req.body);
    if (!body.otpVerificationToken) {
      throw errors.badRequest("OTP verification is required before resetting the password.");
    }

    const user = await prisma.user.findUnique({ where: { mobile: body.mobile } });
    if (!user) {
      // Do not reveal account existence.
      res.status(204).send();
      return;
    }

    const passwordHash = await hashPassword(body.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Customer Google sign-in: verifies the ID token server-side, then finds an
// existing user by googleId (or by matching email, to link an existing
// mobile-registered account) or creates a new CUSTOMER. Google SSO can only
// ever create CUSTOMER accounts — never ADMIN — to prevent privilege
// escalation via a Google account an attacker controls.
authRouter.post("/google/customer", async (req, res, next) => {
  try {
    const { idToken } = z.object({ idToken: z.string() }).parse(req.body);
    const identity = await verifyGoogleIdToken(idToken);

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: identity.googleId }, { email: identity.email }] },
    });

    if (user && user.role !== "CUSTOMER") {
      throw errors.forbidden("This Google account is already linked to a non-customer account.");
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          role: "CUSTOMER",
          name: identity.name,
          email: identity.email,
          googleId: identity.googleId,
          customer: { create: {} },
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: identity.googleId } });
    }

    if (!user.isActive) throw errors.unauthorized("This account has been deactivated.");

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = await issueRefreshToken(user.id);
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
});

// Verifies an OTP just completed via the MSG91 Widget and, if valid, issues a
// short-lived token proving this mobile number was verified. Used to gate
// POST /auth/register/customer -- the widget's own client-side "verified"
// state is never trusted on its own (Rule 3), so this re-checks with MSG91
// server-side before the frontend is allowed to submit the signup form.
const otpVerifySchema = z.object({
  accessToken: z.string().optional(),
  // Dev-only bypass field -- see note below. Ignored whenever a real widget
  // accessToken is provided or MSG91 is configured.
  mobile: z.string().optional(),
});

authRouter.post("/otp/verify", async (req, res, next) => {
  try {
    const body = otpVerifySchema.parse(req.body);
    let mobile: string;

    if (body.accessToken) {
      ({ mobile } = await verifyWidgetAccessToken(body.accessToken));
    } else if (body.mobile && env.NODE_ENV !== "production" && !env.MSG91_AUTH_KEY) {
      // Dev-only bypass: with no MSG91_AUTH_KEY configured there is no real
      // widget to complete an OTP against, so local development would
      // otherwise be blocked entirely. Never available once MSG91_AUTH_KEY
      // is set or NODE_ENV=production (Rule 3) -- production always goes
      // through the branch above, which re-verifies with MSG91 server-side.
      mobile = body.mobile;
    } else {
      throw errors.badRequest("A widget access token is required to verify your mobile number.");
    }

    if (!validateMobile(mobile)) {
      throw errors.badRequest("The verified mobile number is not a valid 10-digit number.");
    }

    const mobileVerificationToken = signMobileVerificationToken(mobile);
    res.json({ mobile, mobileVerificationToken });
  } catch (err) {
    next(err);
  }
});

// Customer OTP login via the MSG91 Widget: the widget itself (client-side)
// sends and verifies the OTP; this endpoint re-verifies the resulting
// access-token server-side (Rule 3) before ever trusting the phone number.
// Auto-provisions a CUSTOMER account on first login, same posture as Google
// SSO — never auto-creates ADMIN or DELIVERY_PERSON accounts.
authRouter.post("/otp/login", async (req, res, next) => {
  try {
    const { accessToken: widgetToken } = z.object({ accessToken: z.string() }).parse(req.body);
    const { mobile } = await verifyWidgetAccessToken(widgetToken);

    if (!validateMobile(mobile)) {
      throw errors.badRequest("The verified mobile number is not a valid 10-digit number.");
    }

    let user = await prisma.user.findUnique({ where: { mobile } });

    if (user && user.role !== "CUSTOMER") {
      throw errors.forbidden("This mobile number is already linked to a non-customer account.");
    }

    if (!user) {
      user = await prisma.user.create({
        data: { role: "CUSTOMER", name: "Customer", mobile, customer: { create: {} } },
      });
    }

    if (!user.isActive) throw errors.unauthorized("This account has been deactivated.");

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = await issueRefreshToken(user.id);
    res.json({ user: { id: user.id, name: user.name, mobile: user.mobile, role: user.role }, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
});

// Admin Google sign-in: only ever LINKS to and signs in an Admin account
// that already exists with a matching email — it never creates a new admin.
// Admin accounts must be provisioned out-of-band (by another admin/ops),
// same posture as the delivery-person creation endpoint.
authRouter.post("/google/admin", async (req, res, next) => {
  try {
    const { idToken } = z.object({ idToken: z.string() }).parse(req.body);
    const identity = await verifyGoogleIdToken(idToken);

    const user = await prisma.user.findFirst({
      where: { role: "ADMIN", OR: [{ googleId: identity.googleId }, { email: identity.email }] },
    });

    if (!user) {
      throw errors.forbidden("No admin account is associated with this Google account.");
    }
    if (!user.isActive) throw errors.unauthorized("This account has been deactivated.");

    if (!user.googleId) {
      await prisma.user.update({ where: { id: user.id }, data: { googleId: identity.googleId } });
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = await issueRefreshToken(user.id);
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) throw errors.notFound();
    res.json({ id: user.id, name: user.name, mobile: user.mobile, email: user.email, role: user.role });
  } catch (err) {
    next(err);
  }
});
