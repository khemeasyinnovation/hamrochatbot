import { Suspense } from "react";
import PaymentContent from "./PaymentContent";

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <PaymentContent />
    </Suspense>
  );
}
