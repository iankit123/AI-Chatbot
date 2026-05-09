import { LegalPageShell } from "@/components/LegalPageShell";

export default function PrivacyPolicy() {
  return (
    <LegalPageShell pageKey="privacy">
      <p className="text-base leading-relaxed text-slate-700">
        This Privacy Policy describes how we collect, use, and share information when you use our
        website and AI chat services.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account & profile:</strong> such as display name, phone number (if you provide
          it), and preferences you save locally or on our servers.
        </li>
        <li>
          <strong>Messages:</strong> content you send to assistants may be processed to generate
          replies and improve reliability and safety.
        </li>
        <li>
          <strong>Technical data:</strong> device or browser identifiers, approximate usage data,
          and diagnostics needed to operate and secure the service.
        </li>
      </ul>

      <h2>How we use information</h2>
      <p>
        We use information to provide and improve the chat experience, authenticate sessions,
        prevent abuse, comply with law, and communicate important service updates.
      </p>

      <h2>Retention</h2>
      <p>
        We retain data only as long as needed for these purposes or as required by law. You may
        request deletion of personal data where applicable by contacting us (see Contact Us).
      </p>

      <h2>Security</h2>
      <p>
        We implement reasonable safeguards to protect your information. No method of transmission
        over the Internet is 100% secure.
      </p>

      <h2>Children</h2>
      <p>
        Our services are not directed to children under 13 (or the minimum age in your region).
        Do not use the service if you do not meet the age requirement.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. Continued use after changes means you accept
        the updated policy.
      </p>

      <p className="text-sm text-slate-500">Last updated: May 2026</p>
    </LegalPageShell>
  );
}
