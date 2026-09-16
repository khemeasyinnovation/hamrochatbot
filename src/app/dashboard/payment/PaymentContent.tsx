"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { initiatePayment } from "@/lib/paymentApi";
import { fetchMyOrg, Org } from "@/lib/orgApi";

export default function PaymentContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const [org, setOrg] = useState<Org | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyOrg()
      .then(setOrg)
      .catch((error) => setError(error.message || "Couldn't load payment status. Please reload."));
  }, [status]);

  async function handlePay() {
    setError("");
    setBusy(true);
    try {
      const { formUrl, fields } = await initiatePayment();
      const form = document.createElement("form");
      form.method = "POST";
      form.action = formUrl;
      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value as string;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setBusy(false);
    }
  }

  if (org === undefined) {
    return <div className="p-6 text-sm text-slate-500">{error || "Loading payment status..."}{error && <button onClick={() => window.location.reload()} className="ml-3 underline">Retry</button>}</div>;
  }

  if (org === null) {
    return (
      <div className="max-w-md mx-auto my-6 sm:my-12 px-4 sm:px-6 pb-8">
        <h1 className="text-lg font-semibold text-[#123A3E] mb-1">Payment</h1>
        <p className="text-sm text-slate-500 mb-4">
          You need to set up your business before you can activate it.
        </p>
        <Link
          href="/dashboard/widget"
          className="inline-block px-4 py-2 rounded-lg bg-[#123A3E] text-white text-sm font-medium hover:bg-[#0D2E31] transition"
        >
          Set up your business
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-6 sm:my-10 px-4 sm:px-6 pb-24">
      <Link href="/dashboard/widget" className="text-sm text-slate-500 hover:underline">Back to widget setup</Link>
      <h1 className="mt-3 text-2xl font-semibold text-[#123A3E] mb-3">Activate your website assistant</h1>
      <p className="text-sm text-slate-500 mb-4">
        Activate your business using eSewa (sandbox test payment — no real
        money moves).
      </p>

      {status === "success" && org.isPaid && (
        <p className="text-sm text-[#5B8266] mb-4">
          Payment confirmed — your business is now marked activated.
        </p>
      )}
      {status === "success" && !org.isPaid && <p role="status" className="mb-4 text-sm text-amber-800">Payment is not confirmed yet. Your widget stays inactive until server verification completes.</p>}
      {status === "failure" && (
        <p className="text-sm text-red-500 mb-4">
          Payment wasn't completed. You can try again below.
        </p>
      )}

      <p className="text-xs text-slate-400 mb-4">
        Status:{" "}
        <strong className={org.isPaid ? "text-[#5B8266]" : "text-[#B5502A]"}>
          {org.isPaid ? "Activated" : "Not activated"}
        </strong>
      </p>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <p className="text-sm font-medium text-[#123A3E]">One-time widget activation</p>
      <p className="mt-2 text-3xl font-semibold text-[#123A3E]">NPR 999 <span className="text-sm font-normal text-slate-500">sandbox</span></p>
      <p className="my-4 text-sm leading-6 text-slate-500">Add your knowledge, choose your appearance, and configure domains before paying. Activation enables public Widget chat. Your own AI key is not required.</p>
      {org.isPaid ? <Link href="/dashboard/widget#install" className="inline-block rounded-lg bg-[#123A3E] px-4 py-3 text-sm font-semibold text-white">Continue to installation</Link> : <button
        onClick={handlePay}
        disabled={busy}
        className="px-4 py-2 rounded-lg bg-[#B5502A] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#9C4322] transition"
      >
        {busy ? "Redirecting to eSewa..." : "Pay NPR 999 (sandbox)"}
      </button>}
      </div>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      <p className="text-xs text-slate-400 mt-4">
        Sandbox test login — eSewa ID <code>9806800001</code>, password{" "}
        <code>Nepal@123</code>, OTP token <code>123456</code>.
      </p>
    </div>
  );
}
