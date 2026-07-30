import { LegalSection } from "./LegalPage";

// Shared between the real /terms and /privacy pages and LegalModal's popup rendering of the same
// content — one copy of the actual legal text, two presentations.
export const TERMS_UPDATED = "July 29, 2026";
export const PRIVACY_UPDATED = "July 30, 2026";

export function TermsContent() {
  return (
    <>
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
            className="font-medium text-brand-700 hover:underline"
          >
            daryltadss.workemail@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </>
  );
}

export function PrivacyContent() {
  return (
    <>
      <LegalSection heading="1. Overview">
        <p>
          This page explains what Votero collects, why, and how it&apos;s handled. Votero is
          currently in beta with a small user base — if anything here is unclear, just email us
          (contact at the bottom) and ask.
        </p>
      </LegalSection>

      <LegalSection heading="2. What we collect">
        <p>
          <strong>Account info.</strong> If you sign in, we collect the email address you provide
          (used only to send and verify a one-time sign-in code — we never see or store a
          password). If you set one up, we also store your username, first/last name, and an
          avatar photo you choose to upload.
        </p>
        <p>
          <strong>Lobby content.</strong> Lobby titles, questions, options, and any votes or
          free-text answers you submit. This content is visible to other participants in the same
          lobby by design, and a lobby&apos;s creator can export it.
        </p>
        <p>
          <strong>Error reports.</strong> If something breaks while you&apos;re using Votero, we
          use Sentry to automatically capture a crash report — the error itself, a stack trace,
          and basic technical context (browser, OS, and the page you were on) — so we can find and
          fix the bug. This is for diagnosing bugs, not for tracking your behavior.
        </p>
        <p>
          <strong>Local storage, not cookies.</strong> Votero stores your sign-in session and a
          few preferences (light/dark theme, chart view, table/grid view) in your browser&apos;s
          local storage. This stays on your device and isn&apos;t used for advertising or
          cross-site tracking.
        </p>
        <p>
          <strong>Camera access (optional).</strong> If you use the in-app QR scanner to join a
          lobby, your browser asks for camera permission. The video feed is processed entirely on
          your device to read the code — it&apos;s never uploaded, transmitted, or stored by
          Votero. You can always skip this and type a lobby code in manually instead.
        </p>
        <p>
          <strong>Usage analytics.</strong> We use Vercel Analytics to see which pages get visited
          and which key actions happen (for example, a lobby being created, opened for voting, or
          joined) so we know what&apos;s working and where people get stuck. It&apos;s
          cookieless — it doesn&apos;t use a persistent identifier to track you across visits or
          across other sites, and it isn&apos;t tied to your account or email address.
        </p>
      </LegalSection>

      <LegalSection heading="3. How we use it">
        <p>
          To operate sign-in, associate lobbies and votes with your account, enforce the lobby
          limit and auto-deletion rules described in our{" "}
          <a href="/terms" className="font-medium text-brand-700 hover:underline">
            Terms of Service
          </a>
          , and to find and fix bugs. We don&apos;t sell your information, and we don&apos;t use
          it for advertising.
        </p>
      </LegalSection>

      <LegalSection heading="4. Retention and deletion">
        <p>
          Lobbies created without signing in are permanently deleted 7 days after creation,
          including their questions, options, and votes. Anyone who creates a lobby can delete it
          manually at any time, which permanently removes it and its results.
        </p>
        <p>
          There&apos;s currently no self-serve &quot;delete my account&quot; button. To request
          deletion of your account or any personal data we hold, email us (below) and we&apos;ll
          process it manually.
        </p>
      </LegalSection>

      <LegalSection heading="5. Who we share it with">
        <p>
          We use a small set of infrastructure providers to run Votero, each of which processes
          data on our behalf: <strong>Supabase</strong> (database, authentication, file storage,
          and delivering sign-in emails), <strong>Vercel</strong> (web hosting and usage
          analytics), and <strong>Sentry</strong> (error monitoring). We don&apos;t share your
          data with anyone else, and we don&apos;t sell it.
        </p>
      </LegalSection>

      <LegalSection heading="6. Children's privacy">
        <p>
          Votero isn&apos;t directed at children under 13, and we don&apos;t knowingly collect
          personal information from anyone under that age.
        </p>
      </LegalSection>

      <LegalSection heading="7. Your choices">
        <p>
          You can use most of Votero without ever providing an email address. Where an account is
          required, you can decline camera access and enter a lobby code manually instead. You can
          request access to, or deletion of, your personal data at any time by contacting us.
        </p>
      </LegalSection>

      <LegalSection heading="8. Changes to this policy">
        <p>
          We may update this policy as Votero changes — we&apos;ll describe any new data we start
          collecting here before we ship it, not after. We&apos;ll update the &quot;Last
          updated&quot; date above whenever we do.
        </p>
      </LegalSection>

      <LegalSection heading="9. Contact">
        <p>
          Questions about this policy, or a data request? Email{" "}
          <a
            href="mailto:daryltadss.workemail@gmail.com"
            className="font-medium text-brand-700 hover:underline"
          >
            daryltadss.workemail@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </>
  );
}
