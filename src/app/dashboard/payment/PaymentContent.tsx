"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 px-6">
      <h1 className="text-lg font-semibold text-[#0b2545] mb-1">Payment</h1>
      <p className="text-sm text-slate-500 mb-4">
        Activate your business using eSewa (sandbox test payment — no real money
        moves).
      </p>

      {status === "success" && (
        <p className="text-sm text-green-600 mb-4">
          Payment confirmed — your business is now marked activated.
        </p>
      )}
      {status === "failure" && (
        <p className="text-sm text-red-500 mb-4">
          Payment wasn't completed. You can try again below.
        </p>
      )}

      {org === undefined && (
        <p className="text-sm text-slate-400">Loading...</p>
      )}

      {org && (
        <>
          <p className="text-xs text-slate-400 mb-4">
            Status:{" "}
            <strong
              className={org.isPaid ? "text-green-600" : "text-amber-600"}
            >
              {org.isPaid ? "Activated" : "Not activated"}
            </strong>
          </p>
          <button
            onClick={handlePay}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-[#0b2545] text-white text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Redirecting to eSewa..." : "Pay NPR 999 (sandbox)"}
          </button>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <p className="text-xs text-slate-400 mt-4">
            Sandbox test login — eSewa ID <code>9711111111</code>, password{" "}
            <code>Nepal@123</code>, OTP token <code>123456</code>.
          </p>
        </>
      )}
    </div>
  );
}
