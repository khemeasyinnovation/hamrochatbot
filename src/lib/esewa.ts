import crypto from "crypto";

// UAT sandbox defaults (from eSewa's own developer docs) — override via env vars
// once you get real production merchant credentials later.
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";
export const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";

export const ESEWA_FORM_URL = "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
export const ESEWA_STATUS_URL = "https://rc.esewa.com.np/api/epay/transaction/status/";

/**
 * Signs the fields eSewa requires for a payment-initiation form.
 * Field order matters — must match signed_field_names exactly:
 * total_amount,transaction_uuid,product_code
 */
export function generateEsewaSignature(
  totalAmount: string,
  transactionUuid: string,
  productCode: string,
): string {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;

  const hmac = crypto.createHmac("sha256", ESEWA_SECRET_KEY);
  hmac.update(message);

  const signature = hmac.digest("base64");

  return signature;
}

/**
 * Verifies the signature on eSewa's redirect-back payload. The payload's own
 * signed_field_names tells us which fields (and what order) were signed —
 * we rebuild the same message and compare.
 */
export function verifyEsewaSignature(payload: Record<string, string>): boolean {
  if (typeof payload.signed_field_names !== "string" || typeof payload.signature !== "string") return false;

  const fieldNames = payload.signed_field_names.split(",");
  if (!["transaction_uuid", "total_amount", "product_code", "status"].every(field => fieldNames.includes(field))) return false;
  if (fieldNames.some(field => typeof payload[field] !== "string")) return false;
  const message = fieldNames.map((f) => `${f}=${payload[f]}`).join(",");

  const hmac = crypto.createHmac("sha256", ESEWA_SECRET_KEY);
  hmac.update(message);
  const expected = hmac.digest("base64");

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(payload.signature);
  if (expectedBuf.length !== actualBuf.length) return false; // timingSafeEqual throws on length mismatch

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Server-to-server confirmation — never trust the redirect alone. This is
 * eSewa's own documented recommendation to filter fraudulent/tampered
 * redirects.
 */
export async function checkEsewaStatus(
  productCode: string,
  totalAmount: string,
  transactionUuid: string,
): Promise<{ status: string; ref_id: string | null }> {
  const url = `${ESEWA_STATUS_URL}?product_code=${encodeURIComponent(
    productCode,
  )}&total_amount=${encodeURIComponent(totalAmount)}&transaction_uuid=${encodeURIComponent(
    transactionUuid,
  )}`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error("Payment verification unavailable");
  return res.json();
}
