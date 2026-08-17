// Validates the X-Twilio-Signature header on inbound Twilio webhooks.
// Twilio signs: full webhook URL + sorted POST params (key+value concatenated),
// HMAC-SHA1 with the account auth token, base64 encoded.

function base64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function publicUrl(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) url.protocol = `${proto}:`;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) url.host = host;
  return url.toString();
}

/**
 * Returns true when the request carries a valid Twilio signature.
 * Reads a clone of the request so the caller can still parse the body.
 */
export async function verifyTwilioSignature(req: Request): Promise<boolean> {
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!authToken) {
    console.error("TWILIO_AUTH_TOKEN not configured - rejecting webhook");
    return false;
  }

  const signature = req.headers.get("x-twilio-signature");
  if (!signature) {
    console.warn("Missing X-Twilio-Signature header");
    return false;
  }

  let payload = publicUrl(req);

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (req.method === "POST" && contentType.includes("application/x-www-form-urlencoded")) {
      const body = await req.clone().text();
      const params = new URLSearchParams(body);
      const keys = [...new Set([...params.keys()])].sort();
      for (const key of keys) {
        payload += key + (params.get(key) ?? "");
      }
    }
  } catch (err) {
    console.error("Failed to read webhook body for signature check:", err);
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expected = base64(mac);

  if (expected !== signature) {
    console.warn("Invalid Twilio signature");
    return false;
  }
  return true;
}

export function forbidden(): Response {
  return new Response("Forbidden", { status: 403 });
}
