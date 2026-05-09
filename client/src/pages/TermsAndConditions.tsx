import { LegalPageShell } from "@/components/LegalPageShell";

export default function TermsAndConditions() {
  return (
    <LegalPageShell pageKey="terms">
      <p className="text-base leading-relaxed text-slate-700">
        By accessing or using our services, you agree to these Terms and Conditions. If you do not
        agree, please do not use the service.
      </p>

      <h2>License to use</h2>
      <p>
        We grant you a limited, non-exclusive, non-transferable license to use the service for
        personal, non-commercial purposes subject to these terms.
      </p>

      <h2>Not professional advice</h2>
      <p>
        AI assistants provide general information and entertainment only. Nothing in the service
        constitutes medical, legal, financial, or other professional advice. Seek qualified
        professionals for decisions that affect your health, rights, or finances.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>No unlawful, harassing, hateful, or sexually exploitative content</li>
        <li>No attempts to disrupt, scrape, or reverse engineer the service beyond permitted use</li>
        <li>No impersonation or misuse of others&apos; identities</li>
      </ul>

      <h2>Credits & payments</h2>
      <p>
        Paid features, bundles, or wallet credits (if offered) are governed by the pricing shown
        at purchase and our Refund Policy.
      </p>

      <h2>Disclaimer</h2>
      <p>
        The service is provided &quot;as is&quot; without warranties of any kind. We do not
        guarantee uninterrupted or error-free operation.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, we are not liable for indirect, incidental, or
        consequential damages arising from your use of the service.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by applicable laws in India unless otherwise required by your
        jurisdiction.
      </p>

      <p className="text-sm text-slate-500">Last updated: May 2026</p>
    </LegalPageShell>
  );
}
