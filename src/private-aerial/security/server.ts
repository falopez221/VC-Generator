import { cookies } from "next/headers";
import {
  aerialLabSessionCookieName,
  verifyAerialLabSessionToken,
} from "./session.ts";

/** Reads only the signed, HttpOnly lab session cookie. */
export async function hasValidAerialLabSession(email: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(aerialLabSessionCookieName())?.value;
  const decision = await verifyAerialLabSessionToken(token, email);
  return decision.valid;
}
