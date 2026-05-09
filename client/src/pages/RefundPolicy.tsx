import { LegalPageShell } from "@/components/LegalPageShell";

export default function RefundPolicy() {
  return (
    <LegalPageShell pageKey="refund">
      <p className="text-base leading-relaxed text-slate-700">
        This Refund Policy explains how refunds work for digital purchases such as chat credits or
        wallet top-ups made through our service.
      </p>

      <h2>Digital goods</h2>
      <p>
        Chat credits and similar digital balances are delivered instantly upon successful payment.
        Because they are consumed digitally, refunds are limited to the cases below.
      </p>

      <h2>Eligible refunds</h2>
      <ul>
        <li>
          <strong>Duplicate charge:</strong> If you were charged twice for the same transaction by
          mistake, contact us with proof of payment within 7 days.
        </li>
        <li>
          <strong>Technical failure:</strong> If credits never appear in your account after payment
          confirmation from your bank or wallet, contact us within 7 days.
        </li>
      </ul>

      <h2>Non-refundable cases</h2>
      <ul>
        <li>Credits already used or partially used</li>
        <li>Change of mind after delivery</li>
        <li>Violations of our Terms that resulted in suspension</li>
      </ul>

      <h2>How to request</h2>
      <p>
        Email us from the address linked to your account with your transaction ID and a short
        description. We aim to respond within a few business days.
      </p>

      <h2>Payment provider disputes</h2>
      <p>
        If you open a chargeback or dispute with your bank, we may be unable to process a parallel
        refund until the dispute is resolved.
      </p>

      <p className="text-sm text-slate-500">Last updated: May 2026</p>
    </LegalPageShell>
  );
}
