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
      .catch(() => setOrg(null));
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
    return <div className="p-6 text-sm text-slate-400">Loading...</div>;
  }

  if (org === null) {
    return (
      <div className="max-w-md mx-auto mt-16 px-6">
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
    <div className="max-w-md mx-auto mt-16 px-6">
      <h1 className="text-lg font-semibold text-[#123A3E] mb-1">Payment</h1>
      <p className="text-sm text-slate-500 mb-4">
        Activate your business using eSewa (sandbox test payment — no real
        money moves).
      </p>

      {status === "success" && (
        <p className="text-sm text-[#5B8266] mb-4">
          Payment confirmed — your business is now marked activated.
        </p>
      )}
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
      <button
        onClick={handlePay}
        disabled={busy}
        className="px-4 py-2 rounded-lg bg-[#B5502A] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#9C4322] transition"
      >
        {busy ? "Redirecting to eSewa..." : "Pay NPR 999 (sandbox)"}
      </button>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      <p className="text-xs text-slate-400 mt-4">
        Sandbox test login — eSewa ID <code>9806800001</code>, password{" "}
        <code>Nepal@123</code>, OTP token <code>123456</code>.
      </p>
    </div>
  );
}