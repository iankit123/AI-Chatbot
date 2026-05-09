import { LegalPageShell } from "@/components/LegalPageShell";

const supportMailto =
  (typeof import.meta.env.VITE_SUPPORT_MAILTO === "string" &&
    import.meta.env.VITE_SUPPORT_MAILTO.trim()) ||
  "mailto:support@example.com?subject=Support";

export default function ContactUs() {
  return (
    <LegalPageShell pageKey="contact">
      <p className="text-base leading-relaxed text-slate-700">
        We&apos;re here to help with account issues, billing questions, or feedback about the
        product.
      </p>

      <h2>Email</h2>
      <p>
        The fastest way to reach us is by email:{" "}
        <a href={supportMailto} className="font-semibold text-indigo-600 underline underline-offset-2">
          Open support mail
        </a>
        .
      </p>

      <h2>What to include</h2>
      <ul>
        <li>A clear subject line (e.g. &quot;Refund&quot;, &quot;Credits not received&quot;)</li>
        <li>The phone number or identifier you use on the app, if any</li>
        <li>Screenshots or transaction IDs for payment-related requests</li>
      </ul>

      <h2>Response time</h2>
      <p>
        We try to reply within a few business days. Peak periods may take longer; thank you for
        your patience.
      </p>

      <p className="text-sm text-slate-500">Last updated: May 2026</p>
    </LegalPageShell>
  );
}
