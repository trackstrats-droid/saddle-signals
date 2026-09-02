export function publicRequestOrigin(request: Request) {
  const configuredOrigin = process.env.PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configuredOrigin) return configuredOrigin;

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();

  if (!forwardedHost || !/^[a-z0-9.-]+(?::\d+)?$/i.test(forwardedHost)) return requestUrl.origin;

  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : requestUrl.protocol.replace(":", "");
  return `${protocol}://${forwardedHost}`;
}
