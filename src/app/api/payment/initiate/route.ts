import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { orgs, paymentTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";
import { generateEsewaSignature, ESEWA_PRODUCT_CODE, ESEWA_FORM_URL } from "@/lib/esewa";

// Flat activation-fee stub for now — swap for a real plan/pricing model later.
const ACTIVATION_AMOUNT = "999";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const [org] = await db.select().from(orgs).where(eq(orgs.ownerUserId, userId));
  if (!org) return NextResponse.json({ error: "No business found" }, { status: 404 });
  if (org.isPaid) return NextResponse.json({ error: "Your widget is already activated" }, { status: 409 });

  // eSewa requires transaction_uuid to be unique and alphanumeric/hyphen only.
  const transactionUuid = `${org.id}-${Date.now()}`;
  const totalAmount = ACTIVATION_AMOUNT;

  await db.insert(paymentTransactions).values({
    orgId: org.id,
    transactionUuid,
    amount: totalAmount,
    status: "PENDING",
  });

  const signature = generateEsewaSignature(totalAmount, transactionUuid, ESEWA_PRODUCT_CODE);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return NextResponse.json({
    formUrl: ESEWA_FORM_URL,
    fields: {
      amount: totalAmount,
      tax_amount: "0",
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: ESEWA_PRODUCT_CODE,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: `${appUrl}/api/payment/success`,
      failure_url: `${appUrl}/api/payment/failure`,
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature,
    },
  });
}
