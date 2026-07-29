"use client";

import { LegalPage, LegalSection } from "../_components/LegalPage";
import { useDocumentTitle } from "../_components/useDocumentTitle";

export default function TermsPage() {
  useDocumentTitle("Terms of Service");

  return (
    <LegalPage title="Terms of Service" updated="July 29, 2026">
      <LegalSection heading="1. Agreement">
        <p>
          These Terms govern your use of Votero (the &quot;Service&quot;), a QR-code-based group
          voting and polling tool. By creating a lobby, joining one, or otherwise using the
          Service, you agree to these Terms.
        </p>
        <p>
          Votero is currently in <strong>beta</strong>. Features, limits, and behavior described
          here may change as the Service develops, and we&apos;ll update this page when they do.
        </p>
      </LegalSection>

      <LegalSection heading="2. Accounts and anonymous use">
        <p>
          You can create or join most lobbies without an account. Some actions — creating a lobby
          with an &quot;open&quot; ballot (where your identity is visible to the lobby&apos;s
          creator), keeping a history of your lobbies, or having a profile with an avatar and
          username — require signing in with an email address via a one-time code. We don&apos;t
          use passwords.
        </p>
        <p>
          You&apos;re responsible for keeping access to your email account secure, since that&apos;s
          how sign-in codes are delivered and verified.
        </p>
      </LegalSection>

      <LegalSection heading="3. Your content">
        <p>
          Anything you enter into a lobby — its title, questions, options, and any free-text
          answers — is visible to other participants in that same lobby, by design. A lobby&apos;s
          creator can export that lobby&apos;s results (including free-text answers) as a CSV file
          or an image.
        </p>
        <p>
          You agree not to submit content that&apos;s illegal, harassing, hateful, or that
          violates someone else&apos;s rights. We may remove content or restrict access to a lobby
          that violates this.
        </p>
      </LegalSection>

      <LegalSection heading="4. Lobby limits and deletion">
        <p>
          Signed-in accounts are currently capped at 10 lobbies. Lobbies created without an
          account (anonymous lobbies) are automatically and permanently deleted 7 days after
          creation. Anyone who creates a lobby — signed in or anonymous — can delete it manually
          at any time; deleting a lobby permanently removes its questions, options, and any votes
          or responses submitted to it.
        </p>
      </LegalSection>

      <LegalSection heading="5. Acceptable use">
        <p>
          Please don&apos;t use Votero to attempt to disrupt the Service (for example, scripted or
          automated vote-stuffing), attempt to access another user&apos;s account or a lobby you
          weren&apos;t invited to by circumventing access controls, or use it for any unlawful
          purpose.
        </p>
      </LegalSection>

      <LegalSection heading="6. Service provided “as is”">
        <p>
          Because Votero is in beta, we don&apos;t guarantee uninterrupted availability, and data
          loss (while not expected) is possible. Don&apos;t rely on Votero as the sole record of
          anything you can&apos;t afford to lose — the CSV/image export exists specifically so you
          can keep your own copy of a lobby&apos;s results.
        </p>
        <p>
          The Service is provided without warranties of any kind, express or implied. To the
          fullest extent permitted by law, Votero isn&apos;t liable for indirect, incidental, or
          consequential damages arising from your use of it.
        </p>
      </LegalSection>

      <LegalSection heading="7. Changes to these Terms">
        <p>
          We may update these Terms as the Service changes. If we make a material change,
          we&apos;ll update the &quot;Last updated&quot; date above. Continued use of Votero after
          a change means you accept the updated Terms.
        </p>
      </LegalSection>

      <LegalSection heading="8. Contact">
        <p>
          Questions about these Terms? Reach out at{" "}
          <a
            href="mailto:daryltadss.workemail@gmail.com"
            className="font-medium text-brand-600 hover:underline"
          >
            daryltadss.workemail@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
