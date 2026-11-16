import crypto from "crypto";

// Minimal signed-token helper (HMAC-SHA256) so we don't need an extra JWT
// dependency for a two-role, cookie-only session model.
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(input: string) {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function sign<T extends object>(payload: T, maxAgeSeconds: number): string {
  const body = { ...payload, exp: Date.now() + maxAgeSeconds * 1000 };
  const encoded = base64url(JSON.stringify(body));
  const sig = crypto.createHmac("sha256", secret()).update(encoded).digest();
  return `${encoded}.${base64url(sig)}`;
}

export function verify<T>(token: string | undefined | null): T | null {
  if (!token) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const expected = base64url(crypto.createHmac("sha256", secret()).update(encoded).digest());
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    return null;
  }
  try {
    const payload = JSON.parse(base64urlDecode(encoded).toString("utf8"));
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload as T;
  } catch {
    return null;
  }
}
