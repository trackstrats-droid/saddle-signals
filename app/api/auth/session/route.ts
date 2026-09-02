import { getToolkitIdentity } from "../../../lib/toolkit-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getToolkitIdentity();
  if (!identity) {
    return Response.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({
    authenticated: true,
    customer: {
      id: identity.customerId,
      email: identity.email,
      firstName: identity.firstName,
      lastName: identity.lastName,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
