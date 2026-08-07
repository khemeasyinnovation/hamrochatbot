import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { orgs, paymentTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyEsewaSignature, checkEsewaStatus, ESEWA_PRODUCT_CODE } from "@/lib/esewa";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const data = url.searchParams.get("data");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!data) {
    return NextResponse.redirect(`${appUrl}/dashboard/payment?status=failure`);
  }

  let payload: Record<string, string>;
  try {
    payload = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard/payment?status=failure`);
  }

  if (!verifyEsewaSignature(payload)) {
    console.error("[esewa] signature verification failed", payload);
    return NextResponse.redirect(`${appUrl}/dashboard/payment?status=failure`);
  }

  // Defense in depth: eSewa's own docs say never trust the redirect alone —
  // confirm independently via their server-to-server status API.
  const statusResult = await checkEsewaStatus(
    payload.product_code || ESEWA_PRODUCT_CODE,
    payload.total_amount,
    payload.transaction_uuid,
  );

  if (statusResult.status !== "COMPLETE") {
    await db
      .update(paymentTransactions)
      .set({ status: statusResult.status || "FAILED", updatedAt: new Date() })
      .where(eq(paymentTransactions.transactionUuid, payload.transaction_uuid));
    return NextResponse.redirect(`${appUrl}/dashboard/payment?status=failure`);
  }

  const [txn] = await db
    .update(paymentTransactions)
    .set({
      status: "COMPLETE",
      refId: statusResult.ref_id ?? null,
      updatedAt: new Date(),
    })
    .where(eq(paymentTransactions.transactionUuid, payload.transaction_uuid))
    .returning();

  if (txn) {
    await db.update(orgs).set({ isPaid: true }).where(eq(orgs.id, txn.orgId));
  }

  return NextResponse.redirect(`${appUrl}/dashboard/payment?status=success`);
}