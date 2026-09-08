import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";
import { errors } from "../lib/errors";

const client = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

export interface GoogleIdentity {
  googleId: string;
  email: string;
  name: string;
}

// Verifies a Google ID token server-side (never trusts a client-asserted
// email/name) and returns the verified identity. This is the only place
// Google SSO identity is established.
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  if (!client) {
    throw errors.badRequest("Google sign-in is not configured on this server.");
  }

  const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    throw errors.unauthorized("Invalid Google sign-in token.");
  }
  if (!payload.email_verified) {
    throw errors.unauthorized("Your Google email is not verified.");
  }

  return { googleId: payload.sub, email: payload.email, name: payload.name ?? payload.email };
}
