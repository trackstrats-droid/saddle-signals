import { cookies } from "next/headers";

const COOKIE = "track_strats_identity";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type ToolkitIdentity = {
  customerId: string;
  email: string;
  firstName: string;
  lastName: string;
  expiresAt: number;
};

function b64(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function key() {
  const secret = process.env.TOOLKIT_AUTH_SECRET;
  if (!secret) throw new Error("Toolkit authentication is not configured.");
  const material = await crypto.subtle.digest("SHA-256", encoder.encode(`track-strats:identity:${secret}`));
  return crypto.subtle.importKey("raw", material, "AES-GCM", false, ["decrypt"]);
}

export async function getToolkitIdentity() {
  try {
    const value = (await cookies()).get(COOKIE)?.value;
    if (!value) return null;
    const [iv, payload] = value.split(".");
    if (!iv || !payload) return null;
    const opened = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(iv) }, await key(), b64(payload));
    const identity = JSON.parse(decoder.decode(opened)) as ToolkitIdentity;
    return identity.expiresAt > Date.now() ? identity : null;
  } catch {
    return null;
  }
}

export function authServiceUrl() {
  const value = process.env.TOOLKIT_LOGIN_URL;
  if (!value) throw new Error("Toolkit login URL is not configured.");
  return value.replace(/\/$/, "");
}
