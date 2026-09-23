// Shared helper that proves an EzeePay postback really came from EzeePay.
//
// EzeePay does not sign its postbacks, so we embed a per-order HMAC token in the
// post_back_url we register with them when creating the checkout token or
// subscription. Only EzeePay ever receives that URL, so a request carrying a
// valid token for the referenced order could not have been forged by a client.

const encoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export const getCallbackSecret = (): string => {
  const secret = Deno.env.get("EZEEPAY_WEBHOOK_SECRET");
  if (!secret) throw new Error("EZEEPAY_WEBHOOK_SECRET is not configured");
  return secret;
};

/** Deterministic token bound to a single order/schedule reference. */
export const signCallbackReference = async (reference: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getCallbackSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(reference));
  return toHex(signature);
};

export const verifyCallbackToken = async (
  reference: string,
  provided: string | null,
): Promise<boolean> => {
  if (!provided) return false;
  const expected = await signCallbackReference(reference);
  if (expected.length !== provided.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return mismatch === 0;
};

/** Appends the signed token to a postback URL registered with EzeePay. */
export const buildSignedPostbackUrl = async (
  baseUrl: string,
  reference: string,
): Promise<string> => {
  const token = await signCallbackReference(reference);
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}wt=${token}`;
};
