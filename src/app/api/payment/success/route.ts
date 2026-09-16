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

  if (!payload || !verifyEsewaSignature(payload) || payload.product_code !== ESEWA_PRODUCT_CODE || payload.status !== "COMPLETE") {
    console.error("[esewa] callback verification failed");
    return NextResponse.redirect(`${appUrl}/dashboard/payment?status=failure`);
  }

  const [existing] = await db.select().from(paymentTransactions)
    .where(eq(paymentTransactions.transactionUuid, payload.transaction_uuid));
  const paidAmount = Number(String(payload.total_amount).replace(/,/g, ""));
  if (!existing || !Number.isFinite(paidAmount) || paidAmount !== Number(existing.amount)) {
    return NextResponse.redirect(`${appUrl}/dashboard/payment?status=failure`);
  }

  // Defense in depth: eSewa's own docs say never trust the redirect alone —
  // confirm independently via their server-to-server status API.
  let statusResult;
  try {
    statusResult = await checkEsewaStatus(ESEWA_PRODUCT_CODE, existing.amount, existing.transactionUuid);
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard/payment?status=failure`);
  }

  if (statusResult.status !== "COMPLETE") {
    return NextResponse.redirect(`${appUrl}/dashboard/payment?status=failure`);
  }

  await db.transaction(async tx => {
  const [txn] = await tx
    .update(paymentTransactions)
    .set({
      status: "COMPLETE",
      refId: statusResult.ref_id ?? null,
      updatedAt: new Date(),
    })
    .where(eq(paymentTransactions.transactionUuid, payload.transaction_uuid))
    .returning();

  if (txn) {
    await tx.update(orgs).set({ isPaid: true }).where(eq(orgs.id, txn.orgId));
  }
  });

  return NextResponse.redirect(`${appUrl}/dashboard/payment?status=success`);
}
