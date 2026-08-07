export async function initiatePayment(): Promise<{
  formUrl: string;
  fields: Record<string, string>;
}> {
  const res = await fetch("/api/payment/initiate", { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Could not start payment");
  }
  return res.json();
}