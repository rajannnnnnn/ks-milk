import { env } from "../config/env";
import { errors } from "../lib/errors";

interface WidgetVerifyResult {
  mobile: string;
}

// MSG91's OTP Widget runs client-side: the browser collects the phone
// number, sends the OTP, and verifies it directly against MSG91, then hands
// the frontend a short-lived access-token as proof. That client-side result
// is never trusted on its own (Rule 3) — this function is the one place
// that re-confirms it server-side, using our account's authkey, before any
// login/registration is allowed to proceed.
//
// NOTE: the exact success/error response shape below has not yet been
// confirmed against a live MSG91 call in this project (no completed widget
// flow has been run to capture a real response). If verification behaves
// unexpectedly, log `body` from a real call and adjust the field access
// below rather than assuming this mapping is correct.
export async function verifyWidgetAccessToken(accessToken: string): Promise<WidgetVerifyResult> {
  if (!env.MSG91_AUTH_KEY) {
    throw errors.badRequest("OTP login is not configured on this server.");
  }

  const response = await fetch("https://control.msg91.com/api/v5/widget/verifyAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authkey: env.MSG91_AUTH_KEY, "access-token": accessToken }),
  });

  const body: unknown = await response.json().catch(() => null);
  const record = body as { type?: string; message?: unknown } | null;

  if (!response.ok || record?.type !== "success" || typeof record.message !== "string") {
    throw errors.unauthorized("OTP verification failed. Please try again.");
  }

  return { mobile: record.message };
}
